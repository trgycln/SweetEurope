// src/components/AdminLayoutClient.tsx (HEADER ÜST ÜSTE BİNME SORUNU GİDERİLDİ)

'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';

type AdminLayoutClientProps = {
  user: User;
  children: React.ReactNode;
};

export function AdminLayoutClient({ user, children }: AdminLayoutClientProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const userEmail = user.email ?? 'E-posta Yok';

  return (
    <div className="h-screen w-full bg-secondary text-text-main antialiased font-sans">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex h-full flex-col lg:ml-64">
        
        {/* Sabit Header'ımız burada */}
        <Header userEmail={userEmail} setIsSidebarOpen={setSidebarOpen} />
        
        {/* --- EN ÖNEMLİ DÜZELTME BURADA ---
          
          pt-24 sınıfı (padding-top: 6rem), 64px (h-16 veya 4rem) yüksekliğindeki 
          sabit Header'ın içeriğin üzerine binmesini kalıcı olarak engeller
          ve arada 2rem'lik (32px) bir boşluk bırakır.
          
          p-8 sınıfı ise içeriğin yanlardan ve alttan boşluğunu ayarlar.
        */}
        <main className="flex-1 overflow-y-auto p-8 pt-24"> 
          {children}
        </main>

      </div>
    </div>
  );
}