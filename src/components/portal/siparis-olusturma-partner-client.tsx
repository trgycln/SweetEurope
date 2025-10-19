'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tables } from '@/lib/supabase/database.types';
import { FiPlus, FiTrash2, FiSend, FiLoader, FiShoppingCart } from 'react-icons/fi';
import { siparisOlusturAction } from '@/app/actions/siparis-actions';
import Image from 'next/image';
import { toast } from 'sonner';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
// KORREKTUR: Alle Context-Daten und Typen importieren
import { usePortal, ProduktImWarenkorb } from '@/contexts/PortalContext';
import Link from 'next/link';
import { getLocalizedName, formatCurrency } from '@/lib/utils'; // Utils importieren

// Typen von page.tsx
type UrunWithPrice = ProduktImWarenkorb; // Alias für Klarheit

interface SiparisOlusturmaClientProps {
    urunler: UrunWithPrice[]; // Komplette Produktliste
    favoriIdSet: Set<string>; // Wird hier nicht verwendet, könnte entfernt werden
    dictionary: Dictionary;
    locale: Locale;
}

export function SiparisOlusturmaPartnerClient({ urunler, favoriIdSet, dictionary, locale }: SiparisOlusturmaClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // KORREKTUR: Warenkorb-Funktionen aus dem Context holen
    const { 
        warenkorb, 
        updateWarenkorbMenge, 
        removeFromWarenkorb, 
        clearWarenkorb,
        addToWarenkorb, // Wichtig für URL-Parameter
        firma 
    } = usePortal();
    
    const [isPending, startTransition] = useTransition();
    const content = (dictionary as any)?.portal?.newOrderPage || {};
    const indirimOrani = firma?.firmalar_finansal?.[0]?.ozel_indirim_orani ?? 0;

    // KORREKTUR: Effekt, der *nur einmal* läuft, um Produkte aus der URL hinzuzufügen
    useEffect(() => {
        if (searchParams && urunler.length > 0) {
            let itemsAdded = false;
            for (const [key, value] of searchParams.entries()) {
                if (key.startsWith('urun_') && value) {
                    const urunId = key.substring(5);
                    const adet = parseInt(value, 10);
                    const urun = urunler.find(u => u.id === urunId);

                    if (urun && adet > 0) {
                        // Verwende die Context-Funktion, um das Produkt hinzuzufügen
                        // Die Funktion prüft bereits den Lagerbestand
                        addToWarenkorb(urun, adet);
                        itemsAdded = true;
                    }
                }
            }
            if (itemsAdded) {
                // Optional: URL "aufräumen", um die searchParams zu entfernen
                router.replace(`/${locale}/portal/siparisler/yeni`);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Leeres Array = Läuft nur einmal beim Mounten

    
    const handleSiparisOnayla = () => {
        if (warenkorb.length === 0) {
            toast.error(content.error?.cartEmpty || 'Sepetiniz boş.');
            return;
        }

        startTransition(async () => {
            const itemsToSubmit = warenkorb.map(item => ({
                urun_id: item.produkt.id,
                adet: item.menge,
                o_anki_satis_fiyati: item.produkt.partnerPreis || 0
            }));

            const result = await siparisOlusturAction({
                firmaId: firma.id,
                teslimatAdresi: firma.adres || 'Adres belirtilmemiş',
                items: itemsToSubmit,
                kaynak: 'Müşteri Portalı'
            });

            if (result?.error) {
                toast.error(result.error);
            } else if (result?.success && result.orderId) {
                toast.success("Siparişiniz başarıyla oluşturuldu!");
                clearWarenkorb(); // Warenkorb leeren
                router.push(`/${locale}/portal/siparisler/${result.orderId}`);
            }
        });
    };

    // Gesamtbetrag aus dem Context-Warenkorb berechnen
    const toplamTutar = useMemo(() => warenkorb.reduce((acc, item) => acc + (item.menge * (item.produkt.partnerPreis || 0)), 0), [warenkorb]);

    return (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg space-y-8">
            <h2 className="font-serif text-2xl font-bold text-primary flex items-center gap-2"><FiShoppingCart /> {content.cartTitle || "Ihr Warenkorb"}</h2>
            
            <div className="space-y-4 divide-y divide-gray-200">
                {warenkorb.length > 0 ? warenkorb.map(item => (
                    <div key={item.produkt.id} className="flex items-center gap-4 pt-4 first:pt-0">
                        <Image src={item.produkt.ana_resim_url || '/placeholder.png'} alt={getLocalizedName(item.produkt.ad, locale)} width={64} height={64} className="rounded-md object-cover w-16 h-16"/>
                        <div className="flex-grow">
                            <p className="font-bold text-primary">{getLocalizedName(item.produkt.ad, locale)}</p>
                            <p className="text-sm text-gray-500">{formatCurrency(item.produkt.partnerPreis, locale)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                             <input
                                type="number"
                                value={item.menge}
                                // Context-Funktion zum Aktualisieren aufrufen
                                onChange={(e) => updateWarenkorbMenge(item.produkt.id, parseInt(e.target.value))}
                                className="w-16 p-1 text-center border rounded-md"
                                min="0" // Erlaube 0, um Artikel zu entfernen
                                max={item.produkt.stok_miktari}
                            />
                            <p className="w-24 text-right font-semibold">{formatCurrency(item.menge * (item.produkt.partnerPreis || 0), locale)}</p>
                            {/* Context-Funktion zum Entfernen aufrufen */}
                            <button onClick={() => removeFromWarenkorb(item.produkt.id)} className="text-red-500 hover:text-red-700 p-1">
                                <FiTrash2/>
                            </button>
                        </div>
                    </div>
                )) : (
                     <p className="text-gray-500 text-center py-8">{content.cartEmpty || "Ihr Warenkorb ist leer."}</p>
                )}
            </div>

            {warenkorb.length > 0 && (
                <div className="pt-6 border-t space-y-4">
                     {indirimOrani > 0 && <p className="text-sm font-semibold text-green-600 text-right">{content.cartDiscountApplied.replace('%{discount}', indirimOrani.toString())}</p>}
                     <div className="flex justify-end items-baseline gap-4">
                         <span className="text-lg font-bold text-primary">{content.cartTotal || "Gesamt:"}</span>
                         <span className="text-2xl font-bold text-accent">{formatCurrency(toplamTutar, locale)}</span>
                     </div>
                     <div className="flex flex-col sm:flex-row justify-end gap-4">
                        <Link href={`/${locale}/portal/katalog`} className="px-6 py-3 bg-secondary hover:bg-bg-subtle text-text-main rounded-lg font-bold text-sm text-center">
                            Weiter einkaufen
                        </Link>
                         <button onClick={handleSiparisOnayla} disabled={isPending} className="flex items-center justify-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 font-bold disabled:bg-green-400">
                             {isPending ? <FiLoader className="animate-spin"/> : <FiSend />}
                             {content.confirmOrderButton || "Bestellung bestätigen"}
                         </button>
                     </div>
                </div>
            )}
        </div>
    );
}