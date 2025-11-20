import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/partner-portal/',
          '/api/',
        ],
      },
    ],
    sitemap: 'https://www.elysonsweets.de/sitemap.xml',
  };
}
