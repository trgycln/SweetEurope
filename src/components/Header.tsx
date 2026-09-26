'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    FiGlobe, FiChevronDown, FiUser, FiSearch,
    FiMenu, FiLogOut, FiX
} from 'react-icons/fi';
import { Dictionary } from '@/dictionaries';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { SearchModal } from '@/components/SearchModal';
import { Locale } from '@/lib/utils';
import { mainNavigation } from '@/lib/i18n/navigation';
import { motion, AnimatePresence } from 'framer-motion';

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
    const currentLocale = params.locale as Locale;

    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsSearchOpen(false);
    }, [pathname]);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Mobile menu overflow control
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isMobileMenuOpen]);

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

    const headerClasses = isAdminHeader 
        ? 'sticky top-0 z-40 flex h-20 w-full items-center justify-between border-b px-4 sm:px-6 bg-white border-bg-subtle text-text-main shadow-sm'
        : `fixed top-0 w-full z-50 transition-all duration-300 flex h-20 items-center justify-between px-4 sm:px-6 ${isScrolled ? 'bg-primary/95 backdrop-blur-md shadow-lg border-b border-white/10' : 'bg-primary border-b border-white/10'} text-white`;

    return (
        <>
            <header className={headerClasses}>
                <div className="flex items-center gap-4">
                    {isAdminHeader && setIsSidebarOpen && (
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-text-main/80 hover:text-accent focus:outline-none" aria-label="Admin-Menü öffnen">
                            <FiMenu size={24} />
                        </button>
                    )}
                    
                    <Link href={`/${currentLocale}${isAdminHeader ? '/admin/dashboard' : ''}`} className="flex items-center gap-2" aria-label="Startseite">
                        {!isAdminHeader && (
                            <div className="hidden sm:flex rounded-full shadow-lg border-4 border-white bg-white mx-auto overflow-hidden items-center justify-center" style={{width: '48px', height: '48px', maxWidth: '60px', marginRight: '0.5rem'}}>
                                <Image src="/Logo.jpg" alt="ElysonSweets Logo" width={48} height={48} priority style={{objectFit: 'cover', objectPosition: 'center', transform: 'scale(1.18)', width: '100%', height: '100%'}} />
                            </div>
                        )}
                        <span className={`text-xl sm:text-2xl font-serif font-bold ${isAdminHeader ? 'text-primary' : 'text-white'}`}>
                            ElysonSweets {isAdminHeader && <span className="text-sm font-sans font-normal text-gray-500 ml-1">Admin</span>}
                        </span>
                    </Link>
                </div>

                {!isAdminHeader && (
                    <nav className="hidden lg:flex items-center gap-6 absolute left-1/2 transform -translate-x-1/2">
                        {mainNavigation.map(link => {
                            const isActive = pathWithoutLocale.startsWith(link.href) && link.href !== '/' || (pathWithoutLocale === '/' && link.href === '/');
                            return (
                                <Link 
                                    key={link.key} 
                                    href={`/${currentLocale}${link.href}`} 
                                    className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${isActive ? 'text-accent' : 'text-secondary hover:text-accent'}`}
                                    aria-label={link.label[currentLocale as Locale] || link.label.de}
                                >
                                    {link.label[currentLocale as Locale] || link.label.de}
                                    {link.isNew && (
                                        <span className="bg-accent text-primary text-[10px] px-1.5 py-0.5 rounded-sm font-bold tracking-wider">
                                            {currentLocale === 'tr' ? 'YENİ' : 'NEU'}
                                        </span>
                                    )}
                                </Link>
                            )
                        })}
                    </nav>
                )}

                <div className="flex items-center gap-3 sm:gap-4">
                    {!isAdminHeader && (
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="hidden sm:block p-2 rounded-md transition-colors text-white/80 hover:text-white"
                            aria-label={nav.search}
                        >
                            <FiSearch size={20} />
                        </button>
                    )}

                    <div className="relative">
                        <button 
                            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} 
                            className={`flex items-center gap-1 sm:gap-2 rounded-md border px-2 sm:px-3 py-2 text-sm font-semibold transition-colors ${isAdminHeader ? 'border-bg-subtle bg-secondary text-text-main hover:bg-bg-subtle' : 'border-white/20 bg-white/10 text-white hover:bg-white/20'}`}
                            aria-label="Sprache ändern"
                        >
                            <FiGlobe size={16} />
                            <span className="hidden md:inline">{currentLangName}</span>
                            <FiChevronDown size={16} className={`transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {isLangMenuOpen && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setIsLangMenuOpen(false)}
                                    />
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute right-0 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50"
                                    >
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
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

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
                            <button className="hidden sm:flex items-center gap-1 sm:gap-2 bg-accent text-primary font-bold px-5 py-2 rounded-md hover:bg-opacity-90 transition-colors text-sm" title={nav.partnerPortal}>
                                <FiUser size={18} />
                                <span>Kundenportal</span>
                            </button>
                        </Link>
                    )}

                    {!isAdminHeader && (
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)} 
                            className="lg:hidden text-white/80 hover:text-white focus:outline-none p-2 ml-1" 
                            aria-label="Menü öffnen"
                        >
                            <FiMenu size={24} />
                        </button>
                    )}
                </div>
            </header>

            {!isAdminHeader && (
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <>
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="fixed inset-0 bg-black/60 z-50 lg:hidden" 
                                onClick={() => setIsMobileMenuOpen(false)} 
                            />
                            <motion.div 
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'tween', duration: 0.3 }}
                                className="fixed right-0 top-0 bottom-0 z-50 w-4/5 max-w-xs h-full bg-primary p-6 space-y-8 lg:hidden shadow-2xl flex flex-col"
                            >
                                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                                    <span className="text-2xl font-serif font-bold text-white">Menü</span>
                                    <button onClick={() => setIsMobileMenuOpen(false)} className="text-white/70 hover:text-white p-2" aria-label="Menü schließen">
                                        <FiX size={24} />
                                    </button>
                                </div>
                                <nav className="flex flex-col space-y-6 flex-grow overflow-y-auto">
                                    {mainNavigation.map(link => {
                                        const isActive = pathWithoutLocale.startsWith(link.href) && link.href !== '/' || (pathWithoutLocale === '/' && link.href === '/');
                                        return (
                                            <Link 
                                                key={link.key} 
                                                href={`/${currentLocale}${link.href}`} 
                                                className={`flex items-center gap-3 text-lg font-semibold transition-colors ${isActive ? 'text-accent' : 'text-secondary/80 hover:text-white'}`}
                                                aria-label={link.label[currentLocale as Locale] || link.label.de}
                                            >
                                                {link.label[currentLocale as Locale] || link.label.de}
                                                {link.isNew && (
                                                    <span className="bg-accent text-primary text-[10px] px-1.5 py-0.5 rounded-sm font-bold tracking-wider">
                                                        {currentLocale === 'tr' ? 'YENİ' : 'NEU'}
                                                    </span>
                                                )}
                                            </Link>
                                        )
                                    })}
                                    
                                    <div className="pt-4 border-t border-white/10">
                                        <button 
                                            onClick={() => {
                                                setIsMobileMenuOpen(false);
                                                setIsSearchOpen(true);
                                            }}
                                            className="w-full flex items-center gap-3 rounded-lg border border-white/20 bg-white/10 py-3 px-4 text-sm text-gray-300 hover:bg-white/20 transition-colors"
                                            aria-label={nav.search}
                                        >
                                            <FiSearch size={20} />
                                            <span className="font-semibold">{nav.search}</span>
                                        </button>
                                    </div>
                                </nav>
                                
                                <div className="mt-auto pt-6 border-t border-white/10">
                                    <Link href={`/${currentLocale}/login`} passHref className="block w-full">
                                        <button className="w-full flex justify-center items-center gap-2 bg-accent text-primary font-bold px-5 py-3 rounded-md hover:bg-opacity-90 transition-colors" aria-label="Kundenportal">
                                            <FiUser size={18} />
                                            <span>Kundenportal</span>
                                        </button>
                                    </Link>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            )}
            
            <SearchModal 
                isOpen={isSearchOpen} 
                onClose={() => setIsSearchOpen(false)} 
                dictionary={dictionary}
                locale={currentLocale}
            />
        </>
    );
}