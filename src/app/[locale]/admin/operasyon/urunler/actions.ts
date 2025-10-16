// src/app/admin/operasyon/urunler/actions.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Tables } from '@/lib/supabase/database.types';
import { SupabaseClient } from '@supabase/supabase-js';

type UrunUpdate = Partial<Tables<'urunler'>>;
const diller = ['de', 'en', 'tr', 'ar'];

async function findUniqueSlug(
    supabase: SupabaseClient, 
    baseSlug: string, 
    excludeId?: string
): Promise<string> {
    let currentSlug = baseSlug;
    let counter = 2;
    while (true) {
        let query = supabase.from('urunler').select('id').eq('slug', currentSlug).single();
        if (excludeId) {
            query = query.neq('id', excludeId);
        }
        const { data: existingProduct } = await query;
        if (!existingProduct) {
            return currentSlug;
        } else {
            currentSlug = `${baseSlug}-${counter}`;
            counter++;
        }
    }
}

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
        slug: formData.get('slug') as string,
        stok_miktari: parseInt(formData.get('stok_miktari') as string || '0', 10),
        stok_esigi: parseInt(formData.get('stok_esigi') as string || '0', 10),
        ana_satis_birimi_id: (formData.get('ana_satis_birimi_id') as string) || null,
        distributor_alis_fiyati: parseFloat(formData.get('distributor_alis_fiyati') as string || '0'),
        satis_fiyati_musteri: parseFloat(formData.get('satis_fiyati_musteri') as string || '0'),
        satis_fiyati_alt_bayi: parseFloat(formData.get('satis_fiyati_alt_bayi') as string || '0'),
        aktif: formData.get('aktif') === 'on',
        ana_resim_url: (formData.get('ana_resim_url') as string) || null,
        galeri_resim_urls: formData.getAll('galeri_resim_urls[]') as string[],
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

export async function updateUrunAction(urunId: string, formData: FormData) {
  const supabase = createSupabaseServerClient();
  const guncellenecekVeri = formDataToUrunObject(formData);
  delete guncellenecekVeri.kategori_id; 

  if (guncellenecekVeri.slug) {
      guncellenecekVeri.slug = await findUniqueSlug(supabase, guncellenecekVeri.slug, urunId);
  }

  const { error } = await supabase
    .from('urunler')
    .update(guncellenecekVeri)
    .eq('id', urunId);

  if (error) {
    return { success: false, message: 'Ürün güncellenirken bir hata oluştu: ' + error.message };
  }
  revalidatePath(`/admin/operasyon/urunler`);
  revalidatePath(`/admin/operasyon/urunler/${urunId}`);
  revalidatePath('/[locale]/products', 'layout');
  return { success: true, message: 'Ürün başarıyla güncellendi!' };
}

export async function createUrunAction(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const yeniVeri = formDataToUrunObject(formData);
  
  if (!yeniVeri.kategori_id || !yeniVeri.ana_satis_birimi_id) {
    return { success: false, message: 'Lütfen Kategori ve Ana Satış Birimi seçin.' };
  }
  if (!yeniVeri.slug) {
    return { success: false, message: 'URL (Slug) alanı zorunludur.' };
  }

  yeniVeri.slug = await findUniqueSlug(supabase, yeniVeri.slug);

  const { error } = await supabase.from('urunler').insert(yeniVeri as Tables<'urunler'>);

  if (error) {
    return { success: false, message: 'Ürün oluşturulurken bir hata oluştu: ' + error.message };
  }
  revalidatePath('/admin/operasyon/urunler');
  revalidatePath('/[locale]/products', 'layout');
  return { success: true, message: 'Ürün başarıyla oluşturuldu!' };
}

export async function deleteUrunAction(urunId: string) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from('urunler').delete().eq('id', urunId);

    if (error) {
        if (error.code === '23503') {
            return { success: false, message: 'Bu ürün bir siparişe bağlı olduğu için silinemez.' };
        }
        return { success: false, message: 'Ürün silinirken bir hata oluştu: ' + error.message };
    }

    revalidatePath('/admin/operasyon/urunler');
    revalidatePath('/[locale]/products', 'layout');
    return { success: true, message: 'Ürün başarıyla silindi.' };
}