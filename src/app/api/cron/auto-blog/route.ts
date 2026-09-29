import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateTextWithFallback } from '@/lib/ai/providers';
import { getSeasonalBlogImage } from '@/lib/blog-images';
import { generateSeasonalTopic } from '@/lib/ai/prompts/topic-generator';
import { buildBlogGenerationPrompt } from '@/lib/ai/prompts/blog-prompt';

// Vercel Pro/Hobby için maksimum çalışma süresi (Zincirleme üretim uzun sürer)
export const maxDuration = 300; 

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function sanitizeSlug(text: string) {
  if (!text) return `blog-${Date.now()}`;
  return text.toLowerCase()
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ä/g, 'a')
    .replace(/ß/g, 'ss')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function parseAiJson(text: string) {
  try {
    // <think>...</think> bloklarını temizle (Qwen/DeepSeek thinking modeller)
    const withoutThink = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const jsonStr = withoutThink.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse AI JSON:", text);
    throw new Error("Failed to parse AI output as JSON.");
  }
}

async function translateJson(baseJson: any, targetLang: string, targetLangCode: string, linkKeyword1: string, linkKeyword2: string) {
  const prompt = `You are a professional translator and copywriter. Translate the following German JSON blog post into ${targetLang}.
Keep the EXACT same JSON keys, only translate the values accurately and fluently. Do not leave German words in the title or content.
Change internal links to match the language code: "/de/barista-ai" -> "/${targetLangCode}/barista-ai" (anchor: "${linkKeyword1}") and "/de/products/fo" -> "/${targetLangCode}/products/fo" (anchor: "${linkKeyword2}").

German JSON to translate:
${JSON.stringify(baseJson, null, 2)}

Return ONLY a valid JSON string in the exact same format, no markdown tags.`;

  const { text } = await generateTextWithFallback({
    prompt,
    temperature: 0.7,
  });
  
  return parseAiJson(text);
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 1. generateSeasonalTopic çağırarak mevsime uygun trend konuyu al
    const { topic, currentMonthName } = await generateSeasonalTopic();
    console.log('Otomatik Bulunan Konu:', topic, 'Ay:', currentMonthName);

    // 2. Bu konuyu buildBlogGenerationPrompt içine vererek Almanca (Ana) makaleyi üret
    const dePrompt = buildBlogGenerationPrompt(topic, currentMonthName);
    const { text: deText } = await generateTextWithFallback({
      prompt: dePrompt,
      temperature: 0.7,
    });
    
    const deData = parseAiJson(deText);

    // 3-5. Çeviriler hafif stagger ile paralel — rate limit ve Hobby 60sn dengesi
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    console.log('Çeviriler başlatılıyor...');
    const [enData, trData, arData] = await Promise.all([
      translateJson(deData, 'English', 'en', 'Barista AI Recipe Assistant', 'FO Cocktail Syrups'),
      sleep(3000).then(() => translateJson(deData, 'Turkish', 'tr', 'Barista AI Reçete Sihirbazı', 'FO Kokteyl Şurupları')),
      sleep(6000).then(() => translateJson(deData, 'Arabic', 'ar', 'مساعد وصفات باريستا الذكي', 'شراب كوكتيل FO')),
    ]);

    // 6. getSeasonalBlogImage fonksiyonunu çağırarak mevsime uygun görseli al
    const currentMonthIndex = new Date().getMonth();
    const imageUrl = getSeasonalBlogImage(currentMonthIndex);

    // 7. Supabase blog_yazilari tablosuna kaydet
    const { data, error } = await supabaseAdmin
      .from('blog_yazilari')
      .insert({
        slug: sanitizeSlug(deData.slug),
        title: { de: deData.title, en: enData.title, tr: trData.title, ar: arData.title },
        excerpt: { de: deData.excerpt, en: enData.excerpt, tr: trData.excerpt, ar: arData.excerpt },
        content: { de: deData.content, en: enData.content, tr: trData.content, ar: arData.content },
        meta_title: { de: deData.meta_title, en: enData.meta_title, tr: trData.meta_title, ar: arData.meta_title },
        meta_description: { de: deData.meta_description, en: enData.meta_description, tr: trData.meta_description, ar: arData.meta_description },
        image_url: imageUrl,
        author_name: 'Elysonsweets B2B Team',
        is_published: true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, topic, data });

  } catch (error: any) {
    console.error('Auto-Blog Cron Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
