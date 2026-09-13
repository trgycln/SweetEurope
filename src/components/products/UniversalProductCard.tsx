'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiPackage, FiChevronRight, FiHeart, FiShoppingCart, FiPlus, FiCheck } from 'react-icons/fi';
import { LuPackage, LuBarcode, LuThermometerSnowflake, LuThermometer } from 'react-icons/lu';
import { ProductDietaryBadges } from '@/components/DietaryStickers';
import { computeTedarikDurumu } from '@/lib/utils';

// ─── Aroma Config ─────────────────────────────────────────────────────────────
const TAT_CONFIG: Record<string, { emoji: string; de: string; tr: string; en: string; ar: string }> = {
    'karamell':        { emoji: '🍮', de: 'Karamell',          tr: 'Karamel', en: 'Caramel', ar: 'كراميل' },
    'schokolade':      { emoji: '🍫', de: 'Schokolade',        tr: 'Çikolata', en: 'Chocolate', ar: 'شوكولاتة' },
    'nuss':            { emoji: '🌰', de: 'Nuss',              tr: 'Fındık', en: 'Hazelnut', ar: 'بندق' },
    'zitrone':         { emoji: '🍋', de: 'Zitrone',           tr: 'Limon', en: 'Lemon', ar: 'ليمون' },
    'mango':           { emoji: '🥭', de: 'Mango',             tr: 'Mango', en: 'Mango', ar: 'مانجو' },
    'erdbeere':        { emoji: '🍓', de: 'Erdbeere',          tr: 'Çilek', en: 'Strawberry', ar: 'فراولة' },
    'himbeere':        { emoji: '🫐', de: 'Himbeere',          tr: 'Ahududu', en: 'Raspberry', ar: 'توت العليق' },
    'blaubeere':       { emoji: '🫐', de: 'Blaubeere',         tr: 'Yaban Mersini', en: 'Blueberry', ar: 'توت أزرق' },
    'banane':          { emoji: '🍌', de: 'Banane',            tr: 'Muz', en: 'Banana', ar: 'موز' },
    'apfel':           { emoji: '🍏', de: 'Apfel',             tr: 'Elma', en: 'Apple', ar: 'تفاح' },
    'pfirsich':        { emoji: '🍑', de: 'Pfirsich',          tr: 'Şeftali', en: 'Peach', ar: 'خوخ' },
    'kirsche':         { emoji: '🍒', de: 'Kirsche',           tr: 'Kiraz', en: 'Cherry', ar: 'كرز' },
    'ananas':          { emoji: '🍍', de: 'Ananas',            tr: 'Ananas', en: 'Pineapple', ar: 'أناناس' },
    'kokos':           { emoji: '🥥', de: 'Kokos',             tr: 'Hindistan Cevizi', en: 'Coconut', ar: 'جوز الهند' },
    'vanille':         { emoji: '🌿', de: 'Vanille',           tr: 'Vanilya', en: 'Vanilla', ar: 'فانيلا' },
    'minze':           { emoji: '🌱', de: 'Minze',             tr: 'Nane', en: 'Mint', ar: 'نعناع' },
    'pistazie':        { emoji: '✨', de: 'Pistazie',          tr: 'Antep Fıstığı', en: 'Pistachio', ar: 'فستق' },
};

function formatCurrency(val: number | null | undefined): string {
    if (val == null || isNaN(val)) return '—';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);
}

function getStorageType(urun: any): 'tiefkuehl' | 'kuehlware' | 'trocken' {
    if (urun.lagerung_typ) return urun.lagerung_typ;
    const maxT = urun.lagertemperatur_max_celsius;
    if (maxT !== null && maxT !== undefined) {
        if (maxT <= -15) return 'tiefkuehl';
        if (maxT <= 8) return 'kuehlware';
    }
    return 'trocken';
}

export interface UniversalProductCardProps {
    urun: any;
    locale: string;
    kategoriAdi?: string;
    detailHref?: string;
    isLoggedIn?: boolean;
    partnerTier?: string;
    userRole?: string;
    
    // Favorites
    isFavorit?: boolean;
    onToggleFavorite?: (e: React.MouseEvent) => void;
    isFavoritePending?: boolean;
    
    // Action (Add to Cart / Merkliste)
    inMerkliste?: boolean;
    onAction?: (e: React.MouseEvent) => void;
    actionType?: 'cart' | 'merkliste';
    actionTooltip?: string;
    
    dictionary?: any;
}

export function UniversalProductCard({
    urun,
    locale,
    kategoriAdi: providedKategoriAdi,
    detailHref: providedDetailHref,
    isLoggedIn = false,
    partnerTier,
    userRole,
    isFavorit,
    onToggleFavorite,
    isFavoritePending = false,
    inMerkliste = false,
    onAction,
    actionType = 'cart',
    actionTooltip,
    dictionary,
}: UniversalProductCardProps) {
    const tekniks = (urun.teknik_ozellikler || {}) as Record<string, unknown>;
    const name = typeof urun.ad === 'object'
        ? (urun.ad?.[locale] || urun.ad?.['de'] || urun.ad?.['tr'] || Object.values(urun.ad)[0] || '')
        : String(urun.ad || '');
    
    const kategoriAdi = providedKategoriAdi || (urun.kategoriler?.ad ? (typeof urun.kategoriler.ad === 'object' ? urun.kategoriler.ad[locale] || urun.kategoriler.ad['de'] : urun.kategoriler.ad) : '');
    const detailHref = providedDetailHref || `/${locale}/products/${urun.slug || urun.id}`;

    // Aroma lookup
    const geschmackRaw = (tekniks.geschmack as string | string[] | null);
    const rawKey = Array.isArray(geschmackRaw) ? geschmackRaw[0] : (geschmackRaw || '');
    const cleanKey = String(rawKey || '').toLowerCase().trim();
    const tatEntry = cleanKey ? (TAT_CONFIG[cleanKey] || Object.entries(TAT_CONFIG).find(([k]) => cleanKey.includes(k))?.[1]) : null;
    const aromaName = tatEntry ? (tatEntry[locale as 'de'|'tr'|'en'|'ar'] || tatEntry.de) : (cleanKey ? cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1) : null);
    const aromaEmoji = tatEntry?.emoji || '✨';

    const koliIciAdet = Number(urun.koli_ici_adet ?? 0);
    const paletIciKoliAdet = Number(urun.palet_ici_koli_adet ?? urun.palet_ici_adet ?? 0);
    const paletToplamAdet = paletIciKoliAdet * (koliIciAdet > 0 ? koliIciAdet : 1);
    const kg = urun.birim_agirlik_kg;

    // Stock computation
    const stokMiktari = urun.stok_miktari ?? 0;
    const inStock = stokMiktari > 0;
    const tedarikDurumu = computeTedarikDurumu(stokMiktari, urun.stok_tukenme_tarihi);

    const isBestseller = urun.is_bestseller === true;
    const isFeatured = urun.is_featured === true;

    // Storage badge calculation
    const storageType = getStorageType(urun);
    const tempMax = urun.lagertemperatur_max_celsius;
    const tempMin = urun.lagertemperatur_min_celsius;

    // Pricing Rows
    const koliFiyat = Number(urun.satis_fiyati_musteri ?? 0);
    const toptanFiyat = Number(urun.satis_fiyati_toptanci ?? 0);
    
    // Palet fiyatı: Normalde satis_fiyati_palet; Alt Bayi rolündeyse satis_fiyati_alt_bayi
    let rawPalet = Number(
        userRole === 'Alt Bayi'
            ? (urun.satis_fiyati_alt_bayi ?? urun.satis_fiyati_palet ?? toptanFiyat ?? koliFiyat)
            : (urun.satis_fiyati_palet ?? urun.satis_fiyati_alt_bayi ?? toptanFiyat ?? koliFiyat)
    );

    // Safeguard: 1 Palet fiyatı toptan (5+ koli) fiyatından asla yüksek olamaz!
    if (rawPalet > toptanFiyat && toptanFiyat > 0) {
        if (urun.satis_fiyati_alt_bayi && Number(urun.satis_fiyati_alt_bayi) > 0 && Number(urun.satis_fiyati_alt_bayi) <= toptanFiyat) {
            rawPalet = Number(urun.satis_fiyati_alt_bayi);
        } else {
            rawPalet = toptanFiyat;
        }
    }
    const paletFiyat = rawPalet;

    const pricingRows = [
        {
            label: dictionary?.publicProductsPage?.oneCarton || (locale === 'tr' ? `1 Koli${koliIciAdet > 0 ? ` (${koliIciAdet} ad.)` : ''}` : locale === 'en' ? `1 Carton${koliIciAdet > 0 ? ` (${koliIciAdet} pcs)` : ''}` : locale === 'ar' ? `1 كرتونة` : `1 Karton${koliIciAdet > 0 ? ` (${koliIciAdet} Stk.)` : ''}`),
            price: koliFiyat,
            tierKey: 'koli_bazli',
        },
        {
            label: dictionary?.publicProductsPage?.from5Cartons || (locale === 'tr' ? '5 Koli+' : locale === 'en' ? '5 Cartons+' : locale === 'ar' ? '5 كراتين+' : 'Ab 5 Kartons'),
            price: toptanFiyat,
            tierKey: 'cok_koli',
        },
        {
            label: paletIciKoliAdet > 0
                ? (locale === 'tr' ? `1 Palet (${paletIciKoliAdet} koli)` : locale === 'en' ? `1 Pallet (${paletIciKoliAdet} ctns)` : locale === 'ar' ? `1 منصة (${paletIciKoliAdet} كرتونة)` : `1 Palette (${paletIciKoliAdet} Ktn.)`)
                : (locale === 'tr' ? '1 Palet' : locale === 'en' ? '1 Pallet' : locale === 'ar' ? '1 منصة' : '1 Palette'),
            price: paletFiyat,
            tierKey: 'palet',
        },
    ];

    // Primary price resolution for logged-in footer
    let primaryPrice = koliFiyat;
    let primaryPriceLabel = dictionary?.publicProductsPage?.oneCarton || (locale === 'tr' ? '1 Koli' : '1 Karton');
    if (userRole === 'Alt Bayi' || partnerTier === 'palet') {
        primaryPrice = paletFiyat || koliFiyat;
        primaryPriceLabel = locale === 'tr' ? 'Palet Fiyatı' : 'Palettenpreis';
    } else if (partnerTier === 'cok_koli') {
        primaryPrice = toptanFiyat || koliFiyat;
        primaryPriceLabel = locale === 'tr' ? '5+ Koli Fiyatı' : 'Ab 5 Kartons';
    } else if (urun.partnerPreis != null && urun.partnerPreis > 0) {
        primaryPrice = urun.partnerPreis;
        primaryPriceLabel = locale === 'tr' ? 'Size Özel' : 'Ihr Preis';
    }

    const hasAnyPrice = pricingRows.some(r => r.price != null && r.price > 0);

    return (
        <div className="group h-full flex flex-col relative bg-white border border-stone-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:border-amber-400/60 hover:-translate-y-1 transition-all duration-300 z-10">
            {/* Top Favorite Button (if onToggleFavorite provided) */}
            {onToggleFavorite && (
                <button
                    onClick={onToggleFavorite}
                    disabled={isFavoritePending}
                    title={isFavorit ? (locale === 'tr' ? 'Favorilerden çıkar' : 'Von Favoriten entfernen') : (locale === 'tr' ? 'Favorilere ekle' : 'Zu Favoriten hinzufügen')}
                    className={`absolute top-2.5 right-2.5 z-20 p-1.5 rounded-full backdrop-blur-xs transition-all ${
                        isFavorit
                            ? 'bg-rose-500 text-white shadow-xs scale-105'
                            : 'bg-white/85 text-stone-400 hover:text-rose-500 hover:bg-white shadow-2xs'
                    }`}
                >
                    <FiHeart size={15} fill={isFavorit ? 'currentColor' : 'none'} />
                </button>
            )}

            {/* Image Area */}
            <Link href={detailHref} className="block relative h-52 overflow-hidden flex-shrink-0 bg-stone-50/50">
                <div className="w-full h-full relative p-3 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                    {urun.ana_resim_url ? (
                        <Image
                            src={`/api/isolate-image?url=${encodeURIComponent(urun.ana_resim_url)}`}
                            alt={name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            className="object-contain drop-shadow-xs filter transition-all duration-300 group-hover:drop-shadow-md"
                            unoptimized
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <FiPackage className="w-10 h-10 text-stone-300" />
                        </div>
                    )}
                </div>

                {/* Status badges — top right (offset if heart button is present) */}
                <div className={`absolute top-2 ${onToggleFavorite ? 'right-10' : 'right-2'} flex flex-col items-end gap-1 pointer-events-none`}>
                    {isBestseller && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                            🏆 Bestseller
                        </span>
                    )}
                    {isFeatured && !isBestseller && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-stone-800 text-white shadow-xs">
                            Empfohlen
                        </span>
                    )}
                </div>

                {/* Storage badge — top left */}
                <div className="absolute top-2 left-2 pointer-events-none">
                    {storageType === 'tiefkuehl' && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-stone-800 text-white shadow-xs">
                            <LuThermometerSnowflake size={9} /> {tempMax != null ? `${tempMax}°C` : (locale === 'tr' ? 'Donuk' : 'Tiefkühl')}
                        </span>
                    )}
                    {storageType === 'kuehlware' && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
                            <LuThermometer size={9} /> {tempMin != null && tempMax != null ? `${tempMin}–${tempMax}°C` : (locale === 'tr' ? 'Soğuk' : 'Kühlware')}
                        </span>
                    )}
                </div>
            </Link>

            {/* Content Area */}
            <div className="flex flex-col flex-1 p-3.5 gap-1">
                {/* Category + Flavor + Stock Status */}
                <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                        {kategoriAdi && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 truncate">
                                {kategoriAdi}
                            </span>
                        )}
                        {aromaName && (
                            <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 flex-shrink-0" title={`Aroma: ${aromaName}`}>
                                <span>{aromaEmoji}</span>
                                <span>{aromaName}</span>
                            </span>
                        )}
                    </div>

                    {/* Stock indicator */}
                    {tedarikDurumu === 'tukendi' ? (
                        <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-rose-600 flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {locale === 'tr' ? 'Tükendi' : 'Ausverkauft'}
                        </span>
                    ) : inStock ? (
                        <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-emerald-700 flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {dictionary?.publicProductsPage?.available || (locale === 'tr' ? 'Stokta var' : 'Verfügbar')}
                        </span>
                    ) : (
                        <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-stone-400 flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                            {dictionary?.publicProductsPage?.onRequest || (locale === 'tr' ? 'Talep üzerine' : 'Auf Anfrage')}
                        </span>
                    )}
                </div>

                {/* SKU / Art.-Nr. & Barcode */}
                <div className="flex items-center gap-2 flex-wrap text-[10.5px] font-mono leading-none my-0.5">
                    {urun.stok_kodu && (
                        <span className="text-amber-950 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/90 tracking-wide">
                            Art.-Nr.: {urun.stok_kodu}
                        </span>
                    )}
                    {urun.ean_gtin && (
                        <span className="text-stone-400 flex items-center gap-1">
                            <LuBarcode size={10} /> {urun.ean_gtin}
                        </span>
                    )}
                </div>

                {/* Product Name */}
                <Link href={detailHref}>
                    <h3 className="text-[14.5px] font-bold text-stone-900 leading-snug line-clamp-2 min-h-[42px] group-hover:text-amber-700 transition-colors">
                        {name}
                    </h3>
                </Link>

                {/* Packaging & Logistics Chips */}
                <div className="flex flex-wrap gap-1.5 my-0.5">
                    {koliIciAdet > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold border px-2 py-0.5 rounded-full bg-stone-100/90 text-stone-700 border-stone-200">
                            <LuPackage size={10} />
                            {koliIciAdet} {dictionary?.publicProductsPage?.piecesPerCarton || (locale === 'tr' ? 'ad./koli' : 'Stk./Ktn.')}
                        </span>
                    )}
                    {paletIciKoliAdet > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold border px-2 py-0.5 rounded-full bg-stone-100/90 text-stone-700 border-stone-200">
                            {paletIciKoliAdet} {dictionary?.publicProductsPage?.cartonsPerPallet || (locale === 'tr' ? 'koli/pal.' : 'Ktn./Pal.')}
                        </span>
                    )}
                    {kg && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold border px-2 py-0.5 rounded-full bg-stone-100/90 text-stone-700 border-stone-200">
                            {kg} kg
                        </span>
                    )}
                </div>

                {/* Dietary Badges */}
                <div className="min-h-[22px] flex items-center">
                    <ProductDietaryBadges
                        teknikOzellikler={urun.teknik_ozellikler as any}
                        zertifikate={urun.zertifikate}
                        size="sm"
                    />
                </div>

                {/* Pricing Tiers (Logged in / Wholesale tiers) */}
                {isLoggedIn && hasAnyPrice && (
                    <div className="mt-2 space-y-1">
                        {pricingRows.map((row, i) => {
                            if (!row.price || row.price <= 0) return null;
                            const isHighlighted = partnerTier === row.tierKey || (userRole === 'Alt Bayi' && row.tierKey === 'palet');
                            return (
                                <div
                                    key={i}
                                    className={`flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg text-xs font-mono transition-all duration-200 ${
                                        isHighlighted
                                            ? 'bg-amber-50 border border-amber-300 text-amber-900 font-bold'
                                            : 'text-stone-600 bg-stone-50 border border-stone-100 hover:border-stone-200'
                                    }`}
                                >
                                    <span className={`truncate min-w-0 text-[11px] ${isHighlighted ? 'text-amber-950 font-semibold' : 'text-stone-600'}`}>
                                        {row.label}
                                    </span>
                                    <span className={`font-bold tracking-wide text-xs whitespace-nowrap flex-shrink-0 ${isHighlighted ? 'text-amber-900' : 'text-stone-900'}`}>
                                        {formatCurrency(row.price)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Card Footer: Always pinned with mt-auto */}
                <div className="mt-auto pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    {!isLoggedIn ? (
                        /* Guest state: Price on Request + Details CTA */
                        <>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-mono text-amber-800 font-semibold tracking-wider uppercase">
                                    {dictionary?.publicProductsPage?.priceLogin || 'PREIS AUF ANFRAGE'}
                                </span>
                                <span className="text-[11px] text-stone-400 truncate">
                                    {locale === 'tr' ? 'B2B Girişi Yapın' : 'Für Partnerpreise'}
                                </span>
                            </div>
                            <Link
                                href={detailHref}
                                className="h-8.5 px-3.5 rounded-xl bg-stone-900 text-white hover:bg-amber-600 transition-all text-xs font-bold flex items-center justify-center gap-1 shadow-xs flex-shrink-0"
                            >
                                {dictionary?.publicProductsPage?.details || 'Details'}
                                <FiChevronRight size={13} />
                            </Link>
                        </>
                    ) : (
                        /* Logged-in state: Primary price on left + Sleek Compact Action Button on right */
                        <>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-stone-400 font-medium uppercase tracking-wider leading-none truncate">
                                    {primaryPriceLabel}
                                </span>
                                <div className="flex items-baseline gap-1 mt-0.5">
                                    <span className="text-base sm:text-lg font-bold font-mono text-stone-900 tracking-tight leading-tight">
                                        {formatCurrency(primaryPrice)}
                                    </span>
                                    <span className="text-[9.5px] font-mono text-stone-400">zzgl.</span>
                                </div>
                            </div>

                            {/* Compact Icon Action Button (replaces the huge repetitive text button) */}
                            {onAction ? (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onAction(e);
                                    }}
                                    title={inMerkliste
                                        ? (locale === 'tr' ? 'Listeye / Sepete Eklendi' : 'Bereits hinzugefügt')
                                        : (actionTooltip || (actionType === 'cart'
                                            ? (locale === 'tr' ? 'Sepete Ekle' : 'In den Warenkorb')
                                            : (locale === 'tr' ? 'Listeye Ekle' : 'Zur Merkliste hinzufügen')))}
                                    aria-label={actionTooltip || 'Aktion'}
                                    className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all shadow-xs flex-shrink-0 group/btn active:scale-95 ${
                                        inMerkliste
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
                                            : 'bg-stone-900 text-white hover:bg-amber-600 hover:scale-105 shadow-stone-900/10'
                                    }`}
                                >
                                    {inMerkliste ? (
                                        <FiCheck size={16} className="animate-in fade-in zoom-in duration-200" />
                                    ) : actionType === 'cart' ? (
                                        <FiShoppingCart size={15} className="group-hover/btn:-rotate-12 transition-transform duration-200" />
                                    ) : (
                                        <FiPlus size={16} className="group-hover/btn:scale-110 transition-transform duration-200" />
                                    )}
                                </button>
                            ) : (
                                <Link
                                    href={detailHref}
                                    className="h-8.5 px-3 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 transition-all text-xs font-bold flex items-center justify-center gap-1 shadow-2xs flex-shrink-0"
                                >
                                    {dictionary?.publicProductsPage?.details || 'Details'}
                                    <FiChevronRight size={13} />
                                </Link>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
