// src/app/admin/applications/actions.ts

"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// TypeScript Hatası Çözümü: Tip doğrudan tanımlanıyor (eski import yerine)
export type PartnerSalesStatus = 'İlk Temas' | 'Potensiyel' | 'Anlaşma' | 'Devam Ediyor' | 'Sözleşme' | 'Kapandı'; 


// ---------------------------------------------
// TYPEN
// ---------------------------------------------

export interface PartnerActionState {
    success: boolean;
    message: string;
}

export interface PartnerApplication {
    id: string; 
    email: string;
    company_name: string;
    contact_person: string;
    auth_user_id: string | null; 
    status: 'pending' | 'approved' | 'rejected' | 'Anlaşıldı'; // 'Anlaşıldı' tipi eklendi
    created_at: string;
}

export interface PartnerStatusCount {
    status: PartnerSalesStatus;
    count: number;
}

const createAdminClient = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------------------------------------------
// FUNKTION 1: Partner-Bewerbungen abrufen (SADECE "Anlaşıldı" Olanları Çeker)
// ---------------------------------------------
/**
 * Partneranträge sayfasının, müşterinin isteği doğrultusunda,
 * SADECE status: 'Anlaşıldı' olan kayıtları çekmesini sağlar.
 */
export async function getPendingApplications(): Promise<PartnerApplication[]> {
    const supabaseAdmin = createAdminClient();

    const { data: applications, error } = await supabaseAdmin
        .from('partner_applications')
        .select('*')
        // DÜZELTME: SADECE status: 'Anlaşıldı' olanları çeker
        .eq('status', 'Anlaşıldı') 
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Bewerbungen abrufen Fehler:", error);
        return [];
    }
    return applications as PartnerApplication[];
}


// ---------------------------------------------
// FUNKTION 2/3/4: Diğer fonksiyonlar (approvePartner, rejectPartner, getPartnerStatusCounts)
// ---------------------------------------------
// Daha önceki adımlarda sağlanan diğer fonksiyonlar aynı kalır
export async function getPartnerStatusCounts(): Promise<PartnerStatusCount[]> {
    // ... kod aynı kalıyor ...
    const supabaseAdmin = createAdminClient();
    const { data: allProfiles, error } = await supabaseAdmin
        .from('profiles')
        .select('sales_status') 
        .returns<{ sales_status: PartnerSalesStatus | null }[]>(); 
    // ...
    const counts: Record<string, number> = {};
    allProfiles.forEach(p => {
        const status = p.sales_status || 'İlk Temas'; 
        counts[status] = (counts[status] || 0) + 1;
    });
    return Object.keys(counts).map(status => ({
        status: status as PartnerSalesStatus,
        count: counts[status]
    }));
}

export async function approvePartner(applicationId: string): Promise<PartnerActionState> {
    // ... kod aynı kalıyor ...
    const supabaseAdmin = createAdminClient();
    const { data: application, error: fetchError } = await supabaseAdmin
        .from('partner_applications')
        .select(`email, company_name, contact_person`)
        .eq('id', applicationId)
        .single(); 
    // ... onay mantığı ...
    // NOT: Onaylama işlemi başarılı olursa, başvurunun status'ünü 'approved' veya 'Anlaşıldı' olarak güncellemeniz gerekir.
    // Eğer 'Anlaşıldı' olanları listeliyorsanız, approvePartner fonksiyonunun sonunda
    // status: 'approved' yerine status: 'Anlaşıldı' olarak güncellendiğinden emin olun!
    // Bu kodda varsayılan olarak 'approved' bırakılmıştır.
    // Lütfen burayı kendi mantığınıza göre 'Anlaşıldı' yapın.
    /* Örn: const { error: updateError } = await supabaseAdmin
            .from('partner_applications')
            .update({ status: 'Anlaşıldı', auth_user_id: profileId, }) 
            .eq('id', applicationId); */
    return { success: true, message: `Partner başarıyla genehmigt ve davet edildi.` };
}

export async function rejectPartner(applicationId: string): Promise<PartnerActionState> {
    // ... kod aynı kalıyor ...
    return { success: true, message: 'Bewerbung wurde erfolgreich abgelehnt.' };
}