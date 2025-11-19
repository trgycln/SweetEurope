// src/components/Sidebar.tsx (Güncellenmiş Hali)
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState } from 'react';
import {
    FiGrid, FiUsers, FiBox, FiClipboard, FiTruck, FiX,
    FiGift, FiLayers, FiSettings, FiChevronDown,
    FiRss, FiPaperclip, FiHardDrive, 
    FiDollarSign, FiBarChart2, FiUser, FiStar, FiTag, FiUserCheck // Yeni eklenen ikonlar
} from 'react-icons/fi';
import { Enums } from '@/lib/supabase/database.types';
import { Dictionary } from '@/dictionaries';

type UserRole = Enums<'user_role'> | null;

type SidebarProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    userRole: UserRole;
    dictionary: Dictionary;
};

export function Sidebar({ isOpen, setIsOpen, userRole, dictionary }: SidebarProps) {
    const pathname = usePathname();
    const content = dictionary.adminSidebar;

    // Type assertion for additional sidebar properties
    const sidebarContent = content as typeof content & {
        announcements?: string;
        marketingMaterials?: string;
        sampleRequests?: string;
        productRequests?: string;
        productManagement?: string;
        pricing?: string;
        marketing?: string;
        finances?: string;
        expenses?: string;
        reporting?: string;
        reviews?: string;
        priceCalculation?: string;
        priceRequests?: string;
        priceExceptions?: string;
        priceRules?: string;
        systemSettings?: string;
        profile?: string;
        customerProfiles?: string;
        profileAssignments?: string;
    };

    type LinkItem = { name: any; href: string; icon: any; roles?: UserRole[] };
    type MenuSection = { title: string; links: LinkItem[] };

    const menuSections: MenuSection[] = [
        {
            title: sidebarContent.mainMenu,
            links: [
                { name: sidebarContent.dashboard, href: '/admin/dashboard', icon: FiGrid },
            ],
        },
        {
            title: sidebarContent.crm || 'CRM & Müşteri Yönetimi',
            links: [
                { name: sidebarContent.customers || 'Firmalar', href: '/admin/crm/firmalar', icon: FiUsers, roles: ['Yönetici', 'Ekip Üyesi'] as UserRole[] },
                { name: sidebarContent.customerProfiles || 'Müşteri Profilleri', href: '/admin/crm/musteri-profilleri', icon: FiTag, roles: ['Yönetici'] as UserRole[] },
                { name: sidebarContent.profileAssignments || 'Profil Atamaları', href: '/admin/crm/profil-atamalari', icon: FiUserCheck, roles: ['Yönetici'] as UserRole[] },
            ],
        },
        {
            title: sidebarContent.operations,
            links: [
                { name: sidebarContent.orders, href: '/admin/operasyon/siparisler', icon: FiTruck, roles: ['Yönetici', 'Ekip Üyesi'] as UserRole[] },
                { 
                    name: sidebarContent.sampleRequests || 'Musteranfragen', 
                    href: '/admin/operasyon/numune-talepleri', 
                    icon: FiHardDrive, 
                    roles: ['Yönetici', 'Ekip Üyesi'] as UserRole[] 
                },
                { name: sidebarContent.tasks, href: '/admin/gorevler', icon: FiClipboard, roles: ['Yönetici', 'Ekip Üyesi'] as UserRole[] },
            ]
        },
        {
            title: sidebarContent.productManagement || 'Ürün Yönetimi',
            links: [
                { name: sidebarContent.products, href: '/admin/urun-yonetimi/urunler', icon: FiBox, roles: ['Yönetici'] as UserRole[] },
                { 
                    name: sidebarContent.productRequests || 'Produktanfragen', 
                    href: '/admin/urun-yonetimi/urun-talepleri', 
                    icon: FiGift,
                    roles: ['Yönetici'] as UserRole[] 
                },
                { name: sidebarContent.categories, href: '/admin/urun-yonetimi/kategoriler', icon: FiLayers, roles: ['Yönetici'] as UserRole[] },
                { 
                    name: sidebarContent.reviews || 'Bewertungen', 
                    href: '/admin/urun-yonetimi/degerlendirmeler', 
                    icon: FiStar,
                    roles: ['Yönetici', 'Ekip Üyesi'] as UserRole[] 
                },
            ],
        },
        {
            title: sidebarContent.pricing || 'Fiyatlandırma',
            links: [
                { name: sidebarContent.pricingHub || '🏷️ Fiyatlandırma Hub', href: '/admin/urun-yonetimi/fiyatlandirma-hub', icon: FiDollarSign, roles: ['Yönetici'] as UserRole[] },
            ],
        },

        {
            title: sidebarContent.marketing || 'Pazarlama',
            links: [
                {
                    name: sidebarContent.announcements || 'Ankündigungen',
                    href: '/admin/pazarlama/duyurular',
                    icon: FiRss,
                    roles: ['Yönetici', 'Ekip Üyesi'] as UserRole[]
                },
                {
                    name: sidebarContent.marketingMaterials || 'Marketingmaterial',
                    href: '/admin/pazarlama/materialien',
                    icon: FiPaperclip,
                    roles: ['Yönetici', 'Ekip Üyesi'] as UserRole[]
                },
            ],
        },
        {
            title: sidebarContent.finances || 'Finanzen',
            links: [
                { 
                    name: sidebarContent.expenses || 'Giderler', 
                    href: '/admin/idari/finans/giderler', 
                    icon: FiDollarSign, 
                    roles: ['Yönetici', 'Ekip Üyesi'] as UserRole[] 
                },
                { 
                    name: sidebarContent.reporting || 'Raporlama', 
                    href: '/admin/idari/finans/raporlama', 
                    icon: FiBarChart2, 
                    roles: ['Yönetici'] as UserRole[] 
                },
            ]
        },
        {
            title: sidebarContent.settings,
            links: [
                { name: sidebarContent.systemSettings || 'Sistem Ayarları', href: '/admin/ayarlar/sistem-ayarlari', icon: FiSettings, roles: ['Yönetici'] as UserRole[] },
                { name: sidebarContent.templates, href: '/admin/ayarlar/sablonlar', icon: FiSettings, roles: ['Yönetici'] as UserRole[] },
                { name: sidebarContent.profile || 'Profil', href: '/admin/profil', icon: FiUser },
            ]
        }
    ];

    const [openSection, setOpenSection] = useState<string | null>(() => {
        for (const section of menuSections) {
            if (section.links.some(link => pathname.startsWith(link.href))) {
                return section.title;
            }
        }
        return sidebarContent.mainMenu;
    });

    return (
        <>
            <div
                onClick={() => setIsOpen(false)}
                className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            ></div>
            <div
                className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-primary text-secondary transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-y-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex flex-shrink-0 items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-primary z-10">
                    <Link href="/admin/dashboard" className="text-white text-2xl font-serif font-bold flex items-center">
                        ElysonSweets
                    </Link>
                    <button onClick={() => setIsOpen(false)} className="lg:hidden text-secondary/70 hover:text-white">
                        <FiX size={24} />
                    </button>
                </div>
                
                <nav className="flex-1 p-4">
                    {menuSections.map((section: MenuSection) => {
                        const hasAccessToSection = section.links.some((item: LinkItem) =>
                            !item.roles || (userRole && item.roles.includes(userRole))
                        );
                        if (!hasAccessToSection) return null;

                        const isSectionOpen = openSection === section.title;
                        return (
                            <div key={section.title} className="mb-2">
                                <button
                                    onClick={() => setOpenSection(isSectionOpen ? null : section.title)}
                                    className="w-full flex justify-between items-center px-4 py-2 text-sm font-bold uppercase text-secondary/60 tracking-wider hover:text-white transition-colors rounded-lg text-left"
                                >
                                    <span className="text-left flex-1">{section.title}</span>
                                    <FiChevronDown className={`transform transition-transform duration-300 ${isSectionOpen ? 'rotate-180' : 'rotate-0'}`} />
                                </button>
                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSectionOpen ? 'max-h-96' : 'max-h-0'}`}>
                                    <div className="space-y-1 pt-2 pl-4 border-l-2 border-white/10 ml-4">
                                        {section.links
                                            .filter((item: LinkItem) => !item.roles || (userRole && item.roles.includes(userRole)))
                                            .map((item: LinkItem) => {
                                                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                                return (
                                                    <Link
                                                        key={item.name}
                                                        href={item.href}
                                                        className={`flex items-center gap-3 rounded-md px-3 py-2 transition-colors duration-200 ${isActive ? 'bg-accent text-primary font-bold' : 'text-secondary/80 hover:bg-white/10 hover:text-white'}`}
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