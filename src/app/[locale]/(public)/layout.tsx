// app/[locale]/(public)/layout.tsx

import { ReactNode } from 'react';
import { getDictionary } from '@/dictionaries';
import { Header } from '@/components/Header';
import Footer from '@/components/Footer';
import { Toaster } from 'sonner';

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
    <>
      <Toaster 
        position="top-center" 
        richColors 
        expand={true}
        closeButton
        toastOptions={{
          style: {
            padding: '16px',
            fontSize: '16px',
            minHeight: '60px',
          },
          duration: 5000,
        }}
      />
      <Header dictionary={dictionary} />
      <main>{children}</main>
      <Footer dictionary={dictionary} locale={locale} />
    </>
  );
}