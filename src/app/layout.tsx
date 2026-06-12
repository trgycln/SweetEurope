// app/layout.tsx (YENİ ANA KÖK LAYOUT)

import { ReactNode } from 'react';
import type { Metadata } from "next";
import { Playfair_Display, Lato } from "next/font/google";
import { headers } from "next/headers";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import VercelAnalytics from "@/components/VercelAnalytics";
import CookieBanner from "@/components/CookieBanner";
import "./globals.css";

const localeNames: Record<string, string> = {
  de: 'de-DE',
  en: 'en-US',
  tr: 'tr-TR',
  ar: 'ar-SA',
};

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
  title: {
    default: "ElysonSweets | B2B Großhandel HoReCa",
    template: "%s | ElysonSweets",
  },
  description: "B2B Großhandel für Cafés, Hotels und Patisserien. Sirupe, Saucen, Desserts und Backzutaten von FO Food Products.",
  metadataBase: new URL("https://www.elysonsweets.de"),
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    title: "ElysonSweets | Premium B2B Großhandel",
    description: "B2B Großhandel für Cafés, Hotels und Patisserien. Sirupe, Saucen, Desserts und Backzutaten.",
    url: "https://www.elysonsweets.de",
    siteName: "ElysonSweets",
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ElysonSweets | B2B Großhandel",
    description: "Premium B2B Großhandel für Cafés, Hotels und Patisserien.",
  },
  verification: {
    google: "", // Google Search Console doğrulama kodu buraya eklenecek
  },
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const headersList = await headers();
  const locale = headersList.get('x-locale') || 'de';
  const htmlLang = localeNames[locale] || 'de-DE';

  return (
    <html lang={htmlLang} className={`${playfair.variable} ${lato.variable}`} suppressHydrationWarning>
      <head>
        <GoogleAnalytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "ElysonSweets",
              "url": "https://www.elysonsweets.de",
              "logo": "https://www.elysonsweets.de/favicon.png",
              "description": "Premium B2B Großhandel für Cafés, Hotels und Patisserien in Deutschland.",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "DE"
              },
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service"
              }
            })
          }}
        />
        {/* eslint-disable-next-line @next/next/no-before-interactive-script-component */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(()=>{const s=(n)=>n==='bis_skin_checked'||n==='bis_register'||n==='bis_use'||n==='data-dynamic-id'||n.startsWith('data-bis-')||n.startsWith('__processed_');const c=(el)=>{if(!el||typeof el.getAttributeNames!=='function')return;el.getAttributeNames().forEach(n=>{if(s(n))el.removeAttribute(n);});};const t=(r)=>{c(r);if(r&&typeof r.querySelectorAll==='function')r.querySelectorAll('*').forEach(c);};t(document.documentElement);new MutationObserver(ms=>{ms.forEach(m=>{if(m.type==='attributes'&&m.attributeName&&s(m.attributeName))c(m.target);m.addedNodes.forEach(n=>{if(n.nodeType===1)t(n);});});}).observe(document.documentElement,{subtree:true,childList:true,attributes:true});})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        <VercelAnalytics />
        <CookieBanner />
      </body>
    </html>
  );
}