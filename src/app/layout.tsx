import type { Metadata } from "next";
import { Playfair_Display, Lato } from "next/font/google";
import "./globals.css";
import PageLayout from "@/components/PageLayout"; // Yeni bileşenimizi import ettik

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

// Artık bu dosya bir Sunucu Bileşeni olduğu için metadata sorunsuz çalışacaktır
export const metadata: Metadata = {
  title: "SweetDreams Germany",
  description: "Premium Pastacılık ve Gurme Lezzetler",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${playfair.variable} ${lato.variable}`}>
      <body className="bg-secondary">
        <PageLayout>{children}</PageLayout>
      </body>
    </html>
  );
}