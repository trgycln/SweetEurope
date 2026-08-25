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
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'ClaudeBot',
          'PerplexityBot',
          'Google-Extended',
          'Applebot-Extended',
          'cohere-ai',
          'Bytespider',
        ],
        allow: ['/', '/llms.txt', '/llms-full.txt'],
        disallow: ['/api/', '/admin/', '/_next/'],
      },
    ],
    sitemap: 'https://www.elysonsweets.de/sitemap.xml',
    host: 'https://www.elysonsweets.de',
  };
}
