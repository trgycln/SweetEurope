// src/app/[locale]/admin/urun-yonetimi/kategoriler/actions.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Tables, TablesInsert } from '@/lib/supabase/database.types';
import { cookies } from 'next/headers';
import { slugify } from '@/lib/utils';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

const diller = ['de', 'en', 'tr', 'ar'];
const revalidatePage = () => revalidatePath('/admin/urun-yonetimi/kategoriler');

type ActionResult = {
    success: boolean;
    message: string;
    error?: string;
};

// YENİ KATEGORİ OLUŞTURAN ACTION
export async function createKategoriAction(formData: FormData): Promise<ActionResult> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) {
        return { success: false, message: "Yetkisiz işlem.", error: "Nicht authentifiziert." };
    }

    const adJson: { [key: string]: string } = {};
    diller.forEach(dil => {
        adJson[dil] = formData.get(`ad_${dil}`) as string || '';
    });
    const ustKategoriId = (formData.get('ust_kategori_id') as string) || null;
    const rawSlug = (formData.get('slug') as string) || '';
    const _rawUrunGami = formData.getAll('urun_gami') as string[];
    const urunGami = _rawUrunGami.length > 0 ? _rawUrunGami : null;
    const finalSlug = slugify(rawSlug || adJson.en || adJson.de || adJson.tr || 'kategori') || null;

    if (!adJson.tr) {
        return { success: false, message: 'Kategori için ana dil (örn: Türkçe) ad zorunludur.', error: 'Hauptsprachenname (z.B. Türkisch) ist erforderlich.' };
    }

    const insertData: any = {
        ad: adJson,
        slug: finalSlug,
        urun_gami: urunGami,
        ust_kategori_id: ustKategoriId === 'root' ? null : ustKategoriId
    };

    let { error } = await supabase.from('kategoriler').insert(insertData);

    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('urun_gami'))) {
        const { urun_gami, ...fallbackData } = insertData;
        ({ error } = await supabase.from('kategoriler').insert(fallbackData));
    }

    if (error) {
        console.error("Kategori oluşturma hatası:", error);
        return { success: false, message: 'Kategori oluşturulurken bir hata oluştu: ' + error.message, error: error.message };
    }

    revalidatePage();
    return { success: true, message: 'Yeni kategori başarıyla oluşturuldu.' };
}

// KATEGORİYİ GÜNCELLEYEN ACTION
export async function updateKategoriAction(kategoriId: string, formData: FormData): Promise<ActionResult> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) {
        return { success: false, message: "Yetkisiz işlem.", error: "Nicht authentifiziert." };
    }

    const adJson: { [key: string]: string } = {};
    diller.forEach(dil => {
        adJson[dil] = formData.get(`ad_${dil}`) as string || '';
    });
    const ustKategoriId = (formData.get('ust_kategori_id') as string) || null;
    const rawSlug = (formData.get('slug') as string) || '';
    const _rawUrunGami = formData.getAll('urun_gami') as string[];
    const urunGami = _rawUrunGami.length > 0 ? _rawUrunGami : null;
    const finalSlug = slugify(rawSlug || adJson.en || adJson.de || adJson.tr || 'kategori') || null;

    if (!adJson.tr) {
        return { success: false, message: 'Kategori için Türkçe ad zorunludur.', error: 'Hauptsprachenname (z.B. Türkisch) ist erforderlich.' };
    }

    const updateData: any = {
        ad: adJson,
        slug: finalSlug,
        urun_gami: urunGami,
        ust_kategori_id: ustKategoriId === 'root' ? null : ustKategoriId
    };

    let { error } = await supabase
        .from('kategoriler')
        .update(updateData)
        .eq('id', kategoriId);

    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('urun_gami'))) {
        const { urun_gami, ...fallbackData } = updateData;
        ({ error } = await supabase
            .from('kategoriler')
            .update(fallbackData)
            .eq('id', kategoriId));
    }

    if (error) {
        console.error("Kategori güncelleme hatası:", error);
        return { success: false, message: 'Kategori güncellenirken bir hata oluştu: ' + error.message, error: error.message };
    }

    revalidatePage();
    return { success: true, message: 'Kategori başarıyla güncellendi.' };
}

// KATEGORİYİ SİLEN ACTION
export async function deleteKategoriAction(kategoriId: string): Promise<ActionResult> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) {
        return { success: false, message: "Yetkisiz işlem.", error: "Nicht authentifiziert." };
    }

    const { error } = await supabase.from('kategoriler').delete().eq('id', kategoriId);

    if (error) {
        console.error("Kategori silme hatası:", error);
        if (error.code === '23503') { 
            return { success: false, message: 'Bu kategoriye bağlı ürünler veya alt kategoriler olduğu için silinemez.', error: 'Kategorie kann nicht gelöscht werden, da Produkte oder Unterkategorien damit verknüpft sind.' };
        }
        return { success: false, message: 'Kategori silinirken bir hata oluştu: ' + error.message, error: error.message };
    }

    revalidatePage();
    return { success: true, message: 'Kategori başarıyla silindi.' };
}