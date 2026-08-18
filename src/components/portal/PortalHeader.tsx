// src/components/portal/PortalHeader.tsx (Vollständig & Korrigiert)
'use client';

import { useState } from 'react';
import { BiLogOut } from "react-icons/bi";
import { FiMenu, FiShoppingCart, FiLoader } from "react-icons/fi"; // FiShoppingCart & FiLoader hinzugefügt
import { Bildirimler } from '../Bildirimler';
import { Dictionary } from '@/dictionaries';
import { usePortal } from '@/contexts/PortalContext'; // usePortal importieren
import { usePathname, useParams, useRouter } from 'next/navigation'; // Hooks importieren
import Link from 'next/link';
import { toast } from 'sonner';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';

interface PortalHeaderProps {
    firmaUnvan: string;
    setSidebarOpen: (isOpen: boolean) => void;
    dictionary: Dictionary;
}

export function PortalHeader({ firmaUnvan, setSidebarOpen, dictionary }: PortalHeaderProps) {
    // Sicherer Zugriff auf Dictionary mit Fallback
    const content = (dictionary as any)?.portal?.header || {
        titleSuffix: "Portal",
        logout: "Abmelden",
        cartTitle: "Warenkorb"
    };
    
    const params = useParams();
    const router = useRouter();
    const locale = params.locale as string;

    // Warenkorb-Daten aus dem Context holen
    const { getGesamtMengeImWarenkorb } = usePortal();
    const gesamtMenge = getGesamtMengeImWarenkorb();

    // Logout-Logik
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const handleLogout = async () => {
        setIsLoggingOut(true);
        const supabase = createDynamicSupabaseClient(true);
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error("Abmelden fehlgeschlagen: " + error.message);
            setIsLoggingOut(false);
        } else {
            router.push(`/${locale}/login`);
        }
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-6 shadow-xs">
            {/* Hamburger Button & Firmentitel */}
            <div className="flex items-center gap-3 sm:gap-4">
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-primary hover:bg-slate-100 transition-colors"
                    aria-label="Menü öffnen"
                >
                    <FiMenu size={22} />
                </button>
                <div className="flex items-center gap-2">
                    <h1 className="font-serif text-lg sm:text-xl font-bold text-primary tracking-tight">
                        {firmaUnvan} <span className="text-slate-400 font-sans text-sm font-normal hidden sm:inline">| {content.titleSuffix}</span>
                    </h1>
                </div>
            </div>
            
            {/* Rechte Seite: Icons */}
            <div className="flex items-center gap-2 sm:gap-3">
                <Bildirimler />
                
                {/* Warenkorb-Shortcut */}
                <Link
                    href={`/${locale}/portal/siparisler/yeni`}
                    className="relative p-2 rounded-lg text-slate-600 hover:text-primary hover:bg-slate-100 transition-colors"
                    title={content.cartTitle}
                >
                    <FiShoppingCart size={21} />
                    {gesamtMenge > 0 && (
                        <span className="absolute 1 top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-accent text-white text-[10px] font-bold shadow-xs animate-pulse">
                            {gesamtMenge}
                        </span>
                    )}
                </Link>

                <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1" />
                
                {/* Logout-Button */}
                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 text-sm font-medium"
                    title={content.logout}
                >
                    {isLoggingOut ? <FiLoader className="animate-spin" size={17} /> : <BiLogOut size={18} />}
                    <span className="hidden sm:inline">{content.logout}</span>
                </button>
            </div>
        </header>
    );
}