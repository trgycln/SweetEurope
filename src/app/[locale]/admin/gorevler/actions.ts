// src/app/[locale]/admin/gorevler/actions.ts
// KORRIGIERTE VERSION (await cookies + await createClient)

'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Enums } from '@/lib/supabase/database.types'; // Import für Typisierung (Enums ist bereits vorhanden)

// Typ für Rückgabewert definieren (optional, aber gut)
type ActionResult = {
    success?: string; // Erfolgsmeldung
    error?: string;   // Fehlermeldung
};

// Diese Funktion aktualisiert den Status einer Aufgabe
export async function gorevDurumGuncelleAction(
    gorevId: string,
    yeniDurum: boolean // true = tamamlandi, false = geri al
): Promise<ActionResult> { // Rückgabetyp verwenden

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // Benutzerprüfung
    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        return { error: "Nicht authentifiziert." }; // Angepasst
    }
    
    // Optional: Rollenprüfung (nur Admins/Teammitglieder dürfen?)
    // const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    // if (profile?.rol !== 'Yönetici' && profile?.rol !== 'Ekip Üyesi') {
    //     return { error: "Keine Berechtigung." };
    // }

    // Status in der Datenbank aktualisieren
    const { error } = await supabase
        .from('gorevler')
        .update({ tamamlandi: yeniDurum })
        .eq('id', gorevId);

    if (error) {
        console.error("Fehler beim Aktualisieren des Aufgabenstatus:", error);
        return { error: "Status konnte nicht aktualisiert werden." }; // Angepasst
    }

    // Cache für die Hauptseite neu validieren
    revalidatePath('/admin/gorevler');
    
    // Optional: Auch relevante CRM-Seiten revalidieren, falls die Aufgabe dort angezeigt wird
    // (Dafür bräuchten wir die firmaId)
    // revalidatePath(`/admin/crm/firmalar/.../gorevler`);

    // Erfolgsmeldung basierend auf der Aktion zurückgeben
    const message = yeniDurum ? "Aufgabe als erledigt markiert." : "Aufgabe wieder geöffnet."; // Angepasst
    return { success: message };
}