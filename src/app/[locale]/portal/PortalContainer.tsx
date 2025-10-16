// src/components/portal/PortalContainer.tsx
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { usePortal } from '@/contexts/PortalContext';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { PortalSidebar } from '@/components/portal/PortalSidebar';

export function PortalContainer({ children }: { children: React.ReactNode }) {
    const { firma, profile } = usePortal(); // Context'ten verileri alıyoruz
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    // Sayfa değiştiğinde mobil menüyü kapat
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    return (
        <div className="min-h-screen w-full bg-secondary text-text-main antialiased font-sans">
            <PortalSidebar
                userRole={profile.rol}
                isOpen={isSidebarOpen}
                setIsOpen={setSidebarOpen}
            />
            
            <div className="lg:ml-64">
                <PortalHeader
                    firmaUnvan={firma.unvan}
                    setSidebarOpen={setSidebarOpen}
                />
                <main className="p-4 sm:p-6 lg:p-8 pt-24">
                    {children}
                </main>
            </div>
        </div>
    );
}