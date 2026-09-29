// src/app/manifest.ts
// Next.js App Router — Web App Manifest
// Açılış Ekranı (Splash): background_color = #FAF9F6 (kremsi/beyaz), ikon üzerine yerleştirilir
// İkon: kremsi arka plan üzerinde logoyla → siyah splash sorunu giderildi

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Elyson Sweets B2B',
    short_name: 'Elyson Sweets',
    description: 'B2B Großhandel für Premium-Sirupe und Dessert-Zutaten',
    start_url: '/',
    display: 'standalone',
    // Açılış ekranı arka planı — ikonla uyumlu kremsi ton
    background_color: '#FAF9F6',
    // Tarayıcı ve sistem çubuğu rengi
    theme_color: '#FAF9F6',
    orientation: 'portrait',
    scope: '/',
    icons: [
      // "any" → genel kullanım (yuvarlak köşe, vb. olmayan bağlamlar)
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      // "maskable" → Android adaptive icon (güvenli alan içinde logo)
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      // Her ikisi birlikte bildirilirse Android en iyi uyumu otomatik seçer
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
