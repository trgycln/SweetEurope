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
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-bg-subtle bg-secondary px-6">
            {/* Hamburger Button & Firmentitel */}
            <div className="flex items-center gap-4">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-text-main/70 hover:text-primary">
                    <FiMenu size={24} />
                </button>
                <h1 className="hidden lg:block font-serif text-xl font-bold text-primary">{firmaUnvan} {content.titleSuffix}</h1>
            </div>
            
            {/* Rechte Seite: Icons */}
            <div className="flex items-center gap-4">
                <Bildirimler />
                
                {/* Warenkorb-Shortcut */}
                <Link
                    href={`/${locale}/portal/siparisler/yeni`}
                    className="relative p-2 text-text-main/80 hover:text-primary transition-colors"
                    title={content.cartTitle}
                >
                    <FiShoppingCart size={22} />
                    {gesamtMenge > 0 && (
                        <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white text-xs font-bold animate-pulse">
                            {gesamtMenge}
                        </span>
                    )}
                </Link>

                <div className="h-8 w-px bg-bg-subtle hidden sm:block" />
                
                {/* Logout-Button (ersetzt das <form>) */}
                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex items-center gap-2 text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                    {isLoggingOut ? <FiLoader className="animate-spin" /> : <BiLogOut size={20} />}
                    <span className="text-sm font-medium">{content.logout}</span>
                </button>
            </div>
        </header>
    );
}