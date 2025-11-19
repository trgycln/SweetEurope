// src/app/[locale]/admin/crm/firmalar/[firmaId]/musteriler/page.tsx
// Alt Bayi'ye bağlı müşterileri listeleyen server component

import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Locale } from '@/i18n-config';

export const dynamic = 'force-dynamic';

export default async function AltBayiMusterileriPage({ params }: { params: { locale: Locale, firmaId: string } }) {
  const { locale, firmaId } = params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  // 1) Bu firmaya bağlı alt bayi kullanıcı(lar)ını bul (varsayım: profiller.firma_id mevcut)
  const { data: subDealerProfiles, error: profileErr } = await supabase
    .from('profiller')
    .select('id, rol, firma_id')
    .eq('firma_id', firmaId);

  if (profileErr) {
    console.error('Alt bayi profilleri çekilirken hata:', profileErr);
  }

  const ownerIds = (subDealerProfiles || [])
    .filter((p: any) => p.rol === 'Alt Bayi')
    .map((p: any) => p.id);

  // 2) Sahip_id bu kullanıcılardan biri olan firmaları listele
  let musteriList: any[] = [];
  if (ownerIds.length > 0) {
    const { data: firms, error: firmsErr } = await supabase
      .from('firmalar')
      .select('*')
      .in('sahip_id', ownerIds)
      .order('unvan', { ascending: true });

    if (firmsErr) {
      console.error('Alt bayi müşterileri çekilirken hata:', firmsErr);
    } else {
      musteriList = firms || [];
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-primary">Alt Bayi Müşterileri</h2>
        <p className="text-sm text-gray-600">Bu alt bayi ile ilişkili kullanıcı(lar) tarafından eklenen müşteriler.</p>
      </div>

      {ownerIds.length === 0 ? (
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          Bu alt bayiye bağlı bir kullanıcı profili bulunamadı. Lütfen alt bayiyi bir kullanıcı profiliyle ilişkilendirin.
        </div>
      ) : (musteriList.length === 0 ? (
        <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
          Bu alt bayiye ait kayıtlı müşteri bulunmuyor.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Firma</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Telefon</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Durum</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {musteriList.map((f: any) => (
                <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                    <Link href={`/${locale}/admin/crm/firmalar/${f.id}`} className="text-accent hover:underline">{f.unvan}</Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{f.kategori || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{f.telefon || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{f.status || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
