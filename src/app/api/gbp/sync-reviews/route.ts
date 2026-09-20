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

  try {
    const settings = await getGbpSettings();

    if (!settings.account_id || !settings.location_id) {
      return NextResponse.json(
        { error: 'Missing account_id or location_id in settings.' },
        { status: 400 }
      );
    }

    const businessName = settings.business_name || 'İşletme';
    const businessCategory = settings.business_category || 'Yerel İşletme';
    const targetKeywords = settings.target_keywords || 'kaliteli hizmet';
    const targetLocations = settings.target_locations || 'çevremizde';

    // 1. Fetch Latest Reviews from Google Business Profile
    const endpoint = `/v4/accounts/${settings.account_id}/locations/${settings.location_id}/reviews`;
    let gbpReviewsResponse;
    try {
      gbpReviewsResponse = await fetchGbpApi(endpoint);
    } catch (apiError: any) {
      // NOTE: Depending on API version, older accounts use v4, newer might need v1 of mybusinessbusinessinformation
      // Assuming standard v4 works for reviews.
      throw new Error(`Failed to fetch reviews: ${apiError.message}`);
    }

    const reviews = gbpReviewsResponse.reviews || [];
    if (reviews.length === 0) {
      return NextResponse.json({ success: true, message: 'No reviews found.' });
    }

    const supabase = createSupabaseServiceClient();
    let repliedCount = 0;

    // Process reviews
    for (const review of reviews) {
      // Check if we already replied to this natively via our system
      if (review.reviewReply) {
        continue; // Already replied on Google
      }

      // Check in Supabase if we've processed this
      const { data: existingLog } = await supabase
        .from('google_business_reviews')
        .select('id')
        .eq('review_id', review.reviewId)
        .maybeSingle();

      if (existingLog) {
        continue; // Already processed in our database
      }

      const reviewerName = review.reviewer?.displayName || 'Değerli Müşterimiz';
      const starRating = review.starRating; // e.g., 'FIVE', 'FOUR', etc.
      const commentText = review.comment || '';

      // 2. Generate Reply using Gemini
      const systemPrompt = `
      Sen bir ${businessCategory} uzmanı ve yerel SEO (GEO) müşteri ilişkileri yöneticisisin.
      İşletme Adı: ${businessName}
      Hedef Lokasyonlar/Bölgeler: ${targetLocations}
      Hedef Anahtar Kelimeler: ${targetKeywords}
      
      Şu an bir Google Haritalar yorumuna yanıt veriyorsun.
      LÜTFEN ŞU KURALLARA KESİNLİKLE UY:
      1. Yanıtta müşterinin ismini (${reviewerName}) kullanarak kişiselleştirilmiş bir giriş yap.
      2. Puan (${starRating}) ve yorum içeriğine ("${commentText}") göre duygu analizi yap.
         - Eğer yüksek puansa (4-5 yıldız): Coşkulu bir teşekkür, işletmemizi tercih ettikleri için minnet ve tekrar beklediğimizi belirten sıcak bir dil kullan.
         - Eğer düşük puansa (1-3 yıldız): Yapıcı, kurumsal, özür dileyen (gerekirse) ve sorunu çözmeye yönelik (örn: 'Lütfen bizimle iletişime geçin') profesyonel bir dil kullan.
      3. Hedef lokasyonları ve anahtar kelimeleri metnin akışını bozmadan, tamamen doğal (organik) bir şekilde yoruma yedir. Spamlama yapma.
      4. Yanıtın sonuna harekete geçirici bir mesaj (CTA - "Detaylı bilgi için haritamızdan yol tarifi alın", "Bir sonraki gelişinizde yeni ürünlerimizi deneyin" vb.) ekle.
      5. Yalnızca yanıt metnini dön, ek açıklamalar yazma.
      `;

      const { text: generatedReply } = await generateText({
        model: google('gemini-3.5-flash'),
        system: systemPrompt,
        prompt: `Müşteri Puanı: ${starRating}\nMüşteri Yorumu: ${commentText}\nLütfen uygun yanıtı ALMANCA (German) dilinde oluştur.`,
      });

      // 3. Publish Reply to Google Business Profile
      const replyEndpoint = `/v4/accounts/${settings.account_id}/locations/${settings.location_id}/reviews/${review.reviewId}/reply`;
      
      try {
        await fetchGbpApi(replyEndpoint, {
          method: 'PUT',
          body: JSON.stringify({ comment: generatedReply }),
        });

        // 4. Log to Supabase
        await supabase.from('google_business_reviews').insert({
          review_id: review.reviewId,
          reviewer_name: reviewerName,
          star_rating: starRating === 'FIVE' ? 5 : starRating === 'FOUR' ? 4 : starRating === 'THREE' ? 3 : starRating === 'TWO' ? 2 : 1, // Simplified conversion
          comment: commentText,
          reply_text: generatedReply,
          replied_at: new Date().toISOString(),
        });

        repliedCount++;
      } catch (replyError) {
        console.error(`Failed to reply to review ${review.reviewId}:`, replyError);
        // Continue to next review even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync complete. Replied to ${repliedCount} new reviews.`,
      replied_count: repliedCount
    });

  } catch (error: any) {
    console.error('Error in sync-reviews route:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
