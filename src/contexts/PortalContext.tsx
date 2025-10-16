// src/contexts/PortalContext.tsx (GÜNCELLENMİŞ HALİ)

'use client';

import { createContext, useContext, ReactNode } from 'react';
import { Tables } from '@/lib/supabase/database.types';

// Tipleri kısayol olarak tanımlayalım
export type Profile = Tables<'profiller'>;
export type Firma = Tables<'firmalar'>;
// YENİ EKLEME: Bildirim tipini de ekliyoruz
export type Bildirim = Tables<'bildirimler'>;

// Context'in içinde tutacağı verinin tipini güncelliyoruz
interface PortalContextType {
    profile: Profile;
    firma: Firma;
    // YENİ EKLEME: Bildirim verilerini context tipine ekliyoruz
    initialNotifications: Bildirim[];
    unreadNotificationCount: number;
}

const PortalContext = createContext<PortalContextType | null>(null);

export function PortalProvider({ children, value }: { children: ReactNode; value: PortalContextType }) {
    return (
        <PortalContext.Provider value={value}>
            {children}
        </PortalContext.Provider>
    );
}

export function usePortal() {
    const context = useContext(PortalContext);
    if (!context) {
        throw new Error('usePortal must be used within a PortalProvider');
    }
    return context;
}