import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { getGroqModel } from '@/lib/ai/providers';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RecipeSchema = z.object({
  recipes: z.array(z.object({
    name: z.string().describe('Creative and catchy name for the signature drink'),
    description: z.string().describe('Short, appetizing description of the drink'),
    ingredients: z.array(z.string()).describe('List of ingredients with exact measurements (e.g., 20ml FO Caramel Syrup)'),
    instructions: z.array(z.string()).describe('Step-by-step preparation instructions'),
    glassType: z.string().describe('Recommended glass type (e.g., Highball, Coupe)'),
  })).length(3)
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ingredients, concept, cafeName, locale = 'de' } = body;

    if (!ingredients || !concept) {
      return NextResponse.json({ error: 'Ingredients and concept are required' }, { status: 400 });
    }

    const systemPrompt = "You are an elite, world-class Master Barista and Mixologist working for Elysonsweets.\nYour task is to create exactly 3 unique 'Signature Drink' recipes based on the user's available ingredients and concept.\n\nCRITICAL RULES:\n1. You MUST use 'FO' brand syrups or sauces in EVERY recipe (e.g., 'FO Caramel Syrup', 'FO Chocolate Sauce').\n2. NEVER mention or use 'Limpo' or 'Repo' brands. ONLY use 'FO'.\n3. Provide exact, professional measurements (ml, grams, shots).\n4. The output language MUST be in " + (locale === 'tr' ? 'Turkish' : locale === 'en' ? 'English' : locale === 'ar' ? 'Arabic' : 'German') + ".\n5. Make the drink names sound premium and suitable for a high-end cafe menu.";

    const userPrompt = "Cafe Name: " + (cafeName || 'My Cafe') + "\nAvailable Ingredients: " + ingredients + "\nMenu Concept/Theme: " + concept + "\n\nPlease generate 3 signature drinks using these inputs and FO brand products.";

    // Her hesapta %100 çalışan stabil Llama 3.1 modeli
    const { object } = await generateObject({
      model: getGroqModel('openai/gpt-oss-120b'),
      schema: RecipeSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    try {
      const supabase = createSupabaseServiceClient();
      const sessionId = req.headers.get('x-session-id') || uuidv4();
      await supabase.from('ai_chat_logs').insert({
        session_id: sessionId,
        user_message: "Barista AI Request: " + concept + " with " + ingredients,
        ai_response: JSON.stringify(object),
        channel: 'barista-ai',
        tools_used: ['generateObject'],
      });
    } catch (logErr) {
      console.error('[API barista-ai] Failed to log:', logErr);
    }

    return NextResponse.json(object);
  } catch (error: any) {
    console.error('[API barista-ai] Error:', error.message);
    return NextResponse.json({ error: 'Failed to generate recipes' }, { status: 500 });
  }
}
