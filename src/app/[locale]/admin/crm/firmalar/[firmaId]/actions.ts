// src/app/[locale]/admin/crm/firmalar/[firmaId]/actions.ts
// KORRIGIERTE VERSION (await cookies + await createClient)

'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Enums, Tables } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";
import { sendNotification } from '@/lib/notificationUtils'; // Importieren
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren

type FirmaStatus = Enums<'firma_status'>;
type FirmaKategorie = Enums<'firma_kategori'>;

// Typ für Rückgabewert
type UpdateFirmaResult = {
    success: boolean;
    data?: Tables<'firmalar'>; // Nur bei Erfolg senden
    error?: string;
};

// Diese Server Action aktualisiert die Firmendaten
export async function updateFirmaAction(
    firmaId: string,
    oncekiStatus: FirmaStatus | null, // Kann auch null sein, falls vorher nicht gesetzt
    formData: FormData
): Promise<UpdateFirmaResult> {

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    // Benutzerprüfung
    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) return { success: false, error: "Nicht authentifiziert." }; // Fehlermeldung angepasst

    // --- Formulardaten sicher auslesen ---
    const unvan = formData.get('unvan') as string | null;
    const kategorie = formData.get('kategori') as FirmaKategorie | null;
    const yeniStatus = formData.get('status') as FirmaStatus | null;
    const adres = formData.get('adres') as string | null;
    const telefon = formData.get('telefon') as string | null;
    const email = formData.get('email') as string | null;
    const oncelik = formData.get('oncelik') as string | null;
    const instagram_url = formData.get('instagram_url') as string | null;
    const facebook_url = formData.get('facebook_url') as string | null;
    const web_url = formData.get('web_url') as string | null;
    const google_maps_url = formData.get('google_maps_url') as string | null;
    // Checkbox-Wert korrekt auslesen
    const referans_olarak_goster = formData.get('referans_olarak_goster') === 'on';

    // Einfache Validierung (Beispiel)
    if (!unvan) { // Status ist oft optional oder wird nicht immer geändert
        return { success: false, error: "Firmenname darf nicht leer sein." };
    }
    // Stellen Sie sicher, dass der Status gültig ist, falls er übergeben wurde
    const validStatusOptions: ReadonlyArray<FirmaStatus> = ["Aday", "Takipte", "Temas Kuruldu", "İletişimde", "Müşteri", "Pasif"];
    if (yeniStatus && !validStatusOptions.includes(yeniStatus)) {
         return { success: false, error: `Ungültiger Status: ${yeniStatus}` };
    }

    // Objekt für das Update erstellen
    const updatedData: Partial<Tables<'firmalar'>> = {};
    if (unvan) updatedData.unvan = unvan;
    if (kategorie) updatedData.kategori = kategorie; else updatedData.kategori = null; // Explizit null setzen, wenn leer
    if (yeniStatus) updatedData.status = yeniStatus;
    if (adres) updatedData.adres = adres; else updatedData.adres = null;
    if (telefon) updatedData.telefon = telefon; else updatedData.telefon = null;
    if (email) updatedData.email = email; else updatedData.email = null;
    if (oncelik) (updatedData as any).oncelik = oncelik; else (updatedData as any).oncelik = null;
    if (instagram_url) (updatedData as any).instagram_url = instagram_url; else (updatedData as any).instagram_url = null;
    if (facebook_url) (updatedData as any).facebook_url = facebook_url; else (updatedData as any).facebook_url = null;
    if (web_url) (updatedData as any).web_url = web_url; else (updatedData as any).web_url = null;
    if (google_maps_url) (updatedData as any).google_maps_url = google_maps_url; else (updatedData as any).google_maps_url = null;
    // Checkbox-Wert immer setzen (true oder false)
    updatedData.referans_olarak_goster = referans_olarak_goster;

    // --- Ab hier Logik für Update, Statusänderung und Benachrichtigung ---
    const promises = [];

    // 1. Update-Promise vorbereiten
    const updatePromise = supabase
        .from('firmalar')
        .update(updatedData)
        .eq('id', firmaId)
        .select() // Aktualisierte Daten zurückgeben
        .single();
    promises.push(updatePromise);

    // 2. Bei Statusänderung: Log und Benachrichtigung hinzufügen
    if (yeniStatus && yeniStatus !== oncekiStatus) {
        console.log(`Statusänderung erkannt für Firma ${firmaId}: ${oncekiStatus} -> ${yeniStatus}`);

        // a) Aktivität loggen (Namen der Spalten prüfen!)
        // Annahme: Ihre 'etkinlikler' Tabelle hat 'olusturan_personel_id', 'etkinlik_tipi', 'aciklama'
        const logPromise = supabase.from('etkinlikler').insert({
            firma_id: firmaId,
            olusturan_personel_id: user.id, // ID des eingeloggten Admin/Teammitglieds
            etkinlik_tipi: 'Not', // Oder einen spezifischen Typ 'Statusänderung'
            aciklama: `Status von '${oncekiStatus || 'Unbekannt'}' zu '${yeniStatus}' geändert.` // Text anpassen
        });
        promises.push(logPromise);

        // b) Partner benachrichtigen
        const bildirimMesaj = `Ihr Firmenstatus wurde zu "${yeniStatus}" geändert.`;
        const bildirimLink = `/portal/dashboard`; // Ziel-Link für den Partner
        // sendNotification direkt aufrufen
        promises.push(sendNotification({
            aliciFirmaId: firmaId, // ID der Firma, deren Benutzer benachrichtigt werden sollen
            icerik: bildirimMesaj,
            link: bildirimLink,
            supabaseClient: supabase // Übergeben Sie den bereits erstellten Client
        }));
    }

    // Alle Promises parallel ausführen
    try {
        const results = await Promise.all(promises);
        // Erstes Ergebnis ist das Update-Ergebnis
        const updateResult = results[0] as typeof updatePromise extends Promise<infer U> ? U : never;

        // Prüfen, ob das Haupt-Update fehlgeschlagen ist
        if (updateResult.error) {
            console.error("Fehler beim Firma-Update (DB):", updateResult.error);
            throw updateResult.error; // Fehler werfen, um ins catch zu springen
        }

        // Optional: Fehler beim Loggen oder Benachrichtigen prüfen und loggen
        if (yeniStatus && yeniStatus !== oncekiStatus) {
            if (results[1] && (results[1] as any).error) { // Prüfung auf Fehler im Log-Promise
                 console.warn(`Firma ${firmaId} aktualisiert, aber Aktivitätslog fehlgeschlagen:`, (results[1] as any).error);
            }
            if (results[2]) { // Prüfung auf Ergebnis des Benachrichtigungs-Promises
                 const notificationResult = results[2] as { success: boolean, error?: any };
                 if (!notificationResult.success) {
                     console.warn(`Firma ${firmaId} aktualisiert, aber Benachrichtigung fehlgeschlagen:`, notificationResult.error);
                 } else {
                     console.log(`Benachrichtigung für Firma ${firmaId} erfolgreich gesendet.`);
                 }
            }
        }

        // Relevante Pfade neu validieren, damit die UI die Änderungen zeigt
        revalidatePath('/admin/crm/firmalar'); // Liste neu laden
        revalidatePath(`/admin/crm/firmalar/${firmaId}`); // Detailseite neu laden
        if (yeniStatus && yeniStatus !== oncekiStatus) {
             revalidatePath(`/admin/crm/firmalar/${firmaId}/etkinlikler`); // Aktivitätenliste neu laden
        }
        // revalidatePath('/portal/dashboard'); // Ggf. für Partner relevant

        console.log(`Firma ${firmaId} erfolgreich aktualisiert.`);
        return { success: true, data: updateResult.data }; // Erfolg mit aktualisierten Daten zurückgeben

    } catch (error: any) {
        console.error("Fehler in updateFirmaAction Promise.all:", error);
        return { success: false, error: "Update fehlgeschlagen: " + error.message }; // Allgemeine Fehlermeldung
    }
}

// Firma silme (admin veya sahibi) server action
export async function deleteFirmaAction(
    firmaId: string,
    locale: string
): Promise<{ success: boolean; error?: string }> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Nicht authentifiziert.' };

    // Silme işlemi (RLS: sahibi olan kullanıcı silebilir; admin için ayrı politika gereklidir)
    const { error } = await supabase
        .from('firmalar')
        .delete()
        .eq('id', firmaId);

    if (error) {
        console.error('Firma silme hatası:', error);
        return { success: false, error: error.message };
    }

    // Listeyi yenile ve listeye dön
    revalidatePath(`/${locale}/admin/crm/firmalar`);
    // Not: Client tarafta redirect yerine router push kullanacağız; burada sadece revalidate yeterli
    return { success: true };
}