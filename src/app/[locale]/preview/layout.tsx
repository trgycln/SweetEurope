// app/[locale]/(public)/layout.tsx (DÜZELTİLMİŞ)

import { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { getDictionary } from '@/dictionaries';
import Footer from '@/components/Footer'; 

// DEĞİŞİKLİK: Fonksiyon imzasını güncelledik.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Next.js 15: params should be awaited
  const { locale } = await params;
  const dictionary = await getDictionary(locale as any);

  return (
    <div>
      <Header dictionary={dictionary} />
      <main className="bg-gray-50">
        {children}
      </main>
      <Footer dictionary={dictionary} />
    </div>
  );
}