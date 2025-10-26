// src/app/[locale]/admin/pazarlama/duyurular/[duyuruId]/actions.ts
// KORRIGIERTE VERSION (await cookies + await createClient in allen Funktionen + locale für redirect)

'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { TablesUpdate, Enums } from '@/lib/supabase/database.types'; // Enums importieren
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren

// Typ für den Rückgabewert
export type UpdateFormState = {
    success: boolean;
    message: string;
    errors?: Record<string, string>;
} | null;

export async function updateDuyuruAction(
    duyuruId: string,
    prevState: UpdateFormState,
    formData: FormData
): Promise<UpdateFormState> {

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        return { success: false, message: 'Nicht authentifiziert.' };
    }
    // Optional: Rollenprüfung
    // ...

    // Formulardaten auslesen
    const baslik = formData.get('baslik') as string;
    const icerik = formData.get('icerik') as string | null;
    const hedef_kitle = formData.get('hedef_kitle') as Enums<'hedef_rol'> | null; // Typ angepasst
    const aktif = formData.get('aktif') === 'on';
    const yayin_tarihi = formData.get('yayin_tarihi') as string | null;
    const bitis_tarihi = formData.get('bitis_tarihi') as string | null;

    if (!baslik || !hedef_kitle) {
        return { success: false, message: 'Fehler: Betreff und Zielgruppe sind Pflichtfelder.' };
    }

    const updateData: TablesUpdate<'duyurular'> = {
        baslik,
        icerik: icerik || null,
        hedef_kitle,
        aktif,
        yayin_tarihi: yayin_tarihi ? new Date(yayin_tarihi).toISOString() : new Date().toISOString(),
        bitis_tarihi: bitis_tarihi ? new Date(bitis_tarihi).toISOString() : null,
    };

    const { error } = await supabase
        .from('duyurular')
        .update(updateData)
        .eq('id', duyuruId);

    if (error) {
        console.error('Fehler beim Aktualisieren der Ankündigung:', error);
        return { success: false, message: 'Datenbankfehler: Die Ankündigung konnte nicht aktualisiert werden.' };
    }

    revalidatePath('/admin/pazarlama/duyurular');
    revalidatePath(`/admin/pazarlama/duyurular/${duyuruId}`);
    revalidatePath('/portal/dashboard');

    return { success: true, message: 'Ankündigung erfolgreich aktualisiert!' };
}

// Funktion zum Löschen (KORRIGIERT)
export async function deleteDuyuruAction(
    duyuruId: string,
    locale: string // <-- WICHTIG: Locale als Parameter empfangen
): Promise<{ success: boolean; message: string }> {

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        return { success: false, message: 'Nicht authentifiziert.' };
    }
    // Optional: Rollenprüfung
    // ...

    const { error } = await supabase
        .from('duyurular')
        .delete()
        .eq('id', duyuruId);

    if (error) {
        console.error('Fehler beim Löschen der Ankündigung:', error);
        return { success: false, message: 'Datenbankfehler: Die Ankündigung konnte nicht gelöscht werden.' };
    }

    revalidatePath('/admin/pazarlama/duyurular');
    revalidatePath('/portal/dashboard');

    // KORREKTUR: Sprachspezifischer Redirect
    redirect(`/${locale}/admin/pazarlama/duyurular`);
}