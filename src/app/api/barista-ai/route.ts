import { NextRequest, NextResponse } from 'next/server';
import { generateObjectWithFallback } from '@/lib/ai/providers';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RecipeSchema = z.object({
  recipes: z.array(z.object({
    title: z.string().describe('Reçetenin havalı ve ticari adı'),
    description: z.string().describe('Menüde müşteriyi cezbedecek 2-3 cümlelik iştah açıcı açıklama'),
    ingredients: z.array(z.string()).describe('List of ingredients with exact measurements'),
    instructions: z.array(z.string()).describe('Step-by-step preparation instructions'),
    prep_time_minutes: z.number().describe('Preparation time in minutes'),
    category: z.enum(['coffee', 'cocktail', 'mocktail', 'smoothie']).describe('Recipe category'),
  })).length(3)
});

// Helper function to sanitize any hallucinated tokens, leaking JSON tags, or formatting glitches
function cleanText(text: string): string {
  if (!text) return '';
  return text
    // Remove leaked JSON keys or brackets like "instructiosn:[", "instructions:", "[", "]"
    .replace(/(?:instructios?ns?|ingredients?)\s*:\s*\[?/gi, '')
    .replace(/[\[\]]/g, '')
    // Remove commercial packaging units erroneously pasted as portions
    .replace(/\s*70\s*cl\s*btl/gi, '')
    .replace(/\s*1000\s*ml\s*btl/gi, '')
    .replace(/\s*1\s*lt?\s*btl/gi, '')
    // Fix AI mistranslations and hallucinations
    .replace(/\bCold\s+Bruw\b/gi, 'Cold Brew')
    .replace(/\bİnçli\s+Süt\s*(?:ısılısı)?\b/gi, 'Buharla Isıtılmış Sıcak Süt')
    .replace(/\bIncli\s+Sut\b/gi, 'Buharla Isıtılmış Sıcak Süt')
    .replace(/\s*\([Ee]lysonsweets\s+reçetesi\)/gi, '')
    .replace(/\s*\([Ee]lysonsweets\s+Rezept\)/gi, '')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ingredients, concept, cafeName, locale = 'de' } = body;

    if (!ingredients || !concept) {
      return NextResponse.json({ error: 'Ingredients and concept are required' }, { status: 400 });
    }

    const systemPrompt = `Sen dünya çapında tanınan bir Master Mixologist, Baş Barista ve İçecek Menüsü Danışmanısın.
Görevin, kafe, bar ve restoran sahiplerine (B2B müşterilerine) ilham verecek, ticari olarak kârlı ve lezzet profili kusursuz reçeteler üretmektir.

[MARKA VE ÜRÜN KİMLİĞİ]
- Sen 'Elysonsweets' firmasının resmi dijital danışmanısın.
- Reçetelerinde DAİMA ve SADECE 'FO' marka şurup, sos ve püreleri kullanmalısın.

[KRİTİK KURAL: ALTIN ORAN VE KONSANTRASYON]
- FO marka ürünler, piyasadaki sıradan ürünlere göre çok daha yüksek meyve özüne sahip ve ekstra konsantredir.
- EĞER kullanıcı "Premium" kategorisinden bir ürün seçmişse veya ürünün yoğun olduğunu belirtmişse: Standart 30ml yerine KESİNLİKLE 10ml - 15ml bandında kullan.
- EĞER ürün standart kategorideyse: 20ml - 25ml bandını geçme.
- İçeceklerin aşırı tatlı (şekerli) olmasını engellemek senin en büyük önceliğindir. Asidite, tatlılık ve acılık (kahve/alkol) dengesini kusursuz kurmalısın.

[ÇIKTI FORMATI VE DİL]
- Kullanıcının talep ettiği dilde (Almanca, İngilizce, Türkçe veya Arapça) yanıt ver.
- Yanıtın SADECE geçerli bir JSON formatında olmalıdır. JSON dışında hiçbir açıklama, giriş (merhaba vb.) veya çıkış metni yazma.
- JSON yapısı KESİNLİKLE aşağıdaki gibi olmalıdır:
{
  "title": "Reçetenin havalı ve ticari adı",
  "description": "Menüde müşteriyi cezbedecek 2-3 cümlelik iştah açıcı açıklama",
  "ingredients": ["15ml FO Karamel Şurubu", "30ml Espresso", "200ml Süt"],
  "instructions": ["Adım 1...", "Adım 2..."],
  "prep_time_minutes": 5,
  "category": "coffee" 
}
Not: 'category' alanı SADECE şu 4 kelimeden biri olabilir: 'coffee', 'cocktail', 'mocktail', 'smoothie'.`;

    const userPrompt = "Cafe Name: " + (cafeName || 'My Cafe') + "\nAvailable Ingredients: " + ingredients + "\nMenu Concept/Theme: " + concept + "\n\nPlease generate 3 signature drinks using these inputs and FO brand products.";

    const { object } = await generateObjectWithFallback({
      schema: RecipeSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    });

    // Clean and sanitize each recipe to ensure pristine presentation
    const cleanedRecipes = object.recipes.map((r: any) => ({
      title: cleanText(r.title),
      description: cleanText(r.description),
      ingredients: (r.ingredients || [])
        .map((ing: string) => cleanText(ing))
        .filter((ing: string) => ing.length > 0 && !ing.toLowerCase().startsWith('instructio')),
      instructions: (r.instructions || [])
        .map((inst: string) => cleanText(inst))
        .filter((inst: string) => inst.length > 0),
      prep_time_minutes: r.prep_time_minutes,
      category: cleanText(r.category),
    }));

    const sanitizedResult = { recipes: cleanedRecipes };

    try {
      const supabase = createSupabaseServiceClient();
      const sessionId = req.headers.get('x-session-id') || uuidv4();
      await supabase.from('ai_chat_logs').insert({
        session_id: sessionId,
        user_message: "Barista AI Request: " + concept + " with " + ingredients,
        ai_response: JSON.stringify(sanitizedResult),
        channel: 'barista-ai',
        tools_used: ['generateObject'],
      });
    } catch (logErr) {
      console.error('[API barista-ai] Failed to log:', logErr);
    }

    return NextResponse.json(sanitizedResult);
  } catch (error: any) {
    console.error('[API barista-ai] Error:', error.message);
    return NextResponse.json({ error: 'Failed to generate recipes' }, { status: 500 });
  }
}
