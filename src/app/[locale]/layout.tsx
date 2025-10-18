// app/[locale]/layout.tsx (SADELEŞTİRİLMİŞ DİL LAYOUT'U)

import { ReactNode } from 'react';

export default function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  // Bu layout'un içeriği değişti, ancak Kök Layout'a (app/layout.tsx)
  // lang attribute'ünü dinamik olarak ekleyemediğimiz için bu dosyayı şimdilik
  // sadece bir "geçirgen" olarak kullanacağız.
  // Gelecekte Next.js bu konuda daha iyi çözümler sunabilir.
  
  // ÖNEMLİ: Bu layout artık <html> veya <body> etiketleri İÇERMEZ.
  // Onlar bir üst katmandaki app/layout.tsx tarafından sağlanır.
  return <>{children}</>;
}