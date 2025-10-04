// src/app/admin/partners/actions.ts

"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

// ---------------------------------------------
// TYPEN
// ---------------------------------------------

export type PartnerSalesStatus = 'İlk Temas' | 'Numune gönderildi' | 'Teklif aşamasında' | 'Potansiyel' | 'Anlaşıldı' | 'İlgilenmiyor';

export interface Partner {
    id: string;
    company_name: string;
    contact_person: string;
    sales_status: PartnerSalesStatus;
    
    // NEUE FELDER HINZUFÜGEN (um den Fehler zu beheben)
    address: string | null;
    email: string | null;
    phone_number: string | null;
    notes: string | null;
    
    // DIE FEHLENDEN FELDER, DIE DEN FEHLER VERURSACHEN
    website: string | null;          // <--- Hier war der Fehler
    location_link: string | null;    // <--- Hier war der Fehler
    sub_branch_count: number | null; // <--- Hier war der Fehler

    // DATUMS-FELDER
    meeting_date: string | null;
    last_visit: string | null;
    next_visit: string | null;
    
    // SYSTEM-FELDER
    created_at: string; // Timestamp
    updated_at: string | null; // Timestamp
}

export interface PartnerActionState {
    success: boolean;
    message: string;
}

/**
 * Erstellt einen Supabase Client mit dem Service Role Key (Admin-Rechte).
 */
const createAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        const errorMessage = "KRITISCHER FEHLER: SUPABASE Admin Credentials fehlen. Prüfung: NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY nicht geladen.";
        console.error(errorMessage);
        // Wir werfen hier einen Fehler, um klare Log-Meldungen zu gewährleisten.
        throw new Error(errorMessage); 
    }
    
    // Erstellt den Client nur, wenn beide Strings vorhanden sind.
    return createClient(url, key);
};


// ---------------------------------------------
// FUNKTION 1: Alle aktiven Partner abrufen
// ---------------------------------------------
export async function getAllPartners(): Promise<Partner[]> {
    const supabaseAdmin = createAdminClient();

    // KRITISCH: Die SELECT-Anweisung muss ALLE verwendeten Spalten enthalten, 
    // um den Fehler "column profiles.created_at does not exist" zu vermeiden.
    const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select(`
            id, 
            company_name, 
            contact_person, 
            sales_status, 
            created_at,   
            updated_at,   
            address, 
            email, 
            phone_number, 
            notes, 
            website, 
            location_link, 
            sub_branch_count, 
            meeting_date, 
            last_visit, 
            next_visit
        `)
        .order('created_at', { ascending: false });

    if (error) {
        // Bei einem Fehler wird dieser in der Konsole ausgegeben und ein leeres Array zurückgegeben.
        console.error("Partner abrufen Fehler:", JSON.stringify(error, null, 2));
        return [];
    }

    // Mappen der Profile in das Partner-Interface, mit Fallbacks
    // HINWEIS: Die Typisierung 'as Partner[]' setzt voraus, dass die abgerufenen Spalten
    // mit dem 'Partner'-Interface übereinstimmen.
    return profiles.map(p => ({
        // Alle abgerufenen Daten übernehmen
        ...p,
        // Typen-Assurance und Fallbacks (falls erforderlich)
        id: p.id as string, 
        // WICHTIG: Wenn Sie 'email: 'N/A'' hart codieren, wird die echte E-Mail ignoriert.
        // Besser ist p.email || 'N/A', aber wir behalten Ihre Struktur bei, falls das Mapping dies erfordert:
        email: p.email || 'N/A', 
        sales_status: p.sales_status || 'İlk Temas' as PartnerSalesStatus, 
        
        // Stellen Sie sicher, dass alle optionalen Felder, die nicht im SELECT enthalten sind,
        // hier mit Fallbacks versehen sind, falls das 'Partner' Interface dies erfordert.
    })) as Partner[];
}
// ---------------------------------------------
// FUNKTION 2: Partner-Status aktualisieren (FÜR StatusDropdown)
// ---------------------------------------------
export async function updatePartnerSalesStatus(
    partnerId: string, 
    newStatus: PartnerSalesStatus
): Promise<PartnerActionState> {
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ sales_status: newStatus })
        .eq('id', partnerId);

    if (error) {
        console.error("Status Update Fehler:", error);
        return { success: false, message: `Status konnte nicht aktualisiert werden: ${error.message}` };
    }

    revalidatePath('/admin/partners');
    revalidatePath('/admin/dashboard');

    return { success: true, message: `Status erfolgreich auf '${newStatus}' aktualisiert.` };
}

// ---------------------------------------------
// FUNKTION 3: Partner löschen
// ---------------------------------------------
/**
 * Löscht den Partner, einschließlich des Auth-Users und des Profiles.
 */
export async function deletePartner(partnerId: string): Promise<PartnerActionState> {
    const supabaseAdmin = createAdminClient();

    try {
        // 1. Profil löschen
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', partnerId);

        if (profileError) {
             console.error("Profil Löschfehler:", profileError);
             // KRITISCH: Wir werfen hier einen Fehler, wenn die Profil-Löschung fehlschlägt!
             throw new Error(`FEHLER: Profil konnte nicht aus der Datenbank gelöscht werden. Grund: ${profileError.message}`);
        }

        // 2. Auth-Benutzer löschen (wird nur ausgeführt, wenn 1 erfolgreich war)
        // Dies löscht das zugehörige Konto in auth.users.
        const { error: userError } = await supabaseAdmin.auth.admin.deleteUser(partnerId);

        if (userError) {
            // Wir loggen den Fehler, aber verhindern keine erfolgreiche Rückgabe,
            // wenn der Auth-User bereits gelöscht war oder nicht existierte.
            if (!userError.message.includes("does not exist")) {
                console.error("Benutzer Löschfehler (Auth):", userError);
                // Wichtig: Wir melden Erfolg, da das Profil (der sichtbare Teil) gelöscht ist.
            }
        }
        
        // 3. Cache invalidieren, damit die Liste aktualisiert wird
revalidatePath('/admin/partners'); // DIES IST KRITISCH
revalidatePath('/admin/dashboard');

return { success: true, message: 'Partner erfolgreich gelöscht.' };

    } catch (error: any) {
        console.error("Partner Löschfehler im Catch:", error.message);
        // Gibt den genauen Fehler an die Konsole zurück, falls das Löschen fehlschlägt
        return { success: false, message: `Fehler beim Löschen des Partners: ${error.message || 'Unbekannter Fehler'}` };
    }
}


// ---------------------------------------------
// FUNKTION 4: Neuen Partner erstellen
// ---------------------------------------------
export async function createPartnerProfile(
    prevState: PartnerActionState, 
    formData: FormData
): Promise<PartnerActionState> {
    const supabaseAdmin = createAdminClient();
    
    // ALLE DATEN AUS DEM FORMULAR EXTRAHIEREN
    const company_name = formData.get('company_name') as string;
    const contact_person = formData.get('contact_person') as string;
    const sales_status = formData.get('sales_status') as PartnerSalesStatus;
    
    const address = formData.get('address') as string | null;
    const email = formData.get('email') as string | null;
    const phone_number = formData.get('phone_number') as string | null;
    const notes = formData.get('notes') as string | null;
    const website = formData.get('website') as string | null;
    const location_link = formData.get('location_link') as string | null;
    const sub_branch_count = parseInt(formData.get('sub_branch_count') as string) || 0;
    
    // Datumsfelder behandeln
    const meeting_date = formData.get('meeting_date') ? new Date(formData.get('meeting_date') as string).toISOString() : null;
    const last_visit = formData.get('last_visit') ? new Date(formData.get('last_visit') as string).toISOString() : null;
    const next_visit = formData.get('next_visit') ? new Date(formData.get('next_visit') as string).toISOString() : null;

    // Datenvalidierung (minimal)
    if (!company_name || !contact_person) {
        return { success: false, message: "Bitte Firma und Ansprechpartner eingeben." };
    }

    // KRITISCHER SCHRITT: EINE NEUE UUID GENERIEREN, UM DEN 'not-null' FEHLER ZU BEHEBEN
    const newPartnerId = randomUUID(); 

    // Profil in die Datenbank schreiben
    const { error } = await supabaseAdmin
        .from('profiles')
        .insert({
            // WICHTIG: ID HIER MANUELL EINFÜGEN
            id: newPartnerId, 
            
            // Eingefügte Werte
            company_name,
            contact_person,
            sales_status, 
            address,
            email,
            phone_number,
            notes,
            website,
            location_link,
            sub_branch_count,
            meeting_date,
            last_visit,
            next_visit,
        })
        .select('id')
        .single();


    if (error) {
        console.error("Partner-Erstellung Fehler:", error);
        return { success: false, message: `Partner konnte nicht erstellt werden: ${error.message}` };
    }

    // Cache invalidieren, damit der neue Partner in der Liste erscheint
    revalidatePath('/admin/partners');

    return { success: true, message: `Partner '${company_name}' erfolgreich erstellt.` };
}

// FUNKTION 5: Partner-Profil bearbeiten
// ---------------------------------------------
export async function updatePartnerProfile(
    partnerId: string, // Die ID wird benötigt, um zu wissen, welche Zeile aktualisiert werden soll
    prevState: PartnerActionState, 
    formData: FormData
): Promise<PartnerActionState> {
    const supabaseAdmin = createAdminClient();
    
    // ALLE DATEN AUS DEM FORMULAR EXTRAHIEREN (MUSS GLEICH SEIN WIE BEIM ERSTELLEN)
    const company_name = formData.get('company_name') as string;
    const contact_person = formData.get('contact_person') as string;
    const sales_status = formData.get('sales_status') as PartnerSalesStatus;
    
    // ... (Alle anderen Felder extrahieren, wie in createPartnerProfile) ...
    const address = formData.get('address') as string | null;
    const email = formData.get('email') as string | null;
    const phone_number = formData.get('phone_number') as string | null;
    const notes = formData.get('notes') as string | null;
    const website = formData.get('website') as string | null;
    const location_link = formData.get('location_link') as string | null;
    const sub_branch_count = parseInt(formData.get('sub_branch_count') as string) || 0;
    
    // Datumsfelder behandeln
    const meeting_date = formData.get('meeting_date') ? new Date(formData.get('meeting_date') as string).toISOString() : null;
    const last_visit = formData.get('last_visit') ? new Date(formData.get('last_visit') as string).toISOString() : null;
    const next_visit = formData.get('next_visit') ? new Date(formData.get('next_visit') as string).toISOString() : null;

    if (!company_name || !contact_person) {
        return { success: false, message: "Firma und Ansprechpartner müssen angegeben werden." };
    }

    // PROFIL AKTUALISIEREN
    const { error } = await supabaseAdmin
        .from('profiles')
        .update({
            company_name,
            contact_person,
            sales_status, 
            address,
            email,
            phone_number,
            notes,
            website,
            location_link,
            sub_branch_count,
            meeting_date,
            last_visit,
            next_visit,
        })
        .eq('id', partnerId); // KRITISCH: Nur diese ID aktualisieren!

    if (error) {
        console.error("Partner-Update Fehler:", error);
        return { success: false, message: `Partner konnte nicht aktualisiert werden: ${error.message}` };
    }

    revalidatePath('/admin/partners');
    // redirect('/admin/partners'); // Optionale Weiterleitung

    return { success: true, message: `Partner '${company_name}' erfolgreich aktualisiert.` };
}

// FUNKTION 6: Partner nach ID abrufen
// ---------------------------------------------
export async function getPartnerById(partnerId: string): Promise<Partner | null> {
    const supabaseAdmin = createAdminClient();
    
    // Wir fragen alle notwendigen Spalten ab, um das Formular vorzufüllen
    const { data: partner, error } = await supabaseAdmin
        .from('profiles')
        .select(`
            id, 
            company_name, 
            contact_person, 
            sales_status, 
            address, 
            email, 
            phone_number, 
            notes, 
            website, 
            location_link, 
            sub_branch_count, 
            meeting_date, 
            last_visit, 
            next_visit,
            created_at,
            updated_at
        `)
        .eq('id', partnerId) // KRITISCH: Nur den Partner mit dieser ID holen
        .single(); // Nur ein Ergebnis erwarten

    if (error) {
        console.error("Fehler beim Abrufen des Partners:", error);
        return null;
    }

    // Rückgabe des Partners (wir verwenden hier direkt das abgerufene Objekt, da es vollständig ist)
    return partner as Partner;
}