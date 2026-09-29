// src/app/sw.ts
// GÜVENLİ PWA — Service Worker (Lite/Safe Architecture)
// -------------------------------------------------------
// KRİTİK GÜVENLİK KURALI:
//  - /api/* ve *.supabase.co rotaları → daima NetworkOnly
//  - Stok, fiyat ve auth verileri ASLA önbelleklenmez
//  - Sadece statik assetler (resimler, fontlar, JS/CSS chunk) önbelleğe alınır

import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist, NetworkOnly, CacheFirst, ExpirationPlugin } from 'serwist';

// Serwist'in TypeScript tip tanımlamaları için
declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,

  // ----------------------------------------------------------------
  // ÇALIŞMA ZAMANI ÖNBELLEKLEME STRATEJİLERİ
  // ----------------------------------------------------------------
  runtimeCaching: [

    // ⛔ KRİTİK: API rotaları → NetworkOnly (stale data riski yok)
    {
      matcher: /^\/api\//,
      handler: new NetworkOnly(),
    },

    // ⛔ KRİTİK: Supabase rotaları → NetworkOnly (auth + ERP verileri)
    {
      matcher: /^https:\/\/.*\.supabase\.co\//,
      handler: new NetworkOnly(),
    },

    // ✅ Statik resimler → CacheFirst (1 yıl, max 60 resim)
    {
      matcher: /\.(?:png|jpg|jpeg|webp|avif|gif|svg|ico)$/i,
      handler: new CacheFirst({
        cacheName: 'static-images',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 60,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 gün
          }),
        ],
      }),
    },

    // ✅ Google Fonts → CacheFirst (1 yıl)
    {
      matcher: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//,
      handler: new CacheFirst({
        cacheName: 'google-fonts',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 10,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 yıl
          }),
        ],
      }),
    },

    // ✅ Next.js statik JS/CSS chunk'ları → CacheFirst (1 yıl, içerik hash'li)
    {
      matcher: /\/_next\/static\//,
      handler: new CacheFirst({
        cacheName: 'next-static-assets',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 yıl
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();

// ----------------------------------------------------------------
// WEB PUSH BİLDİRİMLERİ (PUSH NOTIFICATIONS)
// ----------------------------------------------------------------

// 1. Push Bildirimini Yakala ve Ekranda Göster
self.addEventListener('push', (event: any) => {
  if (!event.data) {
    console.warn('[SW] Push verisi boş geldi.');
    return;
  }

  try {
    const data = event.data.json();
    const title = data.title || 'Elyson Sweets';
    const options: NotificationOptions = {
      body: data.body || data.icerik || 'Yeni bir bildiriminiz var.',
      icon: data.icon || '/android-chrome-192x192.png',
      badge: data.badge || '/favicon-32x32.png',
      data: {
        url: data.url || data.link || '/portal/dashboard',
      },
      tag: data.tag || 'elyson-sweets-notification',
      renotify: true,
      vibrate: [100, 50, 100],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[SW] Push bildirimi parse/gösterim hatası:', err);
    // Düz metin olarak gelmişse fallback
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Elyson Sweets', {
        body: text,
        icon: '/android-chrome-192x192.png',
        data: { url: '/portal/dashboard' },
      })
    );
  }
});

// 2. Bildirime Tıklandığında İlgili URL'yi Aç veya Mevcut Pencereye Odaklan
self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/portal/dashboard';

  event.waitUntil(
    (async () => {
      const windowClients = await (self as any).clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Açık bir sekme varsa ve aynı origin ise ona odaklanıp navigate et
      for (const client of windowClients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client && targetUrl) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }

      // Açık sekme yoksa yeni pencere aç
      if ((self as any).clients.openWindow) {
        return (self as any).clients.openWindow(targetUrl);
      }
    })()
  );
});
