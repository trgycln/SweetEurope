// src/app/actions/numune-actions.ts (Vollständiger Code)
'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Enums } from "@/lib/supabase/database.types"; // Enums importieren

// Typ für Rückgabewert definieren
type ActionResult = {
    success: boolean;
    message?: string;
    error?: string;
};

// Funktion: Partner erstellt eine Musteranfrage
export async function createNumuneTalepAction(
    urunId: string,
    firmaId: string 
): Promise<ActionResult> {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Nicht authentifiziert. Bitte einloggen." };
    }
    
    if (!urunId || !firmaId) {
         return { success: false, error: "Produkt- oder Firmeninformationen fehlen." };
    }

    // RLS (ROW LEVEL SECURITY) prüft, ob der Benutzer
    // (auth.uid() -> profiller.firma_id) mit der übergebenen firmaId übereinstimmt.
    const { error: insertError } = await supabase.from('numune_talepleri').insert({
        urun_id: urunId,
        firma_id: firmaId,
        durum: 'Yeni Talep' // Standard-Startstatus
    });

    if (insertError) {
        console.error("Fehler Erstellung Musteranfrage:", insertError);
        // Fehlercode 23505 = Eindeutigkeitsverletzung (bereits vorhanden)
        if (insertError.code === '23505') { 
             return { success: true, message: "Für dieses Produkt wurde bereits ein Muster angefragt." };
        }
        // Zeige RLS-Fehler oder Standardtext
        return { success: false, error: insertError.message.includes('violates row-level security policy') ? "Berechtigung verweigert." : "Anfrage konnte nicht gesendet werden." };
    }
    
    // Relevante Seiten neu validieren (Cache leeren)
    revalidatePath(`/portal/katalog/${urunId}`);
    revalidatePath('/portal/taleplerim'); // Partner-Anfragenseite
    revalidatePath('/admin/operasyon/numune-talepleri'); // Admin-Anfragenseite

    return { success: true, message: "Musteranfrage erfolgreich gesendet." };
}


// Funktion: Admin aktualisiert den Status (z.B. Bestätigen, Senden)
export async function updateNumuneStatusAction(
    anfrageId: string,
    neuerStatus: Enums<'numune_talep_durumu'>
): Promise<ActionResult> {
    
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Nicht authentifiziert." };
    }
    
    // RLS prüft, ob der Benutzer ein Admin/Teammitglied ist

    const { error } = await supabase
        .from('numune_talepleri')
        .update({ durum: neuerStatus }) // Nur den Status aktualisieren
        .eq('id', anfrageId);

    if (error) {
        console.error("Fehler beim Aktualisieren des Musterstatus:", error);
        return { success: false, error: "Status konnte nicht aktualisiert werden: " + error.message };
    }

    // Cache leeren
    revalidatePath('/admin/operasyon/numune-talepleri');
    revalidatePath('/portal/taleplerim'); // Partner auch informieren

    return { success: true, message: `Status auf "${neuerStatus}" aktualisiert.` };
}

// Funktion: Admin lehnt Anfrage ab (mit Begründung)
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

    // RLS prüft, ob der Benutzer ein Admin/Teammitglied ist
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

    // Cache leeren
    revalidatePath('/admin/operasyon/numune-talepleri');
    revalidatePath('/portal/taleplerim'); // Partner auch informieren

    return { success: true, message: "Anfrage erfolgreich abgelehnt." };
}

// Funktion: Partner storniert seine eigene Anfrage
export async function partnerCancelNumuneTalepAction(
    anfrageId: string
): Promise<ActionResult> {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { return { success: false, error: "Nicht authentifiziert." }; }

    // RLS (aus SQL Schritt 1) stellt sicher, dass der Benutzer nur seine eigenen
    // Anfragen löschen kann, UND nur wenn der Status 'Yeni Talep' ist.
    const { error } = await supabase
        .from('numune_talepleri')
        .delete()
        .eq('id', anfrageId); // RLS regelt den Rest (Benutzer-ID, Firma-ID und Status 'Yeni Talep')

    if (error) {
        console.error("Fehler beim Stornieren der Musteranfrage:", error);
        return { success: false, error: "Anfrage konnte nicht storniert werden. Möglicherweise wurde sie bereits bearbeitet." };
    }

    revalidatePath('/portal/taleplerim');
    return { success: true, message: "Musteranfrage erfolgreich storniert." };
}