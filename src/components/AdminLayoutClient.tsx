'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { Header } from '@/components/Header';
// DİKKAT: Burada Admin'e ait olan, 'Sidebar.tsx' dosyasındaki Sidebar'ı import ediyoruz.
import { Sidebar } from '@/components/Sidebar'; 
import { Enums } from '@/lib/supabase/database.types';

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