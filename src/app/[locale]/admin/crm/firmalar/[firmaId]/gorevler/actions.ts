// src/app/[locale]/admin/crm/firmalar/[firmaId]/gorevler/actions.ts
// KORRIGIERTE VERSION (await cookies + await createClient)

'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Tables, Enums } from '@/lib/supabase/database.types'; // Import für Typisierung

// Typ für Rückgabewerte
type ActionResult = {
    success?: string; // Erfolgsmeldung
    error?: string;   // Fehlermeldung
};

// Typ für Priorität Enum
type GorevOncelik = Enums<'gorev_oncelik'>;
const validPriorities: ReadonlyArray<GorevOncelik> = ['Düşük', 'Orta', 'Yüksek'];

// Fügt eine neue Aufgabe für eine spezifische Firma hinzu
export async function firmaIcinGorevEkleAction(
    firmaId: string,
    formData: FormData
): Promise<ActionResult> { // Rückgabetyp verwenden

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // Benutzerprüfung
    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        return { error: "Nicht authentifiziert." }; // Angepasst
    }

    // Formulardaten abrufen und validieren
    const baslik = formData.get('baslik') as string | null;
    const atanan_kisi_id = formData.get('atanan_kisi_id') as string | null;
    const son_tarih = formData.get('son_tarih') as string | null; // Kann leer sein
    const oncelik_raw = formData.get('oncelik');
    const oncelik = (validPriorities.includes(oncelik_raw as GorevOncelik) ? oncelik_raw : 'Orta') as GorevOncelik; // Standard 'Orta'

    if (!baslik) {
        return { error: "Aufgabentitel ist erforderlich." }; // Angepasst
    }
    if (!atanan_kisi_id) {
         return { error: "Eine zugewiesene Person ist erforderlich." }; // Angepasst
    }

    // Daten für Insert vorbereiten
    const insertData: Partial<Tables<'gorevler'>> = {
        ilgili_firma_id: firmaId,
        baslik: baslik,
        // son_tarih nur setzen, wenn ein gültiges Datum eingegeben wurde
        son_tarih: son_tarih && !isNaN(Date.parse(son_tarih)) ? new Date(son_tarih).toISOString() : null,
        atanan_kisi_id: atanan_kisi_id,
        oncelik: oncelik,
        olusturan_kisi_id: user.id, // ID des Erstellers
        tamamlandi: false, // Neue Aufgaben sind nicht abgeschlossen
        // 'durum' Spalte wird hier nicht gesetzt, da 'tamamlandi' verwendet wird?
    };

    // In Datenbank einfügen
    const { error } = await supabase.from('gorevler').insert(insertData);

    if (error) {
        console.error("Fehler beim Hinzufügen der Aufgabe:", error);
        return { error: "Datenbankfehler beim Hinzufügen der Aufgabe." }; // Angepasst
    }

    // Cache neu validieren
    revalidatePath(`/admin/crm/firmalar/${firmaId}/gorevler`);

    return { success: "Aufgabe erfolgreich hinzugefügt." }; // Angepasst
}


// Aktualisiert den 'tamamlandi'-Status einer Aufgabe
export async function gorevDurumGuncelleAction(
    gorevId: string,
    firmaId: string, // Wird für revalidatePath benötigt
    yeniDurum: boolean // true für abgeschlossen, false für wieder geöffnet
): Promise<ActionResult> { // Rückgabetyp verwenden

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // Benutzerprüfung
    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        return { error: "Nicht authentifiziert." }; // Angepasst
    }

    // Aufgabe aktualisieren
    const { error } = await supabase
        .from('gorevler')
        .update({ tamamlandi: yeniDurum }) // Status setzen
        .eq('id', gorevId);
        // Optional: Prüfen, ob der Benutzer die Aufgabe ändern darf
        // .eq('atanan_kisi_id', user.id) // Nur zugewiesene Person darf ändern? Oder Admin?

    if (error) {
        console.error("Fehler beim Aktualisieren des Aufgabenstatus:", error);
        return { error: "Datenbankfehler beim Aktualisieren des Status." }; // Angepasst
    }

    // Cache neu validieren
    revalidatePath(`/admin/crm/firmalar/${firmaId}/gorevler`);

    // Erfolgsmeldung basierend auf dem neuen Status
    const message = yeniDurum ? "Aufgabe als erledigt markiert." : "Aufgabe wieder geöffnet."; // Angepasst
    return { success: message };
}