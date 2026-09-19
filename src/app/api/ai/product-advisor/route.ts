import { NextRequest, NextResponse } from 'next/server';
import { runSalesAgent } from '@/lib/ai/sales-agent';
import { AgentRequest } from '@/lib/ai/types';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
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
