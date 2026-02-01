// src/app/[locale]/admin/operasyon/siparisler/actions.ts
// KORRIGIERTE VERSION (await cookies + await createClient)

'use server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { Enums } from '@/lib/supabase/database.types';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren

// Typ für Rückgabewert definieren (optional, aber gut)
type ActionResult = {
    success?: string; // Erfolgsmeldung
    error?: string;   // Fehlermeldung
};

export async function statusAendernAction(
    siparisId: string,
    neuerStatus: Enums<'siparis_durumu'>
): Promise<ActionResult> { // Rückgabetyp verwenden

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // Optional: Benutzerprüfung (wer darf Status ändern?)
    // const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    // if (!user) { return { error: "Nicht authentifiziert." }; }
    // const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    // if (profile?.rol !== 'Yönetici' && profile?.rol !== 'Ekip Üyesi') {
    //     return { error: "Keine Berechtigung zur Statusänderung." };
    // }

    // Status in der Datenbank aktualisieren
    const { error } = await supabase
        .from('siparisler')
        .update({ siparis_durumu: neuerStatus })
        .eq('id', siparisId);

    if (error) {
        console.error(`Fehler bei Statusänderung für Bestellung ${siparisId}:`, error);
        return { error: `Status konnte nicht geändert werden. DB-Fehler: ${error.message}` }; // Detailliertere Fehlermeldung
    }

    // Cache für relevante Seiten neu validieren
    revalidatePath('/admin/operasyon/siparisler');          // Listenseite
    revalidatePath(`/admin/operasyon/siparisler/${siparisId}`); // Detailseite
    // Optional: Auch CRM-Ansichten revalidieren, falls nötig
    // const { data: orderData } = await supabase.from('siparisler').select('firma_id').eq('id', siparisId).single();
    // if (orderData?.firma_id) {
    //     revalidatePath(`/admin/crm/firmalar/${orderData.firma_id}/siparisler`);
    // }


    console.log(`Status für Bestellung ${siparisId} erfolgreich auf ${neuerStatus} geändert.`);
    return { success: `Status wurde auf "${neuerStatus}" geändert.` };
}

export async function assignSiparisPersonelAction(formData: FormData): Promise<ActionResult> {
    const siparisId = formData.get('siparisId') as string | null;
    const personelId = formData.get('personelId') as string | null;

    if (!siparisId) return { error: 'Sipariş ID eksik.' };

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: 'Yetkisiz işlem.' };
    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    const isManager = profile?.rol === 'Yönetici' || profile?.rol === 'Ekip Üyesi';
    if (!isManager) return { error: 'Bu işlemi yapma yetkiniz yok.' };

    const supabaseAdmin = createSupabaseServiceClient();
    const { error } = await supabaseAdmin
        .from('siparisler')
        .update({ atanan_kisi_id: personelId || null })
        .eq('id', siparisId);

    if (error) {
        console.error(`Sipariş atama hatası (${siparisId}):`, error);
        return { error: `Atama yapılamadı: ${error.message}` };
    }

    revalidatePath('/admin/operasyon/siparisler');
    revalidatePath(`/admin/operasyon/siparisler/${siparisId}`);

    return { success: 'Sipariş ataması güncellendi.' };
}