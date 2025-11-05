// src/app/actions/favoriten-actions.ts
// KORRIGIERTE VERSION (await cookies + await createClient)

'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren

// Typ für Rückgabewert definieren (optional, aber gut)
type ActionResult = {
    success?: boolean;
    error?: string;
};

export async function toggleFavoriteAction(
    urunId: string, 
    isCurrentlyFavorited: boolean
): Promise<ActionResult> { // Rückgabetyp verwenden

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt

    if (!user) {
        return { error: "Lütfen giriş yapın." };
    }

    if (isCurrentlyFavorited) {
        // Favorit entfernen
        const { error } = await supabase.from('favori_urunler')
            .delete()
            .match({ kullanici_id: user.id, urun_id: urunId });
        
        if (error) {
            console.error("Fehler beim Entfernen des Favoriten:", error);
            return { error: "Favori kaldırılamadı." };
        }

    } else {
        // Favorit hinzufügen
        const { error } = await supabase.from('favori_urunler').insert({
            kullanici_id: user.id,
            urun_id: urunId
        });

        if (error) {
             console.error("Fehler beim Hinzufügen des Favoriten:", error);
             // Prüfen auf Unique-Constraint-Fehler (falls Benutzer schnell doppelt klickt)
             if (error.code === '23505') { // Unique violation
                return { success: true }; // Ist bereits favorisiert, alles gut
             }
            return { error: "Favori eklenemedi." };
        }
    }
    
    // Relevante Seiten neu validieren, damit die Änderungen sofort sichtbar sind
    revalidatePath('/portal/katalog');
    revalidatePath(`/portal/katalog/${urunId}`); // Annahme: Es gibt eine Produktdetailseite
    revalidatePath('/portal/siparisler/yeni'); // Annahme: Schnellbestellung
    revalidatePath('/portal/dashboard'); // Dashboard (Favoriten-Zähler)

    return { success: true };
}