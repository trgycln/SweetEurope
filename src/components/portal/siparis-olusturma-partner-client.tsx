'use client';

import { useEffect, useTransition, useMemo, useState, memo } from 'react';
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
import Link from 'next/link';
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

// Çekmece iskeleti anında açılır; ağır sepet içeriği ilk boyamadan sonra mount edilir.
const DeferredCartBody = memo(function DeferredCartBody({ children }: { children: React.ReactNode }) {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => setReady(true));
        return () => cancelAnimationFrame(id);
    }, []);
    if (!ready) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-accent" role="status" aria-live="polite">
                <FiLoader size={28} className="animate-spin" />
            </div>
        );
    }
    return <>{children}</>;
});

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
        setInitialWarenkorb,
        isCartDrawerOpen,
        setIsCartDrawerOpen
    } = usePortal();

    const [isPending, startTransition] = useTransition();
    // Sicherer Zugriff auf Dictionary-Texte
    const content = (dictionary as any)?.portal?.newOrderPage || {};
    const stockWarningText = (dictionary as any)?.portal?.dashboard?.quickOrder?.stockWarning || "Nicht genügend Lagerbestand! Max. {stock} verfügbar.";
    // Güvenli indirim oranı (firmalar_finansal nesne veya dizi olarak dönebilir)
    const finansal = Array.isArray(firma?.firmalar_finansal) ? firma?.firmalar_finansal[0] : firma?.firmalar_finansal;
    const indirimOrani = finansal?.ozel_indirim_orani ?? 0;

    // openCart URL parametresi kontrolü (başka sayfadan veya başlık ikonundan gelince otomatik açılması için)
    useEffect(() => {
        if (searchParams.get('openCart') === 'true') {
            setIsCartDrawerOpen(true);
        }
    }, [searchParams, setIsCartDrawerOpen]);

    // Mobil Sepet Çekmecesi açıkken arka plandaki sayfa kaydırmasını kilitle
    useEffect(() => {
        if (isCartDrawerOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isCartDrawerOpen]);

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
                        const koliIci = urun.koli_ici_adet || 1;
                        const isKoli = (adet % koliIci === 0);
                        const menge = isKoli ? Math.round(adet / koliIci) : adet;
                        const birim = isKoli ? 'koli' : 'adet';
                        
                        initialCartItems.push({ produkt: urun, menge: menge, birim: birim });
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

    // Posta kodunu öncelikle firmadan (veritabanından) al, yoksa adresten çıkart, yoksa boş
    const partnerPlz = firma?.posta_kodu || (firma?.adres ? (firma.adres.match(/\b\d{5}\b/)?.[0] || '') : '');

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
            const kdvOrani = (item.produkt as any).almanya_kdv_orani ?? 7;
            const { toplamFiyat } = hesaplaSepetSatiri(item.produkt, item.birim, item.menge);
            return acc + (toplamFiyat * kdvOrani / 100);
        }, 0)
    , [warenkorb]);

    const toplamAgirlikKg = useMemo(() =>
        warenkorb.reduce((acc, item) => {
            const sepet = hesaplaSepetSatiri(item.produkt, item.birim, item.menge);
            const agirlik = Number((item.produkt as any).agirlik_kg) || 0.7;
            return acc + (sepet.toplamAdet * agirlik);
        }, 0)
    , [warenkorb]);

    const shippingInfo = useMemo(() => {
        return calculateShipping(toplamTutar, partnerPlz, toplamAgirlikKg);
    }, [toplamTutar, partnerPlz, toplamAgirlikKg]);

    const kargoTutarKdvDahil = shippingInfo.shippingCostGross;
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
            // Removed client-side Stripe checkout logic, now handled in topluSiparisOlusturAction

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
                    ad: getLocalizedName(item.produkt.ad, locale) || (item.produkt as any).urun_kodu || (item.produkt as any).kod || 'Produkt',
                    kdv_orani: (item.produkt as any).almanya_kdv_orani ?? 7,
                };
                if (isOutOfStock) {
                    onSiparisPayload.push(payload);
                } else {
                    normalPayload.push(payload);
                }
            });

            const shippingMethodName = shippingInfo.isLocalDelivery
                ? (shippingInfo.shippingCostNet === 0 ? 'Köln/Bonn Kendi Araçlarımızla Teslimat (Ücretsiz)' : 'Köln/Bonn Kendi Araçlarımızla Teslimat (Standart)')
                : `DHL Paket (${toplamAgirlikKg.toFixed(1)} kg)`;

            const result = await topluSiparisOlusturAction({
                firmaId: firma?.id || '',
                teslimatAdresi: firma?.adres || 'Adresse nicht angegeben',
                normalItems: normalPayload,
                onSiparisItems: onSiparisPayload,
                kaynak: 'Müşteri Portalı',
                kargoTutariNet: shippingInfo.shippingCostNet,
                kargoKdvTutari: shippingInfo.shippingVatAmount,
                kargoTutariBrut: shippingInfo.shippingCostGross,
                kargoYontemi: shippingMethodName,
                paymentMethod,
                locale
            });

            if (result?.error) {
                toast.error(result.error);
            } else if (result?.success) {
                if ((result as any).stripeUrl) {
                    clearWarenkorb();
                    setIsCartDrawerOpen(false);
                    window.location.href = (result as any).stripeUrl;
                    return;
                }
                toast.success(result.message || (locale === 'de' ? "Ihre Bestellung wurde erfolgreich erstellt!" : "Siparişiniz başarıyla oluşturuldu!"));
                clearWarenkorb();
                setIsCartDrawerOpen(false);
                const targetId = result.normalOrderId || result.onSiparisOrderId;
                if (targetId) {
                    router.push(`/${locale}/portal/siparisler/${targetId}`);
                } else {
                    router.push(`/${locale}/portal/siparisler`);
                }
            }
        });
    };

    // --- Ortak Sepet İçeriği Bileşeni (Hem Masaüstü Sağ Kolon hem Mobil Çekmece İçin) ---
    const renderCartBody = (isDrawer = false) => (
        <>
            {/* Vorbestellung Info Banner */}
            {onSiparisItemsList.length > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-0.5">
                    <p className="font-bold flex items-center gap-1">
                        ⏳ {locale === 'de' ? 'Vorbestellung' : 'Ön Sipariş Sepeti'} ({onSiparisItemsList.length})
                    </p>
                    <p className="text-[11px] text-amber-700 leading-snug">
                        {locale === 'de'
                            ? 'Dieser Warenkorb enthält nur Vorbestellungen. Die Lieferung erfolgt, sobald die Artikel auf Lager sind.'
                            : 'Bu sepet sadece ön sipariş ürünlerini içermektedir. Ürünler depoya ulaştığında sevk edilecektir.'}
                    </p>
                </div>
            )}

            <div className="space-y-3 divide-y divide-gray-100">
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
                                            type="button"
                                            onClick={() => removeFromWarenkorb(item.produkt.id)}
                                            className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors flex-shrink-0 p-1.5"
                                            title={locale === 'de' ? 'Entfernen' : 'Kaldır'}
                                        >
                                            <FiTrash2 size={15} />
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
                                                    type="button"
                                                    key={b}
                                                    onClick={() => updateWarenkorbBirim(item.produkt.id, b)}
                                                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border transition-all ${
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
                                                type="button"
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
                                                type="button"
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
                                        if (item.birim === 'adet' && koliIciAdet > 1 && sepet.koliMiktar < 5) {
                                            const eksikAdet = 5 * koliIciAdet - toplamAdet;
                                            return (
                                                <p className="text-[10px] text-gray-400 mt-1">
                                                    {locale === 'de'
                                                        ? `Noch ${eksikAdet} Stk. bis zum Mengenrabatt (5 Kartons)`
                                                        : `${eksikAdet} adet daha: 5 koli toplu indirimi`}
                                                </p>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="text-center py-10 px-4 space-y-3">
                        <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                            <FiShoppingCart size={24} />
                        </div>
                        <p className="text-sm font-semibold text-gray-700">
                            {content.cartEmpty || (locale === 'de' ? 'Ihr Warenkorb ist leer.' : 'Sepetiniz henüz boş.')}
                        </p>
                        <p className="text-xs text-gray-400 max-w-xs mx-auto">
                            {locale === 'de' 
                                ? 'Fügen Sie Artikel aus dem Katalog hinzu.' 
                                : 'Katalogdan ürün seçerek sepetinizi oluşturmaya başlayabilirsiniz.'}
                        </p>
                        {isDrawer ? (
                            <Link
                                href={`/${locale}/portal/katalog`}
                                onClick={() => setIsCartDrawerOpen(false)}
                                className="mt-2 inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
                            >
                                {locale === 'de' ? 'Katalog durchsuchen' : 'Kataloğa Göz At'}
                            </Link>
                        ) : (
                            <Link
                                href={`/${locale}/portal/katalog`}
                                className="mt-2 inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
                            >
                                {locale === 'de' ? 'Katalog durchsuchen' : 'Kataloğa Göz At'}
                            </Link>
                        )}
                    </div>
                )}
            </div>

            {warenkorb.length > 0 && (
                <div className="pt-5 border-t border-gray-200 space-y-3.5">
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
                            {shippingInfo.isLocalDelivery ? (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                    Köln / Bonn
                                </span>
                            ) : (
                                <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.5 rounded">
                                    DHL ({toplamAgirlikKg.toFixed(1)} kg)
                                </span>
                            )}
                        </div>
                        <div className="text-right">
                            {shippingInfo.shippingCostNet === 0 ? (
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
                            id="complete-checkout-btn"
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
                            type="button"
                            onClick={() => { clearWarenkorb(); }}
                            className="flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-red-500 font-medium transition-colors py-1"
                        >
                            <FiX size={14} />
                            {locale === 'de' ? 'Warenkorb leeren' : 'Sepeti Temizle'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );

    // --- JSX (Layout und Katalog unverändert) ---
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto">
            <div className="lg:col-span-7 xl:col-span-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="font-serif text-3xl font-bold text-primary mb-2">{content.title || (locale === 'de' ? "Warenkorb & Kasse" : "Sepetim & Ödeme")}</h1>
                        <p className="text-text-main">{content.subtitle || (locale === 'de' ? "Überprüfen Sie Ihre Artikel und schließen Sie die Bestellung ab." : "Siparişinizi kontrol edip ödeme adımına geçebilirsiniz.")}</p>
                    </div>
                    <Link
                        href={`/${locale}/portal/katalog`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-accent hover:text-accent rounded-xl text-sm font-bold text-gray-600 transition-colors whitespace-nowrap shadow-sm"
                    >
                        <span>←</span>
                        <span>{locale === 'de' ? 'Weiter einkaufen' : 'Ürün Eklemeye Devam Et'}</span>
                    </Link>
                </div>
                
                {/* Masaüstü Sol Kolon Sepet Detayları (İsteğe bağlı burayı zenginleştirebiliriz, şimdilik boş veya sepeti buraya da koyabiliriz. Ancak sağ kolonda zaten sepet var. Sol kolona fatura adresi vs. özet koyalım) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">{locale === 'de' ? 'Rechnungs- & Lieferadresse' : 'Fatura & Teslimat Adresi'}</h3>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <p className="font-bold text-gray-900">{firma?.unvan}</p>
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{firma?.adres || (locale === 'de' ? 'Keine Adresse angegeben' : 'Adres belirtilmemiş')}</p>
                        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded">
                            <FiTruck size={14} />
                            {shippingInfo.isLocalDelivery 
                                ? (locale === 'de' ? 'Lokale Lieferung (Köln/Bonn)' : 'Yerel Teslimat (Köln/Bonn)') 
                                : (locale === 'de' ? 'Paketversand' : 'Paket Gönderimi')}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Masaüstü Sabit Sepet (Sağ Kolon) --- */}
            <div className="hidden lg:block lg:col-span-5 xl:col-span-4 lg:sticky lg:top-20 self-start">
                <div className="bg-white p-4 lg:p-5 rounded-2xl shadow-lg space-y-3.5 border border-gray-200 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-none">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <h2 className="font-serif text-lg lg:text-xl font-bold text-primary flex items-center gap-2">
                            <FiShoppingCart className="text-accent" /> {content.cartTitle || (locale === 'de' ? 'Ihr Warenkorb' : 'Sepetiniz')}
                        </h2>
                        {warenkorb.length > 0 && (
                            <span className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                {warenkorb.length} {locale === 'de' ? 'Artikel' : 'Ürün'}
                            </span>
                        )}
                    </div>
                    {renderCartBody(false)}
                </div>
            </div>


            {/* --- Mobil Sabit Sepet Çubuğu (Floating Bar) --- */}
            {warenkorb.length > 0 && (
                <div 
                    onClick={() => setIsCartDrawerOpen(true)}
                    className="fixed bottom-0 left-0 right-0 p-3.5 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-8px_25px_rgba(0,0,0,0.12)] lg:hidden z-30 flex items-center justify-between pb-6 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                            <FiShoppingCart size={20} />
                            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-accent text-white text-[10px] font-bold shadow-xs animate-pulse">
                                {warenkorb.length}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900 leading-tight">
                                {warenkorb.length} {locale === 'de' ? 'Artikel im Warenkorb' : 'Ürün Sepette'}
                            </p>
                            <p className="text-xs text-accent font-bold">
                                {locale === 'de' ? 'Gesamt' : 'Toplam'}: €{genelToplam.toFixed(2).replace('.', ',')}
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsCartDrawerOpen(true);
                        }}
                        className="bg-accent hover:bg-opacity-90 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                        <span>{locale === 'de' ? 'Zum Warenkorb' : 'Sepete Git'}</span>
                        <span className="text-xs font-bold">→</span>
                    </button>
                </div>
            )}

            {/* --- Mobil Açılır Sepet Çekmecesi (Bottom Sheet Drawer Modal) --- */}
            {isCartDrawerOpen && (
                <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
                    {/* Karartılmış Arka Plan (Backdrop) */}
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                        onClick={() => setIsCartDrawerOpen(false)}
                        aria-hidden="true"
                    />

                    {/* Çekmece Paneli (Sheet Panel) */}
                    <div 
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="cart-drawer-title"
                        className="relative z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] h-[90vh] overflow-hidden"
                    >
                        {/* Çekmece Başlığı ve Kapatma Butonu */}
                        <div className="pt-3 pb-3 px-5 border-b border-gray-100 flex-shrink-0 bg-white">
                            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-3" />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                                        <FiShoppingCart size={18} />
                                    </div>
                                    <h2 id="cart-drawer-title" className="font-serif text-lg font-bold text-primary">
                                        {content.cartTitle || (locale === 'de' ? 'Ihr Warenkorb' : 'Sepetiniz')}
                                    </h2>
                                    {warenkorb.length > 0 && (
                                        <span className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                            {warenkorb.length} {locale === 'de' ? 'Artikel' : 'Ürün'}
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsCartDrawerOpen(false)}
                                    className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                    aria-label="Kapat"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Kaydırılabilir Sepet Gövdesi */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-12">
                            <DeferredCartBody>{renderCartBody(true)}</DeferredCartBody>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}