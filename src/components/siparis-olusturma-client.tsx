// src/components/admin/operasyon/siparisler/SiparisOlusturmaClient.tsx
// KORRIGIERTE & VOLLSTÄNDIGE VERSION mit Logging

'use client';
import { useState, useMemo, useTransition, useEffect } from 'react';
import { Database, Tables, Enums } from '@/lib/supabase/database.types'; // Enums importieren
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // useRouter importieren
import { FiArrowLeft, FiPlus, FiTrash2, FiShoppingCart, FiSearch, FiAlertCircle, FiLoader, FiSend } from 'react-icons/fi';
import { siparisOlusturAction } from '@/app/actions/siparis-actions'; // Pfad prüfen!
import { toast } from 'sonner'; // toast importieren
import { Locale } from '@/i18n-config'; // Locale importieren

// Typen
type ProductOption = Pick<Tables<'urunler'>, 'id' | 'ad' | 'satis_fiyati_musteri' | 'satis_fiyati_alt_bayi' | 'stok_miktari'>;
type FirmaWithFinanz = Tables<'firmalar'> & { firmalar_finansal: Tables<'firmalar_finansal'> | null }; // Finanzdaten sind ein Objekt oder null
type FirmaOption = Pick<Tables<'firmalar'>, 'id' | 'unvan'>;
type UserRole = Enums<'user_role'> | null;
type OrderItemPayload = { // Typ für Action Payload
    urun_id: string;
    adet: number;
    o_anki_satis_fiyati: number;
};
type SepetItem = { // Typ für lokalen Warenkorb-State
    urunId: string;
    urunAdi: string;
    adet: number;
    stokMiktari: number;
    birimFiyat: number;
};

// Props für die Komponente
interface SiparisOlusturmaClientProps {
    firma: FirmaWithFinanz | null;
    firmenListe: FirmaOption[] | null;
    varsayilanTeslimatAdresi: string;
    urunler: ProductOption[];
    userRole: UserRole;
    locale: Locale;
}

export function SiparisOlusturmaClient({
    firma: initialFirma,
    firmenListe,
    varsayilanTeslimatAdresi,
    urunler,
    userRole,
    locale
}: SiparisOlusturmaClientProps) {

    const router = useRouter(); // Router initialisieren
    const [sepet, setSepet] = useState<SepetItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFirmaId, setSelectedFirmaId] = useState<string>(initialFirma?.id || '');
    const [aktuelleFirma, setAktuelleFirma] = useState<FirmaWithFinanz | null>(initialFirma);
    const [teslimatAdresi, setTeslimatAdresi] = useState(varsayilanTeslimatAdresi || aktuelleFirma?.adres || '');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null); // Für allgemeine Fehler

    // Effekt, um Adresse zu aktualisieren (Platzhalter für echtes Datenladen)
    useEffect(() => {
        if (!initialFirma && selectedFirmaId) {
            console.warn("Firmendaten (Adresse, Rabatt) müssen nach Auswahl von Firma ID:", selectedFirmaId, "geladen werden.");
            // Hier müssten Sie die Firmendaten inkl. firmalar_finansal laden
            // const geladeneFirma = await ladeFirmaDaten(selectedFirmaId);
            // setAktuelleFirma(geladeneFirma);
            // setTeslimatAdresi(geladeneFirma?.adres || '');
            setTeslimatAdresi(''); // Vorerst zurücksetzen
            setAktuelleFirma(null); // Vorerst zurücksetzen
        } else if (initialFirma) {
            setTeslimatAdresi(initialFirma.adres || '');
            setAktuelleFirma(initialFirma);
            setSelectedFirmaId(initialFirma.id); // Sicherstellen, dass ID gesetzt ist
        }
    }, [selectedFirmaId, initialFirma]);

    // Funktion zum Extrahieren des Produktnamens
    const getProductName = (urunAdJson: Database['public']['Tables']['urunler']['Row']['ad'] | null | undefined, currentLocale: Locale): string => {
        if (!urunAdJson || typeof urunAdJson !== 'object') return 'Produkt nicht gefunden';
        return (urunAdJson as any)[currentLocale]
            || (urunAdJson as any)['de']
            || (urunAdJson as any)['tr']
            || Object.values(urunAdJson)[0]
            || 'Name fehlt';
    };

    // Rabatt berechnen (basierend auf der *aktuellen* Firma)
    // Sicherer Zugriff auf firmalar_finansal, das ein Objekt oder null ist
    const indirimOrani = aktuelleFirma?.firmalar_finansal?.ozel_indirim_orani ?? 0;

    // Funktion zur Preisermittlung
    const getPreisFuerProdukt = (urun: ProductOption): number => {
        let basisPreis: number | null = null;
        // Annahme: 'Alt Bayi' Rolle verwendet alt_bayi Preis, alle anderen Kundenpreis
        if (userRole === 'Alt Bayi') {
            basisPreis = urun.satis_fiyati_alt_bayi;
        } else {
            basisPreis = urun.satis_fiyati_musteri;
        }

        if (basisPreis === null || basisPreis === undefined) {
            console.warn(`Preis für Produkt ${urun.id} (Name: ${getProductName(urun.ad, locale)}) und Rolle ${userRole} nicht definiert.`);
            return 0;
        }
        const rabattierterPreis = basisPreis * (1 - indirimOrani / 100);
        return rabattierterPreis;
    };

    // Produkt zum Warenkorb hinzufügen
    const urunEkle = (urun: ProductOption) => {
        const vorhandenesItem = sepet.find(item => item.urunId === urun.id);
        const aktuellerPreis = getPreisFuerProdukt(urun);
        const aktuellerStok = urun.stok_miktari ?? 0;

        if (aktuellerPreis <= 0) {
             toast.error(`Preis für ${getProductName(urun.ad, locale)} konnte nicht ermittelt werden.`);
             return;
        }

        if (vorhandenesItem) {
            const neueMenge = vorhandenesItem.adet + 1;
            if (neueMenge > aktuellerStok) {
                toast.warning(`Nicht genügend Lagerbestand für ${getProductName(urun.ad, locale)}! Max. ${aktuellerStok}.`);
                return;
            }
            setSepet(prev => prev.map(item => item.urunId === urun.id ? { ...item, adet: neueMenge, birimFiyat: aktuellerPreis } : item));
        } else {
            if (1 > aktuellerStok) {
                toast.error(`${getProductName(urun.ad, locale)} ist ausverkauft.`);
                return;
            }
            setSepet(prev => [
                ...prev,
                {
                    urunId: urun.id,
                    urunAdi: getProductName(urun.ad, locale),
                    adet: 1,
                    stokMiktari: aktuellerStok,
                    birimFiyat: aktuellerPreis
                }
            ]);
        }
    };

    // Produkt aus Warenkorb entfernen
    const sepettenCikar = (urunId: string) => {
        setSepet(prev => prev.filter(item => item.urunId !== urunId));
    };

    // Menge im Warenkorb aktualisieren
    const adetGuncelle = (urunId: string, neueMengeStr: string) => {
        const neueMenge = parseInt(neueMengeStr, 10);

        if (isNaN(neueMenge) || neueMenge < 0) {
             // Reset auf 1 bei ungültiger Eingabe? Oder alte Menge? Vorerst alte Menge.
             const item = sepet.find(i => i.urunId === urunId);
             if(item) {
                 // Trigger re-render mit alter Menge, um Input zu korrigieren
                 setSepet(prev => [...prev]);
                 toast.warning("Ungültige Menge eingegeben.");
             }
             return;
        }

        if (neueMenge === 0) {
            sepettenCikar(urunId);
            return;
        }

        const itemIndex = sepet.findIndex(item => item.urunId === urunId);
        if (itemIndex === -1) return;

        const item = sepet[itemIndex];
        if (neueMenge > item.stokMiktari) {
            toast.warning(`Nicht genügend Lagerbestand! Max. ${item.stokMiktari}.`);
             setSepet(prev => prev.map(i => i.urunId === urunId ? { ...i, adet: item.stokMiktari } : i)); // Auf Max setzen
            return;
        }

        setSepet(prev => prev.map(i => i.urunId === urunId ? { ...i, adet: neueMenge } : i));
    };

    // Produktliste filtern
    const filtrelenmisUrunler = useMemo(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        if (!lowerSearchTerm) return urunler;
        return urunler.filter(u =>
            getProductName(u.ad, locale).toLowerCase().includes(lowerSearchTerm) ||
            u.id.toLowerCase().includes(lowerSearchTerm)
            // TODO: Suche nach Produktcode hinzufügen
        );
    }, [searchTerm, urunler, locale]); // locale hinzugefügt

    // Gesamtbetrag (Netto)
    const gesamtBetragNetto = useMemo(() => sepet.reduce((acc, item) => acc + (item.birimFiyat * item.adet), 0), [sepet]);
    // TODO: KDV hinzufügen

    // Bestellung absenden
    const handleSiparisOnayla = () => {
        setError(null);

        // --- Logging ---
        console.log("handleSiparisOnayla aufgerufen.");
        console.log("Aktueller Warenkorb (sepet):", sepet);
        console.log("Ausgewählte Firma ID:", initialFirma?.id || selectedFirmaId);
        console.log("Lieferadresse:", teslimatAdresi);
        // --- Ende Logging ---

        const firmaZumSendenId = initialFirma?.id || selectedFirmaId;

        // --- Client-seitige Validierung ---
        if (!firmaZumSendenId) {
             const msg = "Bitte wählen Sie zuerst eine Firma aus.";
             setError(msg);
             toast.error(msg);
             return;
        }
        if (sepet.length === 0) {
            const msg = "Der Warenkorb ist leer. Bitte fügen Sie Produkte hinzu.";
            setError(msg);
            toast.error(msg); // Dieser Toast wird jetzt ausgelöst
            return; // Wichtig: Bricht hier ab!
        }
        if (!teslimatAdresi) {
             const msg = "Bitte geben Sie eine Lieferadresse an.";
             setError(msg);
             toast.error(msg);
             return;
        }
        // --- Ende Validierung ---

        startTransition(async () => {
            // Daten für Action vorbereiten
            const itemsToSubmit: OrderItemPayload[] = sepet.map(item => ({
                urun_id: item.urunId,
                adet: item.adet,
                o_anki_satis_fiyati: item.birimFiyat
            }));

            // Payload-Objekt
            const payload = {
                firmaId: firmaZumSendenId,
                teslimatAdresi: teslimatAdresi,
                items: itemsToSubmit,
                kaynak: 'Admin Paneli' as const
            };

            console.log("Sende Payload an siparisOlusturAction:", payload); // Log Payload
            const result = await siparisOlusturAction(payload);

            // Ergebnis verarbeiten
            if (result?.error) {
                setError(result.error);
                toast.error(`Fehler: ${result.error}`);
            } else if (result?.success && result.orderId) {
                toast.success(`Bestellung #${result.orderId.substring(0,8)} erfolgreich erstellt!`);
                setSepet([]); // Warenkorb leeren
                // Zurück zur Bestellliste der Firma
                 router.push(`/${locale}/admin/crm/firmalar/${firmaZumSendenId}/siparisler`);
            } else {
                 const msg = "Ein unbekannter Fehler ist aufgetreten.";
                 setError(msg);
                 toast.error(msg);
            }
        });
    };

    // Währungsformatierung
    const formatFiyat = (fiyat: number | null | undefined) => {
         if (fiyat === null || fiyat === undefined) return 'N/A';
         // Locale verwenden? Bisher war de-DE hartcodiert.
         return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(fiyat);
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Linke Spalte: Produktkatalog */}
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Produktkatalog</h2>
                {/* Suchleiste */}
                <div className="relative mb-4">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Produktname oder ID suchen..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-accent focus:border-accent"
                    />
                </div>
                {/* Produktliste */}
                <div className="max-h-96 overflow-y-auto space-y-2 pr-2 border rounded-md p-2">
                    {filtrelenmisUrunler.length > 0 ? (
                        filtrelenmisUrunler.map(urun => (
                            <div key={urun.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-100 transition-colors">
                                <div>
                                    <p className="font-semibold text-gray-800">{getProductName(urun.ad, locale)}</p>
                                    <p className="text-sm text-gray-500">
                                         Preis: {formatFiyat(getPreisFuerProdukt(urun))}
                                         <span className="ml-2">| Lager: {urun.stok_miktari ?? 0}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => urunEkle(urun)}
                                    disabled={(urun.stok_miktari ?? 0) <= 0}
                                    className="p-2 bg-accent text-white rounded-full hover:bg-opacity-80 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                                    title="Zum Warenkorb hinzufügen"
                                >
                                    <FiPlus />
                                </button>
                            </div>
                        ))
                    ) : (
                         <p className="text-gray-500 text-center py-4">Keine Produkte für Ihre Suche gefunden.</p>
                    )}
                </div>
            </div>

            {/* Rechte Spalte: Warenkorb/Bestellübersicht */}
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md border border-gray-200 sticky top-6">
                <h2 className="font-serif text-2xl font-bold text-primary flex items-center gap-2 mb-4">
                    <FiShoppingCart /> Bestellübersicht
                </h2>

                {/* Firmenauswahl (nur wenn keine firmaId übergeben wurde) */}
                {!initialFirma && firmenListe && (
                     <div className="mb-4">
                         <label htmlFor="firmaSelect" className="block text-sm font-bold text-gray-700 mb-1">Firma auswählen *</label>
                         <select
                             id="firmaSelect"
                             value={selectedFirmaId}
                             onChange={(e) => setSelectedFirmaId(e.target.value)}
                             required
                             className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
                         >
                             <option value="" disabled>Bitte Firma wählen...</option>
                             {firmenListe.map(f => (
                                 <option key={f.id} value={f.id}>{f.unvan}</option>
                             ))}
                         </select>
                     </div>
                 )}


                {/* Warenkorb-Liste */}
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 mb-4 border rounded-md p-2">
                    {sepet.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Warenkorb ist leer.</p>
                    ) : (
                        sepet.map(item => (
                            <div key={item.urunId} className="flex justify-between items-center border-b pb-2 last:border-b-0">
                                <div>
                                    <p className="font-semibold text-sm text-gray-800">{item.urunAdi}</p>
                                    <p className="text-xs text-gray-500">{formatFiyat(item.birimFiyat)} x {item.adet}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={item.adet}
                                        onChange={e => adetGuncelle(item.urunId, e.target.value)}
                                        min="0" // Erlaubt 0 zum Entfernen
                                        max={item.stokMiktari}
                                        className="w-16 p-1 text-center border rounded text-sm"
                                    />
                                    <button onClick={() => sepettenCikar(item.urunId)} className="p-1 text-red-500 hover:text-red-700" title="Entfernen">
                                        <FiTrash2 size={14}/>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Nur anzeigen, wenn Artikel im Korb sind */}
                {sepet.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        {/* Lieferadresse */}
                        <div className="mb-4">
                             <label htmlFor="teslimatAdresi" className="block text-sm font-bold text-gray-700 mb-1">Lieferadresse *</label>
                             <textarea
                                 id="teslimatAdresi"
                                 value={teslimatAdresi}
                                 onChange={(e) => setTeslimatAdresi(e.target.value)}
                                 rows={3}
                                 required
                                 className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm focus:ring-accent focus:border-accent"
                             />
                        </div>

                        {/* Rabattinfo */}
                        {indirimOrani > 0 && (
                            <p className="text-sm text-green-600 mb-2">
                                Ein Rabatt von {indirimOrani}% wurde angewendet.
                            </p>
                        )}

                        {/* Gesamtbetrag */}
                        <div className="flex justify-between items-center text-lg font-bold text-primary mb-4">
                            <span>Gesamt (Netto):</span>
                            <span>{formatFiyat(gesamtBetragNetto)}</span>
                            {/* TODO: KDV hinzufügen */}
                        </div>

                        {/* Fehlermeldung */}
                        {error && (
                            <p className="text-sm text-red-500 mb-4 flex items-center gap-1">
                                <FiAlertCircle /> {error}
                            </p>
                        )}

                        {/* Bestell-Button */}
                        <button
                            onClick={handleSiparisOnayla}
                            disabled={isPending || sepet.length === 0 || (!initialFirma && !selectedFirmaId)} // Deaktivieren, wenn keine Firma (initial oder ausgewählt) oder leerer Korb
                            className="w-full mt-2 p-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
                        >
                            {isPending ? <FiLoader className="animate-spin"/> : <FiSend />}
                            {isPending ? 'Wird bearbeitet...' : 'Bestellung abschließen'}
                        </button>
                    </div>
                )}
                 {/* Wenn Korb leer ist, Button deaktivieren und ggf. Hinweis anzeigen */}
                 {sepet.length === 0 && (
                     <button
                         disabled={true}
                         className="w-full mt-4 p-3 bg-gray-400 text-white font-bold rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
                     >
                         <FiShoppingCart /> Produkte hinzufügen
                     </button>
                 )}
            </div>
        </div>
    );
}