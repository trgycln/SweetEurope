// src/app/[locale]/admin/crm/firmalar/[firmaId]/musteriler/page.tsx
// Alt Bayi'ye bağlı müşterileri listeleyen server component

import React from 'react';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Locale } from '@/i18n-config';

export const dynamic = 'force-dynamic';

export default async function AltBayiMusterileriPage({ params }: { params: Promise<{ locale: Locale, firmaId: string }> }) {
  const { locale, firmaId } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  // 0) Alt bayi kaydını getir (sahip_id fallback için)
  const { data: altBayiFirma } = await supabase
    .from('firmalar')
    .select('sahip_id, ticari_tip')
    .eq('id', firmaId)
    .single();

  console.log('Alt Bayi Müşterileri - Step 0: altBayiFirma:', altBayiFirma);

  // 1) Bu firmaya bağlı alt bayi kullanıcı(lar)ını bul
  const { data: subDealerProfiles, error: profileErr } = await supabase
    .from('profiller')
    .select('id, rol, firma_id')
    .eq('firma_id', firmaId);

  if (profileErr) {
    console.error('Alt bayi profilleri çekilirken hata:', profileErr);
  }

  let ownerIds = (subDealerProfiles || [])
    .filter((p: any) => p.rol === 'Alt Bayi')
    .map((p: any) => p.id);

  console.log('Alt Bayi Müşterileri - Step 1: Profiller:', subDealerProfiles, 'Initial ownerIds:', ownerIds);

  // If no profiles linked to this firma, use sahip_id from firma record
  if (ownerIds.length === 0 && altBayiFirma?.sahip_id) {
    ownerIds.push(altBayiFirma.sahip_id);
    console.log('Alt Bayi Müşterileri - Step 2: Using sahip_id from firma:', altBayiFirma.sahip_id, 'ownerIds now:', ownerIds);
  }

  // CRITICAL FIX: If still no owner IDs, try to auto-link with the only Alt Bayi user
  if (ownerIds.length === 0 && altBayiFirma?.ticari_tip === 'alt_bayi') {
    // First, let's see ALL users in the system
    const { data: allUsers } = await supabase
      .from('profiller')
      .select('id, tam_ad, rol, firma_id');

    console.log('Alt Bayi Müşterileri - Step 3: ALL users in system:', JSON.stringify(allUsers, null, 2));

    // Also check the specific customer (Aliaha) to see who owns it
    const { data: aliaha } = await supabase
      .from('firmalar')
      .select('id, unvan, sahip_id, ticari_tip')
      .ilike('unvan', '%aliaha%')
      .limit(1)
      .single();

    console.log('Alt Bayi Müşterileri - Step 3.5: Aliaha customer record:', JSON.stringify(aliaha, null, 2));

    const { data: allAltBayiProfiles } = await supabase
      .from('profiller')
      .select('id, tam_ad')
      .eq('rol', 'Alt Bayi');

    console.log('Alt Bayi Müşterileri - Step 4: Alt Bayi users only:', allAltBayiProfiles);

    // FALLBACK: Check if there's a customer with this firma as sahip (reverse lookup)
    const { data: customersOwnedByThisFirma } = await supabase
      .from('firmalar')
      .select('id, unvan, sahip_id')
      .eq('sahip_id', firmaId)
      .limit(5);

    console.log('Alt Bayi Müşterileri - Step 5: Customers where sahip_id = this firma:', customersOwnedByThisFirma);

    if ((allAltBayiProfiles || []).length === 1) {
      const altBayiUserId = allAltBayiProfiles![0].id;
      ownerIds.push(altBayiUserId);
      
      // Update firma to link to this user
      await supabase
        .from('firmalar')
        .update({ sahip_id: altBayiUserId })
        .eq('id', firmaId);
      
      // Also update profiller to link to this firma
      await supabase
        .from('profiller')
        .update({ firma_id: firmaId })
        .eq('id', altBayiUserId);

      console.log('Alt Bayi Müşterileri - Step 4: Auto-linked firma to user:', altBayiUserId, 'ownerIds now:', ownerIds);
    } else {
      console.warn('Alt Bayi Müşterileri - Multiple or no Alt Bayi users found. Manual linking required.');
    }
  }



  // 2) Sahip_id bu kullanıcılardan biri olan firmaların kategori bazlı sayısını al (detay yok)
  let musteriCount = 0;
  const categoryBreakdown: Record<string, number> = {};
  
  console.log('Alt Bayi Müşterileri - Before query: ownerIds:', ownerIds, 'length:', ownerIds.length);
  
  // DEBUG: Check if there are ANY customers with sahip_id matching our IDs
  const { data: debugCustomers } = await supabase
    .from('firmalar')
    .select('id, unvan, sahip_id, kategori, ticari_tip')
    .in('sahip_id', ownerIds);
  
  console.log('Alt Bayi Müşterileri - DEBUG: All customers with sahip_id in ownerIds:', debugCustomers);
  
  if (ownerIds.length > 0) {
    const { data: customers, error: customersErr } = await supabase
      .from('firmalar')
      .select('kategori')
      .in('sahip_id', ownerIds)
      .or('ticari_tip.eq.musteri,ticari_tip.is.null');

    console.log('Alt Bayi Müşterileri - Query params: ownerIds:', ownerIds);
    console.log('Alt Bayi Müşterileri - Final ownerIds:', ownerIds, 'Customers found:', customers?.length ?? 0, 'Error:', customersErr);

    if (customersErr) {
      console.error('Alt bayi müşterileri sayılırken hata:', customersErr);
    } else {
      (customers || []).forEach((c: any) => {
        const category = c?.kategori || 'Diğer';
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
      });
      musteriCount = customers?.length ?? 0;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-primary">Alt Bayi Müşterileri</h2>
        <p className="text-sm text-gray-600">Bu alt bayi ile ilişkili kullanıcı(lar) tarafından eklenen müşteriler.</p>
      </div>

      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Bağlı müşteri sayısı</p>
            <p className="text-3xl font-bold text-primary">{musteriCount}</p>
          </div>
          <div className="text-xs text-gray-400">Detaylar gizlidir</div>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-2">Kategori bazlı dağılım</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categoryBreakdown).length > 0 ? (
              Object.entries(categoryBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([category, count]) => (
                  <span
                    key={category}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                  >
                    <span className="font-semibold">{category}:</span>
                    <span className="text-primary font-bold">{count}</span>
                  </span>
                ))
            ) : (
              <span className="text-xs text-gray-400">Henüz müşteri yok</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
