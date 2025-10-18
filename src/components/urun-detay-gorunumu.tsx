// src/components/urun-detay-gorunumu.tsx (Komplett Korrigiert)
'use client';

import React from 'react';
import Image from 'next/image';
import { Tables } from '@/lib/supabase/database.types';
// Annahme: getLocalizedName und formatCurrency existieren und funktionieren
import { formatCurrency, getLocalizedName } from '@/lib/utils';
import { Locale } from '@/i18n-config'; // Locale importieren
import { FiBox, FiClipboard, FiInfoCircle, FiMaximize, FiMinimize, FiPackage } from 'react-icons/fi'; // Passende Icons

// Korrekter Typ für Urun (basierend auf database.types.ts)
type Urun = Tables<'urunler'>;

interface UrunDetayGorunumuProps {
    urun: Urun;
    price: number | null; // Erwartet jetzt den korrekten Preis
    locale: Locale; // Erwartet jetzt die Locale
}

// Angepasste Map für technische Details (basierend auf database.types.ts)
const ozelliklerMap = [
    // Passe diese Schlüssel an die tatsächlichen Schlüssel in deinem 'teknik_ozellikler' JSON an
    { key: 'paket_icerigi', label: 'Paketinhalt', icon: <FiPackage/>, suffix: '' },
    { key: 'net_agirlik_kg', label: 'Nettogewicht', icon: <FiMaximize/>, suffix: ' kg' },
    { key: 'brut_agirlik_kg', label: 'Bruttogewicht', icon: <FiBox/>, suffix: ' kg' },
    { key: 'raf_omru_ay', label: 'Haltbarkeit', icon: <FiClipboard/>, suffix: ' Monate' },
    // Füge hier weitere relevante technische Details hinzu
];

export function UrunDetayGorunumu({ urun, price, locale }: UrunDetayGorunumuProps) {
    // Korrekte Feldnamen verwenden
    const urunAdi = getLocalizedName(urun.ad, locale);
    const aciklama = getLocalizedName(urun.aciklamalar, locale);
    // Kategorie-Name wird jetzt von der Page-Komponente geholt und könnte als Prop übergeben werden (optional)
    // const kategoriAdi = urun.kategoriler ? getLocalizedName(urun.kategoriler.ad, locale) : '';

    // Technische Details auslesen
    const gosterilecekOzellikler = urun.teknik_ozellikler
        ? ozelliklerMap
            .filter(item => (urun.teknik_ozellikler as any)[item.key] !== null && (urun.teknik_ozellikler as any)[item.key] !== undefined)
            .map(item => ({...item, value: (urun.teknik_ozellikler as any)[item.key]}))
        : [];

    // Hauptbild-URL bestimmen
    const hauptBildUrl = urun.ana_resim_url || (urun.galeri_resim_urls && urun.galeri_resim_urls.length > 0 ? urun.galeri_resim_urls[0] : '/placeholder.png');

    return (
        // Verwende dein bestehendes Layout, aber mit korrekten Daten
        <div className="bg-secondary py-12 md:py-20">
            <div className="container mx-auto px-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-start">
                    {/* Bild */}
                    <div>
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-lg mb-4 bg-white">
                             <Image
                                src={hauptBildUrl}
                                alt={urunAdi}
                                fill // 'layout="fill"' ist veraltet
                                sizes="(max-width: 768px) 100vw, 50vw" // Responsive Größen
                                className="object-cover transition-transform duration-500 hover:scale-105" // objectFit veraltet
                                priority // Hauptbild priorisieren
                             />
                        </div>
                         {/* Optional: Kleine Galeriebilder */}
                         {urun.galeri_resim_urls && urun.galeri_resim_urls.length > 1 && (
                             <div className="flex space-x-2 mt-4 overflow-x-auto">
                                 {urun.galeri_resim_urls.map((url, index) => (
                                     <div key={index} className="relative w-20 h-20 rounded-md overflow-hidden border flex-shrink-0">
                                          <Image src={url} alt={`Galerie ${index+1}`} fill sizes="80px" className="object-cover"/>
                                     </div>
                                 ))}
                             </div>
                         )}
                    </div>

                    {/* Produktdetails */}
                    <div className="flex flex-col">
                         {/* <p className="font-sans text-sm text-gray-500 mb-2 uppercase tracking-wider">{kategoriAdi}</p> */}
                         <h1 className="text-4xl md:text-5xl font-serif text-primary mb-4">{urunAdi}</h1>
                         {/* Korrekten Preis anzeigen */}
                         <p className="font-serif text-3xl text-accent mb-6">{formatCurrency(price, locale)}</p>

                         {aciklama && (
                            <div className="font-sans text-text-main leading-relaxed mb-8 prose prose-sm max-w-none">
                                <p>{aciklama}</p>
                            </div>
                         )}

                         {gosterilecekOzellikler.length > 0 && (
                             <div className="border-t border-gray-300 pt-6">
                                 <h3 className="font-bold font-sans tracking-wider uppercase mb-4 text-primary text-sm">Details</h3>
                                 <div className="space-y-2">
                                     {gosterilecekOzellikler.map(item => (
                                         <div key={item.key} className="flex justify-between items-center py-2 border-b border-gray-200 text-sm">
                                             <div className="flex items-center gap-2 text-text-main/80">
                                                 {item.icon}
                                                 <span className="font-medium">{item.label}</span>
                                             </div>
                                             <span className="font-semibold text-primary">
                                                 {item.value}{item.suffix || ''}
                                             </span>
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