'use client';

import { useState, useMemo, ChangeEvent } from 'react';
import Image from 'next/image';
import { usePortal, ProduktImWarenkorb } from '@/contexts/PortalContext';
import { getLocalizedName, formatCurrency } from '@/lib/utils';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { FiPlus, FiCheck, FiImage, FiShoppingCart, FiMinus, FiPackage, FiAlertTriangle, FiXCircle } from 'react-icons/fi';
import { toast } from 'sonner';

// Typen bleiben gleich
type Urun = ProduktImWarenkorb;
type Kategori = { id: string; ad: any; ust_kategori_id: string | null };

interface UrunKataloguProps {
    initialUrunler: Urun[];
    kategoriler: Kategori[];
    favoriIdSet: Set<string>; // Wird aktuell nicht verwendet, aber beibehalten
    dictionary: Dictionary;
    locale: Locale;
}

// Komponente für den Lagerstatus (für bessere Lesbarkeit ausgelagert)
const LagerStatusAnzeige = ({ menge, schwelle, dictionary }: { menge: number | null, schwelle: number | null, dictionary: Dictionary }) => {
    const currentMenge = menge ?? 0;
    const warnSchwelle = schwelle ?? 0;
    // Texte aus dem Wörterbuch holen (ggf. Pfad anpassen)
    const content = (dictionary as any)?.portal?.productDetailPage || {};

    let status: { text: string; color: string; icon: React.ReactNode };

    if (currentMenge <= 0) {
        status = { text: content.availabilityOutOfStock || "Ausverkauft", color: "text-red-600", icon: <FiXCircle /> };
    } else if (currentMenge <= warnSchwelle) {
        status = { text: content.availabilityLowStock || "Wenig Bestand", color: "text-yellow-600", icon: <FiAlertTriangle /> };
    } else {
        status = { text: content.availabilityInStock || "Auf Lager", color: "text-green-600", icon: <FiCheck /> };
    }

    return (
        <span className={`flex items-center gap-1 text-xs font-medium ${status.color}`}>
            {status.icon}
            {status.text}
        </span>
    );
};


// Hauptkomponente
export function UrunKatalogu({ initialUrunler, kategoriler, favoriIdSet, dictionary, locale }: UrunKataloguProps) {
    const { addToWarenkorb, warenkorb, updateWarenkorbMenge } = usePortal();
    const [aramaMetni, setAramaMetni] = useState('');
    const [seciliKategori, setSeciliKategori] = useState('');
    // State für die Mengen der einzelnen Produkte
    const [mengen, setMengen] = useState<Record<string, number>>({});

    const content = (dictionary as any)?.portal?.newOrderPage || {};
    const stockStatusContent = content.stockStatus || {};

    // --- Filterlogik (unverändert) ---
    const kategorieHiyerarsisi = useMemo(() => {
        const anaKategoriler: (Kategori & { altKategoriler: Kategori[] })[] = [];
        const altKategoriMap = new Map<string, Kategori[]>();
        kategoriler.forEach(k => { if (k.ust_kategori_id) { if (!altKategoriMap.has(k.ust_kategori_id)) { altKategoriMap.set(k.ust_kategori_id, []); } altKategoriMap.get(k.ust_kategori_id)!.push(k); } });
        kategoriler.forEach(k => { if (!k.ust_kategori_id) { anaKategoriler.push({ ...k, altKategoriler: altKategoriMap.get(k.id) || [] }); } });
        return anaKategoriler;
    }, [kategoriler]);

    const filtrelenmisUrunler = useMemo(() => {
        return initialUrunler.filter(urun => {
            const ad = getLocalizedName(urun.ad, locale, '').toLowerCase();
            const arama = aramaMetni.toLowerCase();
            const aramaEslesmesi = ad.includes(arama) || urun.stok_kodu?.toLowerCase().includes(arama);
            const kategorie = (urun as any).kategoriler ? getLocalizedName((urun as any).kategoriler.ad, locale, '').toLowerCase() : '';
            const kategorieEslesmesi = !seciliKategori || urun.kategori_id === seciliKategori || kategorie.includes(arama); // Suche auch im Kategorienamen
            return aramaEslesmesi && kategorieEslesmesi;
        });
    }, [initialUrunler, aramaMetni, seciliKategori, locale]);
    // --- Ende Filterlogik ---

    // Mengenänderung verarbeiten
    const handleMengeChange = (urunId: string, event: ChangeEvent<HTMLInputElement>) => {
        const neueMenge = parseInt(event.target.value, 10) || 1; // Standard auf 1, falls Eingabe ungültig
        setMengen(prev => ({ ...prev, [urunId]: Math.max(1, neueMenge) })); // Minimum 1
    };

    // Produkt zum Warenkorb hinzufügen
    const handleAddToCart = (urun: Urun) => {
        const mengeToAdd = mengen[urun.id] || 1; // Menge aus State oder Standard 1
        addToWarenkorb(urun, mengeToAdd);
        toast.success(`${mengeToAdd} x ${getLocalizedName(urun.ad, locale)} ${stockStatusContent.addedToCart || 'wurde hinzugefügt!'}`);
        // Optional: Menge nach Hinzufügen zurücksetzen
        // setMengen(prev => ({ ...prev, [urun.id]: 1 }));
    };

    const sepettekiMengen = useMemo(() => {
        const map = new Map<string, number>();
        warenkorb.forEach(item => map.set(item.produkt.id, item.menge));
        return map;
    }, [warenkorb]);

    return (
        <div className="space-y-6 bg-white p-6 rounded-lg shadow-md border border-gray-200">
            {/* --- Filterbereich (leicht angepasst für besseres Styling) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                    type="text"
                    placeholder={content.searchPlaceholder || 'Nach Produktname oder -code suchen...'}
                    value={aramaMetni}
                    onChange={(e) => setAramaMetni(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-accent-dark focus:border-accent-dark shadow-sm" // Tailwind Klassen
                />
                <select
                    value={seciliKategori}
                    onChange={(e) => setSeciliKategori(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-accent-dark focus:border-accent-dark bg-white shadow-sm" // Tailwind Klassen
                >
                    <option value="">Alle Kategorien</option>
                    {kategorieHiyerarsisi.map(ana => (
                        <optgroup key={ana.id} label={getLocalizedName(ana.ad, locale)}>
                             {/* <option value={ana.id}>{getLocalizedName(ana.ad, locale)} (Hauptkategorie)</option> */}
                             {/* Hauptkategorie nur als Gruppe anzeigen, nicht als auswählbare Option, es sei denn, Sie möchten das */}
                            {ana.altKategoriler.map(alt => (
                                <option key={alt.id} value={alt.id}>&nbsp;&nbsp;{getLocalizedName(alt.ad, locale)}</option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>

            {/* --- Neue Produktliste (Tabelle) --- */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16"></th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produkt</th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Preis</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lager</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Menge</th>
                            <th scope="col" className="relative px-4 py-3 w-32">
                                <span className="sr-only">Hinzufügen</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filtrelenmisUrunler.length > 0 ? (
                            filtrelenmisUrunler.map(urun => {
                                const mengeImWarenkorb = sepettekiMengen.get(urun.id);
                                const aktuelleMenge = mengen[urun.id] || 1;
                                const isOutOfStock = (urun.stok_miktari ?? 0) <= 0;

                                return (
                                    <tr key={urun.id} className={`${isOutOfStock ? 'opacity-60' : ''}`}>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="relative w-12 h-12 bg-gray-100 rounded overflow-hidden">
                                                {urun.ana_resim_url ? (
                                                    <Image src={urun.ana_resim_url} alt={getLocalizedName(urun.ad, locale)} fill sizes="48px" className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400"> <FiImage size={16} /> </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-semibold text-primary">{getLocalizedName(urun.ad, locale)}</div>
                                            <div className="text-xs text-gray-500 font-mono">{urun.stok_kodu}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-accent">{formatCurrency(urun.partnerPreis, locale)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <LagerStatusAnzeige menge={urun.stok_miktari} schwelle={urun.stok_esigi} dictionary={dictionary} />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                            <input
                                                type="number"
                                                value={aktuelleMenge}
                                                onChange={(e) => handleMengeChange(urun.id, e)}
                                                min="1"
                                                max={urun.stok_miktari ?? 0} // Max auf Lagerbestand setzen
                                                className={`w-16 p-1 text-center border rounded-md ${isOutOfStock ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                disabled={isOutOfStock}
                                            />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                            {mengeImWarenkorb ? (
                                                <div className="flex items-center justify-center gap-1 text-green-600 font-semibold text-xs border border-green-200 bg-green-50 rounded-full px-2 py-1">
                                                    <FiShoppingCart size={12} /> {mengeImWarenkorb} im Korb
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleAddToCart(urun)}
                                                    disabled={isOutOfStock}
                                                    className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white ${isOutOfStock ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark'}`}
                                                >
                                                    <FiPlus className="-ml-0.5 mr-1 h-4 w-4" aria-hidden="true" />
                                                    Hinzufügen
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                                    {content.noProductsFound || 'Keine Produkte für Ihre Filterkriterien gefunden.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {/* --- Ende Produktliste --- */}
        </div>
    );
}

