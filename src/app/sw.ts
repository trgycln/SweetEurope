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
