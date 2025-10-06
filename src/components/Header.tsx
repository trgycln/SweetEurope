// src/components/Header.tsx (GÜNCEL HALİ)

import React from 'react';
import { BiLogOut, BiUserCircle } from 'react-icons/bi';
import { FiMenu, FiSearch } from 'react-icons/fi'; // İkonlar güncellendi

interface HeaderProps {
  userEmail: string | undefined | null;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ userEmail, setIsSidebarOpen }) => {
  
  const LogoutForm = () => (
    <form action="/auth/sign-out" method="post">
      <button
        type="submit"
        className="flex items-center gap-2 text-red-500 hover:text-red-700 transition-colors py-2 px-3 rounded-lg hover:bg-red-500/10"
        title="Çıkış Yap"
      >
        <BiLogOut size={20} />
        <span className="hidden sm:inline text-sm font-medium">Çıkış Yap</span>
      </button>
    </form>
  );

  return (
    <header className="fixed top-0 left-0 z-20 flex h-16 w-full items-center justify-between border-b border-bg-subtle bg-secondary px-4 sm:px-6 lg:left-64 lg:w-[calc(100%-16rem)]">
      
      {/* Sol Alan: Hamburger Menü (Sadece Mobilde) ve Arama Çubuğu */}
      <div className="flex items-center gap-4">
        {/* Hamburger Menü Butonu */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden text-text-main/70 hover:text-primary"
        >
          <FiMenu size={24} />
        </button>

        <div className="relative hidden sm:block">
          <FiSearch size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-main/40" />
          <input 
            type="text" 
            placeholder="Ara..." 
            className="w-full max-w-xs rounded-lg border border-bg-subtle bg-white py-2 pl-10 pr-4 text-sm text-text-main transition-all focus:border-accent focus:ring-2 focus:ring-accent/50"
          />
        </div>
      </div>

      {/* Sağ Alan: Kullanıcı Bilgisi ve Çıkış Butonu */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-lg bg-bg-subtle p-2">
            <BiUserCircle size={22} className="text-accent" />
            <span className="hidden sm:inline text-sm font-medium text-text-main">
                {userEmail || 'Bilinmeyen Kullanıcı'}
            </span>
        </div>
        <LogoutForm />
      </div>
      
    </header>
  );
};