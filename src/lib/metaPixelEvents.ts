'use client';

/**
 * Meta Pixel (Facebook Pixel) Merkezi Event Yönetimi
 * --------------------------------------------------
 * Tüm Pixel event'leri bu dosyadan çağrılır.
 * DSGVO uyumu: Cookie onayı olmadan Pixel yüklenmiyor (MetaPixel.tsx tarafından kontrol edilir).
 * Bu helper'lar yalnızca Pixel başlatıldıktan sonra çalışır — güvenli window.fbq kontrolü dahil.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Güvenli fbq çağırıcı — Pixel yüklenmemişse sessizce geçer */
function fbq(event: string, eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq(event, eventName, params);
  }
}

// ─── Standart E-Ticaret Eventleri ───────────────────────────────────────────

/**
 * Ürün detay sayfası açıldığında çağrılır.
 * Meta Ads bu event'i "Ürün görüntüleme" olarak sayar.
 */
export function trackViewContent(params: {
  content_ids: string[];
  content_name: string;
  content_category?: string;
  content_type?: string;
  currency?: string;
  value?: number;
}) {
  fbq('track', 'ViewContent', {
    content_type: 'product',
    currency: 'EUR',
    ...params,
  });
}

/**
 * Kullanıcı arama yaptığında çağrılır.
 */
export function trackSearch(searchString: string) {
  fbq('track', 'Search', {
    search_string: searchString,
  });
}

/**
 * Kayıt / Üyelik formu tamamlandığında çağrılır.
 * B2B portal başvurusu için kullanılır.
 */
export function trackLead(params?: {
  content_name?: string;
  content_category?: string;
  currency?: string;
  value?: number;
}) {
  fbq('track', 'Lead', params);
}

/**
 * WhatsApp butonu tıklandığında çağrılır.
 * Meta Ads bunu "İletişim kurma niyeti" olarak değerlendirir.
 */
export function trackContact() {
  fbq('track', 'Contact');
}

/**
 * Sipariş tamamlandığında çağrılır (ileride kullanım için).
 */
export function trackPurchase(params: {
  value: number;
  currency?: string;
  content_ids?: string[];
  num_items?: number;
}) {
  fbq('track', 'Purchase', {
    currency: 'EUR',
    ...params,
  });
}

/**
 * Portal kayıt tamamlama (CompleteRegistration) eventi.
 */
export function trackCompleteRegistration(params?: {
  status?: string;
  content_name?: string;
  currency?: string;
  value?: number;
}) {
  fbq('track', 'CompleteRegistration', params);
}
