// src/app/portal/layout.tsx
'use client'; // Bu layout, mobil menü durumunu (state) yöneteceği için bir Client Component'tir.

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { PortalSidebar } from '@/components/portal/PortalSidebar';
import { Enums } from '@/lib/supabase/database.types';
import { User } from '@supabase/supabase-js';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [firmaUnvan, setFirmaUnvan] = useState('Partner');
    const [userRole, setUserRole] = useState<Enums<'user_role'> | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    // Sayfa ilk yüklendiğinde kullanıcı ve firma verilerini çek
    useEffect(() => {
        const supabase = createSupabaseBrowserClient();
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                const [firmaRes, profilRes] = await Promise.all([
                    supabase.from('firmalar').select('unvan').eq('portal_kullanicisi_id', user.id).single(),
                    supabase.from('profiller').select('rol').eq('id', user.id).single()
                ]);
                if (firmaRes.data) setFirmaUnvan(firmaRes.data.unvan);
                if (profilRes.data) setUserRole(profilRes.data.rol);
            }
        };
        fetchUserData();
    }, []);

    // Farklı bir sayfaya gidildiğinde mobil menüyü otomatik kapat
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    // Veri yüklenene kadar bekleme ekranı
    if (!user) {
        return <div className="flex h-screen w-full items-center justify-center">Yükleniyor...</div>;
    }

    return (
        <div className="min-h-screen w-full bg-secondary text-text-main antialiased font-sans">
            <PortalSidebar userRole={userRole} isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />
            
            <div className="lg:ml-64">
                <PortalHeader firmaUnvan={firmaUnvan} setSidebarOpen={setSidebarOpen} />
                <main className="p-4 sm:p-6 lg:p-8 pt-24">
                    {children}
                </main>
            </div>
        </div>
    );
}