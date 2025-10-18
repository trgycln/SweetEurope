// src/components/portal/PortalContainer.tsx (GÜNCELLENMİŞ)
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { usePortal } from '@/contexts/PortalContext';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { PortalSidebar } from '@/components/portal/PortalSidebar';
import { Dictionary } from '@/dictionaries'; // DİKKAT: Bu import'u ekliyoruz

// DİKKAT: Prop'lara 'dictionary' eklendi
export function PortalContainer({ children, dictionary }: { children: React.ReactNode; dictionary: Dictionary }) {
    const { firma, profile } = usePortal();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    return (
        <div className="min-h-screen w-full bg-secondary text-text-main antialiased font-sans">
            {/* DİKKAT: 'dictionary'yi Sidebar'a da gönderiyoruz */}
            <PortalSidebar
                userRole={profile.rol}
                isOpen={isSidebarOpen}
                setIsOpen={setSidebarOpen}
                dictionary={dictionary}
            />
            
            <div className="lg:ml-64">
                {/* DİKKAT: 'dictionary'yi Header'a da gönderiyoruz */}
                <PortalHeader
                    firmaUnvan={firma.unvan}
                    setSidebarOpen={setSidebarOpen}
                    dictionary={dictionary}
                />
                <main className="p-4 sm:p-6 lg:p-8 pt-24">
                    {children}
                </main>
            </div>
        </div>
    );
}