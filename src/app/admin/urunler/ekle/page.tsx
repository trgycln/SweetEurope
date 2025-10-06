// src/app/admin/urunler/ekle/page.tsx

import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Server Action: Form verisini alıp Supabase'e yazar
async function urunEkleAction(formData: FormData) {
  'use server'; // Bu fonksiyonun kesinlikle sunucuda çalışmasını sağlar

  const urun_adi = formData.get('urun_adi') as string;
  const urun_kodu = formData.get('urun_kodu') as string;
  const temel_satis_fiyati = parseFloat(formData.get('temel_satis_fiyati') as string);
  const alis_fiyati = parseFloat(formData.get('alis_fiyati') as string);
  const stok_adeti = parseInt(formData.get('stok_adeti') as string, 10);
  const kategori = formData.get('kategori') as string;

  // Supabase Client'ı sunucuda oluşturuyoruz
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('urunler')
    .insert({
      urun_adi: urun_adi,
      urun_kodu: urun_kodu,
      temel_satis_fiyati: temel_satis_fiyati,
      alis_fiyati: alis_fiyati,
      stok_adeti: stok_adeti,
      kategori: kategori,
      // Diğer zorunlu sütunlar için varsayılan veya basit değerler
      hedef_kar_marji: 0.20, // Örnek varsayılan
      stok_kritik_esik: 5,   // Örnek varsayılan
      ek_maliyetler: {},     // Json tipi için boş obje
    });

  if (error) {
    console.error('Ürün eklenirken hata oluştu:', error.message);
    // Hata durumunda kullanıcıya bir mesaj gösterebiliriz (daha sonra ele alınacak)
  } else {
    // Başarılı olursa, ürün listesi sayfasına yönlendir
    redirect('/admin/urunler');
  }
}

// Ürün Ekleme Sayfası (Server Component)
export default function UrunEklemeSayfasi() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Yeni Ürün Ekle</h1>

      {/* Server Action'ı tetikleyen basit HTML Formu */}
      <form action={urunEkleAction} className="space-y-6 bg-white p-8 rounded-lg shadow">
        
        {/* Ürün Adı */}
        <div>
          <label htmlFor="urun_adi" className="block text-sm font-medium text-gray-700">Ürün Adı</label>
          <input
            type="text"
            id="urun_adi"
            name="urun_adi"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        {/* Ürün Kodu */}
        <div>
          <label htmlFor="urun_kodu" className="block text-sm font-medium text-gray-700">Ürün Kodu</label>
          <input
            type="text"
            id="urun_kodu"
            name="urun_kodu"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        {/* Satış Fiyatı */}
        <div>
          <label htmlFor="temel_satis_fiyati" className="block text-sm font-medium text-gray-700">Temel Satış Fiyatı (TL)</label>
          <input
            type="number"
            step="0.01"
            id="temel_satis_fiyati"
            name="temel_satis_fiyati"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        {/* Alış Fiyatı */}
        <div>
          <label htmlFor="alis_fiyati" className="block text-sm font-medium text-gray-700">Alış Fiyatı (TL)</label>
          <input
            type="number"
            step="0.01"
            id="alis_fiyati"
            name="alis_fiyati"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        {/* Stok Adeti */}
        <div>
          <label htmlFor="stok_adeti" className="block text-sm font-medium text-gray-700">Stok Adeti</label>
          <input
            type="number"
            id="stok_adeti"
            name="stok_adeti"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        
        {/* Kategori */}
        <div>
          <label htmlFor="kategori" className="block text-sm font-medium text-gray-700">Kategori</label>
          <input
            type="text"
            id="kategori"
            name="kategori"
            placeholder="Örn: Kek, Pasta, Tatlı"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          className="w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Ürünü Kaydet
        </button>
      </form>
    </div>
  );
}