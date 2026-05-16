'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { FiGrid, FiPackage, FiBox, FiArchive, FiBarChart2, FiX, FiPaperclip, FiUser, FiCheckSquare, FiHeart, FiDollarSign } from 'react-icons/fi';
import { Dictionary } from '@/dictionaries'; // Dictionary importieren
import { Enums } from '@/lib/supabase/database.types';
import { getPortalLabels } from '@/lib/portalLabels';

// Sidebar için müşteri rolüne özel etiketler (4 dilde)
const CUSTOMER_LABELS: Record<string, { home: string; catalog: string; favorites: string; accountSummary: string; profile: string }> = {
    de: { home: 'Übersicht', catalog: 'Katalog (Bestellen)', favorites: 'Meine Favoriten', accountSummary: 'Kontoübersicht', profile: 'Profil' },
    en: { home: 'Home', catalog: 'Catalog (Order)', favorites: 'My Favorites', accountSummary: 'Account Summary', profile: 'Profile' },
    tr: { home: 'Anasayfa', catalog: 'Katalog (Sipariş Ver)', favorites: 'Favorilerim', accountSummary: 'Hesap Özetim', profile: 'Profil' },
    ar: { home: 'الرئيسية', catalog: 'الكتالوج (طلب)', favorites: 'مفضلاتي', accountSummary: 'ملخص الحساب', profile: 'الملف الشخصي' },
};

// Bayi rolüne özel etiketler
const BAYI_LABELS: Record<string, { cockpit: string; tasks: string; profile: string }> = {
    de: { cockpit: 'Cockpit', tasks: 'Meine Aufgaben', profile: 'Profil' },
    en: { cockpit: 'Cockpit', tasks: 'My Tasks', profile: 'Profile' },
    tr: { cockpit: 'Cockpit', tasks: 'Görevlerim', profile: 'Profil' },
    ar: { cockpit: 'لوحة القيادة', tasks: 'مهامي', profile: 'الملف الشخصي' },
};

type UserRole = Enums<'user_role'> | null;

interface SidebarProps {
    userRole: UserRole;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    dictionary: Dictionary; // Dictionary Prop hinzufügen
}

export function PortalSidebar({ userRole, isOpen, setIsOpen, dictionary }: SidebarProps) {
    const pathname = usePathname();
    const locale = pathname.split('/')[1] || 'de';
    const isRTL = locale === 'ar';
    // Dictionary Prop verwenden
    const content = dictionary.portal.sidebar;

    const isBayi = userRole === 'Alt Bayi';
    const isMusteri = userRole === 'Müşteri';
    const cust = CUSTOMER_LABELS[locale] || CUSTOMER_LABELS.de;
    const bayi = BAYI_LABELS[locale] || BAYI_LABELS.de;

    const menuItems = [
      // Üstte: Genel
      { name: isBayi ? bayi.cockpit : isMusteri ? cust.home : content.dashboard, href: '/portal/dashboard', icon: FiGrid },
      // Alt Bayi temel akış
      { name: content.customers || "Müşterilerim", href: '/portal/musterilerim', icon: FiUser, roles: ['Alt Bayi'] as UserRole[] },
      { name: isMusteri ? cust.catalog : content.products, href: '/portal/katalog', icon: FiBox },
      { name: content.orders, href: '/portal/siparisler', icon: FiPackage },
      { name: cust.favorites, href: '/portal/favoriler', icon: FiHeart, roles: ['Müşteri'] as UserRole[] },
      { name: bayi.tasks, href: '/portal/gorevlerim', icon: FiCheckSquare, roles: ['Alt Bayi'] as UserRole[] },
      { name: content.stock || "Mein Bestand", href: '/portal/stoklarim', icon: FiBox, roles: ['Alt Bayi'] as UserRole[] },
      { name: content.finance || "Meine Finanzen", href: '/portal/finanslarim', icon: FiBarChart2, roles: ['Alt Bayi'] as UserRole[] },
      { name: cust.accountSummary, href: '/portal/hesap-ozetim', icon: FiDollarSign, roles: ['Müşteri'] as UserRole[] },
      { name: content.requests, href: '/portal/taleplerim', icon: FiArchive },
      { name: content.materials || "Materialien", href: '/portal/materialien', icon: FiPaperclip },
      { name: content.reports || "Berichte", href: '/portal/raporlar', icon: FiBarChart2, roles: ['Alt Bayi'] as UserRole[] },
      // Profil en altta
      { name: isMusteri ? cust.profile : isBayi ? bayi.profile : cust.profile, href: '/portal/profil', icon: FiUser },
    ];

    return (
    <>
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      <div
        className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50 flex w-64 flex-col bg-primary text-secondary transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')
        }`}
      >
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-white/10 px-6">
          <h1 className="text-white text-2xl font-serif font-bold">{content.title}</h1>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-secondary/70 hover:text-white">
            <FiX size={24} />
          </button>
        </div>
        <nav className="flex-1 space-y-2 p-4">
            {menuItems
                .filter(item => {
                    if (!item.roles) return true;
                    if (!userRole) return false;
                    return item.roles.includes(userRole);
                })
                .map(item => {
                // Pfad-Präfix für die Locale aus dem aktuellen Pfad extrahieren
                const localePrefix = pathname.split('/')[1];
                const hrefWithLocale = `/${localePrefix}${item.href}`;
                const isActive = pathname.startsWith(hrefWithLocale);
                return (
                    <Link key={item.name} href={hrefWithLocale}
                        className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors ${isActive ? 'bg-accent text-primary font-bold' : 'text-secondary/70 hover:bg-white/10'}`}>
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
