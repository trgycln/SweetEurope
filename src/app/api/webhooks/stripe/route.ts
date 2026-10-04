/**
 * Stripe Webhook Route
 * ====================
 * GÜVENLİK: raw body (req.text()) ile Stripe signature doğrulaması yapılır.
 * Sahte istekler imza doğrulamasında 400 döndürür — hiçbir sipariş haksız yere "Paid" olmaz.
 *
 * Desteklenen event'lar:
 * - checkout.session.completed → siparişi 'paid' yapar + faturasız onay e-postası gönderir
 * - payment_intent.succeeded   → Ek güvence katmanı olarak aynı akışı tetikler
 *
 * NOT: Lexware faturası burada KESİLMEZ — admin panelinden manuel tetiklenir.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { markOrderPaidFromStripe } from '@/lib/order-payment';

// Next.js'in body'yi otomatik parse etmemesi için force-dynamic zorunlu
export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
  // GÜVENLİK: raw body MUTLAKA req.text() ile alınmalı
  // Buffer olarak parse edilmeden signature doğrulaması geçersiz olur
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET tanımlı değil!');
    return NextResponse.json({ error: 'Webhook secret missing' }, { status: 500 });
  }

  if (!signature) {
    console.warn('[stripe-webhook] stripe-signature header eksik');
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  // GÜVENLİK: Stripe imza doğrulaması — sahte istek buradan geçemez
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[stripe-webhook] ⚠️ Stripe imza doğrulama başarısız:', err.message);
    return NextResponse.json({ error: `Webhook signature error: ${err.message}` }, { status: 400 });
  }

  console.log(`[stripe-webhook] Event alındı: ${event.type} | ID: ${event.id}`);

  try {
    // checkout.session.completed: Stripe Checkout ile ödeme tamamlandı
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const normalOrderId = session.metadata?.normal_order_id;
      const onSiparisOrderId = session.metadata?.on_siparis_order_id;
      const legacyOrderId = session.metadata?.order_id || session.metadata?.orderId || session.client_reference_id;

      const orderIdsToMark: string[] = [];
      if (normalOrderId) orderIdsToMark.push(normalOrderId);
      if (onSiparisOrderId) orderIdsToMark.push(onSiparisOrderId);
      
      if (orderIdsToMark.length === 0 && legacyOrderId) {
        orderIdsToMark.push(legacyOrderId);
      }

      if (orderIdsToMark.length === 0) {
        console.warn('[stripe-webhook] checkout.session.completed — sipariş ID bulunamadı (metadata.order_id veya client_reference_id)');
        // Bilinmeyen sipariş — Stripe'a 200 döndür (retry yapmaması için)
        return NextResponse.json({ received: true, warning: 'No orderId found' });
      }

      console.log(`[stripe-webhook] ✅ Ödeme başarılı → Siparişler: ${orderIdsToMark.join(', ')} | Session: ${session.id}`);

      for (const orderId of orderIdsToMark) {
        // Ödemeyi işaretle + faturasız onay e-postası (idempotent)
        const result = await markOrderPaidFromStripe(orderId);

        if (!result.success) {
          // Kritik hata → Stripe'a 500 döndür ki tekrar denesin
          console.error('[stripe-webhook] markOrderPaidFromStripe başarısız:', result.error);
          return NextResponse.json({ error: result.error }, { status: 500 });
        }

        if (result.warning) {
          console.warn(`[stripe-webhook] ⚠️ Kısmi başarı — Sipariş: ${orderId} | Uyarı: ${result.warning}`);
        } else {
          console.log(`[stripe-webhook] ✅ Ödeme işlendi (fatura admin panelinden kesilecek) | Sipariş: ${orderId}`);
        }
      }
    }

    // payment_intent.succeeded: Ek güvence — Checkout dışı ödemeleri yakalar
    else if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      const normalOrderId = paymentIntent.metadata?.normal_order_id;
      const onSiparisOrderId = paymentIntent.metadata?.on_siparis_order_id;
      const legacyOrderId = paymentIntent.metadata?.order_id || paymentIntent.metadata?.orderId;

      const orderIdsToMark: string[] = [];
      if (normalOrderId) orderIdsToMark.push(normalOrderId);
      if (onSiparisOrderId) orderIdsToMark.push(onSiparisOrderId);
      
      if (orderIdsToMark.length === 0 && legacyOrderId) {
        orderIdsToMark.push(legacyOrderId);
      }

      if (orderIdsToMark.length === 0) {
        // Bizim sistemimize ait olmayan bir payment intent olabilir — sessizce geç
        return NextResponse.json({ received: true, warning: 'No orderId in payment_intent metadata' });
      }

      console.log(`[stripe-webhook] payment_intent.succeeded → Siparişler: ${orderIdsToMark.join(', ')} | PI: ${paymentIntent.id}`);

      for (const orderId of orderIdsToMark) {
        // IDEMPOTENCY: zaten 'paid' ise tekrar işlem/e-posta yapılmaz
        const result = await markOrderPaidFromStripe(orderId);
        if (result.warning) {
          console.warn(`[stripe-webhook] ⚠️ Uyarı (payment_intent): ${result.warning}`);
        }
      }
    }

    // Diğer event'lar sessizce kabul edilir (Stripe retry yapmaması için 200 dön)
    else {
      console.log(`[stripe-webhook] Unhandled event type: ${event.type} — ignoring`);
    }
  } catch (handlerErr: any) {
    // İşleyici hatası → 500 döndür, Stripe tekrar denesin
    console.error('[stripe-webhook] Event işleme hatası:', handlerErr);
    return NextResponse.json(
      { error: `Event handling error: ${handlerErr.message}` },
      { status: 500 }
    );
  }

  // Her zaman 200 döndür — Stripe bunu "received" olarak işaretler
  return NextResponse.json({ received: true });
}
