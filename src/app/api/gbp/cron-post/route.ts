import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { getGbpSettings, fetchGbpApi } from '@/lib/gbp/auth';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export const revalidate = 0;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabase = createSupabaseServiceClient();

  try {
    const settings = await getGbpSettings();

    if (!settings.account_id || !settings.location_id) {
      throw new Error('Missing account_id or location_id in settings.');
    }

    const businessName = settings.business_name || 'İşletme';
    const businessCategory = settings.business_category || 'Yerel İşletme';
    const targetKeywords = settings.target_keywords || 'kaliteli hizmet';
    const targetLocations = settings.target_locations || 'çevremizde';

    // 1. Fetch active products and pick one randomly
    const { data: products, error: productsError } = await supabase
      .from('urunler')
      .select('id, ad, aciklamalar, satis_fiyati_musteri, ana_resim_url, slug')
      .eq('aktif', true)
      .limit(100);

    if (productsError) {
      throw new Error(`Ürünler çekilemedi: ${productsError.message}`);
    }

    let selectedProduct = null;
    let productDetailsText = '';
    let productUrl = 'https://elysonsweets.de'; // Base URL

    if (products && products.length > 0) {
      // Pick random product
      const randomIndex = Math.floor(Math.random() * products.length);
      selectedProduct = products[randomIndex];
      
      const pName = typeof selectedProduct.ad === 'object' && selectedProduct.ad !== null 
        ? (selectedProduct.ad as any).tr || (selectedProduct.ad as any).de || 'Ürün' 
        : selectedProduct.ad || 'Ürün';
        
      const pDesc = typeof selectedProduct.aciklamalar === 'object' && selectedProduct.aciklamalar !== null
        ? (selectedProduct.aciklamalar as any).tr || (selectedProduct.aciklamalar as any).de || ''
        : selectedProduct.aciklamalar || '';
        
      productDetailsText = `
        Ürün Adı: ${pName}
        Fiyat: €${selectedProduct.satis_fiyati_musteri}
        Açıklama: ${pDesc}
      `;
      
      productUrl = `https://elysonsweets.de/urun/${selectedProduct.slug || selectedProduct.id}`;
    }

    // 2. Generate Content using Gemini
    const systemPrompt = `
    Sen bir ${businessCategory} uzmanı ve yerel SEO (GEO) içerik yazarısın. 
    İşletme Adı: ${businessName}
    Hedef Lokasyonlar/Bölgeler: ${targetLocations}
    Hedef Anahtar Kelimeler: ${targetKeywords}
    ${selectedProduct ? `\nOdağındaki Ürün Bilgileri:\n${productDetailsText}` : ''}
    
    LÜTFEN ŞU KURALLARA KESİNLİKLE UY:
    1. Üretilen metin, hedef lokasyonları (mahalle, ilçe) ve anahtar kelimeleri metnin akışını bozmadan, TAMAMEN DOĞAL (organik) bir şekilde cümleye yedirmelidir.
    ${selectedProduct ? '2. Metin bu spesifik ürünü merkeze almalı, fiyatına ve öne çıkan özelliklerine organik bir şekilde değinmelidir.' : '2. Metin işletmenin genel hizmetlerini ve kalitesini öne çıkarmalıdır.'}
    3. Metin Google My Business (GBP) gönderisi (local post) formatında, 1500 karakteri geçmeyecek, okuması keyifli, ilgi çekici ve emojilerle zenginleştirilmiş olmalıdır.
    4. YAZILI İÇERİK KESİNLİKLE ALMANCA (GERMAN) OLMALIDIR. TÜRKÇE VEYA BAŞKA BİR DİLDE YAZMA.
    5. Yalnızca gönderi metnini dön, ek açıklamalar yazma.
    `;

    const { text: generatedPostContent } = await generateText({
      model: google('gemini-3.5-flash'),
      system: systemPrompt,
      prompt: `Google Benim İşletmem profilimiz için haftalık güncel, SEO odaklı ürün tanıtım gönderisini ALMANCA (German) dilinde yazar mısın?`,
    });

    // 3. Prepare Payload and Media
    // If the product has an image, use it. Otherwise, use the default settings image.
    const imageUrl = selectedProduct?.ana_resim_url || settings.default_post_image_url;

    const postPayload: any = {
      languageCode: 'tr',
      summary: generatedPostContent,
      callToAction: {
        actionType: selectedProduct ? 'BUY' : 'LEARN_MORE',
        url: productUrl,
      },
    };

    if (imageUrl) {
      postPayload.media = [
        {
          mediaFormat: 'PHOTO',
          sourceUrl: imageUrl,
        }
      ];
    }

    // 4. Publish to Google Business Profile API (or Simulation Mode)
    const isSimulationMode = process.env.GOOGLE_BUSINESS_SIMULATION === 'true';
    let gbpPostId = 'SIMULATED_TEST_MODE';

    if (!isSimulationMode) {
      const endpoint = `/v4/accounts/${settings.account_id}/locations/${settings.location_id}/localPosts`;
      const gbpResponse = await fetchGbpApi(endpoint, {
        method: 'POST',
        body: JSON.stringify(postPayload),
      });
      gbpPostId = gbpResponse.name;
    }

    // 5. Log to Supabase as success
    await supabase.from('google_business_posts').insert({
      title: selectedProduct ? `Ürün Tanıtımı: ${typeof selectedProduct.ad === 'object' && selectedProduct.ad !== null ? (selectedProduct.ad as any).tr || 'Ürün' : selectedProduct.ad}` : 'Otomatik SEO Gönderisi',
      content: generatedPostContent,
      post_type: 'STANDARD',
      status: isSimulationMode ? 'SIMULATED' : 'PUBLISHED',
      language: 'tr',
      google_post_id: gbpPostId,
      published_at: new Date().toISOString(),
      error_message: null
    });

    return NextResponse.json({
      success: true,
      message: 'Post successfully generated and published.',
      post_id: gbpPostId,
    });

  } catch (error: any) {
    console.error('Error in cron-post route:', error);
    
    // Log error to Supabase
    if (supabase) {
      await supabase.from('google_business_posts').insert({
        title: 'Haftalık Otomatik Gönderi (Başarısız)',
        content: 'Gönderi oluşturulamadı veya yayınlanamadı.',
        post_type: 'STANDARD',
        status: 'FAILED',
        language: 'tr',
        error_message: error.message || 'Bilinmeyen Hata',
        published_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
