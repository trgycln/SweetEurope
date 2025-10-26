// src/app/[locale]/admin/pazarlama/materialien/yeni/actions.ts
// KORRIGIERTE VERSION (Bucket-Name angepasst)

'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { TablesInsert, Enums, Database } from '@/lib/supabase/database.types'; // Database importieren
import { v4 as uuidv4 } from 'uuid';
import { sendNotification } from '@/lib/notificationUtils';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importiert
import { SupabaseClient } from '@supabase/supabase-js'; // Typ importieren

export type UploadFormState = {
    success: boolean;
    message: string;
    errors?: Record<string, string>;
} | null;

export async function uploadMaterialAction(
    prevState: UploadFormState,
    formData: FormData
): Promise<UploadFormState> {

    // --- Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE ---

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: 'Nicht authentifiziert.' };
    }
    // Optional: Rollenprüfung
    // ...

    // Formulardaten auslesen
    const baslik = formData.get('baslik') as string;
    const aciklama = formData.get('aciklama') as string | null;
    const kategorie = formData.get('kategori') as Enums<'materyal_kategori'> | null;
    const hedef_kitle = formData.get('hedef_kitle') as Enums<'hedef_rol'> | null;
    const datei = formData.get('datei') as File | null;

    // Validierung
    if (!baslik || !kategorie || !hedef_kitle) {
         return { success: false, message: 'Fehler: Titel, Kategorie und Zielgruppe sind Pflichtfelder.' };
    }
    if (!datei || datei.size === 0) {
         return { success: false, message: 'Fehler: Es muss eine Datei ausgewählt werden.' };
    }
    if (datei.size > 10 * 1024 * 1024) { // Beispiel: max 10MB
         return { success: false, message: 'Fehler: Datei ist zu groß (max. 10MB).' };
    }


    // Dateiupload
    const fileExtension = datei.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    
    // --- KORREKTUR HIER ---
    // Der Bucket-Name in Ihrem Supabase-Screenshot ist 'marketing-materialien'
    const bucketName = 'marketing-materialien'; 
    // --- ENDE KORREKTUR ---
    
    // Der Pfad sollte relativ zum Bucket-Root sein
    const filePath = `${uniqueFileName}`; // z.B. 123e4567-e89b-12d3-a456-426614174000.pdf
    // Oder wenn Sie Unterordner im Bucket haben (wie im Screenshot 'marketing-materialien/'):
    // const filePath = `marketing-materialien/${uniqueFileName}`; // Prüfen Sie Ihre Bucket-Struktur

    console.log(`Versuche Upload nach: ${bucketName}/${filePath}`);

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, datei);

    if (uploadError) {
        console.error("Fehler beim Datei-Upload:", uploadError);
        if (uploadError.message.includes('Bucket not found')) {
             return { success: false, message: `Fehler: Storage-Bucket "${bucketName}" nicht gefunden.` };
        }
        return { success: false, message: `Fehler beim Datei-Upload: ${uploadError.message}` };
    }

    console.log("Upload erfolgreich:", uploadData.path);

    // Public URL abrufen
    const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(uploadData.path); // Verwende den zurückgegebenen Pfad

    if (!publicUrlData || !publicUrlData.publicUrl) {
        console.error("Fehler beim Abrufen der Public URL.");
        await supabase.storage.from(bucketName).remove([filePath]); // Upload zurückrollen
        return { success: false, message: 'Fehler beim Abrufen der Datei-URL.' };
    }

    // Metadaten für DB (Tabellenname aus Ihrem Screenshot {7BBE6BB6...}.png)
    const insertData: TablesInsert<'pazarlama_materyalleri'> = {
        baslik: baslik,
        aciklama: aciklama || null,
        kategori: kategorie,
        hedef_kitle: hedef_kitle,
        dosya_url: publicUrlData.publicUrl,
        dosya_adi: datei.name,
        dosya_boyutu_kb: Math.round(datei.size / 1024),
        // olusturan_id: user.id, // Falls Ihre Tabelle diese Spalte hat
    };

    // Metadaten in DB einfügen
    const { error: insertError, data: insertedData } = await supabase
        .from('pazarlama_materyalleri') // Korrekter Tabellenname
        .insert(insertData)
        .select('id')
        .single();


    if (insertError) {
        console.error('Fehler beim Speichern der Material-Metadaten:', insertError);
        await supabase.storage.from(bucketName).remove([filePath]); // Upload zurückrollen
        return { success: false, message: 'Datenbankfehler: Material-Informationen konnten nicht gespeichert werden.' };
    }

    const newMaterialId = insertedData.id;
    console.log(`Material ${newMaterialId} erfolgreich in DB gespeichert.`);

    // --- Benachrichtigung Senden ---
    try {
        const bildirimMesaj = `Neues Marketingmaterial verfügbar: "${baslik}"`;
        const bildirimLink = `/portal/materialien`;

        let notificationTarget: { aliciRol?: Enums<'user_role'> | Enums<'user_role'>[] } = {};
        if (hedef_kitle === 'Tüm Partnerler') {
            notificationTarget = { aliciRol: ['Müşteri', 'Alt Bayi'] };
        } else if (hedef_kitle === 'Sadece Alt Bayiler') {
            notificationTarget = { aliciRol: 'Alt Bayi' };
        }

        if (notificationTarget.aliciRol) {
            await sendNotification({
                ...notificationTarget,
                icerik: bildirimMesaj,
                link: bildirimLink,
                supabaseClient: supabase // Client übergeben
            });
        }
    } catch (notifyError) {
         console.error("Fehler beim Senden der Benachrichtigung für Material:", notifyError);
    }
    // --- Benachrichtigung Ende ---

    // Cache revalidieren
    revalidatePath('/admin/pazarlama/materialien');
    revalidatePath('/portal/dashboard');
    revalidatePath('/portal/materialien');

    return { success: true, message: 'Marketingmaterial erfolgreich hochgeladen und gespeichert!' };
}