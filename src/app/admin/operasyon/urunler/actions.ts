// src/app/admin/operasyon/urunler/actions.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Tables } from '@/lib/supabase/database.types';

type UrunUpdate = Partial<Tables<'urunler'>>;
const diller = ['de', 'en', 'tr', 'ar'];

// YENİDEN KULLANILABİLİR FONKSİYON: FormData'yı veritabanına uygun bir Urun objesine çevirir.
function formDataToUrunObject(formData: FormData): UrunUpdate {
    const adJson: { [key: string]: string } = {};
    const aciklamalarJson: { [key: string]: string } = {};

    diller.forEach(dil => {
        adJson[dil] = formData.get(`ad_${dil}`) as string || '';
        aciklamalarJson[dil] = formData.get(`aciklamalar_${dil}`) as string || '';
    });

    const data: UrunUpdate = {
        ad: adJson,
        aciklamalar: aciklamalarJson,
        kategori_id: formData.get('kategori_id') as string,
        tedarikci_id: (formData.get('tedarikci_id') as string) || null,
        stok_kodu: formData.get('stok_kodu') as string,
        stok_miktari: parseInt(formData.get('stok_miktari') as string || '0', 10),
        stok_esigi: parseInt(formData.get('stok_esigi') as string || '0', 10),
        ana_satis_birimi_id: (formData.get('ana_satis_birimi_id') as string) || null,
        distributor_alis_fiyati: parseFloat(formData.get('distributor_alis_fiyati') as string || '0'),
        satis_fiyati_musteri: parseFloat(formData.get('satis_fiyati_musteri') as string || '0'),
        satis_fiyati_alt_bayi: parseFloat(formData.get('satis_fiyati_alt_bayi') as string || '0'),
        aktif: formData.get('aktif') === 'on'
    };
    
    const teknikOzelliklerObj: { [key: string]: any } = {};
    for (const [key, value] of formData.entries()) {
        if (key.startsWith('teknik_')) {
            const asilKey = key.replace('teknik_', '');
            teknikOzelliklerObj[asilKey] = value;
        }
    }
    data.teknik_ozellikler = teknikOzelliklerObj;
    
    return data;
}

// MEVCUT ÜRÜNÜ GÜNCELLEYEN ACTION
export async function updateUrunAction(urunId: string, formData: FormData) {
  const supabase = createSupabaseServerClient();
  const guncellenecekVeri = formDataToUrunObject(formData);
  
  // Kategori, düzenleme sırasında değiştirilemez. Bu yüzden objeden siliyoruz.
  delete guncellenecekVeri.kategori_id; 

  const { error } = await supabase
    .from('urunler')
    .update(guncellenecekVeri)
    .eq('id', urunId);

  if (error) {
    console.error('Supabase Update Hatası:', error);
    return { success: false, message: 'Ürün güncellenirken bir hata oluştu: ' + error.message };
  }

  // İlgili sayfaların önbelleğini temizle ki güncel veriler görünsün.
  revalidatePath(`/admin/operasyon/urunler`);
  revalidatePath(`/admin/operasyon/urunler/${urunId}`);

  return { success: true, message: 'Ürün başarıyla güncellendi!' };
}

// YENİ ÜRÜN OLUŞTURAN ACTION
export async function createUrunAction(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const yeniVeri = formDataToUrunObject(formData);
  
  // Yeni ürün için zorunlu alanları kontrol et.
  if (!yeniVeri.kategori_id || !yeniVeri.ana_satis_birimi_id) {
    return { success: false, message: 'Lütfen Kategori ve Ana Satış Birimi seçin.' };
  }

  const { error } = await supabase.from('urunler').insert(yeniVeri as Tables<'urunler'>);

  if (error) {
    console.error('Supabase Insert Hatası:', error);
    return { success: false, message: 'Ürün oluşturulurken bir hata oluştu: ' + error.message };
  }

  // Ürün listesi sayfasının önbelleğini temizle.
  revalidatePath('/admin/operasyon/urunler');
  return { success: true, message: 'Ürün başarıyla oluşturuldu!' };
}