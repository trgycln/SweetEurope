"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
// WICHTIG: Importieren des Sales Status Typs aus partners/actions
import { PartnerSalesStatus } from '../partners/actions'; 


// ---------------------------------------------
// TYPEN
// ---------------------------------------------

export interface PartnerActionState {
    success: boolean;
    message: string;
}

export interface PartnerApplication {
    id: number;
    email: string;
    company_name: string;
    contact_person: string;
    status: 'pending' | 'approved' | 'rejected'; 
    created_at: string;
}

// Typ für das Dashboard (Partner Status Zählung)
export interface PartnerStatusCount {
    status: PartnerSalesStatus;
    count: number;
}


const createAdminClient = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------------------------------------------
// FUNKTION 1: Alle Partner-Bewerbungen abrufen
// ---------------------------------------------
export async function getAllApplications(): Promise<PartnerApplication[]> {
    const supabaseAdmin = createAdminClient();

    const { data: applications, error } = await supabaseAdmin
        .from('partner_applications')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Bewerbungen abrufen Fehler:", error);
        return [];
    }

    return applications as PartnerApplication[];
}

// ---------------------------------------------
// FUNKTION 2: Sales-Status der aktiven Partner zählen (FÜR DASHBOARD)
// ---------------------------------------------
/**
 * Ruft den 'sales_status' aller Profile ab und zählt die Vorkommen.
 * Dies füttert das Dashboard.
 */
export async function getPartnerStatusCounts(): Promise<PartnerStatusCount[]> {
    const supabaseAdmin = createAdminClient();

    // Ruft nur das sales_status Feld ab. Wir erlauben NULL im Rückgabetyp,
    // um den Fehler zu vermeiden, falls die Datenbankspalte fehlt oder leer ist.
    const { data: allProfiles, error } = await supabaseAdmin
        .from('profiles')
        .select('sales_status') 
        .returns<{ sales_status: PartnerSalesStatus | null }[]>(); 

    if (error) {
        // Robustere Fehlerprotokollierung
        console.error("Partner Sales Status Zählung Fehler:", error.message || error);
        return [];
    }

    // Manuelle Gruppierung und Zählung im Code
    const counts: Record<string, number> = {};
    
    // Iteriere über die Profile
    allProfiles.forEach(p => {
        // Fallback: Wenn sales_status NULL ist, verwende den initialen Wert 'İlk Temas'
        const status = p.sales_status || 'İlk Temas'; 
        counts[status] = (counts[status] || 0) + 1;
    });

    // Ergebnis in das erwartete Format konvertieren
    return Object.keys(counts).map(status => ({
        status: status as PartnerSalesStatus,
        count: counts[status]
    }));
}


// ---------------------------------------------
// FUNKTION 3: Partner-Bewerbung genehmigen
// ---------------------------------------------
/**
 * Genehmigt eine Bewerbung, erstellt den Auth-Benutzer und das Profil.
 * Setzt den Sales Status auf den initialen Wert 'İlk Temas'.
 */
export async function approvePartner(applicationId: number): Promise<PartnerActionState> {
    const supabaseAdmin = createAdminClient();
    
    // 1. Bewerbungsdetails abrufen
    const { data: application, error: fetchError } = await supabaseAdmin
        .from('partner_applications')
        .select(`email, company_name, contact_person`)
        .eq('id', applicationId)
        .single();
        
    if (fetchError || !application) {
        return { success: false, message: 'Bewerbung nicht gefunden.' };
    }

    try {
        // 2. Auth-Benutzer einladen/erstellen (dies sendet eine E-Mail mit einem Magic Link)
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.inviteUserByEmail(application.email);

        // Prüfen, ob der Benutzer bereits existiert, was in Ordnung ist
        if (userError && !userError.message.includes("already exists")) {
             throw new Error("Benutzer-Einladung fehlgeschlagen: " + userError.message);
        }
        
        const profileId = userData?.user?.id; 

        // 3. profiles-Tabelle UPSERTEN
        if (profileId) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .upsert({
                    id: profileId, // Nutzt die Auth-ID
                    company_name: application.company_name,
                    contact_person: application.contact_person,
                    status: 'Anlaşıldı', // Der alte/allgemeine Partner-Status
                    sales_status: 'İlk Temas' as PartnerSalesStatus, // Der NEUE initiale Sales Status
                }, { onConflict: 'id' });

            if (profileError) {
                 console.error("Profiles-Upsert Fehler:", profileError);
                 // Warnung: Wir lassen den Prozess bei diesem Fehler nicht abbrechen,
                 // da das Profil möglicherweise schon von einer früheren Einladung existiert.
            }
        }
        
        // 4. partner_applications-Status auf 'approved' aktualisieren
        const { error: updateError } = await supabaseAdmin
            .from('partner_applications')
            .update({ status: 'approved' })
            .eq('id', applicationId);

        if (updateError) throw updateError;
        
        // Caches invalidieren, um alle betroffenen Seiten zu aktualisieren
        revalidatePath('/admin/applications');
        revalidatePath('/admin/partners');
        revalidatePath('/admin/dashboard');

        return { success: true, message: `Partner ${application.company_name} wurde erfolgreich genehmigt und eingeladen.` };

    } catch (error: any) {
        console.error("Partner-Genehmigungsfehler:", error);
        return { success: false, message: `Fehler: ${error.message || 'Unbekannter Fehler'}` };
    }
}


// ---------------------------------------------
// FUNKTION 4: Partner-Bewerbung ablehnen
// ---------------------------------------------
export async function rejectPartner(applicationId: number): Promise<PartnerActionState> {
    const supabaseAdmin = createAdminClient();
    
    try {
        const { error: updateError } = await supabaseAdmin
            .from('partner_applications')
            .update({ status: 'rejected' })
            .eq('id', applicationId);

        if (updateError) throw updateError;
        
        // Caches invalidieren
        revalidatePath('/admin/applications');
        revalidatePath('/admin/dashboard');

        return { success: true, message: 'Bewerbung wurde erfolgreich abgelehnt.' };

    } catch (error: any) {
        console.error("Partner-Ablehnungsfehler:", error);
        return { success: false, message: `Fehler beim Ablehnen der Bewerbung: ${error.message || 'Unbekannter Fehler'}` };
    }
}