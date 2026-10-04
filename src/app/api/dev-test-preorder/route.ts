import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { stripe } from '@/lib/stripe';

export async function GET(request: Request) {
    const adminClient = createSupabaseServiceClient();

    // 1. En son verilen "Ön Sipariş" statüsündeki siparişi bul
    const { data: siparis, error: sErr } = await adminClient
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
                urunler (ad, almanya_kdv_orani)
            )
        `)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (sErr || !siparis) {
        return NextResponse.json({ error: "Sipariş bulunamadı.", details: sErr });
    }

    const siparisId = siparis.id;
    const detaylar = (siparis.siparis_detay || []) as any[];
    
    // Test amaçlı, ürün stoklarını kontrol etmiyoruz, direkt çeviriyoruz.

    // 2. Stripe URL Oluşturma (Aksiyonun içindeki kodun birebir aynısı)
    let stripePaymentUrl: string | null = null;
    try {
        const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        
        const line_items: any[] = detaylar.map((item: any) => {
            const raw = item.urunler?.ad;
            const ad = typeof raw === 'object' && raw !== null ? raw.de || raw.tr || Object.values(raw)[0] : String(raw || 'Produkt');
            const kdvOrani = item.urunler?.almanya_kdv_orani ?? 7;
            const kdvMultiplier = 1 + (kdvOrani / 100);
            const lineGrossCents = Math.max(1, Math.round(item.birim_fiyat * item.miktar * kdvMultiplier * 100));
            return {
                price_data: {
                    currency: 'eur',
                    product_data: { name: String(ad) },
                    unit_amount: lineGrossCents,
                },
                quantity: 1,
            };
        });

        if (siparis.kargo_tutari_brut > 0) {
            line_items.push({
                price_data: {
                    currency: 'eur',
                    product_data: { name: 'Lieferung & Versand' },
                    unit_amount: Math.round(siparis.kargo_tutari_brut * 100),
                },
                quantity: 1,
            });
        }
        
        const sessionPayload: any = {
            mode: 'payment',
            payment_method_types: ['card', 'sepa_debit'],
            line_items,
            client_reference_id: String(siparis.firma_id),
            metadata: {
                order_id: siparisId,
                firma_id: String(siparis.firma_id),
            },
            success_url: `${origin}/de/portal/siparisler?payment_status=success&session_id={CHECKOUT_SESSION_ID}&order_id=${siparisId}`,
            cancel_url: `${origin}/de/portal/siparisler`,
        };
        const session = await stripe.checkout.sessions.create(sessionPayload);
        stripePaymentUrl = session.url;
    } catch (e: any) {
        return NextResponse.json({ error: "Stripe error", message: e.message });
    }

    // 3. Mail Atımı
    const to = (siparis.firmalar as any)?.email || 'mrcandycompany@gmail.com';
    let emailSuccess = false;
    try {
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
            recipientName: 'Test Müşteri',
            firmName: (siparis.firmalar as any)?.unvan || null,
            orderId: siparisId,
            orderType: 'normal',
            items: emailItems,
            toplamNet: siparis.toplam_tutar_net,
            kargoTutariBrut: siparis.kargo_tutari_brut,
            toplamBrut: siparis.toplam_tutar_brut,
            teslimatAdresi: siparis.teslimat_adresi,
            locale: 'de',
            portalOrderUrl: `http://localhost:3000/de/portal/siparisler/${siparisId}`,
            paymentMethod: 'vorkasse',
            stripePaymentUrl: stripePaymentUrl
        });
        emailSuccess = true;
    } catch (e: any) {
        return NextResponse.json({ error: "Email error", message: e.message });
    }

    return NextResponse.json({
        success: true,
        message: "Test completed.",
        orderId: siparisId,
        stripeUrlGenerated: stripePaymentUrl,
        emailSent: emailSuccess
    });
}
