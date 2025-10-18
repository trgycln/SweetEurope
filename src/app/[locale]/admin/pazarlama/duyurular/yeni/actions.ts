'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
// import { redirect } from 'next/navigation'; // Redirect wird hier nicht mehr benötigt
import { TablesInsert } from '@/lib/supabase/database.types';

// Typ für den Rückgabewert der Action
export type FormState = {
    success: boolean;
    message: string;
    errors?: Record<string, string>; // Optional für Feld-spezifische Fehler
} | null; // Initialer Status ist null

// WICHTIG: Die Funktion muss jetzt den vorherigen State als erstes Argument akzeptieren
export async function createDuyuruAction(
    prevState: FormState,
    formData: FormData
): Promise<FormState> {
    const supabase = createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: 'Nicht authentifiziert.' };
    }

    const baslik = formData.get('baslik') as string;
    const icerik = formData.get('icerik') as string | null;
    const hedef_kitle = formData.get('hedef_kitle') as TablesInsert<'duyurular'>['hedef_kitle'];
    const aktif = formData.get('aktif') === 'on';
    const yayin_tarihi = formData.get('yayin_tarihi') as string | null;
    const bitis_tarihi = formData.get('bitis_tarihi') as string | null;

    if (!baslik || !hedef_kitle) {
        return { success: false, message: 'Fehler: Betreff und Zielgruppe sind Pflichtfelder.' };
    }

    const insertData: TablesInsert<'duyurular'> = {
        baslik,
        icerik: icerik || null,
        hedef_kitle,
        aktif,
        olusturan_id: user.id,
        yayin_tarihi: yayin_tarihi ? new Date(yayin_tarihi).toISOString() : new Date().toISOString(),
        bitis_tarihi: bitis_tarihi ? new Date(bitis_tarihi).toISOString() : null,
    };

    const { error } = await supabase.from('duyurular').insert(insertData);

    if (error) {
        console.error('Fehler beim Erstellen der Ankündigung:', error);
        return { success: false, message: 'Datenbankfehler: Die Ankündigung konnte nicht gespeichert werden.' };
    }

    revalidatePath('/admin/pazarlama/duyurular');

    // Erfolg! Gib eine Erfolgsmeldung zurück.
    return { success: true, message: 'Ankündigung erfolgreich gespeichert!' };
    // Die Weiterleitung erfolgt nun auf der Client-Seite nach Anzeige des Toasts.
}