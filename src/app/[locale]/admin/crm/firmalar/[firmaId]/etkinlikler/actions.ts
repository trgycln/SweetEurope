// src/app/[locale]/admin/crm/firmalar/[firmaId]/etkinlikler/actions.ts
// KORRIGIERTE VERSION (await cookies + await createClient)

'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Enums, Tables } from '@/lib/supabase/database.types'; // Tables importieren für Typisierung

// Typen definieren (optional, aber empfohlen)
type EtkinlikTipi = Enums<'etkinlik_tipi'>;
type EtkinlikInsert = Tables<'etkinlikler'>; // Korrekter Typ für Insert-Daten

// Rückgabetypen für Actions definieren
type ActionResult = {
    success: boolean;
    message?: string;
    error?: string;
    data?: Tables<'etkinlikler'>; // Optional: Daten zurückgeben
};


// Fügt eine neue Aktivität hinzu
export async function yeniEtkinlikEkleAction(
    firmaId: string,
    locale: string,
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> { // Rückgabetyp verwenden

    console.log("yeniEtkinlikEkleAction gestartet:", { firmaId, locale });

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // 1. Benutzer abrufen
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user) {
        console.error("Nicht authentifiziert in yeniEtkinlikEkleAction:", userError);
        // Redirect ist hier weniger sinnvoll, besser Fehler zurückgeben
        // return redirect('/login'); // Nicht empfohlen in Actions, die Daten zurückgeben
        return { success: false, error: "Nicht authentifiziert." };
    }

    // 2. Formulardaten abrufen und validieren
    const aciklama = formData.get('aciklama') as string | null;
    // Explizite Typumwandlung und Validierung für Enum
    const etkinlik_tipi_raw = formData.get('etkinlik_tipi');
    const etkinlik_tipi = etkinlik_tipi_raw as EtkinlikTipi | null; // Typumwandlung versuchen

    // Überprüfen, ob der Typ gültig ist (falls Sie Enum-Werte verwenden)
    // const validEtkinlikTipleri: ReadonlyArray<EtkinlikTipi> = ['Not', 'Telefon Görüşmesi', 'Toplantı', 'E-posta', 'Teklif']; // Oder aus Constants
    // if (!aciklama || !etkinlik_tipi || !validEtkinlikTipleri.includes(etkinlik_tipi)) {
    //     return { success: false, error: 'Beschreibung und gültiger Aktivitätstyp sind erforderlich.' }; // Fehlermeldung angepasst
    // }
    
    if (!aciklama || !etkinlik_tipi) {
        return { success: false, error: 'Beschreibung und Aktivitätstyp sind erforderlich.' };
    }

    // 3. Aktivität in die Datenbank einfügen
    const insertData: Partial<EtkinlikInsert> = { // Partial verwenden, da ID etc. nicht gesetzt werden
        firma_id: firmaId,
        olusturan_personel_id: user.id,
        aciklama: aciklama,
        etkinlik_tipi: etkinlik_tipi,
    };

    const { error: insertError } = await supabase.from('etkinlikler').insert(insertData);

    if (insertError) {
        console.error('Fehler beim Hinzufügen der Aktivität:', insertError);
        return { 
            success: false, 
            error: `Datenbankfehler: ${insertError.message} (${insertError.details || insertError.hint || ''})` 
        };
    }

    // 4. Cache für die betroffene Seite neu validieren
    revalidatePath(`/${locale}/admin/crm/firmalar/${firmaId}/etkinlikler`);

    console.log(`Neue Aktivität für Firma ${firmaId} erfolgreich hinzugefügt.`);
    return { success: true, message: 'Aktivität erfolgreich hinzugefügt.' }; // Meldung angepasst
}


// Aktualisiert eine vorhandene Aktivitätsnotiz
export async function updateEtkinlikAction(
    etkinlikId: string,
    formData: FormData
): Promise<ActionResult> { // Rückgabetyp verwenden

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // Benutzer abrufen
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
         return { success: false, error: "Nicht authentifiziert." };
    }

    // Formulardaten abrufen und validieren
    const aciklama = formData.get('aciklama') as string | null;
    if (!aciklama) {
        return { success: false, error: "Beschreibung darf nicht leer sein." };
    }

    // Zeitlimit für Updates definieren (z.B. 15 Minuten)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // Aktivität aktualisieren (nur eigene, kürzlich erstellte)
    const { data, error } = await supabase
        .from('etkinlikler')
        .update({ aciklama: aciklama })
        .eq('id', etkinlikId)
        .eq('olusturan_personel_id', user.id) // Nur der Ersteller darf ändern
        .gte('created_at', fifteenMinutesAgo) // Nur innerhalb des Zeitlimits
        .select() // Aktualisierte Daten zurückgeben
        .single(); // Erwartet genau ein Ergebnis

    if (error || !data) {
        console.error("Fehler beim Aktualisieren der Aktivität:", error);
        // Fehlerdetails geben Aufschluss, z.B. wenn kein Datensatz gefunden wurde (Zeitlimit überschritten)
        let errorMessage = "Update fehlgeschlagen.";
        if (error?.code === 'PGRST116') { // PostgREST Code für "Keine Zeilen zurückgegeben"
             errorMessage = "Update fehlgeschlagen. Zeitlimit überschritten oder keine Berechtigung.";
        } else if (error) {
             errorMessage = `Datenbankfehler: ${error.message}`;
        }
        return { success: false, error: errorMessage };
    }

    // Cache neu validieren
    // Locale wird wieder benötigt, falls Pfad sprachspezifisch ist
    // const locale = 'de'; // Beispiel
    // revalidatePath(`/${locale}/admin/crm/firmalar/${data.firma_id}/etkinlikler`);
    revalidatePath(`/admin/crm/firmalar/[firmaId]/etkinlikler`, 'page');

    console.log(`Aktivität ${etkinlikId} erfolgreich aktualisiert.`);
    return { success: true, data: data }; // Erfolg mit Daten zurückgeben
}