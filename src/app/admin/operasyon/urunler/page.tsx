// src/app/admin/operasyon/urunler/page.tsx

import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Tables } from '@/lib/supabase/database.types';
import { FiPlus, FiBox, FiAlertCircle, FiCheckCircle, FiPackage } from 'react-icons/fi';

type UrunRow = Pick<Tables<'urunler'>, 'id' | 'urun_kodu' | 'urun_adi' | 'temel_satis_fiyati' | 'stok_adeti' | 'stok_azaldi_esigi' | 'stok_bitti_esigi'>;

// Akıllı Stok Göstergesi için durumları ve renkleri belirleyen yardımcı fonksiyon
const getStockStatus = (urun: UrunRow) => {
  if (urun.stok_adeti <= urun.stok_bitti_esigi) {
    return { text: 'Tükendi', color: 'text-red-800 bg-red-100', icon: <FiAlertCircle /> };
  }
  if (urun.stok_adeti <= urun.stok_azaldi_esigi) {
    return { text: 'Stok Azaldı', color: 'text-yellow-800 bg-yellow-100', icon: <FiAlertCircle /> };
  }
  return { text: 'Yeterli Stok', color: 'text-green-800 bg-green-100', icon: <FiCheckCircle /> };
};

export default async function UrunlerListPage() {
  const supabase = createSupabaseServerClient();

  // Hassas maliyet bilgileri (alis_fiyati) OLMADAN sadece gerekli verileri çekiyoruz.
  const { data: urunler, error } = await supabase
    .from('urunler')
    .select('id, urun_kodu, urun_adi, temel_satis_fiyati, stok_adeti, stok_azaldi_esigi, stok_bitti_esigi')
    .order('urun_adi', { ascending: true });

  if (error) {
    console.error("Ürün verileri çekilirken hata oluştu:", error);
    return <div className="p-6 text-red-500">Ürün listesi yüklenirken bir hata oluştu.</div>;
  }

  const urunListesi: UrunRow[] = urunler || [];
  const urunSayisi = urunListesi.length;

  const formatFiyat = (fiyat: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(fiyat);

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="font-serif text-4xl font-bold text-primary">Ürün Kataloğu</h1>
            <p className="text-text-main/80 mt-1">{urunSayisi} adet ürün listeleniyor.</p>
        </div>
        <Link href="/admin/operasyon/urunler/yeni" passHref>
  <button className="...">
    <FiPlus size={18} />
    Yeni Ürün Ekle
  </button>
</Link>      </header>

      {urunSayisi === 0 ? (
        <div className="mt-12 text-center p-10 border-2 border-dashed border-bg-subtle rounded-lg bg-white shadow-sm">
            <FiPackage className="mx-auto text-5xl text-gray-300 mb-4" />
            <h2 className="font-serif text-2xl font-semibold text-primary">Henüz Ürün Eklenmemiş</h2>
            <p className="mt-2 text-text-main/70">Başlamak için yeni bir ürün ekleyin.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-bg-subtle">
            <thead className="bg-bg-subtle">
              <tr>
                {['Ürün Kodu', 'Ürün Adı', 'Satış Fiyatı', 'Stok Durumu'].map(header => (
                    <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider">
                        {header}
                    </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-bg-subtle">
              {urunListesi.map((urun) => {
                const status = getStockStatus(urun);
                return (
                  <tr key={urun.id} className="hover:bg-bg-subtle/50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{urun.urun_kodu}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
  <Link 
    href={`/admin/operasyon/urunler/${urun.id}`} 
    className="hover:underline text-accent transition-colors"
  >
    {urun.urun_adi}
  </Link>
</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-text-main">{formatFiyat(urun.temel_satis_fiyati)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-lg text-primary">{urun.stok_adeti}</span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold leading-5 rounded-full ${status.color}`}>
                          {status.icon}
                          {status.text}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}