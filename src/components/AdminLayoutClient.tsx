'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { Header } from '@/components/Header'; // Header importieren
import { Sidebar } from '@/components/Sidebar';
import { Enums } from '@/lib/supabase/database.types';
import { Dictionary } from '@/dictionaries';
import { Toaster } from 'sonner';

type AdminLayoutClientProps = {
    user: User;
    userRole: Enums<'user_role'> | null;
    children: React.ReactNode;
    dictionary: Dictionary;
};

export function AdminLayoutClient({ user, userRole, children, dictionary }: AdminLayoutClientProps) {
    // useState für die Sidebar bleibt hier
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    // Schließt die Sidebar bei Navigation (bleibt gleich)
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    const userEmail = user.email ?? 'E-posta Yok';

    return (
        <div className="h-screen w-full bg-secondary text-text-main antialiased font-sans">
            
            <Toaster position="top-right" richColors closeButton />

            {/* Sidebar bleibt unverändert */}
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} userRole={userRole} dictionary={dictionary} />

            <div className="flex h-full flex-col lg:ml-64"> {/* Margin links nur auf lg+ */}
                {/* Header wird jetzt mit den neuen Props gerendert */}
                <Header
                    isAdminHeader={true} // Sagt dem Header, dass er im Admin-Modus ist
                    setIsSidebarOpen={setSidebarOpen} // Funktion zum Öffnen übergeben
                    userEmail={userEmail} // Benutzer-E-Mail übergeben
                    dictionary={dictionary} // Dictionary übergeben
                />
                <main className="flex-1 overflow-y-auto p-8 pt-24"> {/* Padding oben für den Header */}
                  {children}
                </main>
            </div>
        </div>
    );
}