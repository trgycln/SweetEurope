// src/app/manifest.ts
// Next.js App Router — Web App Manifest
// Renkler: tailwind.config.ts → primary: #2B2B2B, secondary: #FAF9F6

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Elyson Sweets B2B',
    short_name: 'Elyson Sweets',
    description: 'B2B Großhandel für Premium-Sirupe und Dessert-Zutaten',
    start_url: '/',
    display: 'standalone',         // Tarayıcı çubukları gizlenir → native app hissi
    background_color: '#FAF9F6',   // tailwind secondary rengi
    theme_color: '#2B2B2B',        // tailwind primary rengi
    orientation: 'portrait',
    scope: '/',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
