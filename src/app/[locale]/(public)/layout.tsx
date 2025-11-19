// app/[locale]/(public)/layout.tsx

import { ReactNode } from 'react';
import { getDictionary } from '@/dictionaries';
import { LeadGateProvider } from '@/contexts/LeadGateContext';
import { Header } from '@/components/Header';
import Footer from '@/components/Footer';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as any);

  return (
    <LeadGateProvider>
      <Header dictionary={dictionary} />
      <main>{children}</main>
      <Footer dictionary={dictionary} locale={locale} />
      {/* Lead kapısı modali ve sabit numune sepeti are rendered by LeadGateProvider */}
    </LeadGateProvider>
  );
}