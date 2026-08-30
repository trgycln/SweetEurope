// src/app/actions/siparis-actions.ts
// KORRIGIERTE & VOLLSTÄNDIGE VERSION (await cookies + await createClient in allen Funktionen + Logging)

'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Enums, Tables, Database } from "@/lib/supabase/database.types"; // Database hinzugefügt
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers"; // <-- WICHTIG: Importiert
import { SupabaseClient } from "@supabase/supabase-js"; // Typ für Client importieren
import { sendNotification } from '@/lib/notificationUtils';
import { redirect } from 'next/navigation'; // Import für Redirect

// Typ für Rückgabewerte
type ActionResult = {
    success?: boolean;
    error?: string;
    orderId?: string; // Für create Action
    data?: unknown; // Für andere Actions optional
    message?: string; // Für Erfolgs-/Fehlermeldungen
    url?: string; // Für Download-URLs
};

// Typ für Artikel-Payload in der create-Funktion
type OrderItemPayload = {
    urun_id: string;
    adet: number;
    o_anki_satis_fiyati: number;
};

// === HAUPTFUNKTION: BESTELLUNG ERSTELLEN ===
export async function siparisOlusturAction(payload: {
    firmaId: string,
    teslimatAdresi: string,
    items: OrderItemPayload[],
    kaynak: Enums<'siparis_kaynagi'>,
    siparisTuru?: 'normal' | 'on_siparis'
}): Promise<ActionResult> {

    const isPreOrder = payload.siparisTuru === 'on_siparis';

    // --- Supabase Client initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    // Benutzerprüfung
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "Nicht authentifiziert. Bitte einloggen." };
    }

    // --- VALIDIERUNG ---
    if (!payload || !payload.firmaId || !payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
        return { error: "Kunden- oder Produktinformationen fehlen." };
    }

    // 1. ÖN SİPARİŞ (PRE-ORDER) DURUMU:
    // Ön siparişlerde depodaki anlık stok kontrolü ve stok düşme atlanır.
    if (isPreOrder) {
        let toplamNet = 0;
        payload.items.forEach(item => {
            toplamNet += item.adet * item.o_anki_satis_fiyati;
        });
        const toplamBrut = Number((toplamNet * 1.19).toFixed(2)); // %19 KDV dahil

        // Sipariş ana kaydını oluştur
        const { data: orderData, error: orderError } = await (supabase as any)
            .from('siparisler')
            .insert({
                firma_id: payload.firmaId,
                teslimat_adresi: payload.teslimatAdresi,
                siparis_durumu: 'Ön Sipariş',
                siparis_kaynagi: payload.kaynak,
                olusturan_kullanici_id: user.id,
                siparis_tarihi: new Date().toISOString(),
                toplam_tutar_net: toplamNet,
                toplam_tutar_brut: toplamBrut,
                kdv_orani: 19
            })
            .select('id')
            .single();

        if (orderError || !orderData) {
            console.error("Ön sipariş oluşturma hatası:", orderError);
            return { error: `Ön sipariş oluşturulamadı: ${orderError?.message || 'Veritabanı hatası'}` };
        }

        const newOrderId = orderData.id;

        // Sipariş detaylarını oluştur
        const detayInserts = payload.items.map(item => ({
            siparis_id: newOrderId,
            urun_id: item.urun_id,
            miktar: item.adet,
            birim_fiyat: item.o_anki_satis_fiyati,
            toplam_fiyat: Number((item.adet * item.o_anki_satis_fiyati).toFixed(2))
        }));

        const { error: detayError } = await (supabase as any)
            .from('siparis_detay')
            .insert(detayInserts);

        if (detayError) {
            console.error("Ön sipariş detay ekleme hatası:", detayError);
            return { error: `Ön sipariş detayları kaydedilemedi: ${detayError.message}` };
        }

        // Adminlere bildirim gönder
        if (payload.kaynak === 'Müşteri Portalı') {
            try {
                const { data: firma } = await supabase.from('firmalar').select('unvan').eq('id', payload.firmaId).single();
                const mesaj = `⏳ ${firma?.unvan || 'Bir Müşteri'} yeni bir ÖN SİPARİŞ / TALEP (#${newOrderId.substring(0, 8)}) oluşturdu.`;
                const link = `/admin/operasyon/siparisler/${newOrderId}`;
                await sendNotification({
                    aliciRol: ['Yönetici', 'Personel', 'Ekip Üyesi'],
                    icerik: mesaj,
                    link,
                    preferenceKey: 'order_updates',
                    supabaseClient: supabase
                });
            } catch (notifyError) {
                console.error("Admin bildirimi gönderilemedi:", notifyError);
            }
        }

        revalidatePath('/admin/urun-yonetimi/urunler');
        revalidatePath(`/admin/crm/firmalar/${payload.firmaId}/siparisler`);
        revalidatePath('/admin/operasyon/siparisler');
        revalidatePath('/portal/siparisler');

        return { success: true, orderId: newOrderId, message: "Ön sipariş başarıyla oluşturuldu." };
    }

    // 2. NORMAL SİPARİŞ DURUMU (STOK KONTROLLÜ):
    const urunIds = payload.items.map(item => item.urun_id);
    const { data: stokBilgileri, error: stokError } = await supabase
        .from('urunler')
        .select('id, stok_miktari, ad')
        .in('id', urunIds);

    if (stokError) {
        console.error("Stok bilgisi alınamadı:", stokError);
        return { error: "Stok bilgileri alınırken veritabanı hatası oluştu." };
    }

    for (const item of payload.items) {
        const urun = stokBilgileri?.find(u => u.id === item.urun_id);
        if (!urun) {
            return { error: `Siparişteki bir ürün bulunamadı.` };
        }
        if ((urun.stok_miktari || 0) < item.adet) {
            const urunAd = typeof urun.ad === 'object' && urun.ad ? (urun.ad as any).tr || (urun.ad as any).de || 'Ürün' : String(urun.ad);
            return { error: `Yetersiz stok: ${urunAd} ürününden sadece ${urun.stok_miktari || 0} adet mevcut (İstenen: ${item.adet}). Lütfen sepetinizi güncelleyin.` };
        }
    }

    // RPC-Funktion aufrufen (Stokları düşerek siparişi açar)
    const { data: rpcResultData, error: rpcError } = await supabase.rpc('create_order_with_items_and_update_stock', {
        p_firma_id: payload.firmaId,
        p_teslimat_adresi: payload.teslimatAdresi,
        p_items: payload.items,
        p_olusturan_kullanici_id: user.id,
        p_olusturma_kaynagi: payload.kaynak
    })
    .select()
    .single();

    const data = rpcResultData as any;
    const newOrderId =
        typeof data === 'string'
            ? data
            : data &&
                typeof data === 'object' &&
                'order_id' in data &&
                typeof data.order_id === 'string'
                ? data.order_id
                : null;

    if (rpcError || !newOrderId) {
        console.error("Fehler beim RPC-Aufruf 'create_order_...':", rpcError);
        return { error: `Datenbankfehler beim Erstellen der Bestellung.${rpcError ? ` Details: ${rpcError.message}`: ''}` };
    }

    if (payload.kaynak === 'Müşteri Portalı') {
        try {
            const { data: firma } = await supabase.from('firmalar').select('unvan').eq('id', payload.firmaId).single();
            const mesaj = `${firma?.unvan || 'Ein Partner'} hat eine neue Bestellung (#${newOrderId.substring(0, 8)}) erstellt.`;
            const link = `/admin/operasyon/siparisler/${newOrderId}`;
            await sendNotification({
                aliciRol: ['Yönetici', 'Personel', 'Ekip Üyesi'],
                icerik: mesaj,
                link,
                preferenceKey: 'order_updates',
                supabaseClient: supabase
            });
        } catch (notifyError) {
            console.error("Fehler beim Senden der Admin-Benachrichtigung:", notifyError);
        }
    }

    revalidatePath('/admin/urun-yonetimi/urunler');
    revalidatePath(`/admin/crm/firmalar/${payload.firmaId}/siparisler`);
    revalidatePath('/admin/operasyon/siparisler');
    revalidatePath('/portal/siparisler');

    return { success: true, orderId: newOrderId };
}

// === TOPLU SİPARİŞ OLUŞTURMA (NORMAL + ÖN SİPARİŞ AYRIŞTIRICI) ===
export async function topluSiparisOlusturAction(payload: {
    firmaId: string,
    teslimatAdresi: string,
    normalItems: OrderItemPayload[],
    onSiparisItems: OrderItemPayload[],
    kaynak: Enums<'siparis_kaynagi'>
}): Promise<{
    success?: boolean;
    error?: string;
    normalOrderId?: string | null;
    onSiparisOrderId?: string | null;
    message?: string;
}> {
    let normalOrderId: string | null = null;
    let onSiparisOrderId: string | null = null;

    // 1. Normal Sipariş oluştur (varsa)
    if (payload.normalItems && payload.normalItems.length > 0) {
        const normalRes = await siparisOlusturAction({
            firmaId: payload.firmaId,
            teslimatAdresi: payload.teslimatAdresi,
            items: payload.normalItems,
            kaynak: payload.kaynak,
            siparisTuru: 'normal'
        });

        if (normalRes.error) {
            return { error: `Normal sipariş oluşturulamadı: ${normalRes.error}` };
        }
        normalOrderId = normalRes.orderId || null;
    }

    // 2. Ön Sipariş oluştur (varsa)
    if (payload.onSiparisItems && payload.onSiparisItems.length > 0) {
        const onSiparisRes = await siparisOlusturAction({
            firmaId: payload.firmaId,
            teslimatAdresi: payload.teslimatAdresi,
            items: payload.onSiparisItems,
            kaynak: payload.kaynak,
            siparisTuru: 'on_siparis'
        });

        if (onSiparisRes.error) {
            return {
                error: `Ön sipariş oluşturulurken hata: ${onSiparisRes.error}${normalOrderId ? ' (Normal siparişiniz oluşturulmuştu).' : ''}`,
                normalOrderId
            };
        }
        onSiparisOrderId = onSiparisRes.orderId || null;
    }

    let mesaj = "Siparişiniz başarıyla oluşturuldu.";
    if (normalOrderId && onSiparisOrderId) {
        mesaj = "1 Normal Sevkiyat Siparişi ve 1 Ön Sipariş Talebi olmak üzere 2 ayrı sipariş başarıyla oluşturuldu.";
    } else if (onSiparisOrderId) {
        mesaj = "Ön sipariş talebiniz başarıyla kaydedildi.";
    }

    return {
        success: true,
        normalOrderId,
        onSiparisOrderId,
        message: mesaj
    };
}

// === ÖN SİPARİŞİ NORMAL SİPARİŞE DÖNÜŞTÜR (STOK GELDİĞİNDE) ===
export async function onSiparisiNormalSipariseDonusturAction(
    siparisId: string
): Promise<ActionResult> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkisiz işlem." };

    // 1. Siparişi ve detaylarını çek
    const { data: siparis, error: sErr } = await supabase
        .from('siparisler')
        .select(`
            id,
            firma_id,
            siparis_durumu,
            siparis_detay (
                id,
                urun_id,
                miktar
            )
        `)
        .eq('id', siparisId)
        .single();

    if (sErr || !siparis) {
        return { error: "Sipariş bulunamadı." };
    }

    if (siparis.siparis_durumu !== 'Ön Sipariş') {
        return { error: `Bu sipariş ön sipariş durumunda değil (Mevcut Durum: ${siparis.siparis_durumu}).` };
    }

    const detaylar = (siparis.siparis_detay || []) as any[];
    if (detaylar.length === 0) {
        return { error: "Sipariş kalemleri bulunamadı." };
    }

    // 2. Stokları kontrol et
    const urunIds = detaylar.map(d => d.urun_id);
    const { data: urunler, error: uErr } = await supabase
        .from('urunler')
        .select('id, stok_miktari, ad')
        .in('id', urunIds);

    if (uErr || !urunler) {
        return { error: "Ürün stokları doğrulanamadı." };
    }

    const yetersizUrunler: string[] = [];
    for (const d of detaylar) {
        const urun = urunler.find(u => u.id === d.urun_id);
        const mevcutStok = urun?.stok_miktari || 0;
        if (mevcutStok < d.miktar) {
            const ad = typeof urun?.ad === 'object' ? (urun.ad as any).tr || (urun.ad as any).de : (urun?.ad || 'Ürün');
            yetersizUrunler.push(`${ad} (Gereken: ${d.miktar}, Mevcut: ${mevcutStok})`);
        }
    }

    if (yetersizUrunler.length > 0) {
        return {
            error: `Stok yetersiz olduğu için normale dönüştürülemedi:\n${yetersizUrunler.join('\n')}`
        };
    }

    // 3. Stokları düş
    for (const d of detaylar) {
        const urun = urunler.find(u => u.id === d.urun_id);
        const yeniStok = (urun?.stok_miktari || 0) - d.miktar;
        await supabase
            .from('urunler')
            .update({ stok_miktari: yeniStok })
            .eq('id', d.urun_id);
    }

    // 4. Sipariş durumunu 'Hazırlanıyor' yap
    const { error: upErr } = await supabase
        .from('siparisler')
        .update({ siparis_durumu: 'Hazırlanıyor' })
        .eq('id', siparisId);

    if (upErr) {
        return { error: "Sipariş durumu güncellenemedi." };
    }

    // 5. Müşteriye bildirim gönder
    try {
        const mesaj = `🎉 Ön siparişiniz (#${siparisId.substring(0, 8)}) onaylandı ve depoda hazırlanmaya başlandı!`;
        const link = `/portal/siparisler/${siparisId}`;
        await sendNotification({
            aliciFirmaId: siparis.firma_id,
            icerik: mesaj,
            link,
            supabaseClient: supabase
        });
    } catch (e) {
        console.warn('Müşteri bildirimi gönderilemedi:', e);
    }

    revalidatePath(`/admin/operasyon/siparisler/${siparisId}`);
    revalidatePath('/admin/operasyon/siparisler');
    revalidatePath(`/admin/crm/firmalar/${siparis.firma_id}/siparisler`);
    revalidatePath('/portal/siparisler');

    return { success: true, message: "Ön sipariş başarıyla normal siparişe dönüştürüldü ve stoklar düşüldü." };
}

// === ÖN SİPARİŞİ İPTAL ET / TEMİN EDİLEMEDİ (MÜŞTERİ BİLGİLENDİRMELİ) ===
export async function onSiparisiIptalEtAction(
    siparisId: string,
    iptalSebebi?: string
): Promise<ActionResult> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkisiz işlem." };

    const { data: siparis, error: sErr } = await supabase
        .from('siparisler')
        .select('id, firma_id, siparis_durumu')
        .eq('id', siparisId)
        .single();

    if (sErr || !siparis) return { error: "Sipariş bulunamadı." };

    const { error: upErr } = await supabase
        .from('siparisler')
        .update({ siparis_durumu: 'İptal Edildi' })
        .eq('id', siparisId);

    if (upErr) return { error: "Sipariş iptal edilemedi." };

    // Müşteriye açıklayıcı bildirim gönder
    try {
        const sebepAciklama = iptalSebebi ? ` Sebep: ${iptalSebebi}` : ' Talep edilen ürünler şu an için tedarik edilememiştir.';
        const mesaj = `ℹ️ #${siparisId.substring(0, 8)} numaralı ön sipariş talebiniz kapatılmıştır.${sebepAciklama}`;
        const link = `/portal/siparisler/${siparisId}`;
        await sendNotification({
            aliciFirmaId: siparis.firma_id,
            icerik: mesaj,
            link,
            supabaseClient: supabase
        });
    } catch (e) {
        console.warn('Müşteri bildirimi gönderilemedi (iptal):', e);
    }

    revalidatePath(`/admin/operasyon/siparisler/${siparisId}`);
    revalidatePath('/admin/operasyon/siparisler');
    revalidatePath(`/admin/crm/firmalar/${siparis.firma_id}/siparisler`);
    revalidatePath('/portal/siparisler');

    return { success: true, message: "Ön sipariş iptal edildi ve müşteriye bildirim iletildi." };
}

// === BESTELLSTATUS AKTUALISIEREN ===
export async function siparisDurumGuncelleAction(
    siparisId: string,
    yeniDurum: Enums<'siparis_durumu'>
): Promise<ActionResult> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    // Benutzerprüfung
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "Nicht authentifiziert." };
    }

    // Doğrudan veya Service Client ile güncelle (RLS engellerini aşmak için)
    let updateError: any = null;
    const { error: normalError } = await supabase
        .from('siparisler')
        .update({ siparis_durumu: yeniDurum })
        .eq('id', siparisId);

    if (normalError) {
        // Fallback: Service Client ile dene (Alt bayi yetkisi)
        try {
            const { createSupabaseServiceClient } = await import('@/lib/supabase/service');
            const adminClient = createSupabaseServiceClient();
            const { error: adminErr } = await adminClient
                .from('siparisler')
                .update({ siparis_durumu: yeniDurum })
                .eq('id', siparisId);
            updateError = adminErr;
        } catch (e: any) {
            updateError = normalError;
        }
    }

    if (updateError) {
        console.error("Sipariş durum güncelleme hatası:", updateError);
        return { error: updateError?.message || "Datenbankfehler beim Aktualisieren des Status." };
    }

    // Partner/Müşteri'yi bilgilendir
    try {
        const { data: siparis } = await supabase
            .from('siparisler')
            .select('id, firma_id')
            .eq('id', siparisId)
            .single();

        if (siparis?.firma_id) {
            const mesaj = `Sipariş #${siparisId.substring(0,8)} durumunuz "${yeniDurum}" olarak güncellendi.`;
            const link = `/portal/siparisler/${siparisId}`;
            await sendNotification({
                aliciFirmaId: siparis.firma_id,
                icerik: mesaj,
                link,
                supabaseClient: supabase
            });
        }
    } catch (e) {
        console.warn('Müşteri bildirimini gönderirken sorun oluştu (durum güncellemesi):', e);
    }

    // Cache revalidations
    revalidatePath(`/admin/operasyon/siparisler/${siparisId}`);
    revalidatePath('/admin/operasyon/siparisler');
    revalidatePath(`/portal/siparisler/${siparisId}`);
    revalidatePath('/portal/siparisler');
    revalidatePath('/portal/dashboard');
    revalidatePath('/portal');

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

        // 7. Adminlere bildirim gönder
        try {
            const mesaj = `Bir sipariş (#${siparisId.substring(0,8)}) müşteri tarafından iptal edildi.`;
            const link = `/admin/operasyon/siparisler/${siparisId}`;
            await sendNotification({
                aliciRol: ['Yönetici', 'Personel', 'Ekip Üyesi'],
                icerik: mesaj,
                link,
                preferenceKey: 'order_updates',
                supabaseClient: supabase
            });
        } catch(e) {
            console.warn('Admin bildirimi gönderilemedi (iptal):', e);
        }

        // 8. Cache neu validieren und Erfolg melden
        revalidatePath(`/portal/siparisler/${siparisId}`);
        revalidatePath('/portal/siparisler');
        revalidatePath(`/admin/operasyon/siparisler/${siparisId}`);
        revalidatePath('/admin/operasyon/siparisler');
        revalidatePath(`/admin/crm/firmalar/${siparis.firma_id}/siparisler`);

        console.log(`Bestellung ${siparisId} erfolgreich storniert durch Benutzer ${user.id}`);
        return { success: true, message: 'Bestellung erfolgreich storniert.' };

    } catch (e: unknown) {
        console.error(`Unerwarteter Fehler beim Stornieren der Bestellung ${siparisId}:`, e);
        return { error: 'Serverfehler beim Stornieren der Bestellung.' };
    }
}

// === İPTAL TALEBİ GÖNDER ===
export async function iptalTalebiGonderAction(
    siparisId: string,
    siparisNo: string,
    sebep: string,
    firmaId: string,
) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Oturum bulunamadı.' };

    // 1. Sipariş durumunu güncelle
    const { error: siparisError } = await supabase
        .from('siparisler')
        .update({ siparis_durumu: 'iptal_talep_edildi' })
        .eq('id', siparisId);

    if (siparisError) return { success: false, error: siparisError.message };

    // 2. Yöneticilere görev oluştur
    const { data: yoneticiler } = await supabase
        .from('profiller')
        .select('id')
        .eq('rol', 'Yönetici');

    if (yoneticiler && yoneticiler.length > 0) {
        const gorevler = yoneticiler.map(y => ({
            atanan_kisi_id: y.id,
            olusturan_kisi_id: user.id,
            baslik: `İptal Talebi: Sipariş #${siparisNo.slice(0, 8).toUpperCase()}`,
            aciklama: `Sipariş iptal talebi geldi.\n\nSebep: ${sebep}\n\nSipariş ID: ${siparisId}`,
            oncelik: 'yuksek',
            tamamlandi: false,
            ilgili_firma_id: firmaId,
        }));

        await supabase.from('gorevler').insert(gorevler as any);

        // 3. Yöneticilere bildirim gönder
        const bildirimler = yoneticiler.map(y => ({
            alici_id: y.id,
            icerik: `⚠️ Sipariş #${siparisNo.slice(0, 8).toUpperCase()} için iptal talebi: ${sebep}`,
            link: `/portal/siparisler/${siparisId}`,
            okundu_mu: false,
        }));

        await supabase.from('bildirimler').insert(bildirimler);
    }

    revalidatePath(`/portal/siparisler/${siparisId}`);
    return { success: true };
}