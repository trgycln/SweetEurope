// app/layout.tsx (YENİ ANA KÖK LAYOUT)

import { ReactNode } from 'react';
import type { Metadata } from "next";
import { Playfair_Display, Lato } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import "./globals.css";

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
  title: "ElysonSweets",
  description: "Yönetim ve Partner Portalı",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    // DİKKAT: Burada 'lang' attribute'ü YOKTUR. Dil, [locale]/layout.tsx içinde eklenecek.
    <html className={`${playfair.variable} ${lato.variable}`} suppressHydrationWarning>
      <head>
        <GoogleAnalytics />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}