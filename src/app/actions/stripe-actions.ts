'use server';

import { stripe, assertStripeEnvironmentSafety } from '@/lib/stripe';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies, headers } from 'next/headers';
import { calculateShipping } from '@/lib/shippingUtils';
import { Locale } from '@/i18n-config';

interface CartItemInput {
  urun_id: string;
  ad: string;
  adet: number;
  birimFiyatNet: number;
  kdvOrani?: number;
}

export async function createStripeCheckoutSessionAction(params: {
  firmaId: string;
  items: CartItemInput[];
  deliveryPlz?: string;
  locale: Locale;
  orderNotes?: string;
}) {
  try {
    // 0. Stripe Güvenlik Bariyeri (Safety Guard):
    // Test veya geliştirme ortamında kazara canlı anahtarla gerçek kart çekimini önler
    const safetyCheck = assertStripeEnvironmentSafety();
    if (!safetyCheck.safe) {
      console.error('Stripe Safety Check Failed:', safetyCheck.error);
      return { error: safetyCheck.error };
    }

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Nicht authentifiziert. Bitte melden Sie sich an.' };
    }

    if (!params.firmaId) {
      return { error: 'Kein Partnerprofil zugeordnet.' };
    }

    if (!params.items || params.items.length === 0) {
      return { error: 'Warenkorb ist leer.' };
    }

    // 2. Fetch firm info
    const { data: firmaData } = await supabase
      .from('firmalar')
      .select('adres, unvan')
      .eq('id', params.firmaId)
      .maybeSingle();

    const teslimatAdresi = firmaData?.adres || params.deliveryPlz || 'Lieferadresse im Kundenprofil';

    // 3. Calculate Subtotal & Shipping
    const subtotalNet = params.items.reduce((sum, item) => sum + (item.birimFiyatNet * item.adet), 0);
    const shipping = calculateShipping(subtotalNet, params.deliveryPlz);

    const totalTax = params.items.reduce((sum, item) => {
      const kdvRate = (item.kdvOrani ?? 7) / 100;
      return sum + (item.birimFiyatNet * item.adet * kdvRate);
    }, 0);
    const shippingGross = shipping.shippingCost > 0 ? Number((shipping.shippingCost * 1.19).toFixed(2)) : 0;
    const grossTotal = Number((subtotalNet + totalTax + shippingGross).toFixed(2));

    // 4. Create pending order in database
    const { data: newOrder, error: orderInsertError } = await supabase
      .from('siparisler')
      .insert({
        firma_id: params.firmaId,
        teslimat_adresi: teslimatAdresi,
        siparis_durumu: 'Beklemede',
        siparis_kaynagi: 'Müşteri Portalı',
        olusturan_kullanici_id: user.id,
        siparis_tarihi: new Date().toISOString(),
        toplam_tutar_net: subtotalNet,
        toplam_tutar_brut: grossTotal,
        kdv_orani: 7,
        odeme_durumu: 'pending',
        odeme_kasa_tipi: 'Banka'
      })
      .select('id')
      .single();

    if (orderInsertError || !newOrder) {
      console.error('Order creation error for Stripe:', orderInsertError);
      return { error: 'Fehler beim Erstellen der Bestellung in der Datenbank.' };
    }

    const orderId = newOrder.id;

    // Insert line items into siparis_detay
    const itemRows = params.items.map(item => ({
      siparis_id: orderId,
      urun_id: item.urun_id,
      miktar: item.adet,
      birim_fiyat: item.birimFiyatNet,
      toplam_fiyat: Number((item.adet * item.birimFiyatNet).toFixed(2))
    }));

    const { error: detayError } = await supabase.from('siparis_detay').insert(itemRows);
    if (detayError) {
      console.warn('siparis_detay insert warning:', detayError.message);
    }

    // 5. Build Stripe Line Items
    const line_items: any[] = params.items.map((item) => {
      const kdvMultiplier = 1 + ((item.kdvOrani ?? 7) / 100);
      const grossUnitPriceCent = Math.max(1, Math.round(item.birimFiyatNet * kdvMultiplier * 100));
      const productName = (item.ad && item.ad.trim().length > 0) ? item.ad.trim() : 'Produkt';

      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: productName,
            metadata: {
              urun_id: String(item.urun_id || ''),
            },
          },
          unit_amount: grossUnitPriceCent,
        },
        quantity: Math.max(1, Number(item.adet) || 1),
      };
    });

    // Add shipping as line item if greater than 0
    if (shipping.shippingCost > 0) {
      line_items.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: shipping.shippingMethodName || 'Lieferung & Versand',
            description: shipping.description || 'Versandkosten',
          },
          unit_amount: Math.max(1, Math.round(shipping.shippingCost * 1.19 * 100)), // incl 19% MwSt
        },
        quantity: 1,
      });
    }

    const origin = (await headers()).get('origin') || 'http://localhost:3000';

    // 6. Create Stripe Session with resilience
    const sessionPayload: any = {
      mode: 'payment',
      line_items,
      customer_email: user.email || undefined,
      client_reference_id: String(params.firmaId),
      metadata: {
        firma_id: String(params.firmaId),
        order_id: String(orderId),
        user_id: user.id,
        order_notes: params.orderNotes || '',
        shipping_cost: shipping.shippingCost.toString(),
        is_koln_area: shipping.isKolnArea.toString(),
      },
      success_url: `${origin}/${params.locale}/portal/siparisler?payment_status=success&session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${origin}/${params.locale}/portal/siparisler/yeni?payment_status=cancelled`,
      locale: params.locale === 'de' ? 'de' : params.locale === 'tr' ? 'tr' : 'en',
    };

    console.log('Creating Stripe Session for order:', orderId, 'with line_items:', JSON.stringify(line_items));

    try {
      sessionPayload.payment_method_types = ['card', 'sepa_debit'];
      const session = await stripe.checkout.sessions.create(sessionPayload);
      console.log('Stripe session created successfully:', session.url);
      return { success: true, url: session.url, orderId };
    } catch (createErr: any) {
      console.warn('Stripe multi-payment session create failed, falling back to card:', createErr.message);
      sessionPayload.payment_method_types = ['card'];
      const session = await stripe.checkout.sessions.create(sessionPayload);
      console.log('Stripe fallback card session created successfully:', session.url);
      return { success: true, url: session.url, orderId };
    }
  } catch (error: any) {
    console.error('CRITICAL Stripe Checkout Session Error:', error);
    return { error: error.message || 'Fehler bei der Initialisierung von Stripe Checkout.' };
  }
}

export async function confirmStripePaymentAction(sessionId: string, orderId?: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid') {
      const targetOrderId = orderId || (session.metadata?.order_id as string | undefined);
      if (targetOrderId) {
        const cookieStore = await cookies();
        const supabase = await createSupabaseServerClient(cookieStore);
        await supabase
          .from('siparisler')
          .update({
            odeme_durumu: 'paid',
            siparis_durumu: 'Beklemede'
          })
          .eq('id', targetOrderId);
      }
      return { success: true };
    }
    return { success: false, status: session.payment_status };
  } catch (err: any) {
    console.error('confirmStripePaymentAction error:', err);
    return { error: err.message };
  }
}
