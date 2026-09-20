import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { getGbpSettings } from '@/lib/gbp/auth';

export const revalidate = 0;

export async function GET(req: Request) {
  // Optional: Add admin auth check here

  try {
    const settings = await getGbpSettings();
    const businessName = settings.business_name || 'İşletme';
    const businessCategory = settings.business_category || 'Yerel İşletme';
    const targetKeywords = settings.target_keywords || 'kaliteli hizmet';
    const targetLocations = settings.target_locations || 'çevremizde';

    const systemPromptBase = `
      Sen bir ${businessCategory} uzmanı ve yerel SEO (GEO) müşteri ilişkileri yöneticisisin.
      İşletme Adı: ${businessName}
      Hedef Lokasyonlar/Bölgeler: ${targetLocations}
      Hedef Anahtar Kelimeler: ${targetKeywords}
      LÜTFEN ŞU KURALLARA KESİNLİKLE UY:
      1. Yanıtta müşterinin ismini kullanarak kişiselleştirilmiş bir giriş yap.
      2. Puan ve yorum içeriğine göre duygu analizi yap.
      3. Hedef lokasyonları ve anahtar kelimeleri tamamen doğal (organik) bir şekilde yoruma yedir. Spamlama yapma.
      4. Yanıtın sonuna harekete geçirici bir mesaj (CTA) ekle.
      5. Yalnızca yanıt metnini dön, ek açıklamalar yazma.
    `;

    // Simulate 5-Star Review
    const fiveStarReview = {
      id: 'sim-5star',
      review_id: 'sim-5star-123',
      reviewer_name: 'Ayşe Yılmaz',
      star_rating: 5,
      comment: 'Harika bir deneyimdi, ürünler çok taze ve çalışanlar çok güler yüzlü. Kesinlikle tekrar geleceğim!',
      created_at: new Date().toISOString(),
    };

    const { text: fiveStarReply } = await generateText({
      model: google('gemini-3.5-flash'),
      system: systemPromptBase,
      prompt: `Müşteri Puanı: 5\nMüşteri Yorumu: ${fiveStarReview.comment}\nMüşteri Adı: ${fiveStarReview.reviewer_name}\nLütfen uygun yanıtı ALMANCA (German) dilinde oluştur.`,
    });

    // Simulate 1-Star Review
    const oneStarReview = {
      id: 'sim-1star',
      review_id: 'sim-1star-456',
      reviewer_name: 'Mehmet Demir',
      star_rating: 1,
      comment: 'Beklentimin çok altındaydı. Fiyatlara göre porsiyonlar aşırı küçük ve lezzet konusunda vasattı.',
      created_at: new Date().toISOString(),
    };

    const { text: oneStarReply } = await generateText({
      model: google('gemini-3.5-flash'),
      system: systemPromptBase,
      prompt: `Müşteri Puanı: 1\nMüşteri Yorumu: ${oneStarReview.comment}\nMüşteri Adı: ${oneStarReview.reviewer_name}\nLütfen uygun yanıtı ALMANCA (German) dilinde oluştur.`,
    });

    return NextResponse.json({
      success: true,
      simulatedReviews: [
        { ...fiveStarReview, reply_text: fiveStarReply, replied_at: new Date().toISOString() },
        { ...oneStarReview, reply_text: oneStarReply, replied_at: new Date().toISOString() }
      ]
    });

  } catch (error: any) {
    console.error('Error in simulate-review route:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during simulation.' },
      { status: 500 }
    );
  }
}
