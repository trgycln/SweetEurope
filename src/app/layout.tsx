// app/layout.tsx (YENİ ANA KÖK LAYOUT)

import { ReactNode } from 'react';
import type { Metadata } from "next";
import { Playfair_Display, Lato } from "next/font/google";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import VercelAnalytics from "@/components/VercelAnalytics";
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
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
    shortcut: "/favicon.png",
  },
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
      </body>
    </html>
  );
}