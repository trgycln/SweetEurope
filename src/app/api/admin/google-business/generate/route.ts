import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Yetkilendirme kontrolü
    if (authError || !user) {
      console.error('Auth Error:', authError);
      // Geliştirme aşamasında yetkilendirmeyi atlamak isterseniz burayı pass geçebilirsiniz.
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, includeProducts = true, productId } = await req.json();

    // Sınır Doğrulaması
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Lütfen ajan için geçerli bir konu veya ipucu yazın.' }, { status: 400 });
    }

    let productContext = '';

    // Eğer spesifik bir ürün seçildiyse, ajana sadece o ürünü ver.
    if (productId) {
      const { data: product, error } = await supabase
        .from('urunler')
        .select('ad, aciklamalar, satis_fiyati_musteri, stok_kodu')
        .eq('id', productId)
        .single();

      if (product) {
        const productName = typeof product.ad === 'object' && product.ad !== null 
          ? product.ad.de || product.ad.tr || 'İsimsiz Ürün' 
          : product.ad || 'İsimsiz Ürün';
          
        const productDesc = typeof product.aciklamalar === 'object' && product.aciklamalar !== null 
          ? product.aciklamalar.de || product.aciklamalar.tr || 'Taze ve kaliteli ürün.' 
          : product.aciklamalar || 'Taze ve kaliteli ürün.';

        productContext = `
SEÇİLİ ÜRÜN ODAĞI: 
Bu gönderi aşağıdaki özel ürüne odaklanmalıdır (fiyatını ve avantajlarını vurgula):
- Ürün Adı: ${productName}
- Fiyat (Müşteri): €${product.satis_fiyati_musteri}
- Açıklama: ${productDesc}
`;
      }
    } else if (includeProducts) {
      // Spesifik ürün yoksa ama ürünleri dahil et dediyse rastgele/ilk 5 ürünü çek
      const { data: products, error } = await supabase
        .from('urunler')
        .select('ad, aciklamalar, satis_fiyati_musteri')
        .eq('aktif', true)
        .limit(5); 
      
      if (products && products.length > 0) {
        productContext = `\nMevcut Ürünlerimiz (Referans için):\n${JSON.stringify(products, null, 2)}`;
      }
    }

    const systemPrompt = `
Sen Elyson Sweets (Almanya merkezli premium lokum, baklava ve tatlı toptancısı) için Google İşletme Profili içerik üreticisisin.
Hedef kitlen: Almanya'daki B2B müşteriler (kafeler, restoranlar, marketler, etkinlik organizatörleri) ve B2C perakende alıcılar.

Görev: Verilen konu veya ipucuna (ve sağlanan ürün kataloğu verilerine) dayanarak etkileyici, profesyonel bir Google İşletme Gönderisi (Update/Offer) metni hazırla.
- Dil: Mükemmel ve profesyonel Almanca.
- Ton: Davetkar, güven verici, B2B odaklı (toptan sipariş, taze üretim, hızlı teslimat vurguları).
- Uzunluk: 100-250 kelime (Google Posts kısa ve öz olmalıdır).
- Aksiyon (Call to Action): Mutlaka gönderinin sonuna bir eylem çağrısı ekle (Örn: "Jetzt anfragen", "Mehr erfahren auf unserer Website", "Kontaktieren Sie uns für Großhandelskonditionen").
- Format: Belirtilen JSON şemasına (schema) uygun olarak, hem paylaşılacak Almanca metni hem de yöneticinin ne paylaşıldığını anlaması için Türkçe çevirisini döndür.
`;

    const userPrompt = `Konu/Talimat: ${prompt || 'Yeni ürünlerimiz ve B2B toptan satış hizmetlerimiz hakkında genel bir tanıtım.'}
    ${productContext}
    `;

    // Gemini ile yapılandırılmış içerik üretimi (JSON)
    const { object } = await generateObject({
      model: google('gemini-3.8-flash'),
      schema: z.object({
        germanText: z.string().describe('Almanya pazarı için hazırlanmış B2B/B2C odaklı, mükemmel Almanca Google İşletme Gönderisi.'),
        turkishTranslation: z.string().describe('Hazırlanan Almanca metnin sistem yöneticisinin okuyup ne yayınlanacağını anlaması için birebir Türkçe çevirisi.'),
      }),
      system: systemPrompt,
      prompt: userPrompt,
    });

    return NextResponse.json({ 
      generatedText: object.germanText,
      turkishTranslation: object.turkishTranslation
    });
    
  } catch (error: any) {
    console.error('AI Generation Error:', error);
    return NextResponse.json(
      { error: 'İçerik üretilirken bir hata oluştu', details: error.message },
      { status: 500 }
    );
  }
}
