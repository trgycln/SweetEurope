import { ReactNode } from 'react';
import type { Metadata } from 'next';

const locales = ['de', 'en', 'tr', 'ar'];
const baseUrl = 'https://www.elysonsweets.de';

const localeNames: Record<string, string> = {
  de: 'de-DE',
  en: 'en-US',
  tr: 'tr-TR',
  ar: 'ar-SA',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const alternates: Record<string, string> = {};
  locales.forEach((l) => {
    alternates[l] = `${baseUrl}/${l}`;
  });

  return {
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: alternates,
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
  const htmlLang = localeNames[locale] || locale;

  return (
    <html lang={htmlLang}>
      <body>{children}</body>
    </html>
  );
}
