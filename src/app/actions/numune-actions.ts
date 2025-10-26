// src/app/actions/numune-actions.ts
// KORRIGIERTE VERSION (await cookies + await createClient in allen Funktionen)
'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Enums, Tables, Database } from "@/lib/supabase/database.types"; // Database hinzugefügt
import { sendNotification } from '@/lib/notificationUtils';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { SupabaseClient } from "@supabase/supabase-js"; // Typ importieren

// Typ für Rückgabewerte
type ActionResult = {
    success: boolean;
    message?: string;
    error?: string;
};

// Typ für verknüpfte Daten
type NumuneTalepWithDetails = Tables<'numune_talepleri'> & {
    firmalar: Pick<Tables<'firmalar'>, 'unvan'> | null;
    urunler: Pick<Tables<'urunler'>, 'ad'> | null;
};

// Funktion: Partner erstellt eine Musteranfrage
export async function createNumuneTalepAction(
    urunId: string,
    firmaId: string
): Promise<ActionResult> {

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        return { success: false, error: "Nicht authentifiziert. Bitte einloggen." };
    }

    if (!urunId || !firmaId) {
         return { success: false, error: "Produkt- oder Firmeninformationen fehlen." };
    }

    // Daten für Benachrichtigung parallel abrufen (optional, aber effizient)
    const [firmaRes, urunRes] = await Promise.all([
        supabase.from('firmalar').select('unvan').eq('id', firmaId).single(),
        supabase.from('urunler').select('ad').eq('id', urunId).single()
    ]);
    
    const firmaAdi = firmaRes.data?.unvan || `Firma ID: ${firmaId.substring(0, 8)}...`;
    const urunAdi = urunRes.data?.ad ? (Object.values(urunRes.data.ad)[0] as string || 'unbekanntes Produkt') : 'unbekanntes Produkt';

    // Anfrage einfügen
    const { error: insertError, data: insertedData } = await supabase
        .from('numune_talepleri')
        .insert({
            urun_id: urunId,
            firma_id: firmaId,
            durum: 'Yeni Talep'
        })
        .select('id')
        .single();

    if (insertError) {
        console.error("Fehler Erstellung Musteranfrage:", insertError);
        if (insertError.code === '23505') { // Eindeutigkeitsverletzung (bereits angefragt)
             return { success: true, message: "Für dieses Produkt wurde bereits ein Muster angefragt." };
        }
        return { success: false, error: insertError.message.includes('violates row-level security policy') ? "Berechtigung verweigert." : "Anfrage konnte nicht gesendet werden." };
    }

    const newTalepId = insertedData?.id;

    // Benachrichtigung an Admins senden
    const bildirimMesaj = `${firmaAdi}, "${urunAdi}" ürünü için yeni bir numune talebinde bulundu.`;
    const bildirimLink = newTalepId ? `/admin/operasyon/numune-talepleri?q=${newTalepId}` : '/admin/operasyon/numune-talepleri'; // Pfad angepasst
    await sendNotification({
        aliciRol: ['Yönetici', 'Ekip Üyesi'],
        icerik: bildirimMesaj,
        link: bildirimLink,
        supabaseClient: supabase // Client übergeben
    });

    // Cache revalidieren
    revalidatePath(`/portal/katalog/${urunId}`); // Annahme
    revalidatePath('/portal/taleplerim');
    revalidatePath('/admin/operasyon/numune-talepleri'); // Admin-Seite

    return { success: true, message: "Musteranfrage erfolgreich gesendet." };
}


// Funktion: Admin aktualisiert den Status
export async function updateNumuneStatusAction(
    anfrageId: string,
    neuerStatus: Enums<'numune_talep_durumu'>
): Promise<ActionResult> {

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) return { success: false, error: "Nicht authentifiziert." };

    // 1. Anfrage-Daten für Benachrichtigung abrufen
    const { data: talepData, error: fetchError } = await supabase
        .from('numune_talepleri')
        .select('id, firma_id, urunler!inner(ad)') // !inner stellt sicher, dass Produkt existiert
        .eq('id', anfrageId)
        .single();

    if (fetchError || !talepData || !talepData.firma_id) {
        console.error("Musteranfrage zum Aktualisieren nicht gefunden oder Firma-ID fehlt:", fetchError);
        return { success: false, error: "Anfrage nicht gefunden oder unvollständig." };
    }
    
    // Produktnamen sicher extrahieren
    const urunAdi = talepData.urunler?.ad ? (Object.values(talepData.urunler.ad)[0] as string || 'unbekanntes Produkt') : 'unbekanntes Produkt';

    // 2. Status aktualisieren
    const { error: updateError } = await supabase
        .from('numune_talepleri')
        .update({ durum: neuerStatus })
        .eq('id', anfrageId);

    if (updateError) {
        console.error("Fehler beim Aktualisieren des Musterstatus:", updateError);
        return { success: false, error: "Status konnte nicht aktualisiert werden: " + updateError.message };
    }

    // 3. Benachrichtigung an Partner senden
    const bildirimMesaj = `"${urunAdi}" ürünü için numune talebinizin durumu "${neuerStatus}" olarak güncellendi.`;
    const bildirimLink = `/portal/taleplerim`;
    await sendNotification({
        aliciFirmaId: talepData.firma_id,
        icerik: bildirimMesaj,
        link: bildirimLink,
        supabaseClient: supabase
    });

    // 4. Cache revalidieren
    revalidatePath('/admin/operasyon/numune-talepleri'); // Admin
    revalidatePath('/portal/taleplerim'); // Partner

    return { success: true, message: `Status auf "${neuerStatus}" aktualisiert.` };
}

// Funktion: Admin lehnt Anfrage ab
export async function cancelNumuneTalepAction(
    anfrageId: string,
    begruendung: string
): Promise<ActionResult> {

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) return { success: false, error: "Nicht authentifiziert." };
    if (!begruendung || begruendung.trim() === '') return { success: false, error: "Begründung darf nicht leer sein." };

    // 1. Anfrage-Daten für Benachrichtigung abrufen
    const { data: talepData, error: fetchError } = await supabase
        .from('numune_talepleri')
        .select('id, firma_id, urunler!inner(ad)') // !inner
        .eq('id', anfrageId)
        .single();

    if (fetchError || !talepData || !talepData.firma_id) {
        console.error("Abzulehnende Musteranfrage nicht gefunden:", fetchError);
        return { success: false, error: "Anfrage nicht gefunden oder unvollständig." };
    }
    const urunAdi = talepData.urunler?.ad ? (Object.values(talepData.urunler.ad)[0] as string || 'unbekanntes Produkt') : 'unbekanntes Produkt';

    // 2. Status aktualisieren (Ablehnen)
    const { error: updateError } = await supabase
        .from('numune_talepleri')
        .update({
            durum: 'İptal Edildi',
            iptal_aciklamasi: begruendung
        })
        .eq('id', anfrageId);

    if (updateError) {
        console.error("Fehler beim Ablehnen der Musteranfrage:", updateError);
        return { success: false, error: "Anfrage konnte nicht abgelehnt werden." };
    }

    // 3. Benachrichtigung an Partner senden
    const bildirimMesaj = `"${urunAdi}" ürünü için numune talebiniz reddedildi. Sebep: ${begruendung}`;
    const bildirimLink = `/portal/taleplerim`;
    await sendNotification({
        aliciFirmaId: talepData.firma_id,
        icerik: bildirimMesaj,
        link: bildirimLink,
        supabaseClient: supabase
    });

    // 4. Cache revalidieren
    revalidatePath('/admin/operasyon/numune-talepleri'); // Admin
    revalidatePath('/portal/taleplerim'); // Partner

    return { success: true, message: "Anfrage erfolgreich abgelehnt." };
}

// Funktion: Partner storniert seine eigene Anfrage
export async function partnerCancelNumuneTalepAction(
    anfrageId: string
): Promise<ActionResult> {

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) return { success: false, error: "Nicht authentifiziert." };

    // 1. Anfrage-Daten für Benachrichtigung abrufen (bevor sie gelöscht wird!)
    // Wir brauchen RLS, um sicherzustellen, dass der Benutzer nur seine eigenen löschen kann.
    // Nehmen wir an, RLS ist für DELETE konfiguriert (z.B. auth.uid() = (select user_id from firmalar where id = firma_id))
    // Wir holen die Daten unter der Annahme, dass RLS für SELECT dies erlaubt.
    const { data: talepData, error: fetchError } = await supabase
        .from('numune_talepleri')
        .select('id, firma_id, urunler!inner(ad), firmalar!inner(unvan)')
        .eq('id', anfrageId)
        .single();

    if (fetchError || !talepData) {
         console.warn("Konnte Anfragedaten vor dem Löschen nicht abrufen (vielleicht schon gelöscht oder RLS-Problem):", fetchError);
         // Wir fahren trotzdem mit dem Löschen fort, aber können keine Benachrichtigung senden.
    }
    
    // 2. Anfrage löschen
    const { error: deleteError } = await supabase
        .from('numune_talepleri')
        .delete()
        .eq('id', anfrageId);
        // RLS sollte hier greifen und sicherstellen, dass nur der eigene Datensatz gelöscht wird.

    if (deleteError) {
        console.error("Fehler beim Stornieren der Musteranfrage durch Partner:", deleteError);
        return { success: false, error: "Anfrage konnte nicht storniert werden. Möglicherweise wurde sie bereits bearbeitet." };
    }

    // 3. Benachrichtigung an Admins senden (nur wenn Daten vorhanden)
    if (talepData) {
        const firmaAdi = talepData.firmalar?.unvan || 'Ein Partner';
        const urunAdi = talepData.urunler?.ad ? (Object.values(talepData.urunler.ad)[0] as string || 'unbekanntes Produkt') : 'unbekanntes Produkt';
        const bildirimMesaj = `${firmaAdi} hat die Musteranfrage für "${urunAdi}" storniert.`;
        const bildirimLink = `/admin/operasyon/numune-talepleri`;
        await sendNotification({
            aliciRol: ['Yönetici', 'Ekip Üyesi'],
            icerik: bildirimMesaj,
            link: bildirimLink,
            supabaseClient: supabase
        });
    }

    // 4. Cache revalidieren
    revalidatePath('/portal/taleplerim'); // Partner
    revalidatePath('/admin/operasyon/numune-talepleri'); // Admin

    return { success: true, message: "Musteranfrage erfolgreich storniert." };
}