// src/app/actions/siparis-actions.ts
// KORRIGIERTE & VOLLSTÄNDIGE VERSION (await cookies + await createClient in allen Funktionen + Logging)

'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Enums, Tables, Database } from "@/lib/supabase/database.types"; // Database hinzugefügt
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers"; // <-- WICHTIG: Importiert
import { SupabaseClient } from "@supabase/supabase-js"; // Typ für Client importieren
import { redirect } from 'next/navigation'; // Import für Redirect

// Typ für Rückgabewerte
type ActionResult = {
    success?: boolean;
    error?: string;
    orderId?: string; // Für create Action
    data?: any; // Für andere Actions optional
    message?: string; // Für Erfolgs-/Fehlermeldungen
};

// Typ für Artikel-Payload in der create-Funktion
type OrderItemPayload = {
    urun_id: string;
    adet: number;
    o_anki_satis_fiyati: number;
};

// Hilfsfunktion: Yöneticilere bildirim gönderme
// Empfängt den initialisierten Supabase Client
async function yoneticilereBildirimGonder(
    supabase: SupabaseClient<Database>, // Client übergeben
    mesaj: string,
    link: string
): Promise<void> {
    // KEINE NEUE CLIENT-ERSTELLUNG HIER!
    const { data: yoneticiler, error: profilError } = await supabase
        .from('profiller')
        .select('id')
        .in('rol', ['Yönetici', 'Ekip Üyesi']); // Nur relevante Rollen

    if (profilError) {
        console.error("Fehler beim Abrufen der Admins/Teammitglieder für Benachrichtigung:", profilError);
        return; // Stiller Fehler
    }

    if (yoneticiler && yoneticiler.length > 0) {
        const bildirimler = yoneticiler.map(y => ({
            alici_id: y.id,
            icerik: mesaj,
            link: link
        }));
        const { error: insertError } = await supabase.from('bildirimler').insert(bildirimler);
        if (insertError) {
             console.error("Fehler beim Einfügen der Admin-Benachrichtigungen:", insertError);
        } else {
             console.log(`${bildirimler.length} Admin(s)/Teammitglied(er) benachrichtigt.`);
        }
    }
}

// === HAUPTFUNKTION: BESTELLUNG ERSTELLEN (MIT DETAILLIERTEM LOGGING) ===
export async function siparisOlusturAction(payload: {
    firmaId: string,
    teslimatAdresi: string,
    items: OrderItemPayload[],
    kaynak: Enums<'siparis_kaynagi'>
}): Promise<ActionResult> {

    // --- LOGGING START ---
    console.log("--- siparisOlusturAction gestartet ---");
    // Logge den gesamten empfangenen Payload
    console.log("Empfangener Payload:", JSON.stringify(payload, null, 2));
    // Logge spezifisch die problematischen Teile
    console.log("Payload firmaId:", payload?.firmaId);
    console.log("Payload items vorhanden:", !!payload?.items);
    console.log("Payload items Länge:", payload?.items?.length);
    console.log("Payload items Inhalt (erste 2):", payload?.items?.slice(0, 2)); // Logge die ersten paar Items
    // --- LOGGING ENDE ---

    // --- Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE ---

    // Benutzerprüfung
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error("-> Fehler: Nicht authentifiziert.");
        return { error: "Nicht authentifiziert. Bitte einloggen." };
    }

    // --- VALIDIERUNG (mit zusätzlichem Logging) ---
    if (!payload || !payload.firmaId || !payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
        console.error("-> Fehler: Payload unvollständig!", {
            hasPayload: !!payload,
            hasFirmaId: !!payload?.firmaId,
            hasItems: !!payload?.items,
            isItemsArray: Array.isArray(payload?.items), // Prüfen ob Array
            itemsLength: payload?.items?.length
        });
        // Dies ist die Fehlermeldung, die der Benutzer sieht
        return { error: "Kunden- oder Produktinformationen fehlen." };
    }
    // --- ENDE VALIDIERUNG ---


    console.log("Payload ist gültig. Rufe RPC auf...");
    // RPC-Funktion aufrufen
    const { data: rpcResultData, error: rpcError } = await supabase.rpc('create_order_with_items_and_update_stock', {
        p_firma_id: payload.firmaId,
        p_teslimat_adresi: payload.teslimatAdresi,
        p_items: payload.items,
        p_olusturan_kullanici_id: user.id,
        p_olusturma_kaynagi: payload.kaynak
    })
    // Annahme: RPC gibt die ID als String oder Objekt zurück
    .select() // Wichtig, wenn RPC eine Tabelle/Zeile zurückgibt
    .single();

    // ID aus dem Ergebnis extrahieren (Annahme: RPC gibt { order_id: '...' } oder nur die ID zurück)
    const newOrderId = typeof rpcResultData === 'string' ? rpcResultData : (rpcResultData as any)?.order_id;

    if (rpcError || !newOrderId) {
        console.error("Fehler beim RPC-Aufruf 'create_order_...':", rpcError);
        console.log("RPC Ergebnisdaten (bei Fehler):", rpcResultData);
        return { error: `Datenbankfehler beim Erstellen der Bestellung.${rpcError ? ` Details: ${rpcError.message}`: ''}` };
    }

    // Wenn Bestellung vom Kundenportal kommt, Admins benachrichtigen
    if (payload.kaynak === 'Müşteri Portalı') {
        try {
             const { data: firma } = await supabase.from('firmalar').select('unvan').eq('id', payload.firmaId).single();
             const mesaj = `${firma?.unvan || 'Ein Partner'} hat eine neue Bestellung (#${newOrderId.substring(0,8)}) erstellt.`;
             const link = `/admin/operasyon/siparisler/${newOrderId}`;
             await yoneticilereBildirimGonder(supabase, mesaj, link); // Client übergeben
        } catch(notifyError) {
             console.error("Fehler beim Senden der Admin-Benachrichtigung:", notifyError);
        }
    }

    // Cache für relevante Seiten neu validieren
    revalidatePath('/admin/urun-yonetimi/urunler');
    revalidatePath(`/admin/crm/firmalar/${payload.firmaId}/siparisler`);
    revalidatePath('/admin/operasyon/siparisler');
    revalidatePath('/portal/siparisler');

    console.log(`Bestellung ${newOrderId} erfolgreich erstellt.`);
    return { success: true, orderId: newOrderId };
}


// === BESTELLSTATUS AKTUALISIEREN ===
export async function siparisDurumGuncelleAction(
    siparisId: string,
    yeniDurum: Enums<'siparis_durumu'>
): Promise<ActionResult> {

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // Benutzerprüfung
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "Nicht authentifiziert." };
    }

    // RPC-Funktion aufrufen
    const { error: rpcError } = await supabase.rpc('update_order_status_and_log_activity', {
        p_siparis_id: siparisId,
        p_yeni_status: yeniDurum,
        p_kullanici_id: user.id
    });

    if (rpcError) {
        console.error("Fehler beim RPC-Aufruf 'update_order_status...':", rpcError);
        return { error: "Datenbankfehler beim Aktualisieren des Status." };
    }

    // Cache neu validieren
    revalidatePath(`/admin/operasyon/siparisler/${siparisId}`);
    revalidatePath('/admin/operasyon/siparisler');
    // TODO: Pfade für CRM und Portal hinzufügen, falls nötig und korrekt

    console.log(`Bestellstatus für ${siparisId} erfolgreich auf ${yeniDurum} aktualisiert.`);
    return { success: true, message: "Status erfolgreich aktualisiert." };
}

// === RECHNUNGS-DOWNLOAD-LINK ERZEUGEN ===
export async function getInvoiceDownloadUrlAction(siparisId: string): Promise<ActionResult> {

    // --- KORREKTUR (FALLS AUTH BENÖTIGT): Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // TODO: Implementieren Sie die Logik zum Abrufen des Rechnungspfads und Erstellen der signierten URL
    console.warn("Funktion getInvoiceDownloadUrlAction ist nicht vollständig implementiert.");
    return { error: "Funktion noch nicht implementiert." };

    /* Beispiel-Logik:
    try {
        const { data: fatura, error: faturaError } = await supabase
            .from('faturalar')
            .select('dosya_url')
            .eq('siparis_id', siparisId)
            .maybeSingle(); // Kann null sein

        if (faturaError) throw faturaError;
        if (!fatura || !fatura.dosya_url) {
            return { error: "Rechnung für diese Bestellung nicht gefunden." };
        }

        const bucketName = 'rechnungen'; // Ihren Bucket-Namen einsetzen
        const filePath = fatura.dosya_url;
        const expiresIn = 60 * 5; // 5 Minuten Gültigkeit

        const { data: urlData, error: urlError } = await supabase
            .storage
            .from(bucketName)
            .createSignedUrl(filePath, expiresIn);

        if (urlError) throw urlError;

        return { success: true, data: { downloadUrl: urlData.signedUrl } };

    } catch (error: any) {
        console.error("Fehler beim Erstellen der signierten URL:", error);
        return { error: "Fehler beim Erzeugen des Download-Links." };
    }
    */
}

// === BESTELLUNG STORNIEREN (VOM KUNDENPORTAL) ===
export async function iptalSiparisAction(formData: FormData): Promise<ActionResult> {

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // 1. Benutzer und Profil abrufen
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Nicht authentifiziert.' };
    }
    const { data: profile } = await supabase.from('profiller').select('firma_id').eq('id', user.id).single();
    if (!profile || !profile.firma_id) {
        console.error(`Profil oder Firma-ID nicht gefunden für Benutzer: ${user.id}`);
        return { error: 'Profil oder Firmeninformation nicht gefunden.' };
    }

    // 2. Bestell-ID aus Formulardaten holen
    const siparisId = formData.get('siparisId') as string | null;
    if (!siparisId) {
        return { error: 'Bestell-ID fehlt.' };
    }

    try {
        // 3. Bestellung finden und Status/Besitzer prüfen
        const { data: siparis, error: fetchError } = await supabase
            .from('siparisler')
            .select('id, siparis_durumu, firma_id')
            .eq('id', siparisId)
            .single();

        if (fetchError || !siparis) {
             console.error(`Bestellung ${siparisId} nicht gefunden oder Fehler:`, fetchError);
            return { error: 'Bestellung nicht gefunden.' };
        }

        // 4. Berechtigungsprüfung
        if (siparis.firma_id !== profile.firma_id) {
            console.warn(`Benutzer ${user.id} (Firma ${profile.firma_id}) versuchte, Bestellung ${siparisId} (Firma ${siparis.firma_id}) zu stornieren.`);
            return { error: 'Sie haben keine Berechtigung, diese Bestellung zu ändern.' };
        }

        // 5. Statusprüfung
        // Annahme: Nur 'Beklemede' oder 'processing' können storniert werden
        if (siparis.siparis_durumu !== 'Beklemede' && siparis.siparis_durumu !== 'processing') {
            return { error: `Nur Bestellungen im Status 'Beklemede' oder 'Processing' können storniert werden. Aktueller Status: ${siparis.siparis_durumu}` };
        }

        // 6. Status aktualisieren
        // WICHTIG: Korrekten Enum-Wert verwenden!
        const CANCELLED_STATUS: Enums<'siparis_durumu'> = 'İptal Edildi'; // Oder 'cancelled' etc.
        const { error: updateError } = await supabase
            .from('siparisler')
            .update({ siparis_durumu: CANCELLED_STATUS })
            .eq('id', siparisId);

        if (updateError) {
             console.error(`Fehler beim Aktualisieren des Bestellstatus für ${siparisId}:`, updateError);
            throw updateError;
        }

        // TODO Optional: Lagerbestand wieder erhöhen? (Besser DB-Funktion/Trigger)

        // 7. Cache neu validieren und Erfolg melden
        revalidatePath(`/portal/siparisler/${siparisId}`);
        revalidatePath('/portal/siparisler');
        revalidatePath(`/admin/operasyon/siparisler/${siparisId}`);
        revalidatePath('/admin/operasyon/siparisler');
        revalidatePath(`/admin/crm/firmalar/${siparis.firma_id}/siparisler`);

        console.log(`Bestellung ${siparisId} erfolgreich storniert durch Benutzer ${user.id}`);
        return { success: true, message: 'Bestellung erfolgreich storniert.' };

    } catch (e: any) {
        console.error(`Unerwarteter Fehler beim Stornieren der Bestellung ${siparisId}:`, e);
        return { error: 'Serverfehler beim Stornieren der Bestellung.' };
    }
}