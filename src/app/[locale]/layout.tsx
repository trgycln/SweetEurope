import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { getI18nAlternates } from '@/lib/seo-utils';
import OrganizationSchema from '@/components/seo/OrganizationSchema';
import WebSiteSchema from '@/components/seo/WebSiteSchema';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  // Parametreyi await ile çözüyoruz (Next.js 15+ uyumluluğu için)
  const { locale } = await params;

  return {
    title: {
      default: 'Elysonsweets GmbH | Premium B2B HORECA Supplier',
      template: '%s | Elysonsweets GmbH',
    },
    formatDetection: {
      telephone: false,
      date: false,
      email: false,
      address: false,
    },
    category: 'B2B E-commerce',
    applicationName: 'Elysonsweets B2B',
    // Dil yönlendirmelerini merkezi fonksiyondan alıyoruz
    alternates: getI18nAlternates(''),
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
    <html lang={locale} dir={direction}>
      <body>
        <OrganizationSchema />
        <WebSiteSchema />
        {children}
      </body>
    </html>
  );
}