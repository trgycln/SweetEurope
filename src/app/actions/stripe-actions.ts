'use server';

import { stripe } from '@/lib/stripe';
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

    // 3. Calculate Subtotal & Shipping
    const subtotalNet = params.items.reduce((sum, item) => sum + (item.birimFiyatNet * item.adet), 0);
    const shipping = calculateShipping(subtotalNet, params.deliveryPlz);

    // 4. Build Stripe Line Items
    const line_items: any[] = params.items.map((item) => {
      const kdvMultiplier = 1 + ((item.kdvOrani ?? 19) / 100);
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

    // 5. Create Stripe Session with resilience
    const sessionPayload: any = {
      mode: 'payment',
      line_items,
      customer_email: user.email || undefined,
      client_reference_id: String(params.firmaId),
      metadata: {
        firma_id: String(params.firmaId),
        user_id: user.id,
        order_notes: params.orderNotes || '',
        shipping_cost: shipping.shippingCost.toString(),
        is_koln_area: shipping.isKolnArea.toString(),
      },
      success_url: `${origin}/${params.locale}/portal/siparisler?payment_status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${params.locale}/portal/siparisler/yeni?payment_status=cancelled`,
      locale: params.locale === 'de' ? 'de' : params.locale === 'tr' ? 'tr' : 'en',
    };

    console.log('Creating Stripe Session with line_items:', JSON.stringify(line_items));

    try {
      sessionPayload.payment_method_types = ['card', 'sepa_debit'];
      const session = await stripe.checkout.sessions.create(sessionPayload);
      console.log('Stripe session created successfully:', session.url);
      return { success: true, url: session.url };
    } catch (createErr: any) {
      console.warn('Stripe multi-payment session create failed, falling back to card:', createErr.message);
      sessionPayload.payment_method_types = ['card'];
      const session = await stripe.checkout.sessions.create(sessionPayload);
      console.log('Stripe fallback card session created successfully:', session.url);
      return { success: true, url: session.url };
    }
  } catch (error: any) {
    console.error('CRITICAL Stripe Checkout Session Error:', error);
    return { error: error.message || 'Fehler bei der Initialisierung von Stripe Checkout.' };
  }
}
