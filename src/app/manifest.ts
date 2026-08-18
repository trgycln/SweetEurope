import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ElysonSweets | B2B Großhandel HoReCa',
    short_name: 'ElysonSweets',
    description: 'B2B Großhandel für Cafés, Hotels und Patisserien.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0e3d2f',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
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
