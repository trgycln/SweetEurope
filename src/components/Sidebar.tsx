// src/components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState } from 'react';
import { FiGrid, FiUsers, FiBox, FiClipboard, FiPackage, FiX, FiBriefcase, FiDollarSign, FiGift, FiEdit, FiBarChart2, FiSettings, FiLayers, FiTruck, FiChevronDown } from 'react-icons/fi';
import { Enums } from '@/lib/supabase/database.types';

type UserRole = Enums<'user_role'> | null;

const menuSections = [
  {
    title: 'Genel',
    links: [
      { name: 'Ana Panel', href: '/admin/dashboard', icon: FiGrid },
    ],
  },
  {
    title: 'CRM',
    links: [
      { name: 'Firmalar', href: '/admin/crm/firmalar', icon: FiUsers },
    ],
  },
  {
    title: 'Ürün Yönetimi',
    links: [
      { name: 'Ürünler', href: '/admin/operasyon/urunler', icon: FiBox },
      { name: 'Kategoriler', href: '/admin/urun-yonetimi/kategoriler', icon: FiLayers, roles: ['Yönetici'] as UserRole[] },
    ],
  },
  {
    title: 'Operasyon',
    links: [
      { name: 'Siparişler', href: '/admin/operasyon/siparisler', icon: FiPackage },
      { name: 'Fiyat Listesi', href: '/admin/operasyon/fiyat-listesi', icon: FiDollarSign, roles: ['Yönetici'] as UserRole[] },
    ],
  },
  {
    title: 'İdari',
    links: [
      { name: 'Tedarikçiler', href: '/admin/idari/kontaklar', icon: FiTruck },
      { name: 'Görevler', href: '/admin/idari/gorevler', icon: FiClipboard },
      { name: 'Finans Raporu', href: '/admin/idari/finans/raporlama', icon: FiBarChart2, roles: ['Yönetici'] as UserRole[] },
    ],
  },
  {
    title: 'Pazarlama',
    links: [
      { name: 'Pazarlama Materyalleri', href: '/admin/idari/materyaller', icon: FiGift, roles: ['Yönetici'] as UserRole[] },
      { name: 'İçerik Yönetimi (Blog)', href: '/admin/pazarlama/blog', icon: FiEdit, roles: ['Yönetici'] as UserRole[] },
    ],
  },
  {
    title: 'Sistem Ayarları',
    links: [
      { name: 'Özellik Şablonları', href: '/admin/ayarlar/sablonlar', icon: FiSettings, roles: ['Yönetici'] as UserRole[] },
    ]
  }
];

type SidebarProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  userRole: UserRole;
};

export function Sidebar({ isOpen, setIsOpen, userRole }: SidebarProps) {
  const pathname = usePathname();
  // YENİ: Hangi akordiyon bölümünün açık olduğunu takip eden state.
  // Varsayılan olarak 'Genel' bölümü açık başlar.
  const [openSection, setOpenSection] = useState<string | null>('Genel');

  return (
    <>
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      <div
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-primary text-secondary transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-shrink-0 items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-primary z-10">
          <Link href="/admin/dashboard" className="text-white text-2xl font-serif font-bold flex items-center">
            SweetHeaven
          </Link>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-secondary/70 hover:text-white">
            <FiX size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4">
          {menuSections.map((section) => {
            const isSectionOpen = openSection === section.title;
            return (
              <div key={section.title} className="mb-2">
                {/* YENİ: Akordiyon başlığı */}
                <button
                  onClick={() => setOpenSection(isSectionOpen ? null : section.title)}
                  className="w-full flex justify-between items-center px-4 py-2 text-sm font-bold uppercase text-secondary/60 tracking-wider hover:text-white transition-colors"
                >
                  <span>{section.title}</span>
                  <FiChevronDown
                    className={`transform transition-transform duration-300 ${isSectionOpen ? 'rotate-180' : 'rotate-0'}`}
                  />
                </button>
                
                {/* YENİ: Akordiyon içeriği (açılıp kapanan kısım) */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isSectionOpen ? 'max-h-96' : 'max-h-0'
                  }`}
                >
                  <div className="space-y-1 pt-2 pl-4">
                    {section.links
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
                                : 'text-secondary/80 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <item.icon size={18} />
                            <span className="text-sm font-medium">{item.name}</span>
                          </Link>
                        );
                      })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </>
  );
}