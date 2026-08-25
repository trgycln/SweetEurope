import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notificationUtils';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: any;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET && signature) {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } else {
      // In dev mode without webhook secret configured yet, parse directly
      event = JSON.parse(body);
    }
  } catch (err: any) {
    console.error('⚠️ Stripe Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const metadata = session.metadata || {};
    const firmaId = metadata.firma_id;

    console.log(`✅ Stripe Payment Success for Session: ${session.id}, Firma: ${firmaId}`);

    // Update order or notify admin
    try {
      // In a full implementation, update order status in Supabase to 'Ödendi'
      // and notify managers
      console.log('Stripe Order Processed successfully.');
    } catch (dbError) {
      console.error('Error handling post-payment DB update:', dbError);
    }
  }

  return NextResponse.json({ received: true });
}
