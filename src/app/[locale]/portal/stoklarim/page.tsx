// src/app/[locale]/portal/stoklarim/page.tsx
import React from 'react';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Locale } from '@/i18n-config';

export const dynamic = 'force-dynamic';

export default async function StoklarimPage({ params }: { params: { locale: Locale } }) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div className="p-6 text-red-500">Oturum bulunamadı.</div>;

  // alt_bayi_stoklari + urunler join
  const { data, error } = await supabase
    .from('alt_bayi_stoklari')
    .select('miktar, urunler(id, ad)')
    .eq('sahip_id', user.id)
    .order('urun_id', { ascending: true });

  if (error) {
    console.error('Stoklar çekilirken hata:', error);
  }

  const rows = (data || []).map((r: any) => ({
    urunId: r.urunler?.id,
    ad: typeof r.urunler?.ad === 'object' ? r.urunler?.ad?.tr || r.urunler?.ad?.de || r.urunler?.ad?.en || '-' : r.urunler?.ad || '-',
    miktar: r.miktar || 0,
  }));

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-bold text-primary">Stoklarım</h1>
      <div className="overflow-x-auto bg-white rounded-xl shadow border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ürün</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Miktar</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((r, idx) => (
              <tr key={`${r.urunId ?? 'urun'}-${idx}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">{r.ad}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-text-main">{r.miktar}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-8 text-center text-gray-500">Stok bulunmuyor.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
