'use client';

import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react';
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
    menge: number;
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
    addToWarenkorb: (produkt: ProduktImWarenkorb, menge?: number) => void;
    removeFromWarenkorb: (produktId: string) => void;
    updateWarenkorbMenge: (produktId: string, neueMenge: number) => void;
    clearWarenkorb: () => void;
    getGesamtMengeImWarenkorb: () => number;
    // ++ NEUE FUNKTION ++
    setInitialWarenkorb: (items: SepetUrunu[]) => void;
}

const PortalContext = createContext<PortalContextType | null>(null);

// --- Provider Implementierung ---
export function PortalProvider({ children, value }: { children: ReactNode; value: Omit<PortalContextType, 'warenkorb' | 'addToWarenkorb' | 'removeFromWarenkorb' | 'updateWarenkorbMenge' | 'clearWarenkorb' | 'getGesamtMengeImWarenkorb' | 'setInitialWarenkorb'> }) {
    const [warenkorb, setWarenkorb] = useState<SepetUrunu[]>([]);

    // addToWarenkorb (Logik für bestehende Artikel bleibt additiv)
     const addToWarenkorb = useCallback((produkt: ProduktImWarenkorb, menge: number = 1) => {
         setWarenkorb(prevWarenkorb => {
             const existingItemIndex = prevWarenkorb.findIndex(item => item.produkt.id === produkt.id);
             let angeforderteMenge = menge; // Menge, die hinzugefügt werden soll

             // Stokprüfung für die angeforderte Menge
              if (angeforderteMenge > produkt.stok_miktari) {
                  toast.warning(`Stok yetersiz! İstenen miktar stoğu aşıyor (Maks: ${produkt.stok_miktari}). Miktar ${produkt.stok_miktari} olarak ayarlandı.`);
                  angeforderteMenge = produkt.stok_miktari;
              }
              if (angeforderteMenge <= 0) return prevWarenkorb; // Nichts hinzufügen bei 0 oder weniger

             if (existingItemIndex > -1) {
                 // Produkt ist bereits im Warenkorb, Menge erhöhen
                 const vorhandeneMenge = prevWarenkorb[existingItemIndex].menge;
                 let neueGesamtMenge = vorhandeneMenge + angeforderteMenge; // Addiere die angeforderte Menge

                 // Erneute Stokprüfung für die Gesamtmenge
                 if (neueGesamtMenge > produkt.stok_miktari) {
                     toast.warning(`Stok yetersiz! Sepetteki ve eklenen miktar stoğu aşıyor (Maks: ${produkt.stok_miktari}). Sepetteki miktar ${produkt.stok_miktari} olarak ayarlandı.`);
                     neueGesamtMenge = produkt.stok_miktari; // Gesamtmenge auf Maximum begrenzen
                 }

                 // Warenkorb aktualisieren
                 const updatedWarenkorb = [...prevWarenkorb];
                 updatedWarenkorb[existingItemIndex] = { ...updatedWarenkorb[existingItemIndex], menge: neueGesamtMenge };
                 return updatedWarenkorb;
             } else {
                 // Produkt ist neu, hinzufügen (angeforderteMenge wurde bereits geprüft)
                 return [...prevWarenkorb, { produkt, menge: angeforderteMenge }];
             }
         });
     }, []);

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

    // Funktion zum Leeren des Warenkorbs
    const clearWarenkorb = useCallback(() => {
        setWarenkorb([]);
    }, []);

    // Hilfsfunktion für Gesamtanzahl der Artikel
     const getGesamtMengeImWarenkorb = useCallback(() => {
         return warenkorb.reduce((total, item) => total + item.menge, 0);
     }, [warenkorb]);

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
        clearWarenkorb,
        getGesamtMengeImWarenkorb,
        setInitialWarenkorb, // Neue Funktion hinzufügen
    };

    return (
        <PortalContext.Provider value={contextValue}>
            {children}
        </PortalContext.Provider>
    );
}

// --- Hook (unverändert) ---
export function usePortal() {
    const context = useContext(PortalContext);
    if (!context) {
        throw new Error('usePortal must be used within a PortalProvider');
    }
    return context;
}
