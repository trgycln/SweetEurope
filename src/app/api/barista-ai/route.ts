import { NextRequest, NextResponse } from 'next/server';
import { generateObjectWithFallback } from '@/lib/ai/providers';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { v4 as uuidv4 } from 'uuid';

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

const RecipeSchema = z.object({
  recipes: z.array(z.object({
    title: MultiLangString.describe('Reçetenin adı (4 farklı dilde çevrilmiş olarak)'),
    description: MultiLangString.describe('İştah açıcı açıklama (4 farklı dilde çevrilmiş olarak)'),
    ingredients: MultiLangArray.describe('Malzemeler. UYARI: Her dil objesine ("tr", "de", "en", "ar") o dile ÇEVRİLMİŞ malzemeleri yazmalısın. Asla kopyala yapıştır yapma!'),
    instructions: MultiLangArray.describe('Hazırlanış adımları. UYARI: Her dil objesine ("tr", "de", "en", "ar") o dile ÇEVRİLMİŞ adımları yazmalısın. Asla kopyala yapıştır yapma!'),
    prep_time_minutes: z.number().describe('Preparation time in minutes'),
    category: z.enum(['coffee', 'cocktail', 'mocktail', 'smoothie']).describe('Recipe category'),
  })).length(3)
});

// Helper function to sanitize any hallucinated tokens or formatting glitches in arrays
function cleanArrayText(arr: string[]): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(text => {
    if (!text) return '';
    return text
      .replace(/(?:instructios?ns?|ingredients?)\s*:\s*\[?/gi, '')
      .replace(/[\[\]]/g, '')
      .replace(/\s*70\s*cl\s*btl/gi, '')
      .replace(/\s*1000\s*ml\s*btl/gi, '')
      .replace(/\s*1\s*lt?\s*btl/gi, '')
      .replace(/\bCold\s+Bruw\b/gi, 'Cold Brew')
      .replace(/\bİnçli\s+Süt\s*(?:ısılısı)?\b/gi, 'Buharla Isıtılmış Sıcak Süt')
      .replace(/\bIncli\s+Sut\b/gi, 'Buharla Isıtılmış Sıcak Süt')
      .replace(/\s*\([Ee]lysonsweets\s+reçetesi\)/gi, '')
      .replace(/\s*\([Ee]lysonsweets\s+Rezept\)/gi, '')
      .trim();
  }).filter(t => t.length > 0 && !t.toLowerCase().startsWith('instructio'));
}

// Helper to sanitize an object of arrays (ingredients, instructions)
function cleanMultiLangArray(obj: any) {
  if (!obj) return { tr: [], de: [], en: [], ar: [] };
  return {
    tr: cleanArrayText(obj.tr || []),
    de: cleanArrayText(obj.de || []),
    en: cleanArrayText(obj.en || []),
    ar: cleanArrayText(obj.ar || [])
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ingredients, concept, cafeName, locale = 'de' } = body;

    if (!ingredients || !concept) {
      return NextResponse.json({ error: 'Ingredients and concept are required' }, { status: 400 });
    }

    const systemPrompt = `Sen sadece bir barmen değilsin; sen HoReCa işletmeleri için kârlılık (Cost per Serving) ve operasyonel hız (Speed of Service) odaklı bir Master Barista'sın.
Görevin, kafe, bar ve restoran sahiplerine (B2B müşterilerine) ilham verecek, ticari olarak kârlı ve lezzet profili kusursuz reçeteler üretmektir. Önerdiğin reçeteler görsel olarak Instagrammable olmalı, hazırlanışı yoğun kafe saatlerinde baristayı yormamalı ve KESİNLİKLE Elyson Sweets'in FO marka şurup/soslarını başrolde kullanmalıdır.

[KÂRLILIK VE AÇIKLAMA KURALI]
Her reçetenin 'description' (açıklama) kısmının sonunda işletmeciye bu içeceğin neden kârlı olduğunu ve neden menüye eklenmesi gerektiğini bir cümleyle açıkla.

[KRİTİK KURAL: FO KİMYASI VE DOZAJ (BRIX & VİSKOZİTE)]
- FO marka ürünler, piyasadaki sıradan şuruplardan çok farklı bir formülasyona sahiptir. Kuru madde oranı %10 daha yüksek, ancak tatlılık (şeker) oranı %30 daha düşüktür.
- Bu nedenle FO şurupları sadece bir "tatlandırıcı" değil, içeceğe gövde (mouthfeel), kıvam (viskozite) ve renk katan bir miksoloji bazıdır.
- DOZAJ KURALI: Standart bir içecek (250-300ml) için DAİMA 20ml ile 30ml (2-3 cl) arasında FO ürünü kullan. FO'nun düşük şeker profili sayesinde bu yüksek dozaj içeceği asla aşırı tatlı (bayıcı) yapmaz; aksine özellikle frozen, frappe, asidik kokteyl ve sütlü kahvelerde mükemmel bir gövde yaratır.

[ÇIKTI FORMATI VE DİL - ÇOK ÖNEMLİ]
- Yanıtın SADECE geçerli bir JSON formatında olmalıdır. JSON dışında hiçbir açıklama, giriş veya çıkış metni yazma.
- Üreteceğin reçetelerin içerikleri (Başlık, Açıklama, Malzemeler ve Adımlar) KESİNLİKLE aynı anda 4 farklı dilde (Türkçe, Almanca, İngilizce, Arapça) ÇEVRİLMİŞ olmalıdır.
- YAPILAN EN BÜYÜK HATA: Malzemeleri (ingredients) ve Adımları (instructions) tüm dillere aynı (örneğin sadece Türkçe) yazmak! Bütün metinleri "de" için Almanca'ya, "en" için İngilizce'ye, "ar" için Arapça'ya ÇEVİRMEK ZORUNDASIN.
- JSON yapısı KESİNLİKLE aşağıdaki gibi çoklu dil (MultiLang) destekli olmalıdır:
{
  "title": {
    "tr": "Tükçe Başlık", "de": "Almanca Başlık", "en": "İngilizce Başlık", "ar": "Arapça Başlık"
  },
  "description": {
    "tr": "Türkçe Açıklama", "de": "Almanca Açıklama", "en": "İngilizce Açıklama", "ar": "Arapça Açıklama"
  },
  "ingredients": {
    "tr": ["25ml FO Karamel Şurubu", "30ml Espresso"], 
    "de": ["25ml FO Karamellsirup", "30ml Espresso"],
    "en": ["25ml FO Caramel Syrup", "30ml Espresso"],
    "ar": ["25 مل شراب كراميل FO", "30 مل إسبريسو"]
  },
  "instructions": {
    "tr": ["Adım 1...", "Adım 2..."],
    "de": ["Schritt 1...", "Schritt 2..."],
    "en": ["Step 1...", "Step 2..."],
    "ar": ["الخطوة 1...", "الخطوة 2..."]
  },
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
      title: r.title, // Object with tr, de, en, ar
      description: r.description,
      ingredients: cleanMultiLangArray(r.ingredients),
      instructions: cleanMultiLangArray(r.instructions),
      prep_time_minutes: r.prep_time_minutes,
      category: r.category?.trim().toLowerCase() || 'coffee',
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
