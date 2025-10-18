'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { TablesUpdate } from '@/lib/supabase/database.types';

// Typ für den Rückgabewert (identisch zur create Action)
export type UpdateFormState = {
    success: boolean;
    message: string;
    errors?: Record<string, string>;
} | null;

export async function updateDuyuruAction(
    duyuruId: string, // Die ID der zu bearbeitenden Ankündigung
    prevState: UpdateFormState,
    formData: FormData
): Promise<UpdateFormState> {
    const supabase = createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: 'Nicht authentifiziert.' };
    }

    const baslik = formData.get('baslik') as string;
    const icerik = formData.get('icerik') as string | null;
    const hedef_kitle = formData.get('hedef_kitle') as TablesUpdate<'duyurular'>['hedef_kitle'];
    const aktif = formData.get('aktif') === 'on';
    const yayin_tarihi = formData.get('yayin_tarihi') as string | null;
    const bitis_tarihi = formData.get('bitis_tarihi') as string | null;

    if (!baslik || !hedef_kitle) {
        return { success: false, message: 'Fehler: Betreff und Zielgruppe sind Pflichtfelder.' };
    }

    // Daten für das Update vorbereiten
    const updateData: TablesUpdate<'duyurular'> = {
        baslik,
        icerik: icerik || null,
        hedef_kitle,
        aktif,
        // olusturan_id wird normalerweise nicht aktualisiert
        yayin_tarihi: yayin_tarihi ? new Date(yayin_tarihi).toISOString() : new Date().toISOString(),
        bitis_tarihi: bitis_tarihi ? new Date(bitis_tarihi).toISOString() : null,
    };

    // In Datenbank aktualisieren, basierend auf der ID
    const { error } = await supabase
        .from('duyurular')
        .update(updateData)
        .eq('id', duyuruId); // Wichtig: Nur den spezifischen Datensatz aktualisieren

    if (error) {
        console.error('Fehler beim Aktualisieren der Ankündigung:', error);
        return { success: false, message: 'Datenbankfehler: Die Ankündigung konnte nicht aktualisiert werden.' };
    }

    // Cache für die Liste UND die Detailseite leeren
    revalidatePath('/admin/pazarlama/duyurular');
    revalidatePath(`/admin/pazarlama/duyurular/${duyuruId}`);

    // Erfolg! Gib eine Erfolgsmeldung zurück.
    return { success: true, message: 'Ankündigung erfolgreich aktualisiert!' };
    // Keine Weiterleitung hier, die Komponente kann entscheiden, was als Nächstes passiert.
}

// Funktion zum Löschen einer Ankündigung (Bonus)
export async function deleteDuyuruAction(duyuruId: string): Promise<{ success: boolean; message: string }> {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Nicht authentifiziert.' };

    const { error } = await supabase
        .from('duyurular')
        .delete()
        .eq('id', duyuruId);

    if (error) {
        console.error('Fehler beim Löschen der Ankündigung:', error);
        return { success: false, message: 'Datenbankfehler: Die Ankündigung konnte nicht gelöscht werden.' };
    }

    revalidatePath('/admin/pazarlama/duyurular');
    // Nach dem Löschen leiten wir direkt zur Liste weiter.
    redirect('/admin/pazarlama/duyurular');
}