// src/components/Sidebar/Sidebar.tsx (GÜNCEL HALİ)

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { FiGrid, FiUsers, FiBox, FiClipboard, FiPackage, FiX } from 'react-icons/fi'; // Örnek ikonlar

// Menü verisi: İkonlar artık emoji yerine React Component'leri
const menuItems = [
  { name: 'Ana Panel', href: '/admin/dashboard', icon: FiGrid },
  { name: 'Firmalar (CRM)', href: '/admin/crm/firmalar', icon: FiUsers },
  { name: 'Siparişler', href: '/admin/siparisler', icon: FiPackage },
 { name: 'Ürünler', href: '/admin/operasyon/urunler', icon: FiBox },
  { name: 'Görevler', href: '/admin/gorevler', icon: FiClipboard },
];

type SidebarProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
};

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobil Görünüm İçin Arka Plan Overlay'i */}
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sidebar Panel */}
      <div
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-primary text-secondary transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-shrink-0 items-center justify-between p-4 border-b border-white/10">
          <Link href="/admin/dashboard" className="text-white text-2xl font-serif font-bold flex items-center">
            SweetHeaven
          </Link>
          {/* Mobilde Kapatma Butonu */}
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-secondary/70 hover:text-white">
            <FiX size={24} />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/admin/dashboard');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors duration-200 ${
                  isActive
                    ? 'bg-accent text-primary font-bold'
                    : 'text-secondary/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon size={20} />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}