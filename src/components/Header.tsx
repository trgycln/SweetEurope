// src/components/Header.tsx (Vollständig mit Such-Modal)
'use client';

import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    FiGlobe, FiChevronDown, FiUser, FiSearch,
    FiMenu, FiLogOut, FiX
} from 'react-icons/fi';
import { Dictionary } from '@/dictionaries';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
// NEU: SearchModal importieren
import { SearchModal } from '@/components/SearchModal';
import { Locale } from '@/lib/utils'; // Annahme: Locale ist in utils

interface HeaderProps {
    dictionary: Dictionary;
    isAdminHeader?: boolean;
    setIsSidebarOpen?: (isOpen: boolean) => void;
    userEmail?: string;
}

const diller = [
    { kod: 'de', ad: 'Deutsch' },
    { kod: 'en', ad: 'English' },
    { kod: 'tr', ad: 'Türkçe' },
    { kod: 'ar', ad: 'العربية' },
];

const getPathWithoutLocale = (pathname: string | null) => {
    if (!pathname) return '/';
    const segments = pathname.split('/');
    if (diller.some(d => d.kod === segments[1])) {
        segments.splice(1, 1);
        return segments.join('/') || '/';
    }
    return pathname;
};

export function Header({ dictionary, isAdminHeader = false, setIsSidebarOpen, userEmail }: HeaderProps) {
    const pathname = usePathname();
    const params = useParams();
    const router = useRouter();
    const currentLocale = params.locale as Locale; // Locale-Typ verwenden

    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    // NEU: State für Such-Modal
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsSearchOpen(false); // Suche auch bei Navigation schließen
    }, [pathname]);

    const pathWithoutLocale = getPathWithoutLocale(pathname);
    const currentLangName = diller.find(d => d.kod === currentLocale)?.ad || 'Dil';

    const nav = dictionary.navigation;
    const adminHeaderContent = dictionary.adminHeader || { logout: "Abmelden" };

    const handleLanguageChange = (newLocale: string) => {
        setIsLangMenuOpen(false);
        const newPath = `/${newLocale}${pathWithoutLocale}`;
        router.push(newPath);
        router.refresh();
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        const supabase = createDynamicSupabaseClient(true);
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error("Abmelden fehlgeschlagen: " + error.message);
            setIsLoggingOut(false);
        } else {
            router.push(`/${currentLocale}/login`);
        }
    };

    const publicNavLinks = [
        { name: nav.home, href: `/${currentLocale}` },
        { name: nav.products, href: `/${currentLocale}/products` },
        { name: nav.about, href: `/${currentLocale}/about` },
        { name: nav.contact, href: `/${currentLocale}/contact` },
    ];

    return (
        <>
            <header className={`sticky top-0 z-40 flex h-20 w-full items-center justify-between border-b px-4 sm:px-6 ${isAdminHeader ? 'bg-white border-bg-subtle text-text-main shadow-sm' : 'border-white/10 bg-primary text-white'}`}>

                {/* --- Linke Seite --- */}
                <div className="flex items-center gap-4">
                    {/* Admin Hamburger Button */}
                    {isAdminHeader && setIsSidebarOpen && (
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-text-main/80 hover:text-accent focus:outline-none" aria-label="Admin-Menü öffnen">
                            <FiMenu size={24} />
                        </button>
                    )}
                    {/* Öffentlicher Hamburger Button */}
                    {!isAdminHeader && (
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden text-white/80 hover:text-white focus:outline-none" aria-label="Menü öffnen">
                            <FiMenu size={24} />
                        </button>
                    )}
                    {/* Logo / Titel */}
                    <Link href={`/${currentLocale}${isAdminHeader ? '/admin/dashboard' : ''}`} className={`text-2xl font-serif font-bold ${isAdminHeader ? 'text-primary' : 'text-white'}`}>
                        ElysonSweets {isAdminHeader && <span className="text-sm font-sans font-normal text-gray-500 ml-1">Admin</span>}
                    </Link>
                    {/* Öffentliche Desktop-Navigation */}
                    {!isAdminHeader && (
                        <nav className="hidden lg:flex items-center gap-6 ml-8">
                            {publicNavLinks.map(link => (
                                <Link key={link.name} href={link.href} className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">
                                    {link.name}
                                </Link>
                            ))}
                        </nav>
                    )}
                </div>

                {/* --- Rechte Seite --- */}
                <div className="flex items-center gap-4">
                    
                    {/* KORREKTUR: Alte Suchleiste entfernt */}
                    {/* Stattdessen: Such-Icon-Button (nur öffentlich) */}
                    {!isAdminHeader && (
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className={`p-2 rounded-md transition-colors ${isAdminHeader ? 'text-text-main/70 hover:text-accent' : 'text-white/80 hover:text-white'}`}
                            aria-label={nav.search}
                        >
                            <FiSearch size={20} />
                        </button>
                    )}

                    {/* Sprachwechsler */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} 
                            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${isAdminHeader ? 'border-bg-subtle bg-secondary text-text-main hover:bg-bg-subtle' : 'border-white/20 bg-white/10 text-white hover:bg-white/20'}`}
                        >
                            <FiGlobe size={16} />
                            <span className="hidden md:inline">{currentLangName}</span>
                            <FiChevronDown size={16} className={`transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isLangMenuOpen && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setIsLangMenuOpen(false)}
                                />
                                <div className="absolute right-0 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                                    <div className="py-1">
                                        {diller.map((dil) => (
                                            <button 
                                                key={dil.kod} 
                                                onClick={() => handleLanguageChange(dil.kod)} 
                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                                {dil.ad}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Partner Portal / Logout Button */}
                    {isAdminHeader ? (
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-2 text-sm text-text-main/80">
                                <FiUser size={16} />
                                <span>{userEmail || 'Benutzer'}</span>
                            </div>
                            <button onClick={handleLogout} disabled={isLoggingOut} className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg shadow-sm hover:bg-red-200 transition-colors font-bold text-sm disabled:opacity-50 disabled:cursor-wait" title={adminHeaderContent.logout}>
                                <FiLogOut size={16} />
                                <span className="hidden sm:inline">{adminHeaderContent.logout}</span>
                            </button>
                        </div>
                    ) : (
                        <Link href={`/${currentLocale}/login`} passHref>
                            <button className="flex items-center gap-2 px-4 py-2 bg-accent text-primary rounded-lg shadow-sm hover:bg-opacity-90 transition-all font-bold text-sm">
                                <FiUser size={16} />
                                <span className="hidden sm:inline">{nav.partnerPortal}</span>
                            </button>
                        </Link>
                    )}
                </div>
            </header>

            {/* Mobiles Menü-Overlay (unverändert) */}
            {!isAdminHeader && (
                <div 
                    className={`fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    <div className="fixed inset-0 bg-black/60" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className="relative z-10 w-4/5 max-w-xs h-full bg-primary p-6 space-y-6">
                        <div className="flex justify-between items-center">
                            <span className="text-2xl font-serif font-bold text-white">Menü</span>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="text-white/70 hover:text-white">
                                <FiX size={24} />
                            </button>
                        </div>
                        <nav className="flex flex-col space-y-4">
                            {publicNavLinks.map(link => (
                                <Link key={link.name} href={link.href} className="text-lg font-semibold text-secondary/80 hover:text-white">
                                    {link.name}
                                </Link>
                            ))}
                        </nav>
                        {/* Mobile Suche (Hier den Button hinzufügen, der das Modal öffnet) */}
                        <div className="relative sm:hidden pt-4">
                             <button 
                                onClick={() => {
                                    setIsMobileMenuOpen(false); // Erst mobiles Menü schließen
                                    setIsSearchOpen(true); // Dann Suche öffnen
                                }}
                                className="w-full flex items-center gap-3 rounded-lg border border-white/20 bg-white/10 py-2 px-3 text-sm text-gray-400"
                            >
                                <FiSearch size={20} />
                                <span>{nav.search}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* NEU: Such-Modal rendern */}
            <SearchModal 
                isOpen={isSearchOpen} 
                onClose={() => setIsSearchOpen(false)} 
                dictionary={dictionary}
                locale={currentLocale}
            />
        </>
    );
}