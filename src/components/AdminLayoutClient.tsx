// src/components/AdminLayoutClient.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar'; 
import { Enums } from '@/lib/supabase/database.types';
import { Dictionary } from '@/dictionaries';
import { Toaster } from 'sonner'; // DÜZELTME: react-hot-toast yerine sonner kullanıyoruz.

type AdminLayoutClientProps = {
  user: User;
  userRole: Enums<'user_role'> | null;
  children: React.ReactNode;
  dictionary: Dictionary; // dictionary prop'unu kabul et
};

export function AdminLayoutClient({ user, userRole, children, dictionary }: AdminLayoutClientProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const userEmail = user.email ?? 'E-posta Yok';

  return (
    <div className="h-screen w-full bg-secondary text-text-main antialiased font-sans">
      
      {/* Toaster bileşeni artık burada ve sonner kullanıyor. */}
      <Toaster position="top-right" richColors closeButton />

      {/* Sidebar'a dictionary prop'unu gönderiyoruz. */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} userRole={userRole} dictionary={dictionary} />

      <div className="flex h-full flex-col lg:ml-64">
        {/* Header'a dictionary prop'unu gönderiyoruz. */}
        <Header userEmail={userEmail} setIsSidebarOpen={setSidebarOpen} dictionary={dictionary} />
        <main className="flex-1 overflow-y-auto p-8 pt-24"> 
          {children}
        </main>
      </div>
    </div>
  );
}