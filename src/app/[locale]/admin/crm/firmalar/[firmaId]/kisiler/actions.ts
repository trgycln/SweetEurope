// src/app/[locale]/admin/crm/firmalar/[firmaId]/kisiler/actions.ts
// KORRIGIERTE VERSION (await cookies + await createClient)

'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Tables } from '@/lib/supabase/database.types'; // Import für Typisierung

// Typ für Rückgabewert definieren
type ActionResult = {
    success: boolean;
    message: string; // Immer eine Nachricht zurückgeben
    error?: string; // Optional: Fehlermeldung für detaillierteres Feedback
    data?: any; // Optional: Daten zurückgeben
};


// Fügt eine neue Kontaktperson hinzu
export async function yeniKisiEkleAction(
    firmaId: string,
    formData: FormData
): Promise<ActionResult> { // Rückgabetyp verwenden

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // Optional: Benutzerprüfung, falls nur Admins/Teammitglieder hinzufügen dürfen
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) { return { success: false, message: '', error: "Nicht authentifiziert." }; }

    // Formulardaten abrufen und validieren
    const ad_soyad = formData.get('ad_soyad') as string | null; // Sicherer Zugriff
    if (!ad_soyad) {
        return { success: false, message: 'Name ist erforderlich.' }; // Bessere Nachricht
    }

    // Daten für Insert vorbereiten
    const insertData: Partial<Tables<'dis_kontaklar'>> = { // Partial verwenden
        firma_id: firmaId,
        ad_soyad: ad_soyad,
        unvan: formData.get('unvan') as string || null,
        email: formData.get('email') as string || null,
        telefon: formData.get('telefon') as string || null,
    };

    // In Datenbank einfügen
    const { error } = await supabase.from('dis_kontaklar').insert(insertData);

    if (error) {
        console.error('Fehler beim Hinzufügen des Kontakts:', error);
        return { success: false, message: 'Datenbankfehler beim Hinzufügen.' }; // Bessere Nachricht
    }

    // Cache neu validieren
    revalidatePath(`/admin/crm/firmalar/${firmaId}/kisiler`); // Pfad ohne Locale ist oft ausreichend

    return { success: true, message: 'Kontakt erfolgreich hinzugefügt.' }; // Bessere Nachricht
}


// Aktualisiert eine Kontaktperson
export async function guncelleKisiAction(
    kisiId: string,
    formData: FormData
): Promise<ActionResult> { // Rückgabetyp verwenden

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // Optional: Benutzerprüfung
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) { return { success: false, message: '', error: "Nicht authentifiziert." }; }

    // Formulardaten abrufen und validieren
    const ad_soyad = formData.get('ad_soyad') as string | null;
    if (!ad_soyad) {
        return { success: false, message: 'Name ist erforderlich.' };
    }

    // Daten für Update vorbereiten
    const updateData: Partial<Tables<'dis_kontaklar'>> = {
        ad_soyad: ad_soyad,
        unvan: formData.get('unvan') as string || null,
        email: formData.get('email') as string || null,
        telefon: formData.get('telefon') as string || null,
    };

    // Datenbank-Update durchführen und firma_id für Revalidierung abrufen
    const { data, error } = await supabase
        .from('dis_kontaklar')
        .update(updateData)
        .eq('id', kisiId)
        .select('firma_id') // firma_id wird für revalidatePath benötigt
        .single(); // Erwartet genau ein Ergebnis

    if (error || !data) {
        console.error('Fehler beim Aktualisieren des Kontakts:', error);
        return { success: false, message: 'Datenbankfehler beim Aktualisieren.' };
    }

    // Cache neu validieren
    revalidatePath(`/admin/crm/firmalar/${data.firma_id}/kisiler`);

    return { success: true, message: 'Kontakt erfolgreich aktualisiert.' };
}


// Löscht eine Kontaktperson
export async function silKisiAction(
    kisiId: string,
    firmaId: string // firmaId wird für Revalidierung benötigt
): Promise<ActionResult> { // Rückgabetyp verwenden

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // Optional: Benutzerprüfung
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) { return { success: false, message: '', error: "Nicht authentifiziert." }; }

    // Kontakt löschen
    const { error } = await supabase
        .from('dis_kontaklar')
        .delete()
        .eq('id', kisiId);

    if (error) {
        console.error('Fehler beim Löschen des Kontakts:', error);
        return { success: false, message: 'Datenbankfehler beim Löschen.' };
    }

    // Cache neu validieren
    revalidatePath(`/admin/crm/firmalar/${firmaId}/kisiler`);

    return { success: true, message: 'Kontakt erfolgreich gelöscht.' };
}