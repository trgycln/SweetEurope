// src/app/admin/urun-yonetimi/kategoriler/actions.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Tables } from '@/lib/supabase/database.types';

const diller = ['de', 'en', 'tr', 'ar'];
const revalidatePage = () => revalidatePath('/admin/urun-yonetimi/kategoriler');

// YENİ KATEGORİ OLUŞTURAN ACTION
export async function createKategoriAction(formData: FormData) {
    const supabase = createSupabaseServerClient();
    const adJson: { [key: string]: string } = {};
    diller.forEach(dil => {
        adJson[dil] = formData.get(`ad_${dil}`) as string || '';
    });
    const ustKategoriId = (formData.get('ust_kategori_id') as string) || null;
    if (!adJson.tr) {
        return { success: false, message: 'Kategori için Türkçe ad zorunludur.' };
    }
    const { error } = await supabase.from('kategoriler').insert({ ad: adJson, ust_kategori_id: ustKategoriId });
    if (error) {
        console.error("Kategori oluşturma hatası:", error);
        return { success: false, message: 'Kategori oluşturulurken bir hata oluştu: ' + error.message };
    }
    revalidatePage();
    return { success: true, message: 'Yeni kategori başarıyla oluşturuldu.' };
}

// YENİ: KATEGORİYİ GÜNCELLEYEN ACTION
export async function updateKategoriAction(kategoriId: string, formData: FormData) {
    const supabase = createSupabaseServerClient();
    const adJson: { [key: string]: string } = {};
    diller.forEach(dil => {
        adJson[dil] = formData.get(`ad_${dil}`) as string || '';
    });
    const ustKategoriId = (formData.get('ust_kategori_id') as string) || null;
    if (!adJson.tr) {
        return { success: false, message: 'Kategori için Türkçe ad zorunludur.' };
    }
    const { error } = await supabase
        .from('kategoriler')
        .update({ ad: adJson, ust_kategori_id: ustKategoriId })
        .eq('id', kategoriId);
    if (error) {
        console.error("Kategori güncelleme hatası:", error);
        return { success: false, message: 'Kategori güncellenirken bir hata oluştu: ' + error.message };
    }
    revalidatePage();
    return { success: true, message: 'Kategori başarıyla güncellendi.' };
}

// YENİ: KATEGORİYİ SİLEN ACTION
export async function deleteKategoriAction(kategoriId: string) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from('kategoriler').delete().eq('id', kategoriId);
    if (error) {
        console.error("Kategori silme hatası:", error);
        // ÖNEMLİ NOT: Bu hata genellikle, silinmeye çalışılan kategoriye bağlı ürünler olduğu için oluşur.
        if (error.code === '23503') { // Foreign key violation
            return { success: false, message: 'Bu kategoriye bağlı ürünler olduğu için silinemez. Önce ilgili ürünleri başka bir kategoriye taşıyın veya silin.' };
        }
        return { success: false, message: 'Kategori silinirken bir hata oluştu: ' + error.message };
    }
    revalidatePage();
    return { success: true, message: 'Kategori başarıyla silindi.' };
}