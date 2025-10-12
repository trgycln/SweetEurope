'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Diese Hilfsfunktion ist in Ordnung, da sie den *aufgelösten* Supabase-Client erwartet.
const checkAdmin = async (supabase: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { authorized: false, message: 'Yetkisiz işlem.' };
    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    if (profile?.rol !== 'Yönetici') return { authorized: false, message: 'Bu işlemi yapma yetkiniz yok.' };
    return { authorized: true };
};

export async function saveKategori(formData: FormData) {
    // ## KORREKTUR: 'await' wurde hier hinzugefügt ##
    const supabase = await createSupabaseServerClient();
    
    const authCheck = await checkAdmin(supabase);
    if (!authCheck.authorized) return { success: false, message: authCheck.message };

    const id = formData.get('id') as string | null;
    
    const adData = {
        de: formData.get('ad_de') as string,
        en: formData.get('ad_en') as string,
        tr: formData.get('ad_tr') as string,
        ar: formData.get('ad_ar') as string,
    };

    const sablonDataString = formData.get('sablon_data') as string;
    let sablonJson = null;
    try {
        sablonJson = sablonDataString ? JSON.parse(sablonDataString) : null;
    } catch (e) {
        return { success: false, message: 'Teknik özellik şablonu formatı hatalı.' };
    }

    const dataToUpsert = { ad: adData, teknik_ozellik_sablonu: sablonJson };
    let error;

    if (id) {
        ({ error } = await supabase.from('kategoriler').update(dataToUpsert).eq('id', id));
    } else {
        ({ error } = await supabase.from('kategoriler').insert(dataToUpsert));
    }
    
    if (error) {
        return { success: false, message: `Veritabanı hatası: ${error.message}` };
    }

    revalidatePath('/admin/idari/kategoriler');
    return { success: true, message: `Kategorie erfolgreich ${id ? 'aktualisiert' : 'erstellt'}.` };
}

export async function deleteKategori(kategoriId: string) {
    // ## KORREKTUR: 'await' wurde auch hier hinzugefügt, um zukünftige Fehler zu vermeiden ##
    const supabase = await createSupabaseServerClient();
    
    const authCheck = await checkAdmin(supabase);
    if (!authCheck.authorized) return { success: false, message: authCheck.message };

    const { error } = await supabase.from('kategoriler').delete().eq('id', kategoriId);
    if (error) {
        return { success: false, message: `Veritabanı hatası: ${error.message}` };
    }

    revalidatePath('/admin/idari/kategoriler');
    return { success: true, message: 'Kategorie erfolgreich gelöscht.' };
}