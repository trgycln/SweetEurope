import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { generateObjectWithFallback } from '@/lib/ai/providers';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MultiLangString = z.object({
  tr: z.string().describe('Türkçe'),
  de: z.string().describe('Almanca'),
  en: z.string().describe('İngilizce'),
  ar: z.string().describe('Arapça')
});

const MultiLangArray = z.object({
  tr: z.array(z.string()).describe('Türkçe'),
  de: z.array(z.string()).describe('Almanca'),
  en: z.array(z.string()).describe('İngilizce'),
  ar: z.array(z.string()).describe('Arapça')
});

const RecipeTranslationSchema = z.object({
  title: MultiLangString,
  description: MultiLangString,
  ingredients: MultiLangArray,
  instructions: MultiLangArray,
});

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 });

    const supabase = createSupabaseServiceClient();

    // Fetch existing recipe
    const { data: recipe, error: fetchErr } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const sourceLang = recipe.locale || 'tr';
    
    // Extract the text to translate
    const getSource = (obj: any) => {
        if (!obj) return '';
        if (typeof obj === 'string') return obj;
        return obj[sourceLang] || obj.tr || obj.de || obj.en || JSON.stringify(obj);
    };

    const sourceContent = `
    Title: ${getSource(recipe.title)}
    Description: ${getSource(recipe.description)}
    Ingredients: ${JSON.stringify(getSource(recipe.ingredients))}
    Instructions: ${JSON.stringify(getSource(recipe.instructions))}
    `;

    const systemPrompt = `You are a professional barista translator. Your job is to translate the provided recipe into 4 languages: Turkish (tr), German (de), English (en), and Arabic (ar).
    Ensure the translations are natural, appealing for a cafe menu, and preserve the original meaning.
    The input is currently mostly in ${sourceLang}.
    Return a JSON object containing the translations for title, description, ingredients (array of strings), and instructions (array of strings).`;

    const { object } = await generateObjectWithFallback({
      schema: RecipeTranslationSchema,
      system: systemPrompt,
      prompt: `Translate this recipe:\n${sourceContent}`,
      temperature: 0.3,
    });

    // Update database
    const { error: updateErr } = await supabase
      .from('recipes')
      .update({
        title: object.title,
        description: object.description,
        ingredients: object.ingredients,
        instructions: object.instructions
      })
      .eq('id', id);

    if (updateErr) {
      console.error('Update error:', updateErr);
      return NextResponse.json({ error: 'Failed to save translations' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: object });

  } catch (error: any) {
    console.error('[API translate-recipe] Error:', error.message);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
