'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deleteMaterialAction(
    payload: { materialId: string; filePath: string | null }
): Promise<{ success: boolean; message: string }> {
    const { materialId, filePath } = payload;
    if (!materialId) {
        return { success: false, message: 'Material-ID ist ungültig.' };
    }

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: 'Nicht authentifiziert.' };
    }

    // 1. Zuerst den Datenbankeintrag löschen
    const { error: dbError } = await supabase
        .from('pazarlama_materyalleri')
        .delete()
        .eq('id', materialId);

    if (dbError) {
        console.error('Fehler beim Löschen der DB-Daten:', dbError);
        return { success: false, message: 'Datenbankfehler: Material konnte nicht gelöscht werden.' };
    }

    // 2. Wenn DB-Löschung erfolgreich war, die Datei aus dem Storage löschen
    // Wir tun dies nur, wenn ein gültiger Dateipfad vorhanden ist.
    if (filePath) {
        const { error: storageError } = await supabase.storage
            .from('marketing-materialien') // Name deines Buckets
            .remove([filePath]);
        
        if (storageError) {
            console.error('Fehler beim Löschen der Datei aus Storage:', storageError);
            // Der DB-Eintrag ist weg, aber die Datei ist noch da. Dies sollte manuell geprüft werden.
            // Wir geben trotzdem eine Erfolgsmeldung für den Benutzer aus, da das Material aus der Liste verschwunden ist.
            // Man könnte hier auch eine spezifischere Fehlermeldung zurückgeben.
        }
    }

    // 3. Cache leeren, damit die Liste aktualisiert wird
    revalidatePath('/admin/pazarlama/materialien');
    return { success: true, message: 'Marketingmaterial erfolgreich gelöscht.' };
}
