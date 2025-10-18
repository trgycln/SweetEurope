'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { TablesInsert, Enums } from '@/lib/supabase/database.types';
import { v4 as uuidv4 } from 'uuid';

export type UploadFormState = {
    success: boolean;
    message: string;
    errors?: Record<string, string>;
} | null;

export async function uploadMaterialAction(
    prevState: UploadFormState,
    formData: FormData
): Promise<UploadFormState> {
    const supabase = createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: 'Nicht authentifiziert.' };
    }

    const baslik = formData.get('baslik') as string;
    const aciklama = formData.get('aciklama') as string | null;
    const kategorie = formData.get('kategori') as Enums<'materyal_kategori'>; // Variable wird hier definiert
    const hedef_kitle = formData.get('hedef_kitle') as Enums<'hedef_rol'>; // Variable wird hier definiert
    const datei = formData.get('datei') as File | null;

    if (!baslik || !kategorie || !hedef_kitle) {
        return { success: false, message: 'Fehler: Titel, Kategorie und Zielgruppe sind Pflichtfelder.' };
    }
    if (!datei || datei.size === 0) {
        return { success: false, message: 'Fehler: Bitte wählen Sie eine Datei zum Hochladen aus.' };
    }

    const fileExtension = datei.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `marketing-materialien/${uniqueFileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('marketing-materialien')
        .upload(filePath, datei);

    if (uploadError) {
        console.error('Fehler beim Datei-Upload:', uploadError);
        return { success: false, message: `Fehler beim Hochladen der Datei: ${uploadError.message}` };
    }

    const { data: publicUrlData } = supabase.storage
        .from('marketing-materialien')
        .getPublicUrl(uploadData.path);

    if (!publicUrlData || !publicUrlData.publicUrl) {
         console.error('Fehler beim Abrufen der öffentlichen URL');
         await supabase.storage.from('marketing-materialien').remove([filePath]);
         return { success: false, message: 'Fehler: Datei hochgeladen, aber URL konnte nicht abgerufen werden.' };
    }

    // KORREKTUR: Explizite Zuweisung statt Kurzschreibweise
    const insertData: TablesInsert<'pazarlama_materyalleri'> = {
        baslik: baslik,
        aciklama: aciklama || null,
        kategori: kategorie, // Explizit zugewiesen
        hedef_kitle: hedef_kitle, // Explizit zugewiesen
        dosya_url: publicUrlData.publicUrl,
        dosya_adi: datei.name,
        dosya_boyutu_kb: Math.round(datei.size / 1024),
    };

    const { error: insertError } = await supabase.from('pazarlama_materyalleri').insert(insertData);

    if (insertError) {
        console.error('Fehler beim Speichern der Material-Metadaten:', insertError);
        await supabase.storage.from('marketing-materialien').remove([filePath]);
        return { success: false, message: 'Datenbankfehler: Material-Informationen konnten nicht gespeichert werden.' };
    }

    revalidatePath('/admin/pazarlama/materialien');

    return { success: true, message: 'Marketingmaterial erfolgreich hochgeladen und gespeichert!' };
}