// src/app/layout.tsx (NİHAİ HALİ)

import type { Metadata } from "next";
// DÜZELTME: Fontları buraya, en dış layout'a import ediyoruz.
import { Playfair_Display, Lato } from "next/font/google";
import "./globals.css";

// DÜZELTME: Font değişkenlerini burada, global alanda tanımlıyoruz.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-playfair",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-lato",
});

export const metadata: Metadata = {
  title: "SweetHeaven & SweetDreams",
  description: "Yönetim ve Partner Portalı",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // DÜZELTME: Font değişkenlerini <html> etiketine uygulayarak tüm projeye yayıyoruz.
    <html lang="tr" className={`${playfair.variable} ${lato.variable}`}>
      <body>{children}</body>
    </html>
  );
}