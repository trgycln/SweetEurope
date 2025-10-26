// src/app/[locale]/admin/operasyon/siparisler/actions.ts
// KORRIGIERTE VERSION (await cookies + await createClient)

'use server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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