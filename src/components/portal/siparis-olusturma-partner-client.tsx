'use client';

// useEffect und useSearchParams hinzufügen
import { useEffect, useTransition, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // useSearchParams hinzufügen
import { FiTrash2, FiSend, FiLoader, FiShoppingCart } from 'react-icons/fi'; // FiImage hinzugefügt
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

function getKademeFiyat(produkt: any, toplamAdet: number): number {
    const paletAdet = Number(produkt.palet_ici_adet ?? produkt.palet_ici_koli_adet ?? 0) *
                      Number(produkt.koli_ici_adet ?? 1);
    const koliAdet = Number(produkt.koli_ici_adet ?? 1);

    if (paletAdet > 0 && toplamAdet >= paletAdet) {
        return Number(produkt.satis_fiyati_alt_bayi ?? produkt.satis_fiyati_musteri ?? 0);
    }
    if (toplamAdet >= 5 * koliAdet) {
        return Number(produkt.satis_fiyati_toptanci ?? produkt.satis_fiyati_musteri ?? 0);
    }
    return Number(produkt.satis_fiyati_musteri ?? produkt.partnerPreis ?? 0);
}

function getSepetItem(item: SepetUrunu) {
    const koliAdet = Number(item.produkt.koli_ici_adet ?? 1);
    const paletAdet = Number((item.produkt as any).palet_ici_adet ?? 0);
    const toplamAdet = item.birim === 'palet'
        ? item.menge * (paletAdet || koliAdet)
        : item.birim === 'koli'
            ? item.menge * koliAdet
            : item.menge;
    const adetFiyat = item.birim === 'palet'
        ? Number((item.produkt as any).satis_fiyati_alt_bayi ?? (item.produkt as any).satis_fiyati_musteri ?? 0)
        : getKademeFiyat(item.produkt, toplamAdet);
    const toplamFiyat = toplamAdet * adetFiyat;
    return { toplamAdet, adetFiyat, toplamFiyat, koliAdet, paletAdet };
}

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
                const koliAdet = Number(item.produkt.koli_ici_adet ?? 1);
                const toplamAdet = item.birim === 'koli'
                    ? item.menge * koliAdet
                    : item.menge;
                const { adetFiyat } = getSepetItem(item);

                return {
                    urun_id: item.produkt.id,
                    adet: toplamAdet,
                    o_anki_satis_fiyati: adetFiyat,
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
            const { toplamFiyat } = getSepetItem(item);
            return acc + toplamFiyat;
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
            <div className="lg:col-span-1 lg:sticky lg:top-24">
                <div className="bg-white p-6 rounded-2xl shadow-lg space-y-6 border border-gray-200">
                    <h2 className="font-serif text-2xl font-bold text-primary flex items-center gap-2"><FiShoppingCart /> {content.cartTitle || "Ihr Warenkorb"}</h2>

                    <div className="space-y-3 divide-y divide-gray-100 max-h-[50vh] overflow-y-auto pr-1">
                        {warenkorb.length > 0 ? warenkorb.map(item => {
                            const koliAdet = Number(item.produkt.koli_ici_adet ?? 1);
                            const { toplamAdet, adetFiyat, toplamFiyat } = getSepetItem(item);
                            const isKoli = item.birim === 'koli';

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
                                                    const paletAdetVal = Number(item.produkt.palet_ici_adet ?? 0);
                                                    if (b === 'palet' && paletAdetVal === 0) return null;
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
                                                {item.birim === 'koli' && koliAdet > 1 && (
                                                    <span className="text-[10px] text-gray-400 ml-1">
                                                        1 {locale === 'de' ? 'Ktn' : 'koli'} = {koliAdet} {locale === 'de' ? 'Stk' : 'adet'}
                                                    </span>
                                                )}
                                                {item.birim === 'palet' && (
                                                    <span className="text-[10px] text-gray-400 ml-1">
                                                        1 {locale === 'de' ? 'Pal' : 'palet'} = {Number(item.produkt.palet_ici_adet ?? 0)} {locale === 'de' ? 'Stk' : 'adet'}
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
                                                const koliSayisi = isKoli ? item.menge : 0;
                                                if (!isKoli) return null;
                                                if (koliSayisi >= 5) return (
                                                    <p className="text-[10px] text-blue-600 mt-1 font-semibold">
                                                        ✓ {locale === 'de' ? 'Mengenrabatt aktiv' : '5+ koli indirimi aktif'}
                                                    </p>
                                                );
                                                return (
                                                    <p className="text-[10px] text-gray-400 mt-1">
                                                        {locale === 'de'
                                                            ? `Ab ${5 - koliSayisi} Karton mehr: Mengenrabatt`
                                                            : `${5 - koliSayisi} koli daha: toplu indirim`}
                                                    </p>
                                                );
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
                                <span className="text-lg font-bold text-primary">
                                    {content.cartTotal || (locale === 'de' ? 'Gesamt:' : 'Toplam:')}
                                </span>
                                <div className="text-right">
                                    <span className="text-2xl font-bold text-accent">
                                        {formatCurrency(toplamTutar, locale)}
                                    </span>
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                        {locale === 'de' ? 'zzgl. MwSt.' : 'KDV hariç'} · {
                                            warenkorb.reduce((acc, item) => {
                                                const { toplamAdet } = getSepetItem(item);
                                                return acc + toplamAdet;
                                            }, 0)
                                        } {locale === 'de' ? 'Stk. gesamt' : 'adet toplam'}
                                    </p>
                                </div>
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