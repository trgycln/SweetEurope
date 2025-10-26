// src/app/actions/gider-actions.ts
// KORRIGIERTE VERSION (await hinzugefügt + Logging)

'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { TablesInsert, TablesUpdate, Constants, Database } from '@/lib/supabase/database.types';
import { z, ZodError } from 'zod';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importiert

export type GiderFormState = {
    success: boolean;
    message: string;
    error?: string | ZodError<any>['formErrors'] | null;
} | null;

// Zod Schema (unverändert)
const GiderSchema = z.object({
    gider_kalemi_id: z.string().uuid({ message: "Ungültiger Ausgabenposten." }),
    aciklama: z.string().min(3, { message: "Beschreibung muss mind. 3 Zeichen lang sein." }),
    tutar: z.number({ required_error: "Betrag ist erforderlich.", invalid_type_error: "Betrag muss eine Zahl sein." }).positive({ message: "Betrag muss positiv sein." }),
    tarih: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Ungültiges Datum." }),
    odeme_sikligi: z.enum(Constants.public.Enums.zahlungshaeufigkeit, { errorMap: () => ({ message: "Ungültige Zahlungshäufigkeit." }) }).optional().nullable(),
    belge_url: z.string().url({ message: "Ungültige URL für Beleg." }).optional().nullable(),
});

// === YENİ GİDER OLUŞTURMA ===
export async function createGiderAction(
    prevState: GiderFormState,
    formData: FormData
): Promise<GiderFormState> {

    console.log("--- createGiderAction gestartet ---");

    // --- KORREKTUR: await für cookies() und createSupabaseServerClient ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    // Logging für Cookies
    try {
        const allCookies = cookieStore.getAll();
        console.log("Empfangene Cookies in Action:", allCookies);
        const authTokenCookie = allCookies.find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
        console.log("Auth Token Cookie gefunden:", authTokenCookie ? `Ja (Name: ${authTokenCookie.name})` : 'Nein');
    } catch (e) {
        console.error("Fehler beim Lesen der Cookies:", e);
    }

    // Benutzer abrufen
    let user = null;
    try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
             console.error("supabase.auth.getUser Fehler:", userError);
        }
        user = userData.user;
        console.log("Ergebnis von getUser():", user ? `Benutzer ID: ${user.id}`: 'Kein Benutzer gefunden');
    } catch(e) {
         console.error("Kritischer Fehler bei supabase.auth.getUser:", e);
         return { success: false, message: '', error: "Fehler bei Benutzerabfrage." };
    }

    if (!user) {
        console.log("-> Aktion wird abgebrochen: Nicht authentifiziert.");
        return { success: false, message: '', error: "Nicht authentifiziert." };
    }

    // --- Rest der Funktion ---
    const rawData = {
        gider_kalemi_id: formData.get('gider_kalemi_id'),
        aciklama: formData.get('aciklama'),
        tutar: formData.get('tutar') ? parseFloat(formData.get('tutar') as string) : undefined,
        tarih: formData.get('tarih'),
        odeme_sikligi: formData.get('odeme_sikligi') || null,
        belge_url: formData.get('belge_url') || null,
    };

    const validatedFields = GiderSchema.safeParse(rawData);
    if (!validatedFields.success) {
        console.error("Validierungsfehler (Erstellen):", validatedFields.error.flatten().fieldErrors);
        return { success: false, message: "Validierungsfehler.", error: validatedFields.error.flatten() };
    }

    const insertData: TablesInsert<'giderler'> = {
        gider_kalemi_id: validatedFields.data.gider_kalemi_id,
        aciklama: validatedFields.data.aciklama,
        tutar: validatedFields.data.tutar,
        tarih: new Date(validatedFields.data.tarih).toISOString(),
        odeme_sikligi: validatedFields.data.odeme_sikligi as Database['public']['Enums']['zahlungshaeufigkeit'] | null,
        belge_url: validatedFields.data.belge_url,
        islem_yapan_kullanici_id: user.id,
    };

    // Logging der Insert-Daten
    console.log("Daten für Insert:", insertData);

    console.log("-> Versuche Gider zu speichern für Benutzer:", user.id);
    const { error } = await supabase.from('giderler').insert(insertData);

    if (error) {
        console.error("Fehler beim Erstellen der Ausgabe:", error);
        return { success: false, message: '', error: `Datenbankfehler: ${error.message}` };
    }

    console.log("-> Gider erfolgreich gespeichert. Revalidiere Pfade...");
    revalidatePath('/admin/idari/finans/giderler');
    revalidatePath('/admin/idari/finans/raporlama');
    revalidatePath('/admin/dashboard');

    return { success: true, message: 'Ausgabe erfolgreich gespeichert.' };
}

// === GİDER GÜNCELLEME ===
export async function updateGiderAction(
    giderId: string,
    prevState: GiderFormState,
    formData: FormData
): Promise<GiderFormState> {

    console.log(`--- updateGiderAction gestartet für ID: ${giderId} ---`);

    // --- KORREKTUR: await für cookies() und createSupabaseServerClient ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    // Logging für Cookies
    try {
        const allCookies = cookieStore.getAll();
        console.log("Empfangene Cookies in Action:", allCookies);
        const authTokenCookie = allCookies.find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
        console.log("Auth Token Cookie gefunden:", authTokenCookie ? `Ja (Name: ${authTokenCookie.name})` : 'Nein');
    } catch (e) {
        console.error("Fehler beim Lesen der Cookies:", e);
    }

    // Benutzer abrufen
    let user = null;
    try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
             console.error("supabase.auth.getUser Fehler:", userError);
        }
        user = userData.user;
        console.log("Ergebnis von getUser():", user ? `Benutzer ID: ${user.id}`: 'Kein Benutzer gefunden');
    } catch(e) {
         console.error("Kritischer Fehler bei supabase.auth.getUser:", e);
         return { success: false, message: '', error: "Fehler bei Benutzerabfrage." };
    }

    if (!user) {
        console.log("-> Aktion wird abgebrochen: Nicht authentifiziert.");
        return { success: false, message: '', error: "Nicht authentifiziert." };
    }

    if (!giderId) {
        console.log("-> Aktion wird abgebrochen: Ausgaben-ID fehlt.");
        return { success: false, message: '', error: "Ausgaben-ID fehlt." };
    }

    // --- Rest der Funktion ---
    const rawData = {
        gider_kalemi_id: formData.get('gider_kalemi_id'),
        aciklama: formData.get('aciklama'),
        tutar: formData.get('tutar') ? parseFloat(formData.get('tutar') as string) : undefined,
        tarih: formData.get('tarih'),
        odeme_sikligi: formData.get('odeme_sikligi') || null,
        belge_url: formData.get('belge_url') || null,
    };

    const validatedFields = GiderSchema.safeParse(rawData);
    if (!validatedFields.success) {
        console.error("Validierungsfehler (Aktualisieren):", validatedFields.error.flatten().fieldErrors);
        return { success: false, message: "Validierungsfehler.", error: validatedFields.error.flatten() };
    }

    const updateData: TablesUpdate<'giderler'> = {
        gider_kalemi_id: validatedFields.data.gider_kalemi_id,
        aciklama: validatedFields.data.aciklama,
        tutar: validatedFields.data.tutar,
        tarih: new Date(validatedFields.data.tarih).toISOString(),
        odeme_sikligi: validatedFields.data.odeme_sikligi as Database['public']['Enums']['zahlungshaeufigkeit'] | null,
        belge_url: validatedFields.data.belge_url,
    };

    // Logging der Update-Daten
    console.log("Daten für Update:", updateData);

    console.log(`-> Versuche Gider zu aktualisieren (ID: ${giderId}) für Benutzer: ${user.id}`);
    const { error } = await supabase
        .from('giderler')
        .update(updateData)
        .eq('id', giderId);

    if (error) {
        console.error("Fehler beim Aktualisieren der Ausgabe:", error);
        return { success: false, message: '', error: `Datenbankfehler: ${error.message}` };
    }

    console.log("-> Gider erfolgreich aktualisiert. Revalidiere Pfade...");
    revalidatePath('/admin/idari/finans/giderler');
    revalidatePath('/admin/idari/finans/raporlama');
    revalidatePath('/admin/dashboard');

    return { success: true, message: 'Ausgabe erfolgreich aktualisiert.' };
}

// === GİDER SİLME ===
export async function deleteGiderAction(giderId: string): Promise<{ success: boolean; message: string; error?: string }> {

    console.log(`--- deleteGiderAction gestartet für ID: ${giderId} ---`);

    // --- KORREKTUR: await für cookies() und createSupabaseServerClient ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    // Logging für Cookies
    try {
        const allCookies = cookieStore.getAll();
        console.log("Empfangene Cookies in Action:", allCookies);
        const authTokenCookie = allCookies.find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
        console.log("Auth Token Cookie gefunden:", authTokenCookie ? `Ja (Name: ${authTokenCookie.name})` : 'Nein');
    } catch (e) {
        console.error("Fehler beim Lesen der Cookies:", e);
    }

    // Benutzer abrufen
    let user = null;
    try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
             console.error("supabase.auth.getUser Fehler:", userError);
        }
        user = userData.user;
        console.log("Ergebnis von getUser():", user ? `Benutzer ID: ${user.id}`: 'Kein Benutzer gefunden');
    } catch(e) {
         console.error("Kritischer Fehler bei supabase.auth.getUser:", e);
         return { success: false, message: '', error: "Fehler bei Benutzerabfrage." };
    }

    if (!user) {
        console.log("-> Aktion wird abgebrochen: Nicht authentifiziert.");
        return { success: false, message: '', error: "Nicht authentifiziert." };
    }

    if (!giderId) {
        console.log("-> Aktion wird abgebrochen: Ausgaben-ID fehlt.");
        return { success: false, message: '', error: "Ausgaben-ID fehlt." };
    }

    console.log(`-> Versuche Gider zu löschen (ID: ${giderId}) für Benutzer: ${user.id}`);
    const { error } = await supabase
        .from('giderler')
        .delete()
        .eq('id', giderId);

    if (error) {
        console.error("Fehler beim Löschen der Ausgabe:", error);
        return { success: false, message: '', error: `Datenbankfehler: ${error.message}` };
    }

    console.log("-> Gider erfolgreich gelöscht. Revalidiere Pfade...");
    revalidatePath('/admin/idari/finans/giderler');
    revalidatePath('/admin/idari/finans/raporlama');
    revalidatePath('/admin/dashboard');

    return { success: true, message: 'Ausgabe erfolgreich gelöscht.' };
}
