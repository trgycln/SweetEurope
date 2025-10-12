// src/app/admin/operasyon/urunler/actions.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Tables } from '@/lib/supabase/database.types';

type UrunUpdate = Partial<Tables<'urunler'>>;

// YENİ: Dilleri merkezi bir yerden alalım
const diller = ['de', 'en', 'tr', 'ar'];

export async function updateUrunAction(urunId: string, formData: FormData) {
  const supabase = createSupabaseServerClient();

  // YENİ: Dinamik JSONB oluşturma
  const adJson: { [key: string]: string } = {};
  const aciklamalarJson: { [key: string]: string } = {};

  diller.forEach(dil => {
    adJson[dil] = formData.get(`ad_${dil}`) as string || '';
    aciklamalarJson[dil] = formData.get(`aciklamalar_${dil}`) as string || '';
  });

  const guncellenecekVeri: UrunUpdate = {
    ad: adJson,
    aciklamalar: aciklamalarJson,
    stok_kodu: formData.get('stok_kodu') as string,
    stok_miktari: parseInt(formData.get('stok_miktari') as string || '0', 10),
    stok_esigi: parseInt(formData.get('stok_esigi') as string || '0', 10),
    birim: formData.get('birim') as string,
    distributor_alis_fiyati: parseFloat(formData.get('distributor_alis_fiyati') as string || '0'),
    satis_fiyati_musteri: parseFloat(formData.get('satis_fiyati_musteri') as string || '0'),
    satis_fiyati_alt_bayi: parseFloat(formData.get('satis_fiyati_alt_bayi') as string || '0'),
  };

  const teknikOzelliklerObj: { [key: string]: any } = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('teknik_')) {
      const asilKey = key.replace('teknik_', '');
      teknikOzelliklerObj[asilKey] = value;
    }
  }
  guncellenecekVeri.teknik_ozellikler = teknikOzelliklerObj;

  const { error } = await supabase
    .from('urunler')
    .update(guncellenecekVeri)
    .eq('id', urunId);

  if (error) {
    console.error('Supabase Update Hatası:', error);
    return { success: false, message: 'Ürün güncellenirken bir hata oluştu: ' + error.message };
  }

  revalidatePath(`/admin/operasyon/urunler`);
  revalidatePath(`/admin/operasyon/urunler/${urunId}`);

  return { success: true, message: 'Ürün başarıyla güncellendi!' };
}

// YENİ FONKSİYON: Yeni ürün oluşturur
export async function createUrunAction(formData: FormData) {
  const supabase = createSupabaseServerClient();
  
  // Verileri update action'daki gibi topla...
  const yeniVeri = {
    kategori_id: formData.get('kategori_id') as string,
    ad: { /* ... */ },
    aciklamalar: { /* ... */ },
    // ... diğer tüm alanlar
    teknik_ozellikler: { /* ... */ }
  };

  // Veri doğruluğunu kontrol et (özellikle kategori_id)
  if (!yeniVeri.kategori_id) {
    return { success: false, message: 'Lütfen bir kategori seçin.' };
  }

  const { error } = await supabase.from('urunler').insert(yeniVeri);

  if (error) {
    console.error('Supabase Insert Hatası:', error);
    return { success: false, message: 'Ürün oluşturulurken hata oluştu: ' + error.message };
  }

  revalidatePath('/admin/operasyon/urunler'); // Ürün listesini yenile
  return { success: true, message: 'Ürün başarıyla oluşturuldu!' };
}