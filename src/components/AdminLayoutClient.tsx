'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link'; // ++ HIER: Fehlenden Link-Import hinzufügen ++
import { User } from '@supabase/supabase-js';
// import { Header } from '@/components/Header'; // Nicht mehr benötigt
import { Sidebar } from '@/components/Sidebar';
import { Enums, Tables } from '@/lib/supabase/database.types';
import { Dictionary } from '@/dictionaries';
import { Toaster } from 'sonner';
import { NotificationBell } from '@/components/NotificationBell';
import { Locale } from '@/i18n-config';
import { FiMenu, FiUser, FiLogOut } from 'react-icons/fi'; // Icons sind bereits importiert

// Typ für Benachrichtigungen
type Bildirim = Tables<'bildirimler'>;

type AdminLayoutClientProps = {
    user: User;
    userRole: Enums<'user_role'> | null;
    children: React.ReactNode;
    dictionary: Dictionary;
    initialNotifications: Bildirim[];
    initialUnreadCount: number;
    locale: Locale;
};

export function AdminLayoutClient({
    user,
    userRole,
    children,
    dictionary,
    initialNotifications,
    initialUnreadCount,
    locale
}: AdminLayoutClientProps) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    const userEmail = user.email ?? 'Keine E-Mail';

    const handleLogout = async () => {
        const supabase = (await import('@/lib/supabase/client')).createDynamicSupabaseClient();
        await supabase.auth.signOut();
        router.push(`/${locale}/login`);
    };

    return (
        <div className="h-screen w-full bg-secondary text-text-main antialiased font-sans">

            <Toaster position="top-right" richColors closeButton />

            <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} userRole={userRole} dictionary={dictionary} />

            <div className="flex h-full flex-col lg:ml-64">
                <header className="sticky top-0 z-40 flex h-20 w-full items-center justify-between border-b px-4 sm:px-6 bg-white border-bg-subtle text-text-main shadow-sm">
                    {/* Linke Seite (Hamburger, Logo) */}
                    <div className="flex items-center gap-4">
                         <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-text-main/80 hover:text-accent focus:outline-none" aria-label="Admin-Menü öffnen">
                             <FiMenu size={24} />
                         </button>
                         {/* Link wird jetzt korrekt gefunden */}
                         <Link href={`/${locale}/admin/dashboard`} className="text-2xl font-serif font-bold text-primary">
                             ElysonSweets <span className="text-sm font-sans font-normal text-gray-500 ml-1">Admin</span>
                         </Link>
                    </div>

                    {/* Rechte Seite (Benachrichtigungen, User, Logout) */}
                    <div className="flex items-center gap-4">
                        <NotificationBell
                            initialNotifications={initialNotifications}
                            initialUnreadCount={initialUnreadCount}
                            dictionary={dictionary}
                            locale={locale}
                        />
                        <div className="hidden sm:flex items-center gap-2 text-sm text-text-main/80">
                            <FiUser size={16} />
                            <span>{userEmail}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg shadow-sm hover:bg-red-200 transition-colors font-bold text-sm disabled:opacity-50"
                            title={dictionary.adminHeader?.logout || "Abmelden"}
                        >
                            <FiLogOut size={16} />
                            <span className="hidden sm:inline">{dictionary.adminHeader?.logout || "Abmelden"}</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50/50">
                    {children}
                </main>
            </div>
        </div>
    );
}