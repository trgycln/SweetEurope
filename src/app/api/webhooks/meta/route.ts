import { NextRequest, NextResponse } from 'next/server';
import { runSalesAgent } from '@/lib/ai/sales-agent';

export const dynamic = 'force-dynamic';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'elysonsweets_b2b_sales_webhook';
const ACCESS_TOKEN = process.env.META_GRAPH_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;

// Cache of recently processed message IDs to ensure idempotency
const processedMessageIds = new Set<string>();

/**
 * 1. META WEBHOOK VERIFICATION (GET)
 * Used by Meta Developers / Commerce Manager to verify webhook URL.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Meta Webhook] Verification successful!');
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  console.warn('[Meta Webhook] Verification failed. Token mismatch.');
  return new Response('Forbidden', { status: 403 });
}

/**
 * Send reply message via WhatsApp Cloud API
 */
async function sendWhatsAppMessage(to: string, text: string) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.warn('[Meta Webhook] Missing META_GRAPH_ACCESS_TOKEN or META_PHONE_NUMBER_ID. Skipping WhatsApp send.');
    return;
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Meta Webhook] Error sending WhatsApp message:', err);
    }
  } catch (e) {
    console.error('[Meta Webhook] WhatsApp network exception:', e);
  }
}

/**
 * Send reply message via Instagram DM / Messenger API
 */
async function sendMessengerOrInstagramMessage(recipientId: string, text: string) {
  if (!ACCESS_TOKEN) {
    console.warn('[Meta Webhook] Missing META_GRAPH_ACCESS_TOKEN. Skipping Instagram/Messenger send.');
    return;
  }

  try {
    const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${ACCESS_TOKEN}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Meta Webhook] Error sending IG/Messenger message:', err);
    }
  } catch (e) {
    console.error('[Meta Webhook] IG/Messenger network exception:', e);
  }
}

/**
 * 2. META INBOUND MESSAGE RECEIVER (POST)
 * Handles incoming WhatsApp, Instagram DM, and Messenger events.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Quickly acknowledge receipt to Meta (must respond < 3 seconds)
    // We execute agent processing asynchronously
    const isWhatsApp = body.object === 'whatsapp_business_account';
    const isPageOrInstagram = body.object === 'page' || body.object === 'instagram';

    if (isWhatsApp) {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;
          const messages = value?.messages;

          if (Array.isArray(messages)) {
            for (const msg of messages) {
              const msgId = msg.id;
              if (processedMessageIds.has(msgId)) continue;
              processedMessageIds.add(msgId);
              if (processedMessageIds.size > 5000) processedMessageIds.clear();

              const from = msg.from; // Sender phone number
              const text = msg.text?.body;

              if (text && from) {
                // Background execution of sales agent
                (async () => {
                  try {
                    const agentRes = await runSalesAgent({
                      messages: [{ role: 'user', content: text }],
                      channel: 'whatsapp',
                      locale: 'de',
                    });
                    await sendWhatsAppMessage(from, agentRes.reply);
                  } catch (e) {
                    console.error('[Meta Webhook] WhatsApp agent error:', e);
                  }
                })();
              }
            }
          }
        }
      }
    } else if (isPageOrInstagram) {
      for (const entry of body.entry || []) {
        for (const messaging of entry.messaging || []) {
          const senderId = messaging.sender?.id;
          const text = messaging.message?.text;
          const msgId = messaging.message?.mid;

          if (msgId && processedMessageIds.has(msgId)) continue;
          if (msgId) {
            processedMessageIds.add(msgId);
            if (processedMessageIds.size > 5000) processedMessageIds.clear();
          }

          if (senderId && text) {
            (async () => {
              try {
                const agentRes = await runSalesAgent({
                  messages: [{ role: 'user', content: text }],
                  channel: 'instagram',
                  locale: 'de',
                });
                await sendMessengerOrInstagramMessage(senderId, agentRes.reply);
              } catch (e) {
                console.error('[Meta Webhook] IG agent error:', e);
              }
            })();
          }
        }
      }
    }

    return NextResponse.json({ status: 'EVENT_RECEIVED' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Webhook error';
    console.error('[Meta Webhook] POST error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
