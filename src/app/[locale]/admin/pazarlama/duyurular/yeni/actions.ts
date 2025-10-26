// src/app/[locale]/admin/pazarlama/duyurular/yeni/actions.ts
// KORRIGIERTE VERSION (await cookies + await createClient)

'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { TablesInsert, Enums, Database } from '@/lib/supabase/database.types'; // Database importieren
import { sendNotification } from '@/lib/notificationUtils';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { SupabaseClient } from '@supabase/supabase-js'; // Typ importieren

export type FormState = {
    success: boolean;
    message: string;
    errors?: Record<string, string>;
} | null;

export async function createDuyuruAction(
    prevState: FormState,
    formData: FormData
): Promise<FormState> {

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        return { success: false, message: 'Nicht authentifiziert.' };
    }
    
    // Optional: Rollenprüfung (nur Admin/Team darf dies tun)
    // const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    // if (profile?.rol !== 'Yönetici' && profile?.rol !== 'Ekip Üyesi') {
    //     return { success: false, message: "Keine Berechtigung." };
    // }

    // Formulardaten auslesen
    const baslik = formData.get('baslik') as string;
    const icerik = formData.get('icerik') as string | null;
    const hedef_kitle = formData.get('hedef_kitle') as Enums<'hedef_rol'> | null;
    const aktif = formData.get('aktif') === 'on';
    const yayin_tarihi_raw = formData.get('yayin_tarihi') as string | null;
    const bitis_tarihi_raw = formData.get('bitis_tarihi') as string | null;

    // Validierung
    if (!baslik || !hedef_kitle) {
        return { success: false, message: 'Fehler: Betreff und Zielgruppe sind Pflichtfelder.' };
    }

    // Daten für Insert vorbereiten
    const insertData: TablesInsert<'duyurular'> = {
        baslik,
        icerik: icerik || null,
        hedef_kitle,
        aktif,
        olusturan_id: user.id, // olusturan_id Spalte muss existieren!
        yayin_tarihi: yayin_tarihi_raw ? new Date(yayin_tarihi_raw).toISOString() : new Date().toISOString(),
        bitis_tarihi: bitis_tarihi_raw ? new Date(bitis_tarihi_raw).toISOString() : null,
    };

    const { error, data: insertedData } = await supabase
        .from('duyurular')
        .insert(insertData)
        .select('id') // ID holen für Link
        .single();


    if (error || !insertedData) {
        console.error('Fehler beim Erstellen der Ankündigung:', error);
        return { success: false, message: 'Datenbankfehler: Die Ankündigung konnte nicht gespeichert werden.' };
    }

    const newDuyuruId = insertedData.id;

    // --- Benachrichtigung Senden ---
    try {
        const bildirimMesaj = `Neue Ankündigung veröffentlicht: "${baslik}"`;
        const bildirimLink = `/portal/dashboard`; // Link zum Dashboard

        let notificationTarget: { aliciRol?: Enums<'user_role'> | Enums<'user_role'>[] } = {};
        if (hedef_kitle === 'Tüm Partnerler') {
            notificationTarget = { aliciRol: ['Müşteri', 'Alt Bayi'] };
        } else if (hedef_kitle === 'Sadece Alt Bayiler') {
            notificationTarget = { aliciRol: 'Alt Bayi' };
        }

        if (notificationTarget.aliciRol) {
            // sendNotification muss den Supabase Client nicht neu erstellen
            await sendNotification({
                ...notificationTarget,
                icerik: bildirimMesaj,
                link: bildirimLink,
                supabaseClient: supabase // Bereits initialisierten Client übergeben
            });
        }
    } catch (notifyError) {
         console.error("Fehler beim Senden der Benachrichtigung:", notifyError);
         // Nicht abbrechen, Ankündigung war erfolgreich
    }
    // --- Benachrichtigung Ende ---


    // Cache revalidieren
    revalidatePath('/admin/pazarlama/duyurular');
    revalidatePath('/portal/dashboard'); // Portal Dashboard aktualisieren

    return { success: true, message: 'Ankündigung erfolgreich gespeichert!' };
}