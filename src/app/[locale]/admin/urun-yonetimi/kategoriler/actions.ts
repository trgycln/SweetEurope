// src/app/[locale]/admin/urun-yonetimi/kategoriler/actions.ts
// KORRIGIERTE VERSION (await cookies + await createClient in allen Funktionen)

'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Tables, TablesInsert } from '@/lib/supabase/database.types'; // TablesInsert eklendi
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { redirect } from 'next/navigation'; // Redirect importieren

const diller = ['de', 'en', 'tr', 'ar']; // Dill listesi
const revalidatePage = () => revalidatePath('/admin/urun-yonetimi/kategoriler'); // Revalidate fonksiyonu

// Dönecek cevap tipi
type ActionResult = {
    success: boolean;
    message: string;
    error?: string; // Hata mesajı için
};

// YENİ KATEGORİ OLUŞTURAN ACTION
export async function createKategoriAction(formData: FormData): Promise<ActionResult> {
    
    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // Kullanıcı kontrolü
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "Yetkisiz işlem.", error: "Nicht authentifiziert." };
    }
    // Optional: Rol kontrolü (Sadece Admin?)
    // const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    // if (profile?.rol !== 'Yönetici') {
    //     return { success: false, message: "Bu işlem için yetkiniz yok.", error: "Keine Berechtigung." };
    // }

    // Form verilerini al
    const adJson: { [key: string]: string } = {};
    diller.forEach(dil => {
        adJson[dil] = formData.get(`ad_${dil}`) as string || '';
    });
    const ustKategoriId = (formData.get('ust_kategori_id') as string) || null;

    // Türkçe ad zorunlu mu kontrolü
    if (!adJson.tr) { // Veya 'de' ? Hangi dil ana diliniz?
        return { success: false, message: 'Kategori için ana dil (örn: Türkçe) ad zorunludur.', error: 'Hauptsprachenname (z.B. Türkisch) ist erforderlich.' };
    }

    // Veritabanına ekle
    const insertData: TablesInsert<'kategoriler'> = {
        ad: adJson,
        ust_kategori_id: ustKategoriId === 'root' ? null : ustKategoriId // 'root' ise null kaydet
    };

    const { error } = await supabase.from('kategoriler').insert(insertData);

    if (error) {
        console.error("Kategori oluşturma hatası:", error);
        return { success: false, message: 'Kategori oluşturulurken bir hata oluştu: ' + error.message, error: error.message };
    }

    revalidatePage();
    return { success: true, message: 'Yeni kategori başarıyla oluşturuldu.' };
}

// KATEGORİYİ GÜNCELLEYEN ACTION
export async function updateKategoriAction(kategoriId: string, formData: FormData): Promise<ActionResult> {
    
    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // Kullanıcı kontrolü
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "Yetkisiz işlem.", error: "Nicht authentifiziert." };
    }
    // Optional: Rol kontrolü
    // ...

    // Form verilerini al
    const adJson: { [key: string]: string } = {};
    diller.forEach(dil => {
        adJson[dil] = formData.get(`ad_${dil}`) as string || '';
    });
    const ustKategoriId = (formData.get('ust_kategori_id') as string) || null;
    
    if (!adJson.tr) { // Ana dil kontrolü
        return { success: false, message: 'Kategori için Türkçe ad zorunludur.', error: 'Hauptsprachenname (z.B. Türkisch) ist erforderlich.' };
    }

    // Güncelleme verisi
    const updateData: Partial<Tables<'kategoriler'>> = {
         ad: adJson,
         ust_kategori_id: ustKategoriId === 'root' ? null : ustKategoriId
    };

    // Veritabanını güncelle
    const { error } = await supabase
        .from('kategoriler')
        .update(updateData)
        .eq('id', kategoriId);

    if (error) {
        console.error("Kategori güncelleme hatası:", error);
        return { success: false, message: 'Kategori güncellenirken bir hata oluştu: ' + error.message, error: error.message };
    }

    revalidatePage();
    return { success: true, message: 'Kategori başarıyla güncellendi.' };
}

// KATEGORİYİ SİLEN ACTION
export async function deleteKategoriAction(kategoriId: string): Promise<ActionResult> {
    
    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // Kullanıcı kontrolü
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "Yetkisiz işlem.", error: "Nicht authentifiziert." };
    }
    // Optional: Rol kontrolü
    // ...

    // Silme işlemi
    const { error } = await supabase.from('kategoriler').delete().eq('id', kategoriId);

    if (error) {
        console.error("Kategori silme hatası:", error);
        // Foreign key hatasını yakala (bu kategoriye bağlı ürünler var)
        if (error.code === '23503') { 
            return { success: false, message: 'Bu kategoriye bağlı ürünler veya alt kategoriler olduğu için silinemez.', error: 'Kategorie kann nicht gelöscht werden, da Produkte oder Unterkategorien damit verknüpft sind.' };
        }
        return { success: false, message: 'Kategori silinirken bir hata oluştu: ' + error.message, error: error.message };
    }

    revalidatePage();
    return { success: true, message: 'Kategori başarıyla silindi.' };
}