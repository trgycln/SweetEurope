// app/[locale]/layout.tsx (DÜZELTİLMİŞ)

import { ReactNode } from 'react';
import '@/app/globals.css';
import { Lato, Playfair_Display } from 'next/font/google';

const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-lato',
});
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-playfair',
});

// DEĞİŞİKLİK: Fonksiyon imzasını güncelledik. Artık 'params' doğrudan parçalanmıyor.
export default function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  // DEĞİŞİKLİK: 'locale'i fonksiyonun gövdesi içinde alıyoruz.
  const { locale } = params;

  return (
    <html lang={locale} className={`${lato.variable} ${playfair.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}