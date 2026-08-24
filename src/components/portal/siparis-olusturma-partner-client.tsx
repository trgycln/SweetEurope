'use client';

// useEffect und useSearchParams hinzufügen
import { useEffect, useTransition, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // useSearchParams hinzufügen
import { FiTrash2, FiSend, FiLoader, FiShoppingCart, FiX } from 'react-icons/fi';
import { siparisOlusturAction } from '@/app/actions/siparis-actions';
import Image from 'next/image';
import { toast } from 'sonner';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
// setInitialWarenkorb aus dem Context importieren
import { usePortal, ProduktImWarenkorb, SepetUrunu } from '@/contexts/PortalContext'; // SepetUrunu importieren
import { getLocalizedName, formatCurrency } from '@/lib/utils';
import { UrunKatalogu } from './UrunKatalogu';
import {
    hesaplaSepetSatiri, hesaplaToplamAdet, getKoliIciAdet,
    getPaletIciKoliAdet, getPaletToplamAdet, hasPaletOption,
} from '@/lib/pricingUtils';

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
        updateWarenkorbBirim,
        removeFromWarenkorb,
        clearWarenkorb,
        firma,
        setInitialWarenkorb
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
                             initialCartItems.push({ produkt: urun, menge: adet, birim: 'koli' });
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
            const itemsToSubmit = warenkorb.map(item => {
                const sepet = hesaplaSepetSatiri(item.produkt, item.birim, item.menge);

                return {
                    urun_id: item.produkt.id,
                    adet: sepet.toplamAdet,
                    o_anki_satis_fiyati: sepet.adetFiyat,
                };
            });

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

    const toplamTutar = useMemo(() =>
        warenkorb.reduce((acc, item) => {
            const { toplamFiyat } = hesaplaSepetSatiri(item.produkt, item.birim, item.menge);
            return acc + toplamFiyat;
        }, 0)
    , [warenkorb]);

    const toplamKdv = useMemo(() =>
        warenkorb.reduce((acc, item) => {
            const kdvOrani = (item.produkt as any).kdv_orani ?? 19; // Varsayılan KDV %19
            const { toplamFiyat } = hesaplaSepetSatiri(item.produkt, item.birim, item.menge);
            return acc + (toplamFiyat * kdvOrani / 100);
        }, 0)
    , [warenkorb]);

    const genelToplam = toplamTutar + toplamKdv;

    const toplamKoli = useMemo(() =>
        warenkorb.reduce((acc, item) => {
            const sepet = hesaplaSepetSatiri(item.produkt, item.birim, item.menge);
            // koliMiktar, 'koli' veya 'palet' seçildiyse zaten tam sayıdır, 'adet' seçildiyse koli adetine bölünür
            // Ancak toplam sepetteki *tüm* koli boyutunu bulmak istiyoruz. Adet cinsinden toplamı koliye çevirelim:
            const koliKismi = sepet.toplamAdet / sepet.koliIciAdet;
            return acc + koliKismi;
        }, 0)
    , [warenkorb]);

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
            <div className="lg:col-span-1 lg:sticky lg:top-20 self-start">
                <div className="bg-white p-6 rounded-2xl shadow-lg space-y-6 border border-gray-200">
                    <h2 className="font-serif text-2xl font-bold text-primary flex items-center gap-2"><FiShoppingCart /> {content.cartTitle || "Ihr Warenkorb"}</h2>

                    <div className="space-y-3 divide-y divide-gray-100 max-h-[50vh] overflow-y-auto pr-1">
                        {warenkorb.length > 0 ? warenkorb.map(item => {
                            const sepet = hesaplaSepetSatiri(item.produkt, item.birim, item.menge);
                            const { toplamAdet, adetFiyat, toplamFiyat, kademe, koliIciAdet, paletIciKoliAdet } = sepet;

                            return (
                                <div key={item.produkt.id} className="pt-3 first:pt-0">
                                    <div className="flex items-start gap-3">
                                        <Image
                                            src={item.produkt.ana_resim_url || '/placeholder.png'}
                                            alt={getLocalizedName(item.produkt.ad, locale)}
                                            width={52}
                                            height={52}
                                            className="rounded-lg object-cover w-13 h-13 bg-gray-100 flex-shrink-0"
                                            onError={(e) => { e.currentTarget.src = '/placeholder.png'; }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="font-semibold text-sm text-primary truncate leading-tight">
                                                    {getLocalizedName(item.produkt.ad, locale)}
                                                </p>
                                                <button
                                                    onClick={() => removeFromWarenkorb(item.produkt.id)}
                                                    className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 p-0.5"
                                                >
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </div>

                                            {/* Birim toggle */}
                                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                                {(['koli', 'adet', 'palet'] as const).map(b => {
                                                    if (b === 'palet' && !hasPaletOption(item.produkt)) return null;
                                                    const labels: Record<string, { de: string; tr: string }> = {
                                                        koli:  { de: 'Karton', tr: 'Koli'   },
                                                        adet:  { de: 'Stück',  tr: 'Adet'   },
                                                        palet: { de: 'Palette', tr: 'Palet' },
                                                    };
                                                    const isActive = item.birim === b;
                                                    return (
                                                        <button
                                                            key={b}
                                                            onClick={() => updateWarenkorbBirim(item.produkt.id, b)}
                                                            className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                                                                isActive
                                                                    ? b === 'palet'
                                                                        ? 'bg-purple-600 text-white border-purple-600'
                                                                        : b === 'adet'
                                                                            ? 'bg-slate-700 text-white border-slate-700'
                                                                            : 'bg-accent text-white border-accent'
                                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                                            }`}
                                                        >
                                                            {locale === 'de' ? labels[b].de : labels[b].tr}
                                                        </button>
                                                    );
                                                })}
                                                {item.birim === 'koli' && koliIciAdet > 1 && (
                                                    <span className="text-[10px] text-gray-400 ml-1">
                                                        1 {locale === 'de' ? 'Ktn' : 'koli'} = {koliIciAdet} {locale === 'de' ? 'Stk' : 'adet'}
                                                    </span>
                                                )}
                                                {item.birim === 'palet' && (
                                                    <span className="text-[10px] text-gray-400 ml-1">
                                                        1 {locale === 'de' ? 'Pal' : 'palet'} = {paletIciKoliAdet} {locale === 'de' ? 'Ktn' : 'koli'} / {getPaletToplamAdet(item.produkt)} {locale === 'de' ? 'Stk' : 'adet'}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateWarenkorbMenge(item.produkt.id, item.menge - 1)}
                                                        className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors text-sm font-bold"
                                                    >
                                                        −
                                                    </button>
                                                    <input
                                                        type="number"
                                                        value={item.menge}
                                                        onChange={(e) => updateWarenkorbMenge(item.produkt.id, parseInt(e.target.value) || 1)}
                                                        className="w-12 text-center text-sm font-bold border border-gray-200 rounded py-0.5 focus:ring-2 focus:ring-accent/30 focus:border-accent"
                                                        min="1"
                                                    />
                                                    <button
                                                        onClick={() => updateWarenkorbMenge(item.produkt.id, item.menge + 1)}
                                                        className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors text-sm font-bold"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-sm text-gray-800">
                                                        {formatCurrency(toplamFiyat, locale)}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">
                                                        {toplamAdet} {locale === 'de' ? 'Stk' : 'adet'} × {formatCurrency(adetFiyat, locale)}
                                                    </p>
                                                </div>
                                            </div>

                                            {(() => {
                                                if (kademe === 'toptanci') return (
                                                    <p className="text-[10px] text-blue-600 mt-1 font-semibold">
                                                        ✓ {locale === 'de' ? 'Mengenrabatt aktiv' : '5+ koli indirimi aktif'}
                                                    </p>
                                                );
                                                if (kademe === 'palet') return (
                                                    <p className="text-[10px] text-purple-600 mt-1 font-semibold">
                                                        ✓ {locale === 'de' ? 'Palettenpreis' : 'Palet fiyatı'}
                                                    </p>
                                                );
                                                if (item.birim === 'koli' && item.menge < 5) return (
                                                    <p className="text-[10px] text-gray-400 mt-1">
                                                        {locale === 'de'
                                                            ? `Ab ${5 - item.menge} Karton mehr: Mengenrabatt`
                                                            : `${5 - item.menge} koli daha: toplu indirim`}
                                                    </p>
                                                );
                                                return null;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="text-gray-400 text-center py-8 text-sm">
                                {content.cartEmpty || (locale === 'de' ? 'Ihr Warenkorb ist leer.' : 'Sepetiniz boş.')}
                            </p>
                        )}
                    </div>

                    {warenkorb.length > 0 && (
                        <div className="pt-6 border-t border-gray-200 space-y-4">
                            {indirimOrani > 0 && <p className="text-sm font-semibold text-green-600 text-right">{content.cartDiscountApplied?.replace('{discount}', indirimOrani.toString())}</p>}
                            <div className="flex justify-between items-baseline gap-4">
                                <span className="text-sm font-semibold text-gray-500">
                                    {locale === 'de' ? 'Netto:' : 'Ara Toplam:'}
                                </span>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-gray-700">
                                        {formatCurrency(toplamTutar, locale)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-baseline gap-4 border-b border-gray-100 pb-2">
                                <span className="text-sm font-semibold text-gray-500">
                                    {locale === 'de' ? 'MwSt.:' : 'KDV:'}
                                </span>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-gray-700">
                                        {formatCurrency(toplamKdv, locale)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-baseline gap-4">
                                <span className="text-lg font-bold text-primary">
                                    {content.cartTotal || (locale === 'de' ? 'Gesamt:' : 'Genel Toplam:')}
                                </span>
                                <div className="text-right">
                                    <span className="text-2xl font-bold text-accent">
                                        {formatCurrency(genelToplam, locale)}
                                    </span>
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                        {
                                            warenkorb.reduce((acc, item) => {
                                                const { toplamAdet } = hesaplaSepetSatiri(item.produkt, item.birim, item.menge);
                                                return acc + toplamAdet;
                                            }, 0)
                                        } {locale === 'de' ? 'Stk. gesamt' : 'adet toplam'}
                                    </p>
                                </div>
                            </div>
                            
                            {toplamKoli < 1 && (
                                <div className="bg-red-50 text-red-600 text-xs p-3 rounded-md font-semibold text-center border border-red-100">
                                    {locale === 'de' 
                                        ? 'Der Mindestbestellwert beträgt 1 Karton. Bitte fügen Sie weitere Artikel hinzu.' 
                                        : 'Minimum sipariş miktarı 1 kolidir. Lütfen sepetinize ürün ekleyin.'}
                                </div>
                            )}

                            <div className="bg-blue-50 text-blue-700 text-[11px] p-3 rounded-md text-center border border-blue-100 mt-2">
                                {locale === 'de' 
                                    ? 'Hinweis: Bei Lieferungen außerhalb des Kölner Raums werden die Versandkosten nach der Bestellung separat in der Rechnung ausgewiesen.' 
                                    : 'Not: Teslimat adresiniz Köln bölgesi dışındaysa, kargo ücreti sipariş sonrası faturanıza ayrıca yansıtılacaktır.'}
                            </div>

                            <div className="flex flex-col justify-end gap-3 mt-4">
                                <button onClick={handleSiparisOnayla} disabled={isPending || toplamKoli < 1} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-80 font-bold disabled:bg-opacity-60 disabled:cursor-not-allowed transition-all">
                                    {isPending ? <FiLoader className="animate-spin"/> : <FiSend />}
                                    {content.confirmOrderButton || "Bestellung bestätigen"}
                                </button>
                                <button
                                    onClick={() => { clearWarenkorb(); }}
                                    className="flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-red-500 font-medium transition-colors py-1"
                                >
                                    <FiX size={14} />
                                    {locale === 'de' ? 'Warenkorb leeren' : 'Sepeti Temizle'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}