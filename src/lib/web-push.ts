import webpush from 'web-push';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

// VAPID konfigürasyonu
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:info@elysonsweets.de';

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
} else {
  console.warn('[web-push] VAPID anahtarları eksik. Push bildirimleri gönderilemeyebilir.');
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

/**
 * Belirli bir kullanıcıya ait kayıtlı tüm cihazlara Web Push bildirimi gönderir.
 * Fire-and-forget: Hata durumunda ana işlemi bloklamaz.
 * Geçersiz (404/410) abonelikleri veritabanından otomatik temizler.
 */
export async function sendWebPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ success: boolean; sentCount: number; error?: unknown }> {
  if (!publicKey || !privateKey) {
    console.warn('[sendWebPushToUser] VAPID anahtarları tanımlı değil.');
    return { success: false, sentCount: 0, error: 'VAPID keys not configured' };
  }

  try {
    const supabaseAdmin = createSupabaseServiceClient();

    // Kullanıcının kayıtlı tüm push aboneliklerini çek
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId);

    if (subError) {
      console.error('[sendWebPushToUser] Abonelikler sorgulanırken hata:', subError);
      return { success: false, sentCount: 0, error: subError };
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, sentCount: 0 };
    }

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/android-chrome-192x192.png',
      badge: payload.badge || '/favicon-32x32.png',
      url: payload.url || '/portal/dashboard',
      tag: payload.tag || 'elyson-sweets-notification',
    });

    let sentCount = 0;
    const expiredSubIds: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payloadString);
          sentCount++;
        } catch (pushError: any) {
          console.warn(`[sendWebPushToUser] Push gönderim hatası (ID: ${sub.id}):`, pushError?.message || pushError);

          // 410 Gone veya 404 Not Found dönmüşse kullanıcı tarayıcıdan izni kaldırmış/abonelik düşmüştür
          if (pushError?.statusCode === 410 || pushError?.statusCode === 404) {
            expiredSubIds.push(sub.id);
          }
        }
      })
    );

    // Süresi dolmuş / geçersiz abonelikleri temizle
    if (expiredSubIds.length > 0) {
      try {
        await supabaseAdmin
          .from('push_subscriptions')
          .delete()
          .in('id', expiredSubIds);
      } catch (err) {
        console.error('[sendWebPushToUser] Eski abonelik temizleme hatası:', err);
      }
    }

    return { success: true, sentCount };
  } catch (error) {
    console.error('[sendWebPushToUser] Genel hata:', error);
    return { success: false, sentCount: 0, error };
  }
}
