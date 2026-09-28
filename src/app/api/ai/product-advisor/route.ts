import { NextRequest, NextResponse } from 'next/server';
import { runSalesAgent } from '@/lib/ai/sales-agent';
import { AgentRequest } from '@/lib/ai/types';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const rateLimitMap = new Map<string, { count: number, resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = 3;
  const windowMs = 10000;

  let record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    rateLimitMap.set(ip, record);
    return false;
  }

  if (record.count >= limit) {
    return true;
  }

  record.count += 1;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.ip ?? req.headers.get('x-forwarded-for') ?? 'unknown';
    if (checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    const body: AgentRequest = await req.json();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const result = await runSalesAgent({
      messages: body.messages,
      locale: body.locale || 'de',
      channel: body.channel || 'web',
      currentProduct: body.currentProduct,
    });

    // Log the interaction
    try {
      const supabase = createSupabaseServiceClient();
      const lastUserMessage = body.messages[body.messages.length - 1];
      if (lastUserMessage && lastUserMessage.role === 'user') {
        const sessionId = req.headers.get('x-session-id') || uuidv4();
        
        await supabase.from('ai_chat_logs').insert({
          session_id: sessionId,
          user_message: lastUserMessage.content,
          ai_response: result.reply,
          channel: body.channel || 'web',
          tools_used: result.toolsUsed || [],
        });
      }
    } catch (logErr) {
      console.error('[API product-advisor] Failed to log chat:', logErr);
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('[API product-advisor] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
