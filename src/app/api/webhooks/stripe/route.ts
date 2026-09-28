import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase admin client to bypass RLS for webhook operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: any;

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET || !signature) {
      return NextResponse.json({ error: 'Webhook secret or signature missing' }, { status: 400 });
    }

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error('⚠️ Stripe Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const metadata = session.metadata || {};
    const firmaId = metadata.firma_id;
    const orderId = metadata.order_id;

    console.log(`✅ Stripe Payment Success for Session: ${session.id}, Firma: ${firmaId}, Order: ${orderId}`);

    try {
      if (orderId) {
        const { error } = await supabaseAdmin
          .from('siparisler')
          .update({
            odeme_durumu: 'paid',
            siparis_durumu: 'Beklemede'
          })
          .eq('id', orderId);

        if (error) {
          console.error('Database update failed in Stripe webhook:', error.message);
        } else {
          console.log('✅ Order marked as paid in database via Stripe webhook.');
        }
      } else {
        console.warn('⚠️ No order_id found in Stripe session metadata.');
      }
    } catch (dbError) {
      console.error('Error handling post-payment DB update:', dbError);
    }
  }

  return NextResponse.json({ received: true });
}
