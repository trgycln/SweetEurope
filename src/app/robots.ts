import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/tr/admin',
          '/de/admin',
          '/en/admin',
          '/ar/admin',
        ],
      },
    ],
    sitemap: 'https://www.elysonsweets.de/sitemap.xml',
    host: 'https://www.elysonsweets.de',
  };
}
