// src/app/actions/yeni-urun-actions.ts
// KORRIGIERTE VERSION (await cookies + await createClient in allen Funktionen)
'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Tables, TablesInsert, Enums, Database } from "@/lib/supabase/database.types"; // Database hinzugefügt
import { redirect } from "next/navigation";
import { sendNotification } from '@/lib/notificationUtils';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { SupabaseClient } from "@supabase/supabase-js"; // Typ importieren

// Typ für den Rückgabewert (unverändert)
export type YeniUrunFormState = {
    success: boolean;
    message: string;
    error?: string; // error-Feld hinzugefügt
} | null;

// Typ für Rückgabewert (allgemeiner)
type ActionResult = {
    success: boolean;
    message?: string;
    error?: string;
};

// Hilfsfunktion für Benachrichtigungen (benötigt Supabase Client)
// Diese Funktion muss hier nicht definiert werden, wenn sie in notificationUtils liegt
// async function sendNotification(...) { ... }


export async function createYeniUrunTalepAction(
    prevState: YeniUrunFormState,
    formData: FormData
): Promise<YeniUrunFormState> {

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) return { success: false, message: "Nicht authentifiziert." };

    const { data: profile } = await supabase.from('profiller').select('firma_id').eq('id', user.id).single();
    if (!profile || !profile.firma_id) return { success: false, message: "Keine zugehörige Firma gefunden." };

    // Formulardaten abrufen
    const produkt_name = formData.get('produkt_name') as string;
    const kategorie_vorschlag = formData.get('kategorie_vorschlag') as string;
    const beschreibung = formData.get('beschreibung') as string;
    const referenz_link_gorsel = formData.get('referenz_link_gorsel') as string;
    const geschaetzte_menge_pro_woche = parseInt(formData.get('geschaetzte_menge_pro_woche') as string, 10) || null;

    if (!produkt_name || !beschreibung) return { success: false, message: "Produktname und Beschreibung sind Pflichtfelder." };

    const insertData: TablesInsert<'yeni_urun_talepleri'> = {
        firma_id: profile.firma_id,
        olusturan_kullanici_id: user.id,
        produkt_name,
        kategorie_vorschlag: kategorie_vorschlag || null,
        beschreibung,
        referenz_link_gorsel: referenz_link_gorsel || null,
        geschaetzte_menge_pro_woche: geschaetzte_menge_pro_woche,
        status: 'Yeni'
    };

    // Einfügen und ID holen
    const { error, data: insertedData } = await supabase
        .from('yeni_urun_talepleri')
        .insert(insertData)
        .select('id')
        .single();


    if (error) {
        console.error("Fehler beim Erstellen der Produktanfrage:", error);
        return { success: false, message: "Fehler: Anfrage konnte nicht gespeichert werden." };
    }

    const newTalepId = insertedData?.id;

    // --- Benachrichtigung an Admins senden ---
    const { data: firmaData } = await supabase.from('firmalar').select('unvan').eq('id', profile.firma_id).single();
    const firmaAdi = firmaData?.unvan || `Firma ID: ${profile.firma_id.substring(0, 8)}...`;
    const bildirimMesaj = `${firmaAdi}, "${produkt_name}" için yeni bir ürün talebinde bulundu.`;
    // Pfad anpassen an Ihre Admin-Struktur
    const bildirimLink = newTalepId ? `/admin/urun-yonetimi/urun-talepleri?q=${newTalepId}` : '/admin/urun-yonetimi/urun-talepleri';
    await sendNotification({
        aliciRol: ['Yönetici', 'Ekip Üyesi'],
        icerik: bildirimMesaj,
        link: bildirimLink,
        supabaseClient: supabase // Mevcut client'ı kullan
    });
    // --- Benachrichtigung Ende ---

    revalidatePath('/portal/taleplerim');
    revalidatePath('/admin/urun-yonetimi/urun-talepleri'); // Admin-Seite Pfad angepasst

    return { success: true, message: "Vielen Dank! Ihre Produktanfrage wurde erfolgreich übermittelt." };
}

export async function partnerDeleteUrunTalepAction(
    anfrageId: string
): Promise<YeniUrunFormState> { // Typ angepasst

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) return { success: false, message: "Nicht authentifiziert." };

     // Optional: Vor dem Löschen Infos für Benachrichtigung holen
     // (Stellen Sie sicher, dass RLS SELECT für den Benutzer erlaubt)
     const { data: talepData } = await supabase
        .from('yeni_urun_talepleri')
        .select('id, firma_id, produkt_name, firmalar(unvan)')
        .eq('id', anfrageId)
        .single();

    // Löschen (RLS sollte sicherstellen, dass nur eigene gelöscht werden)
    const { error } = await supabase
        .from('yeni_urun_talepleri')
        .delete()
        .eq('id', anfrageId);
        // RLS-Policy in Supabase: ... WHERE firma_id = (SELECT firma_id FROM profiller WHERE id = auth.uid())

    if (error) {
        console.error("Fehler beim Löschen der Produktanfrage:", error);
        return { success: false, message: "Anfrage konnte nicht gelöscht werden." };
    }

    // --- Benachrichtigung an Admins senden (Optional) ---
    if (talepData) {
        const firmaAdi = (talepData as any).firmalar?.unvan || 'Ein Partner'; // Typ-Cast, da Join
        const productName = talepData.produkt_name || 'ein Produkt';
        const bildirimMesaj = `${firmaAdi} hat die Produktanfrage für "${productName}" gelöscht.`;
        await sendNotification({
            aliciRol: ['Yönetici', 'Ekip Üyesi'],
            icerik: bildirimMesaj,
            supabaseClient: supabase
        });
    }
    // --- Benachrichtigung Ende ---

    revalidatePath('/portal/taleplerim');
    revalidatePath('/admin/urun-yonetimi/urun-talepleri'); // Admin-Seite Pfad angepasst

    return { success: true, message: "Produktanfrage erfolgreich gelöscht." };
}


export async function updateYeniUrunTalepAction(
    talepId: string,
    prevState: YeniUrunFormState,
    formData: FormData
): Promise<YeniUrunFormState> {
    
    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---
    
     const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
     if (!user) return { success: false, message: "Nicht authentifiziert." };

     // ... (Restliche Logik für Partner-Update)
     // Annahme: Partner aktualisiert nur eigene Daten, RLS prüft dies.
     // ...

     revalidatePath('/portal/taleplerim');
     return { success: true, message: "Anfrage erfolgreich aktualisiert." };
}

// Admin aktualisiert Status/Notiz
export async function adminUpdateUrunTalepAction(
    talepId: string,
    formData: FormData
): Promise<ActionResult> { // Allgemeineren Typ verwenden

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) return { success: false, message: "Nicht authentifiziert.", error: "Nicht authentifiziert." };
    
    // Optional: Rollenprüfung (nur Admin/Team darf dies tun)
    // const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    // if (profile?.rol !== 'Yönetici' && profile?.rol !== 'Ekip Üyesi') {
    //     return { success: false, error: "Keine Berechtigung." };
    // }

    const neuerStatus = formData.get('status') as Enums<'urun_talep_durumu'>;
    const adminNotu = formData.get('admin_notu') as string | null; // Erlaube null

    if (!neuerStatus) return { success: false, message: "Status ist ein Pflichtfeld.", error: "Status ist ein Pflichtfeld." };

    // Infos für Benachrichtigung holen
    const { data: talepData, error: fetchError } = await supabase
        .from('yeni_urun_talepleri')
        .select('id, firma_id, produkt_name')
        .eq('id', talepId)
        .single();

    if (fetchError || !talepData || !talepData.firma_id) {
         console.error("Zu aktualisierende Produktanfrage nicht gefunden oder Firma-ID fehlt:", fetchError);
         // Nicht abbrechen, Update trotzdem versuchen
    }
    const productName = talepData?.produkt_name || 'Ihre Produktanfrage';


    // Status aktualisieren
    const { error: updateError } = await supabase
        .from('yeni_urun_talepleri')
        .update({
            status: neuerStatus,
            admin_notu: adminNotu || null // Stelle sicher, dass null übergeben wird, wenn leer
        })
        .eq('id', talepId);

    if (updateError) {
        console.error("Fehler beim Admin-Update der Produktanfrage:", updateError);
        return { success: false, message: "Update fehlgeschlagen: " + updateError.message, error: "Update fehlgeschlagen: " + updateError.message };
    }

    // --- Benachrichtigung an Partner senden ---
    if (talepData && talepData.firma_id) {
        const bildirimMesaj = `Ihre Produktanfrage für "${productName}" wurde aktualisiert. Neuer Status: ${neuerStatus}.`;
        const bildirimLink = `/portal/taleplerim`; // Link zur Übersichtsseite
        await sendNotification({
            aliciFirmaId: talepData.firma_id,
            icerik: bildirimMesaj,
            link: bildirimLink,
            supabaseClient: supabase
        });
    }
    // --- Benachrichtigung Ende ---

    // Cache revalidieren
    revalidatePath('/admin/urun-yonetimi/urun-talepleri'); // Admin-Seite Pfad angepasst
    revalidatePath('/portal/taleplerim');

    return { success: true, message: "Anfragestatus erfolgreich aktualisiert." };
}