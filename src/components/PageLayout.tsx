"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from "@/components/NavbarElegant";
import Footer from "@/components/Footer";
import { dictionary } from "@/dictionaries/de";

export default function PageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');

  // Eğer admin sayfasındaysak, sadece o sayfanın kendi içeriğini göster.
  // Admin'in kendi layout'u zaten menüyü vs. içerecektir.
  if (isAdminRoute) {
    return <>{children}</>;
  }

  // Eğer herkese açık bir sayfadaysak, Navbar ve Footer ile birlikte göster.
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar dictionary={dictionary} />
      <main className="flex-grow">
        {children}
      </main>
      <Footer dictionary={dictionary} />
    </div>
  );
}