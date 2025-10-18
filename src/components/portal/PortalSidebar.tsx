'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { FiGrid, FiPackage, FiBox, FiArchive, FiBarChart2, FiX, FiPaperclip } from 'react-icons/fi'; // FiPaperclip importieren
import { Dictionary } from '@/dictionaries'; // Dictionary importieren
import { Enums } from '@/lib/supabase/database.types';

type UserRole = Enums<'user_role'> | null;

interface SidebarProps {
    userRole: UserRole;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    dictionary: Dictionary; // Dictionary Prop hinzufügen
}

export function PortalSidebar({ userRole, isOpen, setIsOpen, dictionary }: SidebarProps) {
    const pathname = usePathname();
    // Dictionary Prop verwenden
    const content = dictionary.portal.sidebar;

    const menuItems = [
        { name: content.dashboard, href: '/portal/dashboard', icon: FiGrid },
        { name: content.orders, href: '/portal/siparisler', icon: FiPackage },
        { name: content.products, href: '/portal/katalog', icon: FiBox },
        // --- NEUER LINK ---
        { name: content.materials || "Materialien", href: '/portal/materialien', icon: FiPaperclip },
        // ------------------
        { name: content.requests, href: '/portal/taleplerim', icon: FiArchive },
        { name: content.performance, href: '/portal/analiz', icon: FiBarChart2, roles: ['Alt Bayi'] as UserRole[] },
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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-primary text-secondary transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
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
