// src/contexts/PortalContext.tsx (Mit Warenkorb-Funktion)
'use client';

import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { Tables } from '@/lib/supabase/database.types';
import { toast } from 'sonner'; // Für Feedback

// --- Typdefinitionen ---
export type Profile = Tables<'profiller'>;
export type Firma = Tables<'firmalar'> & { firmalar_finansal?: Tables<'firmalar_finansal'>[] | null }; // Finanzdaten optional hinzufügen
export type Bildirim = Tables<'bildirimler'>;

// NEU: Typ für ein Produkt im Warenkorb
// Wir speichern das ganze Produktobjekt für einfachen Zugriff auf Details
export type ProduktImWarenkorb = Tables<'urunler'> & { partnerPreis: number | null };
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

    // NEU: Warenkorb-Status
    warenkorb: SepetUrunu[];

    // NEU: Warenkorb-Funktionen
    addToWarenkorb: (produkt: ProduktImWarenkorb, menge?: number) => void;
    removeFromWarenkorb: (produktId: string) => void;
    updateWarenkorbMenge: (produktId: string, neueMenge: number) => void;
    clearWarenkorb: () => void;
    getGesamtMengeImWarenkorb: () => number; // Hilfsfunktion für Header-Badge
}

const PortalContext = createContext<PortalContextType | null>(null);

// --- Provider Implementierung ---
export function PortalProvider({ children, value }: { children: ReactNode; value: Omit<PortalContextType, 'warenkorb' | 'addToWarenkorb' | 'removeFromWarenkorb' | 'updateWarenkorbMenge' | 'clearWarenkorb' | 'getGesamtMengeImWarenkorb'> }) {
    // NEU: useState für den Warenkorb
    const [warenkorb, setWarenkorb] = useState<SepetUrunu[]>([]);

    // NEU: Funktion zum Hinzufügen zum Warenkorb
    const addToWarenkorb = useCallback((produkt: ProduktImWarenkorb, menge: number = 1) => {
        setWarenkorb(prevWarenkorb => {
            const existingItemIndex = prevWarenkorb.findIndex(item => item.produkt.id === produkt.id);
            let neueMenge = menge;

            if (existingItemIndex > -1) {
                // Produkt ist bereits im Warenkorb, Menge erhöhen
                const vorhandeneMenge = prevWarenkorb[existingItemIndex].menge;
                neueMenge = vorhandeneMenge + menge;

                // Stokprüfung
                if (neueMenge > produkt.stok_miktari) {
                    toast.warning(`Stok yetersiz! Sepetteki ve eklenen miktar stoğu aşıyor (Maks: ${produkt.stok_miktari}).`);
                    neueMenge = produkt.stok_miktari; // Menge auf Maximum begrenzen
                }
                 if (neueMenge <= 0) { // Falls negativ durch +/- Button
                     return prevWarenkorb.filter(item => item.produkt.id !== produkt.id); // Entfernen
                 }

                // Warenkorb aktualisieren
                const updatedWarenkorb = [...prevWarenkorb];
                updatedWarenkorb[existingItemIndex] = { ...updatedWarenkorb[existingItemIndex], menge: neueMenge };
                return updatedWarenkorb;
            } else {
                // Produkt ist neu, hinzufügen
                // Stokprüfung
                if (neueMenge > produkt.stok_miktari) {
                     toast.warning(`Stok yetersiz! Eklenen miktar stoğu aşıyor (Maks: ${produkt.stok_miktari}).`);
                     neueMenge = produkt.stok_miktari; // Menge auf Maximum begrenzen
                }
                 if (neueMenge <= 0) {
                     return prevWarenkorb; // Nichts hinzufügen, wenn Menge <= 0 ist
                 }
                return [...prevWarenkorb, { produkt, menge: neueMenge }];
            }
        });
        // Optional: Kurzes Feedback geben
        // toast.success(`${produkt.ad?.['de']} sepete eklendi.`); // Besser direkt in der aufrufenden Komponente
    }, []);

    // NEU: Funktion zum Entfernen aus dem Warenkorb
    const removeFromWarenkorb = useCallback((produktId: string) => {
        setWarenkorb(prevWarenkorb => prevWarenkorb.filter(item => item.produkt.id !== produktId));
        toast.info("Ürün sepetten kaldırıldı."); // Feedback
    }, []);

    // NEU: Funktion zum Aktualisieren der Menge im Warenkorb
    const updateWarenkorbMenge = useCallback((produktId: string, neueMenge: number) => {
        setWarenkorb(prevWarenkorb => {
            const itemIndex = prevWarenkorb.findIndex(item => item.produkt.id === produktId);
            if (itemIndex === -1) return prevWarenkorb; // Produkt nicht gefunden

            const produkt = prevWarenkorb[itemIndex].produkt;
            let finaleMenge = Math.max(0, neueMenge); // Menge darf nicht negativ sein

            // Stokprüfung
            if (finaleMenge > produkt.stok_miktari) {
                toast.warning(`Stok yetersiz! Maksimum ${produkt.stok_miktari} adet eklenebilir.`);
                finaleMenge = produkt.stok_miktari; // Menge auf Maximum begrenzen
            }

            if (finaleMenge === 0) {
                // Wenn Menge 0 ist, Produkt entfernen
                return prevWarenkorb.filter(item => item.produkt.id !== produktId);
            } else {
                // Menge aktualisieren
                const updatedWarenkorb = [...prevWarenkorb];
                updatedWarenkorb[itemIndex] = { ...updatedWarenkorb[itemIndex], menge: finaleMenge };
                return updatedWarenkorb;
            }
        });
    }, []);

    // NEU: Funktion zum Leeren des Warenkorbs
    const clearWarenkorb = useCallback(() => {
        setWarenkorb([]);
    }, []);

     // NEU: Hilfsfunktion für Gesamtanzahl der Artikel
     const getGesamtMengeImWarenkorb = useCallback(() => {
         return warenkorb.reduce((total, item) => total + item.menge, 0);
     }, [warenkorb]);

    // NEU: Füge Warenkorb-Status und Funktionen zum Context-Wert hinzu
    const contextValue: PortalContextType = {
        ...value, // Bestehende Werte (profile, firma etc.)
        warenkorb,
        addToWarenkorb,
        removeFromWarenkorb,
        updateWarenkorbMenge,
        clearWarenkorb,
        getGesamtMengeImWarenkorb,
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