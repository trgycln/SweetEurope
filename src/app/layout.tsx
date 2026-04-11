// app/layout.tsx (YENİ ANA KÖK LAYOUT)

import { ReactNode } from 'react';
import type { Metadata } from "next";
import Script from "next/script";
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
        <Script id="strip-extension-hydration-attrs" strategy="beforeInteractive">
          {`
            (() => {
              const shouldRemove = (name) =>
                name === 'bis_skin_checked' ||
                name === 'bis_register' ||
                name.startsWith('__processed_');

              const cleanElement = (element) => {
                if (!element || typeof element.getAttributeNames !== 'function') return;
                element.getAttributeNames().forEach((name) => {
                  if (shouldRemove(name)) {
                    element.removeAttribute(name);
                  }
                });
              };

              const cleanTree = (root) => {
                cleanElement(root);
                if (!root || typeof root.querySelectorAll !== 'function') return;
                root.querySelectorAll('*').forEach(cleanElement);
              };

              cleanTree(document.documentElement);

              new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                  if (mutation.type === 'attributes' && mutation.attributeName && shouldRemove(mutation.attributeName)) {
                    cleanElement(mutation.target);
                  }

                  mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                      cleanTree(node);
                    }
                  });
                });
              }).observe(document.documentElement, {
                subtree: true,
                childList: true,
                attributes: true,
              });
            })();
          `}
        </Script>
      </head>
      <body suppressHydrationWarning>
        {children}
        <VercelAnalytics />
      </body>
    </html>
  );
}