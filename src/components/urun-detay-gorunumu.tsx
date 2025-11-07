// src/components/urun-detay-gorunumu.tsx (Vollständig - Öffentlich & Responsiv)
'use client';

import React from 'react';
import Image from 'next/image';
import { Tables } from '@/lib/supabase/database.types';
// Annahme: Locale ist jetzt in utils.ts definiert
import { getLocalizedName, Locale } from '@/lib/utils';
// KORREKTUR: Korrekte Icons importieren (Fa-Icons entfernt)
import { FiTag, FiInfo } from 'react-icons/fi';
import { getBadgeText, getFlavorLabel, piecesSuffix, weightLabel } from '@/lib/labels';

// Typen anpassen
type Urun = Tables<'urunler'> & {
    kategoriler?: Pick<Tables<'kategoriler'>, 'ad'> | null;
};
// Sablon-Typ für die dynamischen Eigenschaften
type Sablon = Pick<Tables<'kategori_ozellik_sablonlari'>, 'alan_adi' | 'gosterim_adi'>;

interface UrunDetayGorunumuProps {
    urun: Urun;
    ozellikSablonu: Sablon[]; // Sablon als Prop für dynamische Anzeige
    locale: Locale;
}

export function UrunDetayGorunumu({ urun, ozellikSablonu, locale }: UrunDetayGorunumuProps) {
    const urunAdi = getLocalizedName(urun.ad, locale);
    const aciklama = getLocalizedName(urun.aciklamalar, locale);
    const kategorieAdi = urun.kategoriler ? getLocalizedName(urun.kategoriler.ad, locale) : '';

    // KORREKTUR: Technische Details dynamisch aus dem Sablon erstellen
    const gosterilecekOzellikler = ozellikSablonu
        .map(sablonItem => {
            // Wert aus dem JSONB-Feld 'teknik_ozellikler' holen
            const wert = (urun.teknik_ozellikler as any)?.[sablonItem.alan_adi];
            
            // Nur anzeigen, wenn ein Wert vorhanden ist
            if (wert !== null && wert !== undefined && wert !== '') {
                return {
                    // Lokalisierten Namen für das Label verwenden
                    label: getLocalizedName(sablonItem.gosterim_adi, locale),
                    wert: wert,
                };
            }
            return null;
        })
        .filter(Boolean) as { label: string; wert: any }[]; // 'null'-Einträge entfernen

    const hauptBildUrl = urun.ana_resim_url || (urun.galeri_resim_urls && urun.galeri_resim_urls.length > 0 ? urun.galeri_resim_urls[0] : '/placeholder.png');
    const tekniks: any = (urun.teknik_ozellikler as any) || {};
    const flavorList: string[] = Array.isArray(tekniks.geschmack) ? tekniks.geschmack : (tekniks.geschmack ? [tekniks.geschmack] : []);
    const sliceCount = tekniks.dilim_adedi || tekniks.kutu_ici_adet;
    const weight = tekniks.net_agirlik_gram || tekniks.net_agirlik_gr || tekniks.net_agirlik || tekniks.gramaj || tekniks.agirlik;
    const badgeBooleans: { key: 'vegan' | 'vegetarisch' | 'glutenfrei' | 'laktosefrei' | 'bio'; active: boolean }[] = [
        { key: 'vegan', active: tekniks.vegan === true },
        { key: 'vegetarisch', active: tekniks.vegetarisch === true },
        { key: 'glutenfrei', active: tekniks.glutenfrei === true },
        { key: 'laktosefrei', active: tekniks.laktosefrei === true },
        { key: 'bio', active: tekniks.bio === true },
    ];

    return (
        <div className="bg-secondary py-12 md:py-20">
            <div className="container mx-auto px-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-start">
                    
                    {/* Bild Sektion */}
                    <div>
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-lg mb-4 bg-white">
                             <Image
                                src={hauptBildUrl}
                                alt={urunAdi}
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-cover transition-transform duration-500 hover:scale-105"
                                priority
                             />
                        </div>
                         {/* Galeriebilder */}
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

                    {/* Produktdetails */}
                    <div className="flex flex-col space-y-6 break-words">
                         <div>
                            {kategorieAdi && <p className="font-sans text-sm text-accent mb-1 uppercase tracking-wider flex items-center gap-2"><FiTag size={14}/> {kategorieAdi}</p>}
                            {/* Responsive Textgröße */}
                            <h1 className="text-3xl md:text-5xl font-serif text-primary mb-4">{urunAdi}</h1>
                            {/* Badges & Flavors */}
                            {(badgeBooleans.some(b => b.active) || flavorList.length > 0 || sliceCount || weight) && (
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {badgeBooleans.filter(b => b.active).map(b => (
                                        <span key={b.key} className="px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm 
                                            bg-gradient-to-r from-primary to-accent">
                                            {getBadgeText(b.key, locale as any)}
                                        </span>
                                    ))}
                                    {flavorList.map(fl => (
                                        <span key={fl} className="px-3 py-1 rounded-full text-xs font-medium bg-pink-600 text-white shadow-sm">
                                            {getFlavorLabel(fl, locale as any)}
                                        </span>
                                    ))}
                                    {sliceCount && (
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                            {sliceCount} {piecesSuffix(locale as any)}
                                        </span>
                                    )}
                                    {weight && (
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                                            {weightLabel(locale as any)}: {weight}
                                        </span>
                                    )}
                                </div>
                            )}
                            
                            {/* PREIS WURDE ENTFERNT */}
                         </div>

                         {/* Beschreibung */}
                         {aciklama && (
                            <div 
                                className="font-sans text-text-main leading-relaxed mb-8 prose prose-sm max-w-none" 
                                // Zeilenumbrüche im Text als <br> rendern
                                dangerouslySetInnerHTML={{ __html: aciklama.replace(/\n/g, '<br />') }} 
                            />
                         )}

                         {/* KORREKTUR: Dynamische Technische Details */}
                         {gosterilecekOzellikler.length > 0 && (
                             <div className="border-t border-gray-300 pt-6">
                                 <h3 className="font-bold font-sans tracking-wider uppercase mb-4 text-primary text-sm flex items-center gap-2"><FiInfo /> Details</h3>
                                 <div className="space-y-2">
                                     {gosterilecekOzellikler.map(item => (
                                         <div key={item.label} className="flex justify-between items-center py-1.5 text-sm">
                                             <span className="font-medium text-text-main/80">{item.label}</span>
                                             <span className="font-semibold text-primary">{Array.isArray(item.wert) ? item.wert.map((v:string) => getFlavorLabel(v, locale as any)).join(', ') : item.wert}</span>
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