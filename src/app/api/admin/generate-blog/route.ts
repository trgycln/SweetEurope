import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateTextWithFallback } from '@/lib/ai/providers';

// Vercel Pro/Hobby için maksimum çalışma süresi
export const maxDuration = 300; 


const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Kırılmaz Parse Fonksiyonu
function parseTextBlocks(text: string) {
  const getSection = (name: string) => {
    // 1. Omni-directional bracket match (handles [SECTION: TITLE], ]SECTION: TITLE[, vs) for Arabic RTL
    let regex = new RegExp(`(?:\\[|\\])SECTION:\\s*${name}(?:\\[|\\])\\s*([\\s\\S]*?)(?=(?:\\[|\\])SECTION:|$)`, 'i');
    let match = text.match(regex);
    if (match && match[1].trim()) return match[1].trim();
    
    // 2. === NAME === format (in case AI used previous instructions)
    regex = new RegExp(`===\\s*${name}\\s*===\\s*([\\s\\S]*?)(?====|$)`, 'i');
    match = text.match(regex);
    if (match && match[1].trim()) return match[1].trim();
    
    // 3. <<<NAME>>> format
    regex = new RegExp(`<<<\\s*${name}\\s*>>>\\s*([\\s\\S]*?)(?=(?:<<<|(?:\\[|\\])SECTION:|===|$))`, 'i');
    match = text.match(regex);
    if (match && match[1].trim()) return match[1].trim();

    // 4. Ultimate fallback (just the word e.g. "TITLE:")
    regex = new RegExp(`\\b${name}:\\s*([\\s\\S]*?)(?=\\b(?:SLUG|TITLE|EXCERPT|CONTENT|META_TITLE|META_DESCRIPTION):|$)`, 'i');
    match = text.match(regex);
    return match ? match[1].trim() : '';
  };
  
  const result = {
    slug: getSection('SLUG'),
    title: getSection('TITLE'),
    excerpt: getSection('EXCERPT'),
    content: getSection('CONTENT'),
    meta_title: getSection('META_TITLE'),
    meta_description: getSection('META_DESCRIPTION')
  };
  
  if (!result.title || result.title.trim() === '') {
    console.error("Parse failed for text. Raw text was:", text.substring(0, 1000));
    throw new Error("Failed to parse AI output. No title found.");
  }
  
  return result;
}

// Slug'daki özel karakterleri temizleyen fonksiyon (404 hatasını önlemek için)
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

// Konuya göre farklı fallback görseller (Unsplash API çalışmadığında)
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000&auto=format&fit=crop', // Bar/cocktail
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1000&auto=format&fit=crop', // Barista
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1000&auto=format&fit=crop', // Coffee
  'https://images.unsplash.com/photo-1559622214-f8a9850965bb?q=80&w=1000&auto=format&fit=crop', // Cafe interior
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1000&auto=format&fit=crop', // Latte art
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=1000&auto=format&fit=crop', // Cocktails
  'https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=1000&auto=format&fit=crop', // Drinks
  'https://images.unsplash.com/photo-1534353341-404a42e67c9e?q=80&w=1000&auto=format&fit=crop', // Restaurant
];

// Unsplash'tan dinamik görsel çekme fonksiyonu
async function fetchDynamicImage(topic: string) {
  try {
    const { text: keyword } = await generateTextWithFallback({
      prompt: `Extract a single English search keyword (e.g., 'coffee', 'cocktail', 'cafe', 'barista') from this topic: "${topic}". Return ONLY the keyword.`,
      temperature: 0.3,
    });
    
    const query = keyword.trim().toLowerCase();
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
    
    if (unsplashAccessKey) {
      const res = await fetch(`https://api.unsplash.com/photos/random?query=${query}&orientation=landscape&client_id=${unsplashAccessKey}`);
      
      if (!res.ok) {
        console.warn(`Unsplash API error: ${res.status} ${res.statusText}`);
      } else {
        const data = await res.json();
        if (data?.urls?.regular) {
          console.log(`Unsplash image fetched for query "${query}": ${data.urls.regular}`);
          return data.urls.regular;
        }
        console.warn('Unsplash returned no image URL. Response:', JSON.stringify(data));
      }
    } else {
      console.warn('UNSPLASH_ACCESS_KEY is not set. Using fallback image.');
    }
    
    // Fallback: konuya göre rastgele farklı bir resim seç
    const randomIndex = Math.floor(Math.random() * FALLBACK_IMAGES.length);
    return FALLBACK_IMAGES[randomIndex];
  } catch (e) {
    console.error('fetchDynamicImage error:', e);
    const randomIndex = Math.floor(Math.random() * FALLBACK_IMAGES.length);
    return FALLBACK_IMAGES[randomIndex];
  }
}

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();

    // 1. ADIM: Sadece Almanca olarak ÇOK UZUN ve detaylı ana makaleyi yaz
    const dePrompt = `
      Sen dünya çapında bir B2B HORECA (Otel, Restoran, Kafe) uzmanı ve SEO stratejistisin.
      Konu: "${topic}"
      
      Bana bu konu hakkında ALMANCA (German) dilinde ÇOK DETAYLI, UZUN (en az 400 kelime) ve PROFESYONEL bir blog yazısı hazırla.
      Eğer konu başka dilde yazılmışsa, sen yine de SADECE ALMANCA içerik üreteceksin.
      
      KURALLAR:
      1. Sadece kısa madde işaretleri kullanma, konuyu derinlemesine anlatan doyurucu paragraflar yaz.
      2. İçerikte mutlaka <h2> ve <h3> başlıkları, <p> paragrafları ve <strong> vurguları kullan.
      3. Okuyucuya (Kafe ve Bar sahiplerine) kârlılık, trendler ve işletme yönetimi hakkında gerçekçi tavsiyeler ver.
      4. İÇ LİNKLEME (ÇOK ÖNEMLİ): Makalenin akışına uygun yerlerde şu iki linki doğal bir şekilde geçir:
         - Reçete ve kokteyl oluşturma aracı için: <a href="/de/barista-ai" class="text-blue-600 font-semibold hover:underline">Barista AI Rezept-Assistent</a>
         - Ürün tedariki için: <a href="/de/products/fo" class="text-blue-600 font-semibold hover:underline">FO Cocktail Sirupe</a>

      STRICT INSTRUCTIONS:
      - You MUST return the output using the exact [SECTION: NAME] separators below. 
      - DO NOT translate or modify the separators themselves. 

      [SECTION: SLUG]
      seo-friendly-url-in-english-without-special-characters
      [SECTION: TITLE]
      Makale Başlığı
      [SECTION: EXCERPT]
      Kısa Özet
      [SECTION: META_TITLE]
      SEO Meta Başlığı
      [SECTION: META_DESCRIPTION]
      SEO Meta Açıklaması
      [SECTION: CONTENT]
      <p>Burası makalenin HTML halidir...</p>
    `;

    const { text: deText } = await generateTextWithFallback({
      prompt: dePrompt,
      temperature: 0.7,
      maxTokens: 8192,
    });
    const deData = parseTextBlocks(deText);

    // 2. ADIM: Almanca metni diğer dillere çevir
    const translatePrompt = (lang: string, code: string, aiName: string, foName: string) => `
      You are a professional translator and copywriter. Translate the following text from German to ${lang}. 
      Translate the entire title, excerpt, and HTML content accurately and fluently into ${lang}. Do not leave German words in the title or content.
      
      STRICT INSTRUCTIONS:
      - You MUST return the output using the exact [SECTION: NAME] separators below. 
      - DO NOT translate or modify the separators themselves. 
      - Change internal links to match the language code: "/de/barista-ai" -> "/${code}/barista-ai" (anchor: "${aiName}") and "/de/products/fo" -> "/${code}/products/fo" (anchor: "${foName}").

      [SECTION: SLUG]
      translated-slug-here
      [SECTION: TITLE]
      Translated Title Here
      [SECTION: EXCERPT]
      Translated Excerpt Here
      [SECTION: META_TITLE]
      Translated Meta Title Here
      [SECTION: META_DESCRIPTION]
      Translated Meta Description Here
      [SECTION: CONTENT]
      <p>Translated HTML Content Here</p>
      
      --- TEXT TO TRANSLATE BELOW ---
      [SECTION: SLUG]
      ${deData.slug}
      [SECTION: TITLE]
      ${deData.title}
      [SECTION: EXCERPT]
      ${deData.excerpt}
      [SECTION: META_TITLE]
      ${deData.meta_title}
      [SECTION: META_DESCRIPTION]
      ${deData.meta_description}
      [SECTION: CONTENT]
      ${deData.content}
    `;

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    await wait(8000); // Kotaya takılmamak için süreyi artırdık
    const { text: enText } = await generateTextWithFallback({ 
      prompt: translatePrompt('English', 'en', 'Barista AI Recipe Assistant', 'FO Cocktail Syrups'),
      maxTokens: 8192
    });
    
    await wait(8000);
    const { text: trText } = await generateTextWithFallback({ 
      prompt: translatePrompt('Turkish', 'tr', 'Barista AI Reçete Sihirbazı', 'FO Kokteyl Şurupları'),
      maxTokens: 8192
    });
    
    await wait(8000);
    const { text: arText } = await generateTextWithFallback({ 
      prompt: translatePrompt('Arabic', 'ar', 'مساعد وصفات باريستا الذكي', 'شراب كوكتيل FO'),
      maxTokens: 8192
    });

    const enData = parseTextBlocks(enText);
    const trData = parseTextBlocks(trText);
    const arData = parseTextBlocks(arText);
    
    // YENİ DEBUG DOSYASI
    require('fs').writeFileSync('debug-tr.txt', trText);
    require('fs').writeFileSync('debug-ar.txt', arText);
    require('fs').writeFileSync('debug-en.txt', enText);

    // 3. ADIM: Dinamik Görsel Çek
    const imageUrl = await fetchDynamicImage(topic);

    // 4. ADIM: Veritabanına Kaydet
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

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('AI Blog Generation Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
