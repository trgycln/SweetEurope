'use client';

import React, { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { Tables } from '@/lib/supabase/database.types';
import { toast } from 'sonner'; // Für Feedback

// --- Typdefinitionen ---
export type Profile = Tables<'profiller'>;
export type Firma = Tables<'firmalar'> & { firmalar_finansal?: Tables<'firmalar_finansal'>[] | null };
export type Bildirim = Tables<'bildirimler'>;

export type ProduktImWarenkorb = Tables<'urunler'> & {
    partnerPreis: number | null;
    ana_resim_url?: string | null;
    galeri_resim_urls?: any | null;
};
export type SepetUrunu = {
    produkt: ProduktImWarenkorb;
    menge: number;       // koli modunda: koli sayısı, adet modunda: adet sayısı
    birim: 'koli' | 'adet' | 'palet';  // varsayılan: 'koli'
};

// --- Context Typ erweitern ---
interface PortalContextType {
    // Bestehende Daten
    profile: Profile;
    firma: Firma;
    initialNotifications: Bildirim[];
    unreadNotificationCount: number;

    // Warenkorb-Status
    warenkorb: SepetUrunu[];

    // Warenkorb-Funktionen
    addToWarenkorb: (produkt: ProduktImWarenkorb, menge?: number, birim?: 'koli' | 'adet' | 'palet') => boolean;
    removeFromWarenkorb: (produktId: string) => void;
    updateWarenkorbMenge: (produktId: string, neueMenge: number) => void;
    updateWarenkorbBirim: (produktId: string, birim: 'koli' | 'adet' | 'palet') => void;
    clearWarenkorb: () => void;
    getGesamtMengeImWarenkorb: () => number;
    // ++ NEUE FUNKTION ++
    setInitialWarenkorb: (items: SepetUrunu[]) => void;
    // ++ Mobil Cart Drawer ++
    isCartDrawerOpen: boolean;
    setIsCartDrawerOpen: (isOpen: boolean) => void;
}

const PortalContext = createContext<PortalContextType | null>(null);

// --- Provider Implementierung ---
export function PortalProvider({ children, value }: { children: ReactNode; value: Omit<PortalContextType, 'warenkorb' | 'addToWarenkorb' | 'removeFromWarenkorb' | 'updateWarenkorbMenge' | 'updateWarenkorbBirim' | 'clearWarenkorb' | 'getGesamtMengeImWarenkorb' | 'setInitialWarenkorb' | 'isCartDrawerOpen' | 'setIsCartDrawerOpen'> }) {
    const [warenkorb, setWarenkorb] = useState<SepetUrunu[]>([]);
    const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Initialisiere Warenkorb aus localStorage beim Client-Mount
    useEffect(() => {
        setIsMounted(true);
        try {
            const savedCart = localStorage.getItem('elyson_b2b_cart');
            if (savedCart) {
                setWarenkorb(JSON.parse(savedCart));
            }
        } catch (e) {
            console.error('Fehler beim Lesen des Warenkorbs aus localStorage:', e);
        }
    }, []);

    // Speichere Warenkorb in localStorage bei jeder Änderung
    useEffect(() => {
        if (isMounted) {
            localStorage.setItem('elyson_b2b_cart', JSON.stringify(warenkorb));
        }
    }, [warenkorb, isMounted]);

    // --- PWA: App Badge API (Uygulama İkonunda Okunmamış Bildirim Sayısı) ---
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const count = value.unreadNotificationCount ?? 0;

        try {
            if ('setAppBadge' in navigator && typeof (navigator as any).setAppBadge === 'function') {
                if (count > 0) {
                    (navigator as any).setAppBadge(count).catch((err: any) => {
                        console.debug('[AppBadge] setAppBadge çağrısı sessizce yoksayıldı:', err);
                    });
                } else if ('clearAppBadge' in navigator && typeof (navigator as any).clearAppBadge === 'function') {
                    (navigator as any).clearAppBadge().catch((err: any) => {
                        console.debug('[AppBadge] clearAppBadge çağrısı sessizce yoksayıldı:', err);
                    });
                }
            }
        } catch (error) {
            console.debug('[AppBadge] Desteklenmiyor veya hata:', error);
        }
    }, [value.unreadNotificationCount]);

     const addToWarenkorb = useCallback((produkt: ProduktImWarenkorb, menge: number = 1, birim: 'koli' | 'adet' | 'palet' = 'koli'): boolean => {
         let isSuccess = true;
         const isPreOrder = (produkt.stok_miktari ?? 0) <= 0;
         
         // Try to get locale from pathname
         let locale = 'tr';
         if (typeof window !== 'undefined') {
             const path = window.location.pathname;
             if (path.startsWith('/de')) locale = 'de';
             else if (path.startsWith('/en')) locale = 'en';
             else if (path.startsWith('/ar')) locale = 'ar';
         }

         // --- Sepet Karıştırma Engeli (Normal & Ön Sipariş) ---
         if (warenkorb.length > 0) {
             const hasNormalItems = warenkorb.some(item => (item.produkt.stok_miktari ?? 0) > 0);
             const hasPreOrderItems = warenkorb.some(item => (item.produkt.stok_miktari ?? 0) <= 0);

             if (isPreOrder && hasNormalItems) {
                 const msg = locale === 'de' 
                    ? 'Achtung: Ihr Warenkorb enthält bereits Lagerartikel. Vorbestellungen können nicht mit Lagerartikeln gemischt werden. Bitte schließen Sie zuerst Ihre aktuelle Bestellung ab.'
                    : locale === 'en'
                    ? 'Attention: Your cart contains in-stock items. Pre-orders cannot be mixed with in-stock items. Please complete your current order first.'
                    : locale === 'ar'
                    ? 'تنبيه: تحتوي سلتك على منتجات متوفرة. لا يمكن خلط الطلبات المسبقة مع المنتجات المتوفرة. يرجى إكمال طلبك الحالي أولاً.'
                    : 'Dikkat: Sepetinizde şu an "Stoklu" ürünler bulunuyor. Stokta olmayan (Ön Sipariş) ürünleri aynı sepete ekleyemezsiniz. Lütfen önce mevcut sepetinizdeki siparişi tamamlayın.';
                 toast.warning(msg, { duration: 7000 });
                 return false;
             }
             if (!isPreOrder && hasPreOrderItems) {
                 const msg = locale === 'de'
                    ? 'Achtung: Ihr Warenkorb enthält bereits Vorbestellungen. Lagerartikel können nicht mit Vorbestellungen gemischt werden. Bitte schließen Sie zuerst Ihre Vorbestellung ab.'
                    : locale === 'en'
                    ? 'Attention: Your cart contains pre-orders. In-stock items cannot be mixed with pre-orders. Please complete your pre-order first.'
                    : locale === 'ar'
                    ? 'تنبيه: تحتوي سلتك على طلبات مسبقة. لا يمكن خلط المنتجات المتوفرة مع الطلبات المسبقة. يرجى إكمال طلبك المسبق أولاً.'
                    : 'Dikkat: Sepetinizde şu an "Ön Sipariş" (stoksuz) ürünleri bulunuyor. Stokta olan ürünleri aynı sepete ekleyemezsiniz. Lütfen önce ön sipariş sepetinizi tamamlayın.';
                 toast.warning(msg, { duration: 7000 });
                 return false;
             }
         }

         setWarenkorb(prevWarenkorb => {
             const existingItemIndex = prevWarenkorb.findIndex(item => item.produkt.id === produkt.id);
             let angeforderteMenge = Math.max(1, menge); // Menge, die hinzugefügt werden soll

             // Stokprüfung für die angeforderte Menge (nur bei Artikeln auf Lager)
             if (!isPreOrder && angeforderteMenge > (produkt.stok_miktari ?? 0)) {
                 toast.warning(`Stok yetersiz! İstenen miktar stoğu aşıyor (Maks: ${produkt.stok_miktari}). Miktar ${produkt.stok_miktari} olarak ayarlandı.`);
                 angeforderteMenge = produkt.stok_miktari ?? 0;
             }
             if (!isPreOrder && angeforderteMenge <= 0) return prevWarenkorb;

             if (existingItemIndex > -1) {
                 // Produkt ist bereits im Warenkorb, Menge erhöhen
                 const vorhandeneMenge = prevWarenkorb[existingItemIndex].menge;
                 let neueGesamtMenge = vorhandeneMenge + angeforderteMenge;

                 // Erneute Stokprüfung für die Gesamtmenge (nur bei lagernden Artikeln)
                 if (!isPreOrder && neueGesamtMenge > (produkt.stok_miktari ?? 0)) {
                     toast.warning(`Stok yetersiz! Sepetteki ve eklenen miktar stoğu aşıyor (Maks: ${produkt.stok_miktari}). Sepetteki miktar ${produkt.stok_miktari} olarak ayarlandı.`);
                     neueGesamtMenge = produkt.stok_miktari ?? 0;
                 }

                 // Warenkorb aktualisieren
                 const updatedWarenkorb = [...prevWarenkorb];
                 updatedWarenkorb[existingItemIndex] = { ...updatedWarenkorb[existingItemIndex], menge: neueGesamtMenge, birim };
                 return updatedWarenkorb;
             } else {
                 // Produkt ist neu, hinzufügen
                 return [...prevWarenkorb, { produkt, menge: angeforderteMenge, birim }];
             }
         });
         return isSuccess;
     }, [warenkorb]);

    // Funktion zum Entfernen aus dem Warenkorb
    const removeFromWarenkorb = useCallback((produktId: string) => {
        setWarenkorb(prevWarenkorb => prevWarenkorb.filter(item => item.produkt.id !== produktId));
        toast.info("Artikel aus dem Warenkorb entfernt."); // Feedback angepasst
    }, []);

    // Funktion zum Aktualisieren der Menge im Warenkorb
    const updateWarenkorbMenge = useCallback((produktId: string, neueMenge: number) => {
        setWarenkorb(prevWarenkorb => {
            const itemIndex = prevWarenkorb.findIndex(item => item.produkt.id === produktId);
            if (itemIndex === -1) return prevWarenkorb;

            const produkt = prevWarenkorb[itemIndex].produkt;
            let finaleMenge = Math.max(0, neueMenge); // Menge darf nicht negativ sein

            if (finaleMenge > produkt.stok_miktari) {
                toast.warning(`Nicht genügend Lagerbestand! Max. ${produkt.stok_miktari} verfügbar.`); // Übersetzt
                finaleMenge = produkt.stok_miktari;
            }

            if (finaleMenge === 0) {
                // Wenn Menge 0 ist, Produkt entfernen
                 toast.info("Artikel aus dem Warenkorb entfernt."); // Feedback hinzugefügt
                return prevWarenkorb.filter(item => item.produkt.id !== produktId);
            } else {
                // Menge aktualisieren
                const updatedWarenkorb = [...prevWarenkorb];
                updatedWarenkorb[itemIndex] = { ...updatedWarenkorb[itemIndex], menge: finaleMenge };
                return updatedWarenkorb;
            }
        });
    }, []);

    const updateWarenkorbBirim = useCallback((produktId: string, birim: 'koli' | 'adet' | 'palet') => {
        setWarenkorb(prevWarenkorb =>
            prevWarenkorb.map(item =>
                item.produkt.id === produktId
                    ? { ...item, birim, menge: 1 }
                    : item
            )
        );
    }, []);

    // Funktion zum Leeren des Warenkorbs
    const clearWarenkorb = useCallback(() => {
        setWarenkorb([]);
    }, []);

    // Hilfsfunktion für Gesamtanzahl der Artikel
     const getGesamtMengeImWarenkorb = useCallback(() => {
         if (!isMounted) return 0; // Vermeide Hydration-Mismatch (Client/Server)
         return warenkorb.length;
     }, [warenkorb, isMounted]);

     // ++ NEUE FUNKTION: Setzt den Warenkorb direkt ++
     const setInitialWarenkorb = useCallback((items: SepetUrunu[]) => {
         // Hier könnten zusätzliche Prüfungen erfolgen, falls nötig
         setWarenkorb(items);
         // Toast wird jetzt im useEffect der aufrufenden Komponente ausgelöst
     }, []);

    const contextValue: PortalContextType = {
        ...value,
        warenkorb,
        addToWarenkorb,
        removeFromWarenkorb,
        updateWarenkorbMenge,
        updateWarenkorbBirim,
        clearWarenkorb,
        getGesamtMengeImWarenkorb,
        setInitialWarenkorb, // Neue Funktion hinzufügen
        isCartDrawerOpen,
        setIsCartDrawerOpen,
    };

    return (
        <PortalContext.Provider value={contextValue}>
            {children}
        </PortalContext.Provider>
    );
}

// --- Hook ---
export function usePortal() {
    const context = useContext(PortalContext);
    if (!context) {
        throw new Error('usePortal must be used within a PortalProvider');
    }
    return context;
}

export function useOptionalPortal() {
    return useContext(PortalContext);
}
