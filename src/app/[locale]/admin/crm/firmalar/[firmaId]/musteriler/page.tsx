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

  console.log('Alt Bayi Müşterileri - Step 0: altBayiFirma:', JSON.stringify(altBayiFirma, null, 2));

  // DEBUG: Sistemdeki TÜM kullanıcıları ve rollerini görelim
  const { data: allUsers } = await supabase
    .from('profiller')
    .select('id, tam_ad, rol, firma_id');
  console.log('Alt Bayi Müşterileri - TÜM KULLANICILAR:', JSON.stringify(allUsers, null, 2));

  // DEBUG: Aliaha müşterisini bulalım
  const { data: aliahaCustomer } = await supabase
    .from('firmalar')
    .select('id, unvan, sahip_id, ticari_tip, kategori')
    .ilike('unvan', '%aliaha%')
    .limit(1)
    .single();
  console.log('Alt Bayi Müşterileri - ALIAHA MÜŞTERİSİ:', JSON.stringify(aliahaCustomer, null, 2));

  // DEBUG: Aliaha'nın sahibi olan kullanıcı profilini bul
  if (aliahaCustomer?.sahip_id) {
    const { data: aliahaOwner } = await supabase
      .from('profiller')
      .select('id, tam_ad, rol, firma_id')
      .eq('id', aliahaCustomer.sahip_id)
      .single();
    console.log('Alt Bayi Müşterileri - ALIAHA SAHİBİ KULLANICI:', JSON.stringify(aliahaOwner, null, 2));
  }

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
    const { data: allAltBayiProfiles } = await supabase
      .from('profiller')
      .select('id, tam_ad')
      .eq('rol', 'Alt Bayi');

    console.log('Alt Bayi Müşterileri - Auto-link attempt: Found Alt Bayi users:', allAltBayiProfiles?.length ?? 0);

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

      console.log('Alt Bayi Müşterileri - Auto-linked firma to user:', altBayiUserId);
    } else {
      console.warn('Alt Bayi Müşterileri - Multiple or no Alt Bayi users found. Manual linking required.');
    }
  }



  // 2) Sahip_id bu kullanıcılardan biri olan firmaların kategori bazlı sayısını al (detay yok)
  let musteriCount = 0;
  const categoryBreakdown: Record<string, number> = {};
  
  console.log('Alt Bayi Müşterileri - Before query: ownerIds:', ownerIds, 'length:', ownerIds.length);
  
  // CRITICAL FIX: Müşteriler hem kullanıcı ID'sine hem de firma ID'sine sahip olabilir
  // İki query yapıp sonuçları birleştireceğiz
  
  let allCustomers: any[] = [];
  
  // Query 1: sahip_id kullanıcı ID'lerinden birine eşit olan müşteriler
  if (ownerIds.length > 0) {
    const { data: customersByUserId, error: err1 } = await supabase
      .from('firmalar')
      .select('id, kategori, sahip_id')
      .in('sahip_id', ownerIds)
      .or('ticari_tip.eq.musteri,ticari_tip.is.null');

    console.log('Alt Bayi Müşterileri - Query 1 (by user IDs):', customersByUserId?.length ?? 0, 'Error:', err1);
    
    if (!err1 && customersByUserId) {
      allCustomers.push(...customersByUserId);
    }
  }
  
  // Query 2: sahip_id firma ID'sine eşit olan müşteriler (fallback)
  const { data: customersByFirmaId, error: err2 } = await supabase
    .from('firmalar')
    .select('id, kategori, sahip_id')
    .eq('sahip_id', firmaId)
    .or('ticari_tip.eq.musteri,ticari_tip.is.null');

  console.log('Alt Bayi Müşterileri - Query 2 (by firma ID):', customersByFirmaId?.length ?? 0, 'Error:', err2);
  
  if (!err2 && customersByFirmaId) {
    allCustomers.push(...customersByFirmaId);
  }
  
  // Duplicate'leri temizle (aynı müşteri her iki query'de de gelebilir)
  const uniqueCustomers = Array.from(
    new Map(allCustomers.map(c => [c.id, c])).values()
  );
  
  console.log('Alt Bayi Müşterileri - Total unique customers:', uniqueCustomers.length);
  
  // Kategori bazlı breakdown hesapla
  uniqueCustomers.forEach((c: any) => {
    const category = c?.kategori || 'Diğer';
    categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
  });
  
  musteriCount = uniqueCustomers.length;

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
