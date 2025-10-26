'use client';

// useEffect und useSearchParams hinzufügen
import { useEffect, useTransition, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // useSearchParams hinzufügen
import { FiTrash2, FiSend, FiLoader, FiShoppingCart, FiImage } from 'react-icons/fi'; // FiImage hinzugefügt
import { siparisOlusturAction } from '@/app/actions/siparis-actions';
import Image from 'next/image';
import { toast } from 'sonner';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
// setInitialWarenkorb aus dem Context importieren
import { usePortal, ProduktImWarenkorb, SepetUrunu } from '@/contexts/PortalContext'; // SepetUrunu importieren
import Link from 'next/link';
import { getLocalizedName, formatCurrency } from '@/lib/utils';
import { UrunKatalogu } from './UrunKatalogu';

// Typen bleiben gleich
type UrunWithPrice = ProduktImWarenkorb;
type Kategori = { id: string; ad: any; ust_kategori_id: string | null };

interface SiparisOlusturmaClientProps {
    urunler: UrunWithPrice[]; // Diese Liste enthält ALLE Produkte
    kategoriler: Kategori[];
    favoriIdSet: Set<string>;
    dictionary: Dictionary;
    locale: Locale;
}

export function SiparisOlusturmaPartnerClient({ urunler, kategoriler, favoriIdSet, dictionary, locale }: SiparisOlusturmaClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams(); // SearchParams Hook holen
    const {
        warenkorb,
        updateWarenkorbMenge,
        removeFromWarenkorb,
        clearWarenkorb,
        firma,
        // addToWarenkorb, // Wird im Effekt nicht mehr direkt verwendet
        setInitialWarenkorb // Neue Funktion holen
    } = usePortal();

    const [isPending, startTransition] = useTransition();
    // Sicherer Zugriff auf Dictionary-Texte
    const content = (dictionary as any)?.portal?.newOrderPage || {};
    const stockWarningText = (dictionary as any)?.portal?.dashboard?.quickOrder?.stockWarning || "Nicht genügend Lagerbestand! Max. {stock} verfügbar.";
    const indirimOrani = firma?.firmalar_finansal?.[0]?.ozel_indirim_orani ?? 0; // Korrekter Typ-Name prüfen

    // +++ ANGEPASSTER useEffect Hook +++
    useEffect(() => {
        // Nur ausführen, wenn searchParams vorhanden und noch NICHT verarbeitet wurden
        const paramsExist = Array.from(searchParams.keys()).some(key => key.startsWith('urun_'));

        if (paramsExist && urunler.length > 0) {
            const initialCartItems: SepetUrunu[] = [];
            let itemsProcessed = false; // Flag, um sicherzustellen, dass nur einmal verarbeitet wird

            for (const [key, value] of searchParams.entries()) {
                if (key.startsWith('urun_') && value) {
                    const urunId = key.substring(5);
                    let adet = parseInt(value, 10);
                    const urun = urunler.find(u => u.id === urunId);

                    if (urun && adet > 0) {
                        itemsProcessed = true;
                        if (adet > urun.stok_miktari) {
                            toast.warning(stockWarningText.replace('{stock}', urun.stok_miktari.toString()));
                            adet = urun.stok_miktari;
                        }
                        if (adet > 0) {
                             initialCartItems.push({ produkt: urun, menge: adet });
                        }
                    }
                }
            }

            if (itemsProcessed) {
                // Warenkorb EINMALIG setzen
                setInitialWarenkorb(initialCartItems);
                // URL aufräumen
                router.replace(`/${locale}/portal/siparisler/yeni`, { scroll: false });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Leeres Array! Nur beim ersten Mount ausführen.
    // +++ ENDE useEffect Hook +++


    const handleSiparisOnayla = () => {
        if (warenkorb.length === 0) {
            toast.error(content.error?.cartEmpty || 'Ihr Warenkorb ist leer.');
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
                teslimatAdresi: firma.adres || 'Adresse nicht angegeben', // Übersetzt
                items: itemsToSubmit,
                kaynak: 'Müşteri Portalı'
            });

            if (result?.error) {
                toast.error(result.error);
            } else if (result?.success && result.orderId) {
                toast.success("Ihre Bestellung wurde erfolgreich erstellt!"); // Übersetzt
                clearWarenkorb();
                router.push(`/${locale}/portal/siparisler/${result.orderId}`);
            }
        });
    };

    const toplamTutar = useMemo(() => warenkorb.reduce((acc, item) => acc + (item.menge * (item.produkt.partnerPreis || 0)), 0), [warenkorb]);

    // --- JSX (Layout und Katalog unverändert) ---
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
                <h1 className="font-serif text-3xl font-bold text-primary mb-2">{content.title || "Neue Bestellung erstellen"}</h1>
                <p className="text-text-main mb-6">{content.subtitle || "Stellen Sie Ihren Warenkorb aus dem Katalog zusammen."}</p>
                <UrunKatalogu
                    initialUrunler={urunler}
                    kategoriler={kategoriler}
                    favoriIdSet={favoriIdSet}
                    dictionary={dictionary}
                    locale={locale}
                />
            </div>

            {/* --- Warenkorb-Anzeige (JSX unverändert, aber verwendet korrekten State) --- */}
            <div className="lg:col-span-1 lg:sticky lg:top-24">
                <div className="bg-white p-6 rounded-2xl shadow-lg space-y-6 border border-gray-200">
                    <h2 className="font-serif text-2xl font-bold text-primary flex items-center gap-2"><FiShoppingCart /> {content.cartTitle || "Ihr Warenkorb"}</h2>

                    <div className="space-y-4 divide-y divide-gray-200 max-h-[40vh] overflow-y-auto pr-2">
                        {warenkorb.length > 0 ? warenkorb.map(item => (
                            <div key={item.produkt.id} className="flex items-start gap-4 pt-4 first:pt-0">
                                <div className="flex-shrink-0">
                                    <Image
                                        src={item.produkt.ana_resim_url || '/placeholder.png'}
                                        alt={getLocalizedName(item.produkt.ad, locale)}
                                        width={64}
                                        height={64}
                                        className="rounded-md object-cover w-16 h-16 bg-gray-100"
                                        onError={(e) => { e.currentTarget.src = '/placeholder.png'; }}
                                    />
                                </div>
                                <div className="flex-grow min-w-0">
                                    <p className="font-bold text-primary truncate" title={getLocalizedName(item.produkt.ad, locale)}>{getLocalizedName(item.produkt.ad, locale)}</p>
                                    <p className="text-sm text-gray-500">{formatCurrency(item.produkt.partnerPreis, locale)}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <input
                                            type="number"
                                            value={item.menge}
                                            // Stellt sicher, dass die Eingabe als Zahl behandelt wird
                                            onChange={(e) => updateWarenkorbMenge(item.produkt.id, parseInt(e.target.value) || 0)}
                                            className="w-16 p-1 text-center border rounded-md"
                                            min="0"
                                            max={item.produkt.stok_miktari}
                                        />
                                        <p className="font-semibold">{formatCurrency(item.menge * (item.produkt.partnerPreis || 0), locale)}</p>
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    <button onClick={() => removeFromWarenkorb(item.produkt.id)} className="text-red-500 hover:text-red-700 p-1" title="Entfernen">
                                        <FiTrash2/>
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <p className="text-gray-500 text-center py-8">{content.cartEmpty || "Ihr Warenkorb ist leer."}</p>
                        )}
                    </div>

                    {warenkorb.length > 0 && (
                        <div className="pt-6 border-t border-gray-200 space-y-4">
                            {indirimOrani > 0 && <p className="text-sm font-semibold text-green-600 text-right">{content.cartDiscountApplied?.replace('{discount}', indirimOrani.toString())}</p>}
                            <div className="flex justify-between items-baseline gap-4">
                                <span className="text-lg font-bold text-primary">{content.cartTotal || "Gesamt:"}</span>
                                <span className="text-2xl font-bold text-accent">{formatCurrency(toplamTutar, locale)}</span>
                            </div>
                            <div className="flex flex-col justify-end gap-3">
                                <button onClick={handleSiparisOnayla} disabled={isPending} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-80 font-bold disabled:bg-opacity-60 disabled:cursor-wait">
                                    {isPending ? <FiLoader className="animate-spin"/> : <FiSend />}
                                    {content.confirmOrderButton || "Bestellung bestätigen"}
                                </button>
                                <Link href={`/${locale}/portal/katalog`} className="text-center text-sm text-gray-600 hover:text-primary font-semibold">
                                    {content.continueShopping || "Weiter einkaufen"}
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}