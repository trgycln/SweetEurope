'use client';

import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
    FiGlobe, FiChevronDown, FiUser, FiSearch,
    FiMenu, FiLogOut // <-- NEU: Logout-Icon importieren
} from 'react-icons/fi';
import { Dictionary } from '@/dictionaries';
// NEU: Supabase Client importieren für Logout
import { createDynamicSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner'; // Für Fehlermeldungen

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
    const currentLocale = params.locale as string;

    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    // NEU: Ladezustand für Logout
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const pathWithoutLocale = getPathWithoutLocale(pathname);
    const currentLangName = diller.find(d => d.kod === currentLocale)?.ad || 'Dil';

    const nav = dictionary.navigation;
    const adminHeaderContent = dictionary.adminHeader || { logout: "Abmelden" }; // Fallback hinzufügen

    const handleLanguageChange = (newLocale: string) => {
        setIsLangMenuOpen(false);
        const newPath = `/${newLocale}${pathWithoutLocale}`;
        router.push(newPath);
        router.refresh();
    };

    // NEU: Logout Funktion
    const handleLogout = async () => {
        setIsLoggingOut(true);
        const supabase = createDynamicSupabaseClient(true); // Client erstellen (persistSession ist hier egal)
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Logout Fehler:", error);
            toast.error("Abmelden fehlgeschlagen: " + error.message);
            setIsLoggingOut(false);
        } else {
            // Erfolgreich abgemeldet, zur Login-Seite weiterleiten
            router.push(`/${currentLocale}/login`);
            // Optional: Hard-Refresh erzwingen, um sicherzustellen, dass alle Daten weg sind
            // window.location.href = `/${currentLocale}/login`;
        }
    };

    return (
        <header className={`sticky top-0 z-40 flex h-20 w-full items-center justify-between border-b px-4 sm:px-6 ${isAdminHeader ? 'bg-white border-bg-subtle text-text-main shadow-sm' : 'border-white/10 bg-primary text-white'}`}>

            <div className="flex items-center gap-4">
                 {isAdminHeader && setIsSidebarOpen && (
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="lg:hidden text-text-main/80 hover:text-accent focus:outline-none"
                        aria-label="Open sidebar"
                    >
                        <FiMenu size={24} />
                    </button>
                 )}

                <Link href={`/${currentLocale}${isAdminHeader ? '/admin/dashboard' : ''}`} className={`text-2xl font-serif font-bold ${isAdminHeader ? 'text-primary' : 'text-white'}`}>
                    ElysonSweets {isAdminHeader && <span className="text-sm font-sans font-normal text-gray-500 ml-1">Admin</span>}
                </Link>

                {!isAdminHeader && (
                    <nav className="hidden lg:flex items-center gap-6 ml-8">
                        {/* Öffentliche Navigation unverändert */}
                        <Link href={`/${currentLocale}`} className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">{nav.home}</Link>
                        <Link href={`/${currentLocale}/products`} className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">{nav.products}</Link>
                        <Link href={`/${currentLocale}/about`} className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">{nav.about}</Link>
                        <Link href={`/${currentLocale}/contact`} className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">{nav.contact}</Link>
                    </nav>
                )}
            </div>

            <div className="flex items-center gap-4">
                 {!isAdminHeader && (
                    <div className="relative hidden sm:block">
                        {/* Suche unverändert */}
                        <FiSearch size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder={nav.search} className={`w-full max-w-xs rounded-lg border py-2 pl-10 pr-4 text-sm placeholder-gray-400 focus:border-accent focus:ring-2 focus:ring-accent/50 ${isAdminHeader ? 'bg-secondary border-bg-subtle text-text-main' : 'border-white/20 bg-white/10 text-white'}`}/>
                    </div>
                 )}

                {/* Sprachwechsler unverändert */}
                <div className="relative">
                    <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} onBlur={() => setTimeout(() => setIsLangMenuOpen(false), 200)} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${isAdminHeader ? 'border-bg-subtle bg-secondary text-text-main hover:bg-bg-subtle' : 'border-white/20 bg-white/10 text-white hover:bg-white/20'}`}>
                        <FiGlobe size={16} />
                        <span className="hidden md:inline">{currentLangName}</span>
                        <FiChevronDown size={16} className={`transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isLangMenuOpen && ( <div className="absolute right-0 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50"><div className="py-1">{diller.map((dil) => (<button key={dil.kod} onClick={() => handleLanguageChange(dil.kod)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{dil.ad}</button>))}</div></div> )}
                </div>

                {/* --- Partner Portal / Logout Button --- */}
                {isAdminHeader ? (
                    <div className="flex items-center gap-4">
                         <div className="hidden sm:flex items-center gap-2 text-sm text-text-main/80">
                            <FiUser size={16} />
                            <span>{userEmail || 'Benutzer'}</span>
                         </div>
                         {/* NEUER LOGOUT BUTTON */}
                         <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg shadow-sm hover:bg-red-200 transition-colors font-bold text-sm disabled:opacity-50 disabled:cursor-wait"
                            title={adminHeaderContent.logout}
                         >
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
                {/* ------------------------------------- */}
            </div>
        </header>
    );
}