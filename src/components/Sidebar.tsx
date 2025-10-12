// src/components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
// DÜZELTME: FiBarChart2 ikonu eklendi.
import { FiGrid, FiUsers, FiBox, FiClipboard, FiPackage, FiX, FiBriefcase, FiDollarSign, FiGift, FiEdit, FiBarChart2 } from 'react-icons/fi';
import { Enums } from '@/lib/supabase/database.types';

type UserRole = Enums<'user_role'> | null;

const menuItems = [
  { name: 'Ana Panel', href: '/admin/dashboard', icon: FiGrid },
  { name: 'Firmalar (CRM)', href: '/admin/crm/firmalar', icon: FiUsers },
  { name: 'Katagoriler', href: '/admin/ayarlar/sablonlar', label: 'Özellik Şablonları', icon: FiGrid },
  { name: 'Ürünler', href: '/admin/operasyon/urunler', icon: FiBox },
  
  { name: 'Siparişler', href: '/admin/operasyon/siparisler', icon: FiPackage },
  { name: 'Görevler', href: '/admin/idari/gorevler', icon: FiClipboard },
  { name: 'Tedarikçi Yönetimi', href: '/admin/idari/kontaklar', icon: FiBriefcase },
  { name: 'Pazarlama Materyalleri', href: '/admin/idari/materyaller', icon: FiGift, roles: ['Yönetici'] as UserRole[] },
  { name: 'İçerik Yönetimi (Blog)', href: '/admin/pazarlama/blog', icon: FiEdit, roles: ['Yönetici'] },
  { name: 'Finans Raporu', href: '/admin/idari/finans/raporlama', icon: FiBarChart2, roles: ['Yönetici'] as UserRole[] },
  { name: 'Fiyat Listesi', href: '/admin/operasyon/fiyat-listesi', icon: FiBarChart2, roles: ['Yönetici'] as UserRole[] },
  { name: 'Kategori Yönetimi', href: '/admin/idari/kategoriler', icon: FiGift, roles: ['Yönetici'] as UserRole[] },

];

type SidebarProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  userRole: UserRole;
};

export function Sidebar({ isOpen, setIsOpen, userRole }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      <div
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-primary text-secondary transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-shrink-0 items-center justify-between p-4 border-b border-white/10">
          <Link href="/admin/dashboard" className="text-white text-2xl font-serif font-bold flex items-center">
            SweetHeaven
          </Link>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-secondary/70 hover:text-white">
            <FiX size={24} />
          </button>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {menuItems
            .filter(item => {
              if (!item.roles) return true;
              if (!userRole) return false;
              return item.roles.includes(userRole);
            })
            .map((item) => {
              const isActive = pathname.startsWith(item.href);
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