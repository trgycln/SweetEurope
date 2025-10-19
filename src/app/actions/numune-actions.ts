// src/app/actions/numune-actions.ts (Vollständig aktualisiert)
'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Enums } from "@/lib/supabase/database.types"; // Enums importieren

// Typ für Rückgabewert
type ActionResult = {
    success: boolean;
    message?: string;
    error?: string;
};

// --- Bestehende Funktion (Unverändert) ---
export async function createNumuneTalepAction(
    urunId: string,
    firmaId: string
): Promise<ActionResult> {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { return { success: false, error: "Nicht authentifiziert. Bitte einloggen." }; }
    if (!urunId || !firmaId) { return { success: false, error: "Produkt- oder Firmeninformationen fehlen." }; }

    const { error: insertError } = await supabase.from('numune_talepleri').insert({
        urun_id: urunId,
        firma_id: firmaId,
        durum: 'Yeni Talep'
    });

    if (insertError) {
        console.error("Fehler Erstellung Musteranfrage:", insertError);
        if (insertError.code === '23505') { return { success: true, message: "Bereits angefragt." }; }
        return { success: false, error: "Anfrage fehlgeschlagen." };
    }
    
    revalidatePath(`/portal/katalog/${urunId}`);
    revalidatePath('/portal/taleplerim');
    revalidatePath('/admin/operasyon/numune-talepleri');

    return { success: true, message: "Anfrage gesendet." };
}


// --- Status aktualisieren (Unverändert) ---
export async function updateNumuneStatusAction(
    anfrageId: string,
    neuerStatus: Enums<'numune_talep_durumu'>
): Promise<ActionResult> {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { return { success: false, error: "Nicht authentifiziert." }; }
    
    const { error } = await supabase
        .from('numune_talepleri')
        .update({ durum: neuerStatus }) // Nur den Status aktualisieren
        .eq('id', anfrageId);

    if (error) {
        console.error("Fehler beim Aktualisieren des Musterstatus:", error);
        return { success: false, error: "Status konnte nicht aktualisiert werden." };
    }

    revalidatePath('/admin/operasyon/numune-talepleri');
    revalidatePath('/portal/taleplerim'); // Partner auch benachrichtigen

    return { success: true, message: `Status auf "${neuerStatus}" aktualisiert.` };
}

// --- NEUE FUNKTION: Anfrage ablehnen (mit Begründung) ---
export async function cancelNumuneTalepAction(
    anfrageId: string,
    begruendung: string
): Promise<ActionResult> {
    
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { return { success: false, error: "Nicht authentifiziert." }; }

    if (!begruendung || begruendung.trim() === '') {
        return { success: false, error: "Begründung darf nicht leer sein." };
    }

    const { error } = await supabase
        .from('numune_talepleri')
        .update({ 
            durum: 'İptal Edildi',       // Status auf 'İptal Edildi' setzen
            iptal_aciklamasi: begruendung // Begründung speichern
        })
        .eq('id', anfrageId);

    if (error) {
        console.error("Fehler beim Ablehnen der Musteranfrage:", error);
        return { success: false, error: "Anfrage konnte nicht abgelehnt werden." };
    }

    revalidatePath('/admin/operasyon/numune-talepleri');
    revalidatePath('/portal/taleplerim'); // Partner auch benachrichtigen

    return { success: true, message: "Anfrage erfolgreich abgelehnt." };
}