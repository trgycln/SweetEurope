// src/components/AdminLayoutClient.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar'; 
import { Enums } from '@/lib/supabase/database.types';

// DEĞİŞİKLİK 1: Toaster'ı import ettik.
import { Toaster } from 'react-hot-toast';

type AdminLayoutClientProps = {
  user: User;
  userRole: Enums<'user_role'> | null;
  children: React.ReactNode;
};

export function AdminLayoutClient({ user, userRole, children }: AdminLayoutClientProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const userEmail = user.email ?? 'E-posta Yok';

  return (
    <div className="h-screen w-full bg-secondary text-text-main antialiased font-sans">
      
      {/* DEĞİŞİKLİK 2: Toaster bileşenini buraya ekledik. */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} userRole={userRole} />

      <div className="flex h-full flex-col lg:ml-64">
        <Header userEmail={userEmail} setIsSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-y-auto p-8 pt-24"> 
          {children}
        </main>
      </div>
    </div>
  );
}