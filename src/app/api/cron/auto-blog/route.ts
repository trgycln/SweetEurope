import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateTextWithFallback } from '@/lib/ai/providers';

// Vercel Pro/Hobby için maksimum çalışma süresi (Zincirleme üretim uzun sürer)
export const maxDuration = 300; 

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Kırılmaz Parse Fonksiyonu (XML formatı AI tarafından çevrilmez)
function parseXMLText(text: string) {
  // AI bazen MD blokları içine alabilir, temizleyelim
  const cleanText = text.replace(/```xml/gi, '').replace(/```/g, '');
  
  const getSection = (name: string) => {
    const regex = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i');
    const match = cleanText.match(regex);
    return match ? match[1].trim() : '';
  };
  return {
    slug: getSection('blog_slug'),
    title: getSection('blog_title'),
    excerpt: getSection('blog_excerpt'),
    content: getSection('blog_content'),
    meta_title: getSection('blog_meta_title'),
    meta_description: getSection('blog_meta_description')
  };
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
    // Konudan İngilizce bir anahtar kelime çıkar (Örn: "coffee", "cocktail")
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
    
    // Fallback: Unsplash API key yoksa veya hata verirse, konuya göre rastgele farklı bir resim seç
    const randomIndex = Math.floor(Math.random() * FALLBACK_IMAGES.length);
    return FALLBACK_IMAGES[randomIndex];
  } catch (e) {
    console.error('fetchDynamicImage error:', e);
    const randomIndex = Math.floor(Math.random() * FALLBACK_IMAGES.length);
    return FALLBACK_IMAGES[randomIndex];
  }
}

export async function GET(req: Request) {
  try {
    // 1. Güvenlik: Sadece Vercel Cron veya yetkili istekler çalıştırabilir
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. AI'dan Trend Konu Bulmasını İste
    const topicPrompt = `
      Sen Almanya'daki B2B HORECA (Otel, Restoran, Kafe) sektörü için bir trend analistisin.
      Bana şu anki mevsime ve gastronomi trendlerine uygun, kafe/bar sahiplerinin ilgisini çekecek, 
      kokteyl şurupları veya işletme kârlılığı ile ilgili TEK BİR blog yazısı başlığı/konusu ver.
      Sadece konuyu yaz, başka hiçbir açıklama yapma.
    `;

    const { text: generatedTopic } = await generateTextWithFallback({
      prompt: topicPrompt,
      temperature: 0.8,
    });

    const topic = generatedTopic.trim();
    console.log('Otomatik Bulunan Konu:', topic);

    // 3. ADIM: Sadece Almanca olarak ÇOK UZUN ve detaylı ana makaleyi yaz
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
      
      LÜTFEN ÇIKTIYI AŞAĞIDAKİ XML FORMATINDA VER (XML TAGLERİNİ DEĞİŞTİRME):
      
      <blog_slug>
      seo-friendly-url-in-english-without-special-characters
      </blog_slug>
      <blog_title>
      Makale Başlığı
      </blog_title>
      <blog_excerpt>
      Kısa Özet
      </blog_excerpt>
      <blog_meta_title>
      SEO Meta Başlığı
      </blog_meta_title>
      <blog_meta_description>
      SEO Meta Açıklaması
      </blog_meta_description>
      <blog_content>
      <p>Burası makalenin HTML halidir...</p>
      </blog_content>
    `;

    const { text: deText } = await generateTextWithFallback({
      prompt: dePrompt,
      temperature: 0.7,
      maxTokens: 8192,
    });
    const deData = parseXMLText(deText);

    // 4. ADIM: Almanca metni diğer dillere çevir
    const translatePrompt = (lang: string, code: string, aiName: string, foName: string) => `
      You are a professional translator and copywriter. Translate the following text from German to ${lang}. 
      DO NOT TRANSLATE OR MODIFY THE XML TAGS. You MUST keep the exact same XML tag names.
      Translate the entire title, excerpt, and HTML content accurately and fluently into ${lang}. Do not leave German words in the title or content.
      IMPORTANT: Change the internal links inside the 'blog_content' to match the language code:
      - Change "/de/barista-ai" to "/${code}/barista-ai" and translate the anchor text to "${aiName}".
      - Change "/de/products/fo" to "/${code}/products/fo" and translate the anchor text to "${foName}".
      
      OUTPUT ONLY THE XML. DO NOT WRITE ANY EXTRA TEXT.
      
      <blog_slug>translated-slug</blog_slug>
      <blog_title>Translated Title Here</blog_title>
      <blog_excerpt>Translated Excerpt Here</blog_excerpt>
      <blog_meta_title>Translated Meta Title Here</blog_meta_title>
      <blog_meta_description>Translated Meta Description</blog_meta_description>
      <blog_content><p>Translated HTML content here...</p></blog_content>

      --- TEXT TO TRANSLATE BELOW ---
      <blog_slug>
      ${deData.slug}
      </blog_slug>
      <blog_title>
      ${deData.title}
      </blog_title>
      <blog_excerpt>
      ${deData.excerpt}
      </blog_excerpt>
      <blog_meta_title>
      ${deData.meta_title}
      </blog_meta_title>
      <blog_meta_description>
      ${deData.meta_description}
      </blog_meta_description>
      <blog_content>
      ${deData.content}
      </blog_content>
    `;

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    await wait(1000); 
    const { text: enText } = await generateTextWithFallback({ 
      prompt: translatePrompt('English', 'en', 'Barista AI Recipe Assistant', 'FO Cocktail Syrups'),
      maxTokens: 8192
    });
    
    await wait(1000); 
    const { text: trText } = await generateTextWithFallback({ 
      prompt: translatePrompt('Turkish', 'tr', 'Barista AI Reçete Sihirbazı', 'FO Kokteyl Şurupları'),
      maxTokens: 8192
    });
    
    await wait(1000);
    const { text: arText } = await generateTextWithFallback({ 
      prompt: translatePrompt('Arabic', 'ar', 'مساعد وصفات باريستا الذكي', 'شراب كوكتيل FO'),
      maxTokens: 8192
    });

    const enData = parseXMLText(enText);
    const trData = parseXMLText(trText);
    const arData = parseXMLText(arText);

    // 5. ADIM: Dinamik Görsel Çek
    const imageUrl = await fetchDynamicImage(topic);

    // 6. ADIM: Veritabanına Kaydet
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
