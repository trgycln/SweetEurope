'use client';

import { useEffect, useTransition, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiTrash2, FiSend, FiLoader, FiShoppingCart, FiX, FiCreditCard, FiFileText, FiTruck } from 'react-icons/fi';
import { siparisOlusturAction, topluSiparisOlusturAction } from '@/app/actions/siparis-actions';
import { createStripeCheckoutSessionAction } from '@/app/actions/stripe-actions';
import { calculateShipping } from '@/lib/shippingUtils';
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
                        initialCartItems.push({ produkt: urun, menge: adet, birim: 'koli' });
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


    const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'rechnung'>('stripe');

    // Extract PLZ from address or use fallback
    const plzMatch = firma?.adres ? firma.adres.match(/\b\d{5}\b/) : null;
    const partnerPlz = plzMatch ? plzMatch[0] : '';

    const normalItemsList = useMemo(() => warenkorb.filter(i => (i.produkt.stok_miktari ?? 0) > 0), [warenkorb]);
    const onSiparisItemsList = useMemo(() => warenkorb.filter(i => (i.produkt.stok_miktari ?? 0) <= 0), [warenkorb]);

    const toplamTutar = useMemo(() =>
        warenkorb.reduce((acc, item) => {
            const { toplamFiyat } = hesaplaSepetSatiri(item.produkt, item.birim, item.menge);
            return acc + toplamFiyat;
        }, 0)
    , [warenkorb]);

    const toplamKdv = useMemo(() =>
        warenkorb.reduce((acc, item) => {
            const kdvOrani = (item.produkt as any).kdv_orani ?? 19;
            const { toplamFiyat } = hesaplaSepetSatiri(item.produkt, item.birim, item.menge);
            return acc + (toplamFiyat * kdvOrani / 100);
        }, 0)
    , [warenkorb]);

    const shippingInfo = useMemo(() => {
        return calculateShipping(toplamTutar, partnerPlz);
    }, [toplamTutar, partnerPlz]);

    const kargoTutarKdvDahil = shippingInfo.shippingCost > 0 ? shippingInfo.shippingCost * 1.19 : 0;
    const genelToplam = toplamTutar + toplamKdv + kargoTutarKdvDahil;

    const toplamKoli = useMemo(() =>
        warenkorb.reduce((acc, item) => {
            const sepet = hesaplaSepetSatiri(item.produkt, item.birim, item.menge);
            const koliKismi = sepet.toplamAdet / sepet.koliIciAdet;
            return acc + koliKismi;
        }, 0)
    , [warenkorb]);

    const handleSiparisOnayla = () => {
        if (warenkorb.length === 0) {
            toast.error(content.error?.cartEmpty || 'Ihr Warenkorb ist leer.');
            return;
        }

        startTransition(async () => {
            if (paymentMethod === 'stripe') {
                const itemsToSubmit = warenkorb.map(item => {
                    const sepet = hesaplaSepetSatiri(item.produkt, item.birim, item.menge);
                    return {
                        urun_id: item.produkt.id,
                        ad: getLocalizedName(item.produkt.ad, locale) || (item.produkt as any).urun_kodu || (item.produkt as any).kod || 'Produkt',
                        adet: sepet.toplamAdet,
                        birimFiyatNet: sepet.adetFiyat,
                        kdvOrani: (item.produkt as any).kdv_orani ?? 19,
                    };
                });

                const stripeRes = await createStripeCheckoutSessionAction({
                    firmaId: firma?.id || '',
                    items: itemsToSubmit,
                    deliveryPlz: partnerPlz,
                    locale,
                });

                if (stripeRes.error) {
                    console.error('Stripe error received:', stripeRes.error);
                    toast.error(stripeRes.error);
                } else if (stripeRes.url) {
                    console.log('Redirecting to Stripe:', stripeRes.url);
                    window.location.href = stripeRes.url;
                }
                return;
            }

            // Split into Normal and Pre-Orders
            const normalPayload: any[] = [];
            const onSiparisPayload: any[] = [];

            warenkorb.forEach(item => {
                const sepet = hesaplaSepetSatiri(item.produkt, item.birim, item.menge);
                const isOutOfStock = (item.produkt.stok_miktari ?? 0) <= 0;
                const payload = {
                    urun_id: item.produkt.id,
                    adet: sepet.toplamAdet,
                    o_anki_satis_fiyati: sepet.adetFiyat,
                };
                if (isOutOfStock) {
                    onSiparisPayload.push(payload);
                } else {
                    normalPayload.push(payload);
                }
            });

            const result = await topluSiparisOlusturAction({
                firmaId: firma?.id || '',
                teslimatAdresi: firma?.adres || 'Adresse nicht angegeben',
                normalItems: normalPayload,
                onSiparisItems: onSiparisPayload,
                kaynak: 'Müşteri Portalı'
            });

            if (result?.error) {
                toast.error(result.error);
            } else if (result?.success) {
                toast.success(result.message || (locale === 'de' ? "Ihre Bestellung wurde erfolgreich erstellt!" : "Siparişiniz başarıyla oluşturuldu!"));
                clearWarenkorb();
                const targetId = result.normalOrderId || result.onSiparisOrderId;
                if (targetId) {
                    router.push(`/${locale}/portal/siparisler/${targetId}`);
                } else {
                    router.push(`/${locale}/portal/siparisler`);
                }
            }
        });
    };

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

            {/* --- Warenkorb-Anzeige (JSX) --- */}
            <div className="lg:col-span-1 lg:sticky lg:top-20 self-start">
                <div className="bg-white p-4 lg:p-5 rounded-2xl shadow-lg space-y-3.5 border border-gray-200 max-h-[calc(100vh-6rem)] overflow-y-auto">
                    <div className="flex items-center justify-between">
                        <h2 className="font-serif text-lg lg:text-xl font-bold text-primary flex items-center gap-2">
                            <FiShoppingCart className="text-accent" /> {content.cartTitle || (locale === 'de' ? 'Ihr Warenkorb' : 'Sepetiniz')}
                        </h2>
                        {warenkorb.length > 0 && (
                            <span className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                {warenkorb.length} {locale === 'de' ? 'Artikel' : 'Ürün'}
                            </span>
                        )}
                    </div>

                    {/* Vorbestellung Info Banner */}
                    {onSiparisItemsList.length > 0 && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-0.5">
                            <p className="font-bold flex items-center gap-1">
                                ⏳ {locale === 'de' ? 'Vorbestellung im Warenkorb' : 'Ön Sipariş Talebi'} ({onSiparisItemsList.length})
                            </p>
                            <p className="text-[11px] text-amber-700 leading-snug">
                                {locale === 'de'
                                    ? 'Nicht lagernde Artikel werden als separate Vorbestellung erfasst und bei Wareneingang geliefert.'
                                    : 'Stokta olmayan ürünler ayrı bir ön sipariş olarak kaydedilir ve ürün depoya ulaştığında sevk edilir.'}
                            </p>
                        </div>
                    )}

                    <div className="space-y-2.5 divide-y divide-gray-100 max-h-[24vh] overflow-y-auto pr-1">
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

                            {/* Versandkosten / Kargo */}
                            <div className="flex justify-between items-baseline gap-4 border-b border-gray-100 pb-2">
                                <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-500">
                                    <FiTruck size={15} className="text-gray-400" />
                                    <span>{locale === 'de' ? 'Lieferung:' : 'Teslimat:'}</span>
                                    {shippingInfo.isKolnArea && (
                                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                            Köln
                                        </span>
                                    )}
                                </div>
                                <div className="text-right">
                                    {shippingInfo.shippingCost === 0 ? (
                                        <span className="text-sm font-bold text-emerald-600">
                                            {locale === 'de' ? 'Kostenlos' : 'Ücretsiz'}
                                        </span>
                                    ) : (
                                        <div>
                                            <span className="text-sm font-bold text-gray-700">
                                                {formatCurrency(kargoTutarKdvDahil, locale)}
                                            </span>
                                            <span className="text-[10px] text-gray-400 ml-1">({locale === 'de' ? 'inkl. MwSt.' : 'KDV dahil'})</span>
                                        </div>
                                    )}
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

                            {/* Ödeme Yöntemi Seçimi */}
                            <div className="pt-2">
                                <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                                    {locale === 'de' ? 'Zahlungsart wählen:' : 'Ödeme Yöntemi Seçin:'}
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('stripe')}
                                        className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                                            paymentMethod === 'stripe'
                                                ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 text-indigo-900 shadow-sm'
                                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <FiCreditCard className={paymentMethod === 'stripe' ? 'text-indigo-600' : 'text-gray-400'} size={18} />
                                            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                                                Stripe
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold">{locale === 'de' ? 'Online-Zahlung' : 'Online Ödeme'}</p>
                                            <p className="text-[10px] text-gray-500">{locale === 'de' ? 'Kreditkarte & SEPA' : 'Kart & SEPA'}</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('rechnung')}
                                        className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                                            paymentMethod === 'rechnung'
                                                ? 'border-accent bg-amber-50/60 ring-2 ring-accent/20 text-amber-900 shadow-sm'
                                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <FiFileText className={paymentMethod === 'rechnung' ? 'text-accent' : 'text-gray-400'} size={18} />
                                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                                B2B
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold">{locale === 'de' ? 'Auf Rechnung' : 'Fatura ile'}</p>
                                            <p className="text-[10px] text-gray-500">{locale === 'de' ? 'Banküberweisung' : 'Banka Havalesi'}</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col justify-end gap-3 mt-4">
                                <button 
                                    onClick={handleSiparisOnayla} 
                                    disabled={isPending || toplamKoli < 1} 
                                    className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg shadow-md font-bold disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm ${
                                        paymentMethod === 'stripe'
                                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                                            : 'bg-accent hover:bg-opacity-90 text-white shadow-accent/20'
                                    }`}
                                >
                                    {isPending ? (
                                        <FiLoader className="animate-spin" />
                                    ) : paymentMethod === 'stripe' ? (
                                        <>
                                            <FiCreditCard size={18} />
                                            {locale === 'de' ? 'Mit Stripe sicher bezahlen' : 'Stripe ile Güvenli Öde'}
                                        </>
                                    ) : (
                                        <>
                                            <FiSend size={18} />
                                            {content.confirmOrderButton || (locale === 'de' ? 'Bestellung auf Rechnung senden' : 'Siparişi Fatura ile Gönder')}
                                        </>
                                    )}
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