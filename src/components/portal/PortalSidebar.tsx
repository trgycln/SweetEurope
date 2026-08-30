'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { FiGrid, FiPackage, FiBox, FiArchive, FiBarChart2, FiX, FiPaperclip, FiUser, FiCheckSquare, FiHeart, FiDollarSign } from 'react-icons/fi';
import { Dictionary } from '@/dictionaries'; // Dictionary importieren
import { Enums } from '@/lib/supabase/database.types';
import { getPortalLabels } from '@/lib/portalLabels';

// Sidebar için müşteri rolüne özel profesyonel B2B etiketleri (4 dilde)
const CUSTOMER_LABELS: Record<string, { home: string; catalog: string; favorites: string; orders: string; accountSummary: string; profile: string }> = {
    de: { home: 'Übersicht', catalog: 'Katalog & Bestellen', favorites: 'Häufig Bestellt', orders: 'Bestellungen & Rechnungen', accountSummary: 'Kontoauszug & Saldo', profile: 'Kontoeinstellungen' },
    en: { home: 'Overview', catalog: 'Catalog & Order', favorites: 'Frequently Ordered', orders: 'Orders & Invoices', accountSummary: 'Statement & Balance', profile: 'Account Settings' },
    tr: { home: 'Genel Bakış', catalog: 'Ürün Kataloğu & Sipariş', favorites: 'Sık Sipariş Edilenler', orders: 'Sipariş Takibi & Faturalar', accountSummary: 'Cari Bakiye & Ekstre', profile: 'Hesap Ayarları' },
    ar: { home: 'نظرة عامة', catalog: 'الكتالوج والطلب', favorites: 'الطلبات المتكررة', orders: 'الطلبات والفواتير', accountSummary: 'كشف الحساب والرصيد', profile: 'إعدادات الحساب' },
};

// Bayi rolüne özel profesyonel B2B etiketleri (4 dilde)
const BAYI_LABELS: Record<string, { cockpit: string; customers: string; catalog: string; orders: string; tasks: string; stock: string; finance: string; reports: string; profile: string }> = {
    de: { cockpit: 'Cockpit', customers: 'Kundenportfolio', catalog: 'Produktkatalog', orders: 'Bestellverwaltung', tasks: 'Aufgaben & Follow-ups', stock: 'Bestandsstatus', finance: 'Finanzen & Debitoren', reports: 'Vertriebsberichte', profile: 'Einstellungen' },
    en: { cockpit: 'Cockpit', customers: 'Customer Portfolio', catalog: 'Product Catalog', orders: 'Order Management', tasks: 'Tasks & Follow-ups', stock: 'Stock Status', finance: 'Finance & Accounts', reports: 'Sales Reports', profile: 'Settings' },
    tr: { cockpit: 'Cockpit', customers: 'Müşteri Portföyü', catalog: 'Ürün Kataloğu', orders: 'Sipariş Yönetimi', tasks: 'Görev & Takipler', stock: 'Stok Durumu', finance: 'Cari Hesap & Finans', reports: 'Satış & Raporlar', profile: 'Hesap & Ayarlar' },
    ar: { cockpit: 'لوحة القيادة', customers: 'محفظة العملاء', catalog: 'كتالوج المنتجات', orders: 'إدارة الطلبات', tasks: 'المهام والمتابعة', stock: 'حالة المخزون', finance: 'الحسابات والمالية', reports: 'تقارير المبيعات', profile: 'الإعدادات' },
};

type UserRole = Enums<'user_role'> | null;

interface SidebarProps {
    userRole: UserRole;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    dictionary: Dictionary;
}

export function PortalSidebar({ userRole, isOpen, setIsOpen, dictionary }: SidebarProps) {
    const pathname = usePathname();
    const locale = pathname.split('/')[1] || 'de';
    const isRTL = locale === 'ar';
    const content = dictionary.portal.sidebar;

    const isBayi = userRole === 'Alt Bayi';
    const isMusteri = userRole === 'Müşteri';
    const cust = CUSTOMER_LABELS[locale] || CUSTOMER_LABELS.de;
    const bayi = BAYI_LABELS[locale] || BAYI_LABELS.de;

    const menuItems = [
      // 1. Genel Bakış
      { name: isBayi ? bayi.cockpit : isMusteri ? cust.home : content.dashboard, href: '/portal/dashboard', icon: FiGrid },
      
      // 2. Alt Bayi CRM & Müşteriler
      { name: isBayi ? bayi.customers : (content.customers || "Müşteri Portföyü"), href: '/portal/musterilerim', icon: FiUser, roles: ['Alt Bayi'] as UserRole[] },
      
      // 3. Ürün Kataloğu & Sipariş
      { name: isMusteri ? cust.catalog : (isBayi ? bayi.catalog : content.products), href: '/portal/katalog', icon: FiBox },
      
      // 4. Sipariş Yönetimi
      { name: isMusteri ? cust.orders : (isBayi ? bayi.orders : content.orders), href: '/portal/siparisler', icon: FiPackage },
      
      // 5. Müşteri Sık Sipariş Edilenler
      { name: cust.favorites, href: '/portal/favoriler', icon: FiHeart, roles: ['Müşteri'] as UserRole[] },
      
      // 6. Görev & Takipler (Alt Bayi)
      { name: bayi.tasks, href: '/portal/gorevlerim', icon: FiCheckSquare, roles: ['Alt Bayi'] as UserRole[] },
      
      // 7. Stok Durumu (Alt Bayi)
      { name: isBayi ? bayi.stock : (content.stock || "Stok Durumu"), href: '/portal/stoklarim', icon: FiBox, roles: ['Alt Bayi'] as UserRole[] },
      
      // 8. Cari Hesap & Finans (Alt Bayi)
      { name: isBayi ? bayi.finance : (content.finance || "Cari Hesap & Finans"), href: '/portal/finanslarim', icon: FiBarChart2, roles: ['Alt Bayi'] as UserRole[] },
      
      // 9. Cari Bakiye & Ekstre (Müşteri)
      { name: cust.accountSummary, href: '/portal/hesap-ozetim', icon: FiDollarSign, roles: ['Müşteri'] as UserRole[] },
      
      // 10. Satış & Raporlar (Alt Bayi)
      { name: isBayi ? bayi.reports : (content.reports || "Satış & Raporlar"), href: '/portal/raporlar', icon: FiBarChart2, roles: ['Alt Bayi'] as UserRole[] },
      
      // 11. Hesap & Ayarlar
      { name: isMusteri ? cust.profile : (isBayi ? bayi.profile : cust.profile), href: '/portal/profil', icon: FiUser },
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
