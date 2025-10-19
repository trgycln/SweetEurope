// src/components/portal/katalog/PortalUrunDetay.tsx (Mit Warenkorb-Funktion)
'use client';

import React, { useState } from 'react'; // useState importieren
import Image from 'next/image';
import { Tables } from '@/lib/supabase/database.types';
import { getLocalizedName, formatCurrency } from '@/lib/utils';
import { Locale } from '@/i18n-config';
import { Dictionary } from '@/dictionaries';
import {
    FiBox, FiClipboard, FiMaximize, FiPackage, FiCheckCircle,
    FiAlertTriangle, FiXCircle, FiShoppingCart, FiPlus, FiMinus
} from 'react-icons/fi';
import { usePortal, ProduktImWarenkorb } from '@/contexts/PortalContext'; // NEU: Context importieren
import { toast } from 'sonner'; // NEU: toast importieren

// Typen (unverändert)
type Urun = Tables<'urunler'> & { kategoriler: Pick<Tables<'kategoriler'>, 'ad'> | null };

interface PortalUrunDetayProps {
    urun: Urun;
    partnerPreis: number | null;
    stokMiktari: number | null;
    locale: Locale;
    dictionary: Dictionary;
}

// Map für technische Details (unverändert)
const ozelliklerMap = [
    { key: 'paket_icerigi', label: 'Paketinhalt', icon: <FiPackage/>, suffix: '' },
    { key: 'net_agirlik_kg', label: 'Nettogewicht', icon: <FiMaximize/>, suffix: ' kg' },
    { key: 'brut_agirlik_kg', label: 'Bruttogewicht', icon: <FiBox/>, suffix: ' kg' },
    { key: 'raf_omru_ay', label: 'Haltbarkeit', icon: <FiClipboard/>, suffix: ' Monate' },
];

// LagerStatusAnzeige (unverändert)
const LagerStatusAnzeige = ({ menge, schwelle, dictionary }: { menge: number | null, schwelle: number | null, dictionary: Dictionary }) => {
    const currentMenge = menge ?? 0;
    const warnSchwelle = schwelle ?? 0;
    const content = (dictionary as any)?.portal?.productDetailPage || {};

    let status: { text: string; color: string; icon: React.ReactNode };

    if (currentMenge <= 0) {
        status = { text: content.availabilityOutOfStock || "Ausverkauft", color: "text-red-600", icon: <FiXCircle /> };
    } else if (currentMenge <= warnSchwelle) {
        status = { text: content.availabilityLowStock || "Wenig Bestand", color: "text-yellow-600", icon: <FiAlertTriangle /> };
    } else {
        status = { text: content.availabilityInStock || "Auf Lager", color: "text-green-600", icon: <FiCheckCircle /> };
    }

    return (
        <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${status.color}`}>
            {status.icon}
            {status.text} ({currentMenge})
        </span>
    );
};


export function PortalUrunDetay({ urun, partnerPreis, stokMiktari, locale, dictionary }: PortalUrunDetayProps) {
    const content = (dictionary as any)?.portal?.productDetailPage || {};
    const cartContent = (dictionary as any)?.portal?.newOrderPage || {}; // Für Warenkorb-Texte

    // NEU: Warenkorb-Kontext und Menge-State
    const { addToWarenkorb } = usePortal(); // Holt die Funktion aus dem Context
    const [menge, setMenge] = useState(1); // Lokaler State für die Mengenauswahl

    // Lokalisierte Texte (unverändert)
    const urunAdi = getLocalizedName(urun.ad, locale);
    const aciklama = getLocalizedName(urun.aciklamalar, locale);
    const kategorieAdi = urun.kategoriler ? getLocalizedName(urun.kategoriler.ad, locale) : '';

    // Technische Details (unverändert)
    const gosterilecekOzellikler = urun.teknik_ozellikler ? ozelliklerMap .filter(item => (urun.teknik_ozellikler as any)[item.key] !== null && (urun.teknik_ozellikler as any)[item.key] !== undefined && (urun.teknik_ozellikler as any)[item.key] !== '') .map(item => ({...item, value: (urun.teknik_ozellikler as any)[item.key]})) : [];
    // Hauptbild (unverändert)
    const hauptBildUrl = urun.ana_resim_url || (urun.galeri_resim_urls && urun.galeri_resim_urls.length > 0 ? urun.galeri_resim_urls[0] : '/placeholder.png');
    
    // Preisformatierung (unverändert)
    const formatPreis = (wert: number | null) => {
         if (wert === null) return '-';
         const localeFormat = locale === 'tr' ? 'tr-TR' : 'de-DE';
         try { return new Intl.NumberFormat(localeFormat, { style: 'currency', currency: 'EUR' }).format(wert); }
         catch (e) { return `${wert} EUR`; }
    };
    
    // NEU: Handler für Mengenänderung
    const handleMengeChange = (neueMenge: number) => {
        const maxStok = stokMiktari ?? 0;
        if (neueMenge < 1) {
            setMenge(1); // Minimum 1
        } else if (neueMenge > maxStok) {
            setMenge(maxStok); // Maximum ist Lagerbestand
            toast.warning(`Stok yetersiz! Maksimum ${maxStok} adet eklenebilir.`);
        } else {
            setMenge(neueMenge);
        }
    };
    
    // NEU: Handler für "In den Warenkorb"
    const handleAddToWarenkorb = () => {
        if (stokMiktari === null || stokMiktari <= 0) {
            toast.error("Dieses Produkt ist ausverkauft.");
            return;
        }
        if (partnerPreis === null) {
            toast.error("Für dieses Produkt ist kein Preis verfügbar.");
            return;
        }

        // Produktobjekt für den Context vorbereiten
        const produktFuerWarenkorb: ProduktImWarenkorb = {
            ...urun,
            partnerPreis: partnerPreis
        };

        addToWarenkorb(produktFuerWarenkorb, menge);
        
        // Erfolg-Toast
        toast.success(`${menge} x ${urunAdi} ${cartContent.addedToCart || 'zum Warenkorb hinzugefügt!'}`);
    };

    return (
        <div className="bg-secondary py-12 md:py-16">
            <div className="container mx-auto px-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-start">
                    {/* Bild Sektion (unverändert) */}
                    <div>
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-lg mb-4 bg-white">
                             <Image src={hauptBildUrl} alt={urunAdi} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
                        </div>
                         {urun.galeri_resim_urls && urun.galeri_resim_urls.length > 1 && (
                             <div className="flex space-x-2 mt-4 overflow-x-auto pb-2">
                                 {urun.galeri_resim_urls.map((url, index) => (
                                     <div key={index} className="relative w-20 h-20 rounded-md overflow-hidden border flex-shrink-0 bg-white">
                                          <Image src={url} alt={`Galerie ${index+1}`} fill sizes="80px" className="object-cover"/>
                                     </div>
                                 ))}
                             </div>
                         )}
                    </div>

                    {/* Detail Sektion (Aktualisiert) */}
                    <div className="flex flex-col space-y-6">
                         <div>
                            {kategorieAdi && <p className="font-sans text-sm text-gray-500 mb-1 uppercase tracking-wider">{kategorieAdi}</p>}
                            <h1 className="text-3xl lg:text-4xl font-serif text-primary">{urunAdi}</h1>
                            {urun.stok_kodu && <p className="text-xs text-gray-400 font-mono mt-1">Art.-Nr.: {urun.stok_kodu}</p>}
                         </div>

                         {/* Preis und Lager (unverändert) */}
                         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border">
                             <div>
                                 <p className="text-xs font-bold text-text-main/60 uppercase">{content.yourPrice || "Ihr Preis (Netto)"}</p>
                                 <p className="font-serif text-2xl text-accent font-bold">{formatPreis(partnerPreis)}</p>
                             </div>
                             <div className='sm:text-right'>
                                 <p className="text-xs font-bold text-text-main/60 uppercase">{content.availability || "Verfügbarkeit"}</p>
                                 <LagerStatusAnzeige menge={stokMiktari} schwelle={urun.stok_esigi} dictionary={dictionary} />
                             </div>
                         </div>

                        {/* --- NEU: Bestell-Aktionen --- */}
                        <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                {/* Mengenauswahl */}
                                <div className="flex items-center border rounded-lg">
                                    <button 
                                        onClick={() => handleMengeChange(menge - 1)}
                                        className="px-4 py-3 text-text-main/70 hover:bg-bg-subtle rounded-l-lg"
                                        disabled={(stokMiktari ?? 0) <= 0}
                                    >
                                        <FiMinus size={16} />
                                    </button>
                                    <input 
                                        type="number" 
                                        value={menge}
                                        onChange={(e) => handleMengeChange(parseInt(e.target.value) || 1)}
                                        className="w-16 text-center font-bold text-primary border-y-0 border-x [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        min="1"
                                        max={stokMiktari ?? 0}
                                        disabled={(stokMiktari ?? 0) <= 0}
                                    />
                                    <button 
                                        onClick={() => handleMengeChange(menge + 1)}
                                        className="px-4 py-3 text-text-main/70 hover:bg-bg-subtle rounded-r-lg"
                                        disabled={(stokMiktari ?? 0) <= 0}
                                    >
                                        <FiPlus size={16} />
                                    </button>
                                </div>
                                {/* In den Warenkorb Button */}
                                <button 
                                    onClick={handleAddToWarenkorb}
                                    disabled={(stokMiktari ?? 0) <= 0 || partnerPreis === null}
                                    className="flex-grow w-full flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all font-bold text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    <FiShoppingCart size={18} />
                                    {cartContent.addToCart || 'In den Warenkorb'}
                                </button>
                            </div>
                        </div>
                        {/* --- Ende Bestell-Aktionen --- */}


                         {/* Beschreibung (unverändert) */}
                         {aciklama && (
                            <div className="prose prose-sm max-w-none text-text-main" dangerouslySetInnerHTML={{ __html: aciklama.replace(/\n/g, '<br />') }} />
                         )}

                         {/* Technische Details (unverändert) */}
                         {gosterilecekOzellikler.length > 0 && (
                             <div className="border-t pt-6">
                                 <h3 className="font-bold font-sans tracking-wider uppercase mb-3 text-primary text-sm">Details</h3>
                                 <div className="space-y-1">
                                     {gosterilecekOzellikler.map(item => (
                                         <div key={item.key} className="flex justify-between items-center py-1.5 text-sm">
                                             <span className="font-medium text-text-main/80">{item.label}</span>
                                             <span className="font-semibold text-primary">{item.value}{item.suffix || ''}</span>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
}