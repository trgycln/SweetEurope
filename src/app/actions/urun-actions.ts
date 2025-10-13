// src/app/actions/urun-actions.ts

'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Tables, Enums } from '@/lib/supabase/database.types';

// --- Fiyat Listesi ve Diğer Bileşenler İçin Gerekli Olan Eski Fonksiyonlar ---

// Hızlı düzenleme için tip tanımı
type UrunOperasyonelData = Partial<Pick<Tables<'urunler'>['Row'], 
    'alis_fiyati' | 'liste_fiyati_kutu' | 'distributor_fiyati_kutu' | 'pesin_fiyat' | 
    'barkod' | 'kutu_gramaj' | 'koli_ici_kutu_adet' | 'tedarikci_urun_kodu' | 'urun_kodu' | 'kutu_ici_adet' | 'stok_adeti'
>>;

export async function updateUrunOperasyonel(urunId: string, data: UrunOperasyonelData) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Yetkilendirme hatası.' };

    const { error } = await supabase.from('urunler').update(data).eq('id', urunId);

    if (error) {
        console.error('Ürün operasyonel güncelleme hatası:', error);
        return { success: false, message: `Veritabanı hatası: ${error.message}` };
    }

    revalidatePath(`/admin/operasyon/urunler/${urunId}`);
    revalidatePath('/admin/operasyon/fiyat-listesi');
    return { success: true, message: 'Ürün başarıyla güncellendi.' };
}

export async function deleteUrun(urunId: string) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Yetkisiz işlem.' };

    const { error } = await supabase.from('urunler').delete().eq('id', urunId);
    
    if (error) {
        console.error('Ürün silme hatası:', error);
        return { success: false, message: `Veritabanı hatası: ${error.message}` };
    }

    revalidatePath('/admin/operasyon/fiyat-listesi');
    revalidatePath('/admin/operasyon/urunler');
    return { success: true, message: 'Ürün başarıyla silindi.' };
}

export async function guncelleUrunGorunurluk(urunId: string, yeniDurum: Tables<'urunler'>['Row']['gorunurluk']) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Yetkisiz işlem.' };

    const { error } = await supabase.from('urunler').update({ gorunurluk: yeniDurum }).eq('id', urunId);

    if (error) {
        console.error('Ürün görünürlük güncelleme hatası:', error);
        return { success: false, message: `Veritabanı hatası: ${error.message}` };
    }

    revalidatePath('/admin/operasyon/fiyat-listesi');
    revalidatePath('/admin/operasyon/urunler');
    return { success: true, message: 'Görünürlük başarıyla güncellendi.' };
}



// Sadece saveUrun fonksiyonunu güncelliyoru

// saveUrun fonksiyonu calisiyor ama veritabanina kayit yapmiyor. Duzenleme butonu ile yeni veri ekleyince kayit etmiyor. simdi yeni ürün ekle diyerek kayit etmeyi denedim, "veritabani hatasi: new violates row-level security policy for table "urunler" hatasi verdi
export async function saveUrun(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Yetkilendirme hatası.' };

  const urunId = formData.get('urunId') as string | null;

  const safeParseFloat = (val: FormDataEntryValue | null) => (val !== null && String(val).trim() !== '') ? parseFloat(String(val).replace(',', '.')) : null;
  const safeParseInt = (val: FormDataEntryValue | null) => (val !== null && String(val).trim() !== '') ? parseInt(String(val), 10) : null;

  const teknikOzellikler: { [key: string]: any } = {};
  for (const [key, value] of formData.entries()) {
      if (key.startsWith('teknik_') && value) {
          const ozellikAdi = key.replace('teknik_', '');
          teknikOzellikler[ozellikAdi] = value;
      }
  }

  const urunData = {
    // Önceki adımlardaki tüm alanlar...
    urun_kodu: formData.get('urun_kodu') as string || null,
    barkod: formData.get('barkod') as string || null,
    urun_adi: { de: formData.get('urun_adi_de'), en: formData.get('urun_adi_en'), tr: formData.get('urun_adi_tr'), ar: formData.get('urun_adi_ar') },
    aciklama: { de: formData.get('aciklama_de') },
    alis_fiyati: safeParseFloat(formData.get('alis_fiyati')) ?? 0,
    liste_fiyati_kutu: safeParseFloat(formData.get('liste_fiyati_kutu')),
    distributor_fiyati_kutu: safeParseFloat(formData.get('distributor_fiyati_kutu')),
    stok_adeti: safeParseInt(formData.get('stok_adeti')) ?? 0,
    kutu_ici_adet: safeParseInt(formData.get('kutu_ici_adet')),
    kategori_id: formData.get('kategori_id') as string || null,
    pesin_fiyat: safeParseFloat(formData.get('pesin_fiyat')),
    stok_kritik_esik: safeParseInt(formData.get('stok_kritik_esik')) ?? 0,
    tedarikci_id: formData.get('tedarikci_id') as string || null,
    gramaj: safeParseInt(formData.get('gramaj')),
    koli_ici_kutu_adet: safeParseInt(formData.get('koli_ici_kutu_adet')),
    gorunurluk: formData.get('gorunurluk') as Enums<'urun_gorunurluk'>,
    teknik_ozellikler: teknikOzellikler,
    temel_satis_fiyati: safeParseFloat(formData.get('temel_satis_fiyati')) ?? 0, 
    hedef_kar_marji: safeParseFloat(formData.get('hedef_kar_marji')) ?? 0,
    
    // ## DÜZELTME: SQL SORGUSUNDA ÇIKAN EKSİK ZORUNLU ALANLARI EKLİYORUZ ##
    ek_maliyetler: {}, // Varsayılan olarak boş bir JSON objesi gönderiyoruz.
    stok_azaldi_esigi: safeParseInt(formData.get('stok_azaldi_esigi')) ?? 10,
    stok_bitti_esigi: safeParseInt(formData.get('stok_bitti_esigi')) ?? 0,
  };

  let error;
  if (urunId) {
    ({ error } = await supabase.from('urunler').update(urunData).eq('id', urunId));
  } else {
    // Yeni ürün ekleme mantığını da düzeltiyoruz
    const { data: insertedData, error: insertError } = await supabase.from('urunler').insert(urunData).select().single();
    error = insertError;
  }
  
  if (error) {
    console.error("Supabase Kaydetme Hatası:", error);
    return { success: false, message: `Veritabanı hatası: ${error.message}` };
  }

  revalidatePath('/admin/operasyon/urunler');
  if (urunId) revalidatePath(`/admin/operasyon/urunler/${urunId}`);

  return { success: true, message: `Ürün başarıyla ${urunId ? 'güncellendi' : 'oluşturuldu'}.` };
}
