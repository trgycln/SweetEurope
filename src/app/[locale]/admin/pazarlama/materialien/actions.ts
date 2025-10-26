// src/app/[locale]/admin/pazarlama/materialien/actions.ts
// KORRIGIERTE VERSION (await cookies + await createClient)

'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation'; // Importiert, falls benötigt
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Database } from '@/lib/supabase/database.types'; // Import für Typisierung

// Typ für Rückgabewert
type ActionResult = {
    success: boolean;
    message: string;
    error?: string; // Optional: spezifischere Fehlermeldung
};

export async function deleteMaterialAction(
    payload: { materialId: string; filePath: string | null }
): Promise<ActionResult> { // Typ ActionResult verwenden
    const { materialId, filePath } = payload;
    if (!materialId) {
        return { success: false, message: 'Material-ID ist ungültig.' };
    }

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        return { success: false, message: 'Nicht authentifiziert.' };
    }
    // Optional: Rollenprüfung (nur Admins/Teammitglieder?)
    // ...

    // 1. Zuerst den Datenbankeintrag löschen
    // Stellen Sie sicher, dass der Tabellenname 'pazarlama_materyalleri' korrekt ist
    const { error: dbError } = await supabase
        .from('pazarlama_materyalleri')
        .delete()
        .eq('id', materialId);

    if (dbError) {
        console.error('Fehler beim Löschen der DB-Daten:', dbError);
        return { success: false, message: 'Datenbankfehler: Material konnte nicht gelöscht werden.', error: dbError.message };
    }

    // 2. Wenn DB-Löschung erfolgreich war, die Datei aus dem Storage löschen
    if (filePath) {
        // Stellen Sie sicher, dass der Bucket-Name 'marketing-materialien' korrekt ist
        const { error: storageError } = await supabase.storage
            .from('marketing-materialien') // Name Ihres Buckets
            .remove([filePath]); // filePath ist der Pfad innerhalb des Buckets (z.B. 'marketing-materialien/xyz.pdf')

        if (storageError) {
            console.error('Fehler beim Löschen der Datei aus Storage:', storageError);
            // Loggen, aber trotzdem Erfolg melden, da der DB-Eintrag (der Wichtigste) weg ist.
            // Der Benutzer sieht das Material nicht mehr.
        }
    } else {
        console.warn(`Kein filePath für Material ${materialId} übergeben. Datei im Storage wurde nicht gelöscht.`);
    }

    // 3. Cache leeren
    revalidatePath('/admin/pazarlama/materialien');
    revalidatePath('/portal/materialien'); // Auch Portal-Seite aktualisieren

    return { success: true, message: 'Marketingmaterial erfolgreich gelöscht.' };
}