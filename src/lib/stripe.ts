import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

const isProduction = process.env.NODE_ENV === 'production';
const vercelEnv = process.env.VERCEL_ENV; // 'production' | 'preview' | 'development' | undefined

export const isStripeLiveKey = stripeSecretKey.startsWith('sk_live_');
// Lokal geliştirme, test veya Vercel Preview (ön izleme) ortamları "canlı olmayan" ortamlardır
export const isNonProductionEnv = !isProduction || vercelEnv === 'preview' || vercelEnv === 'development';

// 1. Ortam Kontrolleri & Güvenlik Logları
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ STRIPE_SECRET_KEY ortam değişkeni tanımlı değil. Build için geçici placeholder kullanılıyor.');
} else if (isNonProductionEnv && isStripeLiveKey) {
  console.error('🛑 GÜVENLİK KİLİDİ: Test/Geliştirme ortamında CANLI Stripe anahtarı (sk_live_) tespit edildi! Gerçek banka ve kart çekimlerini önlemek için işlemler sınırlandırılmalıdır.');
} else if (isProduction && vercelEnv === 'production' && !isStripeLiveKey) {
  console.warn('⚠️ DİKKAT: Canlı ortamda (Production) Stripe TEST anahtarı (sk_test_) tanımlı. Gerçek ödemeler alınamaz.');
}

/**
 * Güvenlik kontrolü: Bir ödeme oturumu veya işlem başlatılmadan önce çağrılır.
 * Test/Lokal ortamda kazara canlı anahtar kullanılarak gerçek banka veya karttan
 * para çekilmesini kesin olarak engeller.
 */
export function assertStripeEnvironmentSafety(): { safe: boolean; error?: string } {
  if (isNonProductionEnv && isStripeLiveKey) {
    return {
      safe: false,
      error: 'Güvenlik Koruması: Geliştirme/Test ortamında canlı Stripe anahtarı ile işlem yapılamaz. Lütfen test anahtarınızı (sk_test_...) kullanın.',
    };
  }
  return { safe: true };
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20' as any,
  appInfo: {
    name: 'ElysonSweets B2B',
    version: '1.0.0',
  },
});

