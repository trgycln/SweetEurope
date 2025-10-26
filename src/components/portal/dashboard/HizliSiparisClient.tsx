'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { FiShoppingCart, FiSearch, FiPlus, FiMinus, FiLoader, FiImage } from 'react-icons/fi'; // FiImage hinzugefügt
import { Locale } from '@/i18n-config';
import { Dictionary } from '@/dictionaries';
import { getLocalizedName } from '@/lib/utils'; // getLocalizedName importieren

// Typdefinition (unverändert)
type HizliSiparisUrun = {
    id: string;
    ad: any;
    stok_kodu: string | null;
    ana_resim_url: string | null;
    partnerPreis: number; // Annahme: partnerPreis kommt bereits von page.tsx
    stok_miktari: number;
};

interface HizliSiparisClientProps {
    urunler: HizliSiparisUrun[];
    locale: Locale;
    dictionary: Dictionary;
}

export function HizliSiparisClient({ urunler, locale, dictionary }: HizliSiparisClientProps) {
    const router = useRouter();
    const [adetler, setAdetler] = useState<Record<string, number>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sicherer Zugriff auf Dictionary-Texte mit Fallbacks
    const content = (dictionary as any)?.portal?.dashboard?.quickOrder || {
        quickOrderTitle: "Schnellbestellung",
        searchProductPlaceholder: "Produktname oder Code suchen...",
        addSelectedToCart: "Auswahl zum Warenkorb hinzufügen",
        addNItemsToCart: "{count} Artikel zum Warenkorb hinzufügen",
        noProductsFound: "Keine Produkte für Ihre Suche gefunden.",
        pleaseSelectItems: "Bitte Artikel auswählen.",
        stockWarning: "Nicht genügend Lagerbestand! Max. {stock} verfügbar.",
        itemRemoved: "Artikel aus Auswahl entfernt.",
        addingToCart: "Wird hinzugefügt...",
    };

    const handleAdetChange = (urunId: string, mevcutAdet: number | undefined, stok: number, artis: number) => {
        const aktuelleMenge = mevcutAdet || 0;
        let neueMenge = aktuelleMenge + artis;

        if (neueMenge < 0) neueMenge = 0; // Nicht unter 0 gehen

        if (neueMenge > stok) {
            toast.warning(content.stockWarning.replace('{stock}', stok.toString()));
            neueMenge = stok; // Menge auf Maximum begrenzen
        }

        setAdetler(prev => ({ ...prev, [urunId]: neueMenge }));

        // Optional: Toast-Nachricht, wenn Menge auf 0 gesetzt wird
        if (aktuelleMenge > 0 && neueMenge === 0) {
             toast.info(content.itemRemoved);
        }
    };

     // Direkte Eingabe im Input-Feld verarbeiten
     const handleInputChange = (urunId: string, stok: number, event: React.ChangeEvent<HTMLInputElement>) => {
        let wert = parseInt(event.target.value, 10);
        if (isNaN(wert) || wert < 0) {
            wert = 0; // Bei ungültiger Eingabe auf 0 setzen
        }

        if (wert > stok) {
            toast.warning(content.stockWarning.replace('{stock}', stok.toString()));
            wert = stok; // Menge auf Maximum begrenzen
        }

        setAdetler(prev => ({ ...prev, [urunId]: wert }));
     };


    const handleSepeteEkle = () => {
        setIsSubmitting(true);
        const sepeteEklenecekler = Object.entries(adetler).filter(([_, adet]) => adet > 0);

        if (sepeteEklenecekler.length === 0) {
            toast.error(content.pleaseSelectItems);
            setIsSubmitting(false);
            return;
        }

        const params = new URLSearchParams();
        sepeteEklenecekler.forEach(([urunId, adet]) => {
            params.append(`urun_${urunId}`, adet.toString());
        });

        // Hinzufügen-Text anzeigen und dann weiterleiten
        toast.info(content.addingToCart);
        setTimeout(() => {
            router.push(`/${locale}/portal/siparisler/yeni?${params.toString()}`);
            // Hinweis: isSubmitting muss hier nicht unbedingt zurückgesetzt werden,
            // da die Seite wechselt. Falls doch gewünscht, dann nach dem Timeout.
            // setIsSubmitting(false);
        }, 500); // Kurze Verzögerung für den Toast
    };

    const filtrelenmisUrunler = useMemo(() => urunler.filter(urun => {
        const ad = getLocalizedName(urun.ad, locale, '').toLowerCase(); // utils Funktion verwenden
        const stokKodu = urun.stok_kodu?.toLowerCase() || '';
        return ad.includes(searchTerm.toLowerCase()) || stokKodu.includes(searchTerm.toLowerCase());
    }), [urunler, searchTerm, locale]);

    const seciliUrunSayisi = Object.values(adetler).reduce((sum, adet) => sum + (adet > 0 ? 1 : 0), 0); // Zählt Produkte mit Menge > 0

    if (urunler.length === 0) {
        return null;
    }

    // Dynamischer Button-Text
    const buttonText = seciliUrunSayisi > 0
        ? content.addNItemsToCart.replace('{count}', seciliUrunSayisi.toString())
        : content.addSelectedToCart;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                {/* Titel aus Dictionary */}
                <h3 className="font-serif text-xl font-bold text-primary">{content.quickOrderTitle}</h3>
                <div className="relative flex-grow sm:flex-grow-0 sm:w-72">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        // Platzhalter aus Dictionary
                        placeholder={content.searchProductPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-accent focus:border-accent shadow-sm"
                    />
                </div>
            </div>

            <div className="max-h-96 overflow-y-auto pr-2 divide-y divide-gray-200 border-t border-b border-gray-200">
                {filtrelenmisUrunler.length > 0 ? filtrelenmisUrunler.map((urun) => {
                    const aktuelleMengeFuerUrun = adetler[urun.id] || 0;
                    const isOutOfStock = urun.stok_miktari <= 0;
                    return (
                        <div key={urun.id} className={`flex items-center gap-4 py-3 ${isOutOfStock ? 'opacity-60' : ''}`}>
                            <div className="relative w-12 h-12 bg-secondary rounded-md overflow-hidden flex-shrink-0">
                                {urun.ana_resim_url ? (
                                    <Image
                                        src={urun.ana_resim_url}
                                        alt={getLocalizedName(urun.ad, locale)} // utils Funktion
                                        fill
                                        sizes="48px"
                                        className="object-cover"
                                        onError={(e) => { e.currentTarget.src = '/placeholder.png'; }} // Fallback
                                    />
                                ) : (
                                     <div className="w-full h-full flex items-center justify-center text-gray-400"> <FiImage size={24} /> </div>
                                )}
                            </div>
                            <div className="flex-grow">
                                <p className="text-sm font-semibold text-text-main line-clamp-1">
                                    {getLocalizedName(urun.ad, locale)} {/* utils Funktion */}
                                </p>
                                <p className="text-xs text-gray-400 font-mono">{urun.stok_kodu}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleAdetChange(urun.id, aktuelleMengeFuerUrun, urun.stok_miktari, -1)} className="p-1.5 border rounded-md hover:bg-bg-subtle disabled:opacity-50 disabled:cursor-not-allowed" disabled={aktuelleMengeFuerUrun <= 0 || isOutOfStock}>
                                    <FiMinus size={14} />
                                </button>
                                <input
                                    type="number"
                                    value={aktuelleMengeFuerUrun} // Zeigt 0 an, wenn nicht im State
                                    onChange={(e) => handleInputChange(urun.id, urun.stok_miktari, e)}
                                    placeholder="0"
                                    min="0"
                                    max={urun.stok_miktari}
                                    className={`w-16 text-center border rounded-md p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isOutOfStock ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    disabled={isOutOfStock}
                                />
                                <button onClick={() => handleAdetChange(urun.id, aktuelleMengeFuerUrun, urun.stok_miktari, 1)} className="p-1.5 border rounded-md hover:bg-bg-subtle disabled:opacity-50 disabled:cursor-not-allowed" disabled={isOutOfStock || aktuelleMengeFuerUrun >= urun.stok_miktari}>
                                    <FiPlus size={14} />
                                </button>
                            </div>
                        </div>
                    );
                }) : (
                    // "Keine Produkte" Meldung aus Dictionary
                    <div className="text-center py-10 text-gray-500">{content.noProductsFound}</div>
                )}
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleSepeteEkle}
                    disabled={isSubmitting || seciliUrunSayisi === 0} // Auch deaktivieren, wenn nichts ausgewählt
                    className="bg-accent text-white font-bold py-2 px-6 rounded-lg shadow hover:bg-opacity-90 transition-all inline-flex items-center gap-2 disabled:bg-accent/50 disabled:cursor-wait"
                >
                    {isSubmitting ? <FiLoader className="animate-spin" /> : <FiShoppingCart />}
                    {/* Dynamischer Button-Text */}
                    {buttonText}
                </button>
            </div>
        </div>
    );
}
