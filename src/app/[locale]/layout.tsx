import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { getI18nAlternates } from '@/lib/seo-utils';
import OrganizationSchema from '@/components/seo/OrganizationSchema';
import WebSiteSchema from '@/components/seo/WebSiteSchema';

// Hız Optimizasyonu: Zero CLS (Düzen Kaymasını Önleme) için lokal font tanımlamaları
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elysonsweets.de';

  return {
    metadataBase: new URL(baseUrl),
    title: {
      template: '%s | Elysonsweets B2B',
      default: 'Elysonsweets | Premium FO Syrups & Bar Supplies',
    },
    description: 'B2B wholesale supplier for premium cocktail syrups, bar sauces, and HORECA supplies in Europe.',
    formatDetection: {
      telephone: false,
      date: false,
      email: false,
      address: false,
    },
    category: 'B2B E-commerce',
    applicationName: 'Elysonsweets B2B',
    alternates: getI18nAlternates(''),
    openGraph: {
      type: 'website',
      locale: locale,
      url: `${baseUrl}/${locale}`,
      siteName: 'Elysonsweets GmbH',
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: 'Elysonsweets B2B HORECA',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@elysonsweets',
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Arapça için Sağdan Sola (RTL), diğer diller için Soldan Sağa (LTR)
  const direction = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <div dir={direction} className={`locale-wrapper ${inter.variable} ${playfair.variable}`}>
      <OrganizationSchema />
      <WebSiteSchema />
      {children}
    </div>
  );
}