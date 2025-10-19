// src/app/actions/yeni-urun-actions.ts (NEUE DATEI)
'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { TablesInsert } from "@/lib/supabase/database.types";
import { redirect } from "next/navigation";

// Typ für den Rückgabewert des Formulars
export type YeniUrunFormState = {
    success: boolean;
    message: string;
} | null;

export async function createYeniUrunTalepAction(
    prevState: YeniUrunFormState,
    formData: FormData
): Promise<YeniUrunFormState> {
    
    const supabase = createSupabaseServerClient();
    
    // 1. Benutzer und Profil holen (um firma_id zu bekommen)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "Nicht authentifiziert." };
    }

    const { data: profile } = await supabase
        .from('profiller')
        .select('firma_id')
        .eq('id', user.id)
        .single();
        
    if (!profile || !profile.firma_id) {
        return { success: false, message: "Keine zugehörige Firma gefunden." };
    }

    // 2. Formulardaten auslesen
    const produkt_name = formData.get('produkt_name') as string;
    const kategorie_vorschlag = formData.get('kategorie_vorschlag') as string;
    const beschreibung = formData.get('beschreibung') as string;
    const referenz_link_gorsel = formData.get('referenz_link_gorsel') as string;
    const geschaetzte_menge_pro_woche = parseInt(formData.get('geschaetzte_menge_pro_woche') as string, 10) || null;

    // 3. Validierung
    if (!produkt_name || !beschreibung) {
        return { success: false, message: "Produktname und Beschreibung sind Pflichtfelder." };
    }

    // 4. Datenobjekt für DB erstellen
    const insertData: TablesInsert<'yeni_urun_talepleri'> = {
        firma_id: profile.firma_id,
        olusturan_kullanici_id: user.id,
        produkt_name,
        kategorie_vorschlag: kategorie_vorschlag || null,
        beschreibung,
        referenz_link_gorsel: referenz_link_gorsel || null,
        geschaetzte_menge_pro_woche: geschaetzte_menge_pro_woche,
        status: 'Yeni' // Standard-Startstatus
    };

    // 5. In Datenbank einfügen (RLS prüft die Berechtigung)
    const { error } = await supabase.from('yeni_urun_talepleri').insert(insertData);

    if (error) {
        console.error("Fehler beim Erstellen der Produktanfrage:", error);
        return { success: false, message: "Fehler: Anfrage konnte nicht gespeichert werden." };
    }

    // 6. Cache leeren
    revalidatePath('/portal/taleplerim');
    // TODO: Admin-Seite für Anfragen auch revalidieren
    // revalidatePath('/admin/urun-yonetimi/urun-talepleri'); 

    return { success: true, message: "Vielen Dank! Ihre Produktanfrage wurde erfolgreich übermittelt." };
}

export async function partnerDeleteUrunTalepAction(
    anfrageId: string
): Promise<YeniUrunFormState> { // Verwendet denselben Rückgabetyp
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { return { success: false, message: "Nicht authentifiziert." }; }

    // RLS (aus Schritt 1) stellt sicher, dass der Benutzer nur seine eigenen
    // Anfragen löschen kann, UND nur wenn der Status 'Yeni' ist.
    const { error } = await supabase
        .from('yeni_urun_talepleri')
        .delete()
        .eq('id', anfrageId); // RLS regelt den Rest

    if (error) {
        console.error("Fehler beim Löschen der Produktanfrage:", error);
        return { success: false, message: "Anfrage konnte nicht gelöscht werden." };
    }

    revalidatePath('/portal/taleplerim');
    return { success: true, message: "Produktanfrage erfolgreich gelöscht." };
}

// NEU: Partner aktualisiert seine eigene Produktanfrage
export async function updateYeniUrunTalepAction(
    talepId: string,
    prevState: YeniUrunFormState,
    formData: FormData
): Promise<YeniUrunFormState> {
    
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "Nicht authentifiziert." };
    }

    // Daten auslesen
    const produkt_name = formData.get('produkt_name') as string;
    const kategorie_vorschlag = formData.get('kategorie_vorschlag') as string;
    const beschreibung = formData.get('beschreibung') as string;
    const referenz_link_gorsel = formData.get('referenz_link_gorsel') as string;
    const geschaetzte_menge_pro_woche = parseInt(formData.get('geschaetzte_menge_pro_woche') as string, 10) || null;

    // Validierung
    if (!produkt_name || !beschreibung) {
        return { success: false, message: "Produktname und Beschreibung sind Pflichtfelder." };
    }

    const updateData: Partial<Tables<'yeni_urun_talepleri'>> = {
        produkt_name,
        kategorie_vorschlag: kategorie_vorschlag || null,
        beschreibung,
        referenz_link_gorsel: referenz_link_gorsel || null,
        geschaetzte_menge_pro_woche: geschaetzte_menge_pro_woche,
    };

    // Update in DB (RLS prüft, ob der Benutzer der Ersteller ist UND der Status 'Yeni' ist)
    const { error } = await supabase
        .from('yeni_urun_talepleri')
        .update(updateData)
        .eq('id', talepId); // RLS regelt den Rest (Benutzer-ID und Status)

    if (error) {
        console.error("Fehler beim Aktualisieren der Produktanfrage:", error);
        return { success: false, message: "Fehler: Anfrage konnte nicht aktualisiert werden." };
    }

    revalidatePath('/portal/taleplerim');
    // redirect(`/${locale}/portal/taleplerim`); // Besser im Client nach Toast
    return { success: true, message: "Anfrage erfolgreich aktualisiert." };
}

export async function adminUpdateUrunTalepAction(
    talepId: string,
    formData: FormData
): Promise<{ success: boolean; message: string }> {
    
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Nicht authentifiziert." };

    // Daten aus FormData holen
    const neuerStatus = formData.get('status') as Enums<'urun_talep_durumu'>;
    const adminNotu = formData.get('admin_notu') as string;

    if (!neuerStatus) {
        return { success: false, message: "Status ist ein Pflichtfeld." };
    }

    // RLS-Richtlinien (die wir bereits erstellt haben) stellen sicher,
    // dass nur Admins/Teammitglieder dies tun können.
    const { error } = await supabase
        .from('yeni_urun_talepleri')
        .update({
            status: neuerStatus,
            admin_notu: adminNotu || null // Leeren String als null speichern
        })
        .eq('id', talepId);

    if (error) {
        console.error("Fehler beim Admin-Update der Produktanfrage:", error);
        return { success: false, message: "Update fehlgeschlagen: " + error.message };
    }

    // Cache für beide Seiten leeren
    revalidatePath('/admin/urun-yonetimi/urun-talepleri');
    revalidatePath('/portal/taleplerim'); // Partner informieren

    return { success: true, message: "Anfragestatus erfolgreich aktualisiert." };
}