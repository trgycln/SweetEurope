// src/app/[locale]/layout.tsx

import { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { getDictionary } from '@/dictionaries';
// DÜZELTME: Süslü parantezler kaldırıldı.
import Footer from '@/components/Footer'; 

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const dictionary = await getDictionary(params.locale as any);

  return (
    <div>
      <Header dictionary={dictionary} />
      
      <main className="bg-gray-50">
        {children}
      </main>

      {/* Footer bileşenini burada çağırıyoruz */}
      <Footer dictionary={dictionary} />
    </div>
  );
}