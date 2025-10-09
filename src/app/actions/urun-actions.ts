// src/app/actions/urun-actions.ts
'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function processDynamicFields(formData: FormData): Record<string, any> {
    const dynamicFields: Record<string, any> = {};
    for (const [key, value] of formData.entries()) {
        if (key.startsWith("teknik_")) {
            const fieldId = key.replace("teknik_", "");
            if (value) {
                dynamicFields[fieldId] = value;
            }
        }
    }
    return dynamicFields;
}

function getRawFormData(formData: FormData) {
    return {
        urun_kodu: formData.get('urun_kodu') as string,
        urun_adi: formData.get('urun_adi') as string,
        aciklama: formData.get('aciklama') as string,
        ana_kategori: formData.get('ana_kategori') as string,
        alt_kategori: formData.get('alt_kategori') as string,
        icindekiler_listesi: formData.get('icindekiler_listesi') as string,
        alerjen_listesi: formData.get('alerjen_listesi') as string,
        tedarikci_id: (formData.get('tedarikci_id') as string) || null,
        alis_fiyati: parseFloat(formData.get('alis_fiyati') as string),
        temel_satis_fiyati: parseFloat(formData.get('temel_satis_fiyati') as string),
        hedef_kar_marji: parseFloat(formData.get('hedef_kar_marji') as string),
        stok_adeti: parseInt(formData.get('stok_adeti') as string, 10),
        stok_azaldi_esigi: parseInt(formData.get('stok_azaldi_esigi') as string, 10),
        stok_bitti_esigi: parseInt(formData.get('stok_bitti_esigi') as string, 10),
    };
}

export async function yeniUrunEkleAction(formData: FormData) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkisiz işlem." };
    // ... (Diğer güvenlik kontrolleri)

    const rawFormData = getRawFormData(formData);
    const teknikOzellikler = processDynamicFields(formData);
    const images = formData.getAll('images') as File[];
    const imageUrls: string[] = [];

    for (const image of images) {
        if (image && image.size > 0) {
            const fileName = `public/${Date.now()}-${image.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage.from('urun-gorselleri').upload(fileName, image);
            if (uploadError) return { error: `Fotoğraf yüklenemedi: ${uploadError.message}` };
            const { data: urlData } = supabase.storage.from('urun-gorselleri').getPublicUrl(uploadData.path);
            imageUrls.push(urlData.publicUrl);
        }
    }

    const insertData: TablesInsert<'urunler'> = {
        ...rawFormData,
        teknik_ozellikler: teknikOzellikler,
        fotograf_url_listesi: imageUrls.length > 0 ? imageUrls : null,
        ek_maliyetler: {},
    };

    const { error: insertError } = await supabase.from('urunler').insert(insertData);
    if (insertError) return { error: `Veritabanı hatası: ${insertError.message}` };

    revalidatePath('/admin/operasyon/urunler');
    redirect('/admin/operasyon/urunler');
}

export async function urunGuncelleAction(urunId: string, formData: FormData) {
    const supabase = createSupabaseServerClient();
    // ... (Güvenlik kontrolleri)
    
    const { data: mevcutUrun } = await supabase.from('urunler').select('fotograf_url_listesi').eq('id', urunId).single();
    if (!mevcutUrun) return { error: "Güncellenecek ürün bulunamadı." };
    
    const rawFormData = getRawFormData(formData);
    const teknikOzellikler = processDynamicFields(formData);
    const updateData: TablesUpdate<'urunler'> = { ...rawFormData, teknik_ozellikler: teknikOzellikler };
    
    // ... (Dosya yükleme/silme mantığı öncekiyle aynı)
    
    const { error: updateError } = await supabase.from('urunler').update(updateData).eq('id', urunId);
    if (updateError) return { error: `Güncelleme hatası: ${updateError.message}` };
    
    revalidatePath('/admin/operasyon/urunler');
    revalidatePath(`/admin/operasyon/urunler/${urunId}`);
    return { success: true };
}