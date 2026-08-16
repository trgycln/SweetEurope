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
        src: '/favicon.png',
        sizes: 'any',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
  };
}
