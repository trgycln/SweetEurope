// src/app/actions/siparis-actions.ts
// KORRIGIERTE & VOLLSTÄNDIGE VERSION (await cookies + await createClient in allen Funktionen + Logging)

'use server';

import { createSupabaseServerClient } from "../../lib/supabase/server";
import { Enums, Tables, Database } from "../../lib/supabase/database.types"; // Database hinzugefügt
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers"; // <-- WICHTIG: Importiert
import { stripe, stripeTest, assertStripeEnvironmentSafety } from '@/lib/stripe';
import { SupabaseClient } from "@supabase/supabase-js"; // Typ für Client importieren
import { sendNotification } from '../../lib/notificationUtils';
import { sendOrderConfirmationEmail } from '../../lib/email';
import { createLexwareProformaForOrder, getLexwareProformaPdfBuffer } from '@/lib/lexware/order-confirmations';
import { redirect } from 'next/navigation'; // Import für Redirect

// Typ für Rückgabewerte
type ActionResult = {
    success?: boolean;
    error?: string;
    orderId?: string; // Für create Action
    data?: unknown; // Für andere Actions optional
    message?: string; // Für Erfolgs-/Fehlermeldungen
    url?: string; // Für Download-URLs
    calculatedItems?: unknown;
    calculatedShipping?: unknown;
};

// Typ für Artikel-Payload in der create-Funktion
type OrderItemPayload = {
    urun_id: string;
    adet: number;
    o_anki_satis_fiyati: number;
    ad?: string;
    kdv_orani?: number;
};

// === HAUPTFUNKTION: BESTELLUNG ERSTELLEN ===
export async function siparisOlusturAction(payload: {
    firmaId: string,
    teslimatAdresi: string,
    items: OrderItemPayload[],
    kaynak: Enums<'siparis_kaynagi'>,
    siparisTuru?: 'normal' | 'on_siparis',
    // Frontend'den gelen güvensiz finansal veriler (Kullanılmayacak!)
    kargoTutariNet?: number,
    kargoKdvTutari?: number,
    kargoTutariBrut?: number,
    kargoYontemi?: string,
    paymentMethod?: 'stripe' | 'rechnung' | 'vorkasse',
    locale?: string,
    orderNotes?: string,
    isTest?: boolean,
}): Promise<ActionResult> {

    const isPreOrder = payload.siparisTuru === 'on_siparis';
    let isTestOrder = payload.isTest === true;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "Nicht authentifiziert. Bitte einloggen." };
    }

    if (!payload || !payload.firmaId || !payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
        return { error: "Kunden- oder Produktinformationen fehlen." };
    }

    // --- ZERO TRUST SECURITY: Backend Re-calculation ---
    // 0. Test Firması Kontrolü
    const { data: currentFirma } = await supabase
        .from('firmalar')
        .select('is_test_account')
        .eq('id', payload.firmaId)
        .single();

    if (currentFirma?.is_test_account === true) {
        isTestOrder = true;
        // payload.isTest'i de ezelim ki asagidaki email fonksiyonlarına doğru gitsin
        payload.isTest = true;
    }

    // 1. Kullanıcı Rolünü Çek
    const { data: profile } = await supabase
        .from('profiller')
        .select('rol')
        .eq('id', user.id)
        .single();
    const userRole = profile?.rol || 'Müşteri';

    // 2. Ürünlerin gerçek veritabanı fiyatlarını çek
    const urunIds = payload.items.map(item => item.urun_id);
    const { data: urunler, error: stokError } = await supabase
        .from('urunler')
        .select('id, stok_miktari, ad, koli_ici_adet, palet_ici_adet, satis_fiyati_musteri, satis_fiyati_toptanci, satis_fiyati_alt_bayi, satis_fiyati_palet, birim_agirlik_kg')
        .in('id', urunIds);

    if (stokError || !urunler) {
        console.error("Stok bilgisi alınamadı:", stokError);
        return { error: "Stok bilgileri alınırken veritabanı hatası oluştu." };
    }

    // Stok kontrolü (Normal sipariş için)
    if (!isPreOrder && !isTestOrder) {
        for (const item of payload.items) {
            const urun = urunler.find(u => u.id === item.urun_id);
            if (!urun) return { error: `Siparişteki bir ürün bulunamadı.` };
            if ((urun.stok_miktari || 0) < item.adet) {
                const urunAd = typeof urun.ad === 'object' && urun.ad ? (urun.ad as any).tr || (urun.ad as any).de || 'Ürün' : String(urun.ad);
                return { error: `Yetersiz stok: ${urunAd} ürününden sadece ${urun.stok_miktari || 0} adet mevcut. Lütfen sepetinizi güncelleyin.` };
            }
        }
    }

    // 3. Fiyat ve Kargo Hesaplama
    const { hesaplaSepetSatiri } = await import('../../lib/pricingUtils');
    const { calculateShipping } = await import('../../lib/shippingUtils');

    let trustedToplamNet = 0;
    let trustedStripeToplamBrutCents = 0;
    let totalWeightKg = 0;

    const trustedItems = payload.items.map(item => {
        const urun = urunler.find(u => u.id === item.urun_id);
        if (!urun) throw new Error("Ürün eşleşmedi.");

        // İstemciden gelen birim 'adet' cinsinden toplam miktar olarak kabul edilir
        const sepetSatiri = hesaplaSepetSatiri(urun as any, 'adet', item.adet, userRole);
        
        trustedToplamNet += sepetSatiri.toplamFiyat;
        totalWeightKg += (urun.birim_agirlik_kg || 0) * item.adet;

        const kdvMultiplier = 1.07;
        trustedStripeToplamBrutCents += Math.round(sepetSatiri.toplamFiyat * kdvMultiplier * 100);

        return {
            urun_id: item.urun_id,
            urun_ad: typeof urun.ad === 'object' && urun.ad ? ((urun.ad as any).de || (urun.ad as any).tr || 'Produkt') : String(urun.ad || 'Produkt'),
            miktar: item.adet,
            birim_fiyat: sepetSatiri.adetFiyat,
            toplam_fiyat: sepetSatiri.toplamFiyat
        };
    });

    // Kargo hesaplama (PLZ'yi adresten bulmaya çalış veya kargo yönteminden tahmin et)
    const plzMatch = payload.teslimatAdresi?.match(/\b\d{5}\b/);
    const plz = plzMatch ? plzMatch[0] : (payload.kargoYontemi?.includes('Köln') ? '50667' : '10115');
    
    const shipping = calculateShipping(trustedToplamNet, plz, totalWeightKg);
    trustedStripeToplamBrutCents += Math.round(shipping.shippingCostGross * 100);
    const trustedToplamBrut = trustedStripeToplamBrutCents / 100;

    // 1. ÖN SİPARİŞ DURUMU (VEYA TEST SİPARİŞİ)
    if (isPreOrder || isTestOrder) {
        const { data: orderData, error: orderError } = await (supabase as any)
            .from('siparisler')
            .insert({
                firma_id: payload.firmaId,
                teslimat_adresi: payload.teslimatAdresi,
                siparis_durumu: isTestOrder ? 'Yeni' : 'Ön Sipariş',
                siparis_kaynagi: payload.kaynak,
                olusturan_kullanici_id: user.id,
                siparis_tarihi: new Date().toISOString(),
                toplam_tutar_net:  trustedToplamNet,
                toplam_tutar_brut: trustedToplamBrut,
                kdv_orani:         7,
                kargo_tutari_net:  shipping.shippingCostNet,
                kargo_kdv_tutari:  shipping.shippingVatAmount,
                kargo_tutari_brut: shipping.shippingCostGross,
                kargo_yontemi:     shipping.shippingMethodName,
                is_test:           isTestOrder,
            })
            .select('id')
            .single();

        if (orderError || !orderData) {
            return { error: `Ön sipariş oluşturulamadı: ${orderError?.message || 'Veritabanı hatası'}` };
        }

        const newOrderId = orderData.id;

        const detayInserts = trustedItems.map(item => ({
            siparis_id: newOrderId,
            urun_id: item.urun_id,
            miktar: item.miktar,
            birim_fiyat: item.birim_fiyat,
            toplam_fiyat: item.toplam_fiyat
        }));

        const { error: detayError } = await (supabase as any).from('siparis_detay').insert(detayInserts);
        if (detayError) {
            return { error: `Ön sipariş detayları kaydedilemedi: ${detayError.message}` };
        }

        if (payload.kaynak === 'Müşteri Portalı') {
            try {
                const { data: firma } = await supabase.from('firmalar').select('unvan').eq('id', payload.firmaId).single();
                await sendNotification({
                    aliciRol: ['Yönetici', 'Personel', 'Ekip Üyesi'],
                    icerik: `⏳ ${firma?.unvan || 'Bir Müşteri'} yeni bir ÖN SİPARİŞ / TALEP (#${newOrderId.substring(0, 8)}) oluşturdu.`,
                    link: `/admin/operasyon/siparisler/${newOrderId}`,
                    preferenceKey: 'order_updates',
                    supabaseClient: supabase
                });
            } catch (e) {}

            // ++ Müşteriye otomatik ön sipariş onay e-postası gönder ++
            try {
                const { data: profil } = await supabase
                    .from('profiller')
                    .select('ad_soyad')
                    .eq('id', user.id)
                    .single();
                const { data: firma2 } = await supabase
                    .from('firmalar')
                    .select('unvan')
                    .eq('id', payload.firmaId)
                    .single();
                if (user.email) {
                    const emailItems = trustedItems.map((item, i) => ({
                        ad: (item as any).urun_ad,
                        miktar: item.miktar,
                        birimFiyat: item.birim_fiyat,
                        toplamFiyat: item.toplam_fiyat,
                    }));
                    const loc = payload.locale || 'de';
                    // if (!payload.isTest) {
                        await sendOrderConfirmationEmail({
                        to: user.email,
                        recipientName: profil?.ad_soyad || null,
                        firmName: firma2?.unvan || null,
                        orderId: newOrderId,
                        orderType: (isTestOrder && !isPreOrder) ? 'normal' : 'on_siparis',
                        items: emailItems,
                        toplamNet: trustedToplamNet,
                        kargoTutariBrut: (isTestOrder && !isPreOrder) ? shipping.shippingCostGross : undefined,
                        toplamBrut: trustedToplamBrut,
                        teslimatAdresi: payload.teslimatAdresi,
                        locale: loc,
                        portalOrderUrl: `https://elysonsweets.de/${loc}/portal/siparisler/${newOrderId}`,
                        paymentMethod: payload.paymentMethod,
                        });
                    // }
                }
            } catch (emailErr) {
                console.error('[siparis-actions] Ön sipariş onay e-postası gönderilemedi:', emailErr);
            }
        }

        revalidatePath('/admin/urun-yonetimi/urunler');
        revalidatePath(`/admin/crm/firmalar/${payload.firmaId}/siparisler`);
        revalidatePath('/admin/operasyon/siparisler');
        revalidatePath('/portal/siparisler');

        return { 
            success: true, 
            orderId: newOrderId, 
            message: isTestOrder ? "Test siparişi başarıyla oluşturuldu (Stok düşülmedi)." : "Ön sipariş başarıyla oluşturuldu.",
            calculatedItems: trustedItems,
            calculatedShipping: shipping 
        };
    }

    // 2. NORMAL SİPARİŞ DURUMU (STOK KONTROLLÜ)
    // RPC-Funktion aufrufen
    const rpcPayloadItems = trustedItems.map(item => ({
        urun_id: item.urun_id,
        adet: item.miktar,
        o_anki_satis_fiyati: item.birim_fiyat
    }));

    // Ancak RPC içinde fiyatı da yeniden kaydettirdiğimiz için, payload olarak sunucuda hesaplanan temiz item'ları gönderiyoruz.
    // RPC'ye kargo vb bilgileri göndermemiz gerekiyorsa RPC formatına bakılmalı. RPC sadece sepet detayını alıyor.
    // Wait, RPC 'create_order_with_items_and_update_stock' uses frontend payload. We supply trusted data.
    const { data: rpcResultData, error: rpcError } = await supabase.rpc('create_order_with_items_and_update_stock', {
        p_firma_id: payload.firmaId,
        p_teslimat_adresi: payload.teslimatAdresi,
        p_items: rpcPayloadItems,
        p_olusturan_kullanici_id: user.id,
        p_olusturma_kaynagi: payload.kaynak
    })
    .select()
    .single();

    const data = rpcResultData as any;
    const newOrderId = typeof data === 'string' ? data : data && typeof data === 'object' && 'order_id' in data ? data.order_id : null;

    if (rpcError || !newOrderId) {
        return { error: `Datenbankfehler beim Erstellen der Bestellung.${rpcError ? ` Details: ${rpcError.message}`: ''}` };
    }
    
    // Normal sipariş kargo tutarı ve toplam net/brüt güncellemesini RPC'den sonra yap (Çünkü RPC bunları setliyor veya setlemiyorsa biz setleyelim)
    await supabase.from('siparisler').update({
        toplam_tutar_net: trustedToplamNet,
        toplam_tutar_brut: trustedToplamBrut,
        kargo_tutari_net: shipping.shippingCostNet,
        kargo_kdv_tutari: shipping.shippingVatAmount,
        kargo_tutari_brut: shipping.shippingCostGross,
        kargo_yontemi: shipping.shippingMethodName
    }).eq('id', newOrderId);

    if (payload.kaynak === 'Müşteri Portalı') {
        try {
            const { data: firma } = await supabase.from('firmalar').select('unvan').eq('id', payload.firmaId).single();
            await sendNotification({
                aliciRol: ['Yönetici', 'Personel', 'Ekip Üyesi'],
                icerik: `${firma?.unvan || 'Ein Partner'} hat eine neue Bestellung (#${newOrderId.substring(0, 8)}) erstellt.`,
                link: `/admin/operasyon/siparisler/${newOrderId}`,
                preferenceKey: 'order_updates',
                supabaseClient: supabase
            });
        } catch (e) {}

        // ++ Lexware Proforma Faturayı (Auftragsbestätigung) otomatik oluştur ve PDF'i al ++
        let proformaPdfBuffer: Buffer | null = null;
        let proformaPdfFilename: string | null = null;

        try {
            const proformaRes = await createLexwareProformaForOrder(newOrderId, { finalize: true });
            if (proformaRes?.proformaId) {
                const pdfRes = await getLexwareProformaPdfBuffer(proformaRes.proformaId, isTestOrder);
                proformaPdfBuffer = pdfRes.buffer;
                proformaPdfFilename = pdfRes.filename || `Proforma-${proformaRes.proformaNo}.pdf`;
            }
        } catch (lexErr) {
            console.error('[siparis-actions] Otomatik Lexware Proforma oluşturulamadı (Graceful failure):', lexErr);
        }

        // ++ Müşteriye otomatik sipariş onay e-postası gönder ++
        try {
            const { data: profil } = await supabase
                .from('profiller')
                .select('ad_soyad')
                .eq('id', user.id)
                .single();
            const { data: firma2 } = await supabase
                .from('firmalar')
                .select('unvan')
                .eq('id', payload.firmaId)
                .single();
            if (user.email) {
                const emailItems = trustedItems.map((item, i) => ({
                    ad: (item as any).urun_ad,
                    miktar: item.miktar,
                    birimFiyat: item.birim_fiyat,
                    toplamFiyat: item.toplam_fiyat,
                }));
                const loc = payload.locale || 'de';
                // if (!payload.isTest) {
                    await sendOrderConfirmationEmail({
                        to: user.email,
                        recipientName: profil?.ad_soyad || null,
                        firmName: firma2?.unvan || null,
                        orderId: newOrderId,
                        orderType: 'normal',
                        items: emailItems,
                        toplamNet: trustedToplamNet,
                        kargoTutariBrut: shipping.shippingCostGross,
                        toplamBrut: trustedToplamBrut,
                        teslimatAdresi: payload.teslimatAdresi,
                        locale: loc,
                        portalOrderUrl: `https://elysonsweets.de/${loc}/portal/siparisler/${newOrderId}`,
                        paymentMethod: payload.paymentMethod,
                        pdfBuffer: proformaPdfBuffer,
                        pdfFilename: proformaPdfFilename,
                    });
                // }
            }
        } catch (emailErr) {
            console.error('[siparis-actions] Sipariş onay e-postası gönderilemedi:', emailErr);
        }
    }

    revalidatePath('/admin/urun-yonetimi/urunler');
    revalidatePath(`/admin/crm/firmalar/${payload.firmaId}/siparisler`);
    revalidatePath('/admin/operasyon/siparisler');
    revalidatePath('/portal/siparisler');

    return { 
        success: true, 
        orderId: newOrderId,
        calculatedItems: trustedItems,
        calculatedShipping: shipping
    };
}

// === TOPLU SİPARİŞ OLUŞTURMA (NORMAL + ÖN SİPARİŞ AYRIŞTIRICI) ===
export async function topluSiparisOlusturAction(payload: {
    firmaId: string,
    teslimatAdresi: string,
    normalItems: OrderItemPayload[],
    onSiparisItems: OrderItemPayload[],
    kaynak: Enums<'siparis_kaynagi'>,
    // Kargo — tüm siparişe ait tek bir kargo bilgisi
    kargoTutariNet?: number,
    kargoKdvTutari?: number,
    kargoTutariBrut?: number,
    kargoYontemi?: string,
    paymentMethod?: "stripe" | "rechnung" | "vorkasse",
    locale?: string,
    orderNotes?: string,
    isTest?: boolean,
}): Promise<{
    success?: boolean;
    error?: string;
    normalOrderId?: string | null;
    onSiparisOrderId?: string | null;
    message?: string;
    stripeUrl?: string;
}> {
    let normalOrderId: string | null = null;
    let onSiparisOrderId: string | null = null;
    
    let normalResData: any = null;
    let onSiparisResData: any = null;

    // --- ZERO TRUST SECURITY: Test Firması Kontrolü ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    
    const { data: currentFirma } = await supabase
        .from('firmalar')
        .select('is_test_account')
        .eq('id', payload.firmaId)
        .single();

    if (currentFirma?.is_test_account === true) {
        payload.isTest = true;
    }

    // 1. Normal Sipariş oluştur (varsa)
    if (payload.normalItems && payload.normalItems.length > 0) {
        normalResData = await siparisOlusturAction({
            firmaId: payload.firmaId,
            teslimatAdresi: payload.teslimatAdresi,
            items: payload.normalItems,
            kaynak: payload.kaynak,
            siparisTuru: 'normal',
            kargoTutariNet:  payload.kargoTutariNet,
            kargoKdvTutari:  payload.kargoKdvTutari,
            kargoTutariBrut: payload.kargoTutariBrut,
            kargoYontemi:    payload.kargoYontemi,
            paymentMethod:   payload.paymentMethod,
            locale:          payload.locale,
            orderNotes:      payload.orderNotes,
            isTest:          payload.isTest,
        });

        if (normalResData.error) {
            return { error: `Normal sipariş oluşturulamadı: ${normalResData.error}` };
        }
        normalOrderId = normalResData.orderId || null;
    }

    // 2. Ön Sipariş oluştur (varsa)
    if (payload.onSiparisItems && payload.onSiparisItems.length > 0) {
        onSiparisResData = await siparisOlusturAction({
            firmaId: payload.firmaId,
            teslimatAdresi: payload.teslimatAdresi,
            items: payload.onSiparisItems,
            kaynak: payload.kaynak,
            siparisTuru: 'on_siparis',
            kargoTutariNet:  payload.kargoTutariNet,
            kargoKdvTutari:  payload.kargoKdvTutari,
            kargoTutariBrut: payload.kargoTutariBrut,
            kargoYontemi:    payload.kargoYontemi,
            isTest:          payload.isTest,
        });

        if (onSiparisResData.error) {
            return {
                error: `Ön sipariş oluşturulurken hata: ${onSiparisResData.error}${normalOrderId ? ' (Normal siparişiniz oluşturulmuştu).' : ''}`,
                normalOrderId
            };
        }
        onSiparisOrderId = onSiparisResData.orderId || null;
    }

    let mesaj = "Siparişiniz başarıyla oluşturuldu.";
    if (normalOrderId && onSiparisOrderId) {
        mesaj = "1 Normal Sevkiyat Siparişi ve 1 Ön Sipariş Talebi olmak üzere 2 ayrı sipariş başarıyla oluşturuldu.";
    } else if (onSiparisOrderId) {
        mesaj = "Ön sipariş talebiniz başarıyla kaydedildi.";
    }

    
    if (payload.paymentMethod === 'stripe') {
        const activeStripe = payload.isTest ? stripeTest : stripe;
        
        const calculatedItems = [
            ...(normalResData?.calculatedItems || []),
            ...(onSiparisResData?.calculatedItems || [])
        ];
        
        const stripeItems = calculatedItems.map(item => ({
            urun_id: item.urun_id,
            ad: item.urun_ad || 'Produkt',
            adet: item.miktar,
            birimFiyatNet: item.birim_fiyat,
            kdvOrani: 7, // Sistemde gıda KDV'si %7 olarak ayarlandı
        }));
        
        let totalCalculatedShippingGross = 0;
        let shippingMethodName = 'Lieferung & Versand';
        
        if (normalResData?.calculatedShipping) {
            totalCalculatedShippingGross += normalResData.calculatedShipping.shippingCostGross;
            shippingMethodName = normalResData.calculatedShipping.shippingMethodName;
        }
        if (onSiparisResData?.calculatedShipping) {
            totalCalculatedShippingGross += onSiparisResData.calculatedShipping.shippingCostGross;
            shippingMethodName = onSiparisResData.calculatedShipping.shippingMethodName;
        }
        
        try {
            // Need to get user email and id
            const supabase = await createSupabaseServerClient(await cookies());
            const { data: { user } } = await supabase.auth.getUser();
            
            const line_items = stripeItems.map((item) => {
                const qty = Math.max(1, Number(item.adet) || 1);
                const kdvMultiplier = 1 + ((item.kdvOrani || 7) / 100);
                const lineGrossCents = Math.max(1, Math.round(item.birimFiyatNet * qty * kdvMultiplier * 100));
                const baseName = (item.ad && item.ad.trim().length > 0) ? item.ad.trim() : 'Produkt';
                const productName = qty > 1 ? `${baseName} (${qty} x)` : baseName;

                return {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: productName,
                            metadata: { urun_id: String(item.urun_id || '') },
                        },
                        unit_amount: lineGrossCents,
                    },
                    quantity: 1,
                };
            });
            
            if (totalCalculatedShippingGross > 0) {
                line_items.push({
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: shippingMethodName || 'Lieferung & Versand',
                            metadata: { urun_id: 'shipping' },
                        },
                        unit_amount: Math.max(1, Math.round(totalCalculatedShippingGross * 100)),
                    },
                    quantity: 1,
                });
            }
            
            const reqHeaders = await headers();
            // Server Actions'ta 'origin' header gelmeyebilir (özellikle Vercel Production'da).
            // NEXT_PUBLIC_SITE_URL her zaman güvenilir bir fallback'tir.
            const origin = reqHeaders.get('origin') 
                || process.env.NEXT_PUBLIC_SITE_URL 
                || 'https://elysonsweets.de';
            const loc = payload.locale || 'de';
            const targetOrderId = normalOrderId || onSiparisOrderId;

            // Stripe desteklenen locale listesi (https://stripe.com/docs/api/checkout/sessions/create#checkout_session_create-locale)
            const STRIPE_SUPPORTED_LOCALES = ['auto', 'bg', 'cs', 'da', 'de', 'el', 'en', 'en-GB', 'es', 'es-419', 'et', 'fi', 'fil', 'fr', 'fr-CA', 'hr', 'hu', 'id', 'it', 'ja', 'ko', 'lt', 'lv', 'ms', 'mt', 'nb', 'nl', 'pl', 'pt', 'pt-BR', 'ro', 'ru', 'sk', 'sl', 'sv', 'th', 'vi', 'zh', 'zh-HK', 'zh-TW'];
            const stripeLocale = loc === 'de' ? 'de' : loc === 'en' ? 'en' : 'auto';

            const sessionPayload = {
                mode: 'payment',
                line_items,
                customer_email: user?.email || undefined,
                client_reference_id: String(payload.firmaId),
                metadata: {
                    firma_id: String(payload.firmaId),
                    order_id: String(targetOrderId),
                    normal_order_id: String(normalOrderId || ''),
                    on_siparis_order_id: String(onSiparisOrderId || ''),
                    user_id: user?.id || '',
                    order_notes: payload.orderNotes || '',
                },
                success_url: `${origin}/${loc}/portal/siparisler?payment_status=success&session_id={CHECKOUT_SESSION_ID}&order_id=${targetOrderId}${normalOrderId && onSiparisOrderId ? '&split=true' : (!normalOrderId && onSiparisOrderId ? '&preorder_only=true' : '')}`,
                cancel_url: `${origin}/${loc}/portal/siparisler/yeni?payment_status=cancelled`,
                locale: stripeLocale,
                payment_method_types: ['card'],
            };
            
            const session = await activeStripe.checkout.sessions.create(sessionPayload as any);
            return {
                success: true,
                normalOrderId,
                onSiparisOrderId,
                message: mesaj,
                stripeUrl: session.url || undefined
            };
        } catch (err: any) {
            console.error('Stripe Checkout Error in topluSiparisOlusturAction:', err);
            return { error: 'Fehler bei der Initialisierung von Stripe Checkout. ' + err.message };
        }

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
            toplam_tutar_net,
            toplam_tutar_brut,
            kargo_tutari_brut,
            teslimat_adresi,
            olusturan_kullanici_id,
            firmalar (email, unvan),
            siparis_detay (
                id,
                urun_id,
                miktar,
                birim_fiyat,
                toplam_fiyat,
                urunler (ad)
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

    // 3. Stokları düş (Atomik / Güvenli)
    const { createSupabaseServiceClient } = await import('@/lib/supabase/service');
    const adminClient = createSupabaseServiceClient();

    for (const d of detaylar) {
        // RPC ile atomik düşmeyi dene
        const { data: rpcRes, error: rpcErr } = await adminClient.rpc('deduct_single_product_stock' as any, {
            p_urun_id: d.urun_id,
            p_miktar: d.miktar
        });

        if (rpcErr || !rpcRes?.success) {
            // Fallback: anlık güncel stok çekip düş
            const { data: freshProd } = await adminClient
                .from('urunler')
                .select('stok_miktari')
                .eq('id', d.urun_id)
                .single();
            const freshStock = freshProd?.stok_miktari || 0;
            await adminClient
                .from('urunler')
                .update({ stok_miktari: Math.max(0, freshStock - d.miktar) })
                .eq('id', d.urun_id);
        }
    }

    // 4. Sipariş durumunu 'Hazırlanıyor' yap
    const { error: upErr } = await adminClient
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

    // 6. Müşteriye IBAN/Ödeme Bilgilerini de içeren onay e-postasını gönder
    try {
        const to = (siparis.firmalar as any)?.email;
        if (to) {
            const { data: profil } = await adminClient
                .from('profiller')
                .select('ad_soyad')
                .eq('id', siparis.olusturan_kullanici_id)
                .single();
                
            const emailItems = detaylar.map((item: any) => {
                const raw = item.urunler?.ad;
                const ad = typeof raw === 'object' && raw !== null ? raw.de || raw.tr || Object.values(raw)[0] : String(raw || 'Produkt');
                return {
                    ad: String(ad),
                    miktar: item.miktar,
                    birimFiyat: item.birim_fiyat,
                    toplamFiyat: item.toplam_fiyat,
                };
            });
            
            await sendOrderConfirmationEmail({
                to,
                recipientName: profil?.ad_soyad || null,
                firmName: (siparis.firmalar as any)?.unvan || null,
                orderId: siparisId,
                orderType: 'normal',
                items: emailItems,
                toplamNet: siparis.toplam_tutar_net,
                kargoTutariBrut: siparis.kargo_tutari_brut,
                toplamBrut: siparis.toplam_tutar_brut,
                teslimatAdresi: siparis.teslimat_adresi,
                locale: 'de', // veya siparişten dil bilgisi geliyorsa o
                portalOrderUrl: `https://elysonsweets.de/de/portal/siparisler/${siparisId}`,
                paymentMethod: 'vorkasse',
            });
        }
    } catch (e) {
        console.warn('Müşteriye sipariş onay (vorkasse) e-postası gönderilemedi:', e);
    }

    revalidatePath(`/admin/operasyon/siparisler/${siparisId}`);
    revalidatePath('/admin/operasyon/siparisler');
    revalidatePath(`/admin/crm/firmalar/${siparis.firma_id}/siparisler`);
    revalidatePath('/portal/siparisler');

    return { success: true, message: "Ön sipariş başarıyla normal siparişe dönüştürüldü ve stoklar düşüldü." };
}

// === ÖN SİPARİŞİ İPTAL ET (MÜŞTERİ VEYA YÖNETİCİ) ===
export async function onSiparisiIptalEtAction(
    siparisId: string,
    iptalNedeni?: string
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
        const not = iptalNedeni ? ` (Neden: ${iptalNedeni})` : '';
        const mesaj = `Sipariş #${siparisId.substring(0, 8)} iptal edildi${not}.`;
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

    // Önceki durumu kontrol et (Stok iadesi kararı için)
    const { data: prevOrder } = await supabase
        .from('siparisler')
        .select('id, firma_id, siparis_durumu')
        .eq('id', siparisId)
        .single();

    const previousStatus = prevOrder?.siparis_durumu;
    const isAlreadyCancelled = previousStatus === 'İptal Edildi' || (previousStatus as string) === 'cancelled';
    const isNowCancelled = yeniDurum === 'İptal Edildi' || (yeniDurum as string) === 'cancelled';

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

    // STOK İADESİ (Sipariş iptal edildiyse ve daha önce iptal edilmemişse ve Ön Sipariş değilse)
    if (isNowCancelled && !isAlreadyCancelled && previousStatus !== 'Ön Sipariş') {
        try {
            const { createSupabaseServiceClient } = await import('@/lib/supabase/service');
            const adminClient = createSupabaseServiceClient();

            // RPC ile atomik stok iadesini dene
            const { data: rpcRes, error: rpcErr } = await adminClient.rpc('restore_order_stock' as any, {
                p_siparis_id: siparisId
            });

            if (rpcErr || !rpcRes?.success) {
                // Fallback: siparis_detay kayıtlarını çek ve stoklara ekle
                const { data: detaylar } = await adminClient
                    .from('siparis_detay')
                    .select('urun_id, miktar')
                    .eq('siparis_id', siparisId);

                if (detaylar && detaylar.length > 0) {
                    for (const item of detaylar) {
                        if (item.urun_id && Number(item.miktar) > 0) {
                            const { data: currentProd } = await adminClient
                                .from('urunler')
                                .select('stok_miktari')
                                .eq('id', item.urun_id)
                                .single();
                            const currentStock = Number(currentProd?.stok_miktari) || 0;
                            await adminClient
                                .from('urunler')
                                .update({ stok_miktari: currentStock + Number(item.miktar) })
                                .eq('id', item.urun_id);
                        }
                    }
                }
            }
        } catch (stockRestoreErr) {
            console.error('[siparis-actions] İptal edilen sipariş için stok iadesi hatası:', stockRestoreErr);
        }
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

                if (siparis.siparis_durumu === 'İptal Edildi' || siparis.siparis_durumu === 'cancelled') {
            return { success: true, message: 'Zaten iptal edildi' };
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

                // 6.1. Stokları iade et
        try {
            const { createSupabaseServiceClient } = await import('@/lib/supabase/service');
            const adminClient = createSupabaseServiceClient();
            await adminClient.rpc('restore_order_stock' as any, { p_siparis_id: siparisId });
        } catch (e) {
            console.error('Stok iadesi yapılamadı:', e);
        }

        // 6.2. Lexware faturasını iptal et (Storno)
        try {
            const { cancelLexwareInvoiceForOrder } = await import('@/lib/lexware/invoices');
            await cancelLexwareInvoiceForOrder(siparisId, 'Kundenstornierung');
        } catch (e) {
            console.error('Lexware faturası iptal edilemedi:', e);
        }

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