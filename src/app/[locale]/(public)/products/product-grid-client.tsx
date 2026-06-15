'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { type Urun } from './types';
import {
    FiSearch, FiPackage, FiGrid, FiList, FiChevronRight, FiChevronDown,
    FiDownload, FiX, FiShoppingBag, FiPlus, FiMinus, FiSend,
} from 'react-icons/fi';
import { LuPackage, LuBarcode, LuThermometerSnowflake, LuThermometer } from 'react-icons/lu';
import { getBadgeText } from '@/lib/labels';
import { motion } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductGridClientProps {
    urunler: Urun[];
    locale: string;
    kategoriAdlariMap: Map<string, string>;
    sablonMap: Record<string, Array<{ alan_adi: string; gosterim_adi: any; sira: number }>>;
    kategoriParentMap: Record<string, string | null>;
    isLoggedIn?: boolean;
    partnerTier?: string;
    bestsellerUrunler?: Urun[];
    featuredUrunler?: Urun[];
    searchQuery?: string;
    geschmackCounts?: Record<string, number>;
    geschmackFilter?: string;
    aktiveMerkmale?: string[];
    loginHref?: string;
    pagination?: {
        page: number;
        perPage: number;
        total: number;
        kategori?: string;
        query?: Record<string, string | undefined | null>;
        basePath?: string;
    };
    dictionary?: any;
}

type MerklisteItem = { urunId: string; menge: number };

const itemVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    show: (i: number) => ({ 
        opacity: 1, 
        y: 0, 
        scale: 1, 
        transition: { 
            ease: [0.25, 1, 0.5, 1], 
            duration: 0.8,
            delay: (i % 10) * 0.08 
        } 
    })
};
// ─── Constants ────────────────────────────────────────────────────────────────

const BADGE_DEFS = [
    { key: 'vegan',       short: 'Vegan',    bg: 'bg-green-100 text-green-800 border-green-200' },
    { key: 'glutenfrei',  short: 'GF',        bg: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { key: 'laktosefrei', short: 'LF',        bg: 'bg-blue-100 text-blue-800 border-blue-200' },
    { key: 'bio',         short: 'Bio',       bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { key: 'ohne_zucker', short: 'Ø Zucker',  bg: 'bg-sky-100 text-sky-800 border-sky-200' },
    { key: 'katkisiz',    short: 'Pure',      bg: 'bg-teal-100 text-teal-800 border-teal-200' },
] as const;

const TAT_CONFIG: Record<string, { emoji: string; de: string; tr: string; en: string; ar: string }> = {
    'karamell':        { emoji: '🍮', de: 'Karamell',          tr: 'Karamel', en: 'Caramel', ar: 'كراميل' },
    'schokolade':      { emoji: '🍫', de: 'Schokolade',        tr: 'Çikolata', en: 'Chocolate', ar: 'شوكولاتة' },
    'nuss':            { emoji: '🌰', de: 'Nuss',              tr: 'Fındık', en: 'Hazelnut', ar: 'بندق' },
    'zitrone':         { emoji: '🍋', de: 'Zitrone',           tr: 'Limon', en: 'Lemon', ar: 'ليمون' },
    'mango':           { emoji: '🥭', de: 'Mango',             tr: 'Mango', en: 'Mango', ar: 'مانجو' },
    'erdbeere':        { emoji: '🍓', de: 'Erdbeere',          tr: 'Çilek', en: 'Strawberry', ar: 'فراولة' },
    'himbeere':        { emoji: '🫐', de: 'Himbeere',          tr: 'Ahududu', en: 'Raspberry', ar: 'توت العليق' },
    'vanille':         { emoji: '🌿', de: 'Vanille',           tr: 'Vanilya', en: 'Vanilla', ar: 'فانيليا' },
    'pfirsich':        { emoji: '🍑', de: 'Pfirsich',          tr: 'Şeftali', en: 'Peach', ar: 'خوخ' },
    'blaubeere':       { emoji: '🫐', de: 'Blaubeere',         tr: 'Yaban Mersini', en: 'Blueberry', ar: 'توت أزرق' },
    'apfel':           { emoji: '🍏', de: 'Apfel',             tr: 'Elma', en: 'Apple', ar: 'تفاح' },
    'hindistancevizi': { emoji: '🥥', de: 'Kokos',             tr: 'Hindistan Cevizi', en: 'Coconut', ar: 'جوز الهند' },
    'banane':          { emoji: '🍌', de: 'Banane',            tr: 'Muz', en: 'Banana', ar: 'موز' },
    'kaffee':          { emoji: '☕', de: 'Kaffee',             tr: 'Kahve', en: 'Coffee', ar: 'قهوة' },
    'kirsche':         { emoji: '🍒', de: 'Kirsche',           tr: 'Kiraz', en: 'Cherry', ar: 'كرز' },
    'brombeere':       { emoji: '🍇', de: 'Brombeere',         tr: 'Böğürtlen', en: 'Blackberry', ar: 'توت أسود' },
    'ananas':          { emoji: '🍍', de: 'Ananas',            tr: 'Ananas', en: 'Pineapple', ar: 'أناناس' },
};

const ZERTIFIKAT_CONFIG: Record<string, { label: string; bg: string }> = {
    'Halal':      { label: 'Halal',     bg: 'bg-teal-50 text-teal-800 border-teal-300' },
    'Bio':        { label: 'Bio ✓',    bg: 'bg-green-50 text-green-800 border-green-300' },
    'IFS':        { label: 'IFS',       bg: 'bg-slate-100 text-slate-700 border-slate-300' },
    'BRC':        { label: 'BRC',       bg: 'bg-slate-100 text-slate-700 border-slate-300' },
    'Kosher':     { label: 'Kosher',    bg: 'bg-purple-50 text-purple-800 border-purple-200' },
    'HACCP':      { label: 'HACCP',     bg: 'bg-slate-100 text-slate-700 border-slate-300' },
    'Vegan_Zert': { label: 'Vegan ✓',  bg: 'bg-green-50 text-green-800 border-green-300' },
    'Rainforest': { label: 'Rainforest',bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
};

// Tier → DB field mapping
const TIER_FIELD: Record<string, keyof Urun> = {
    koli_bazli: 'satis_fiyati_musteri',
    cok_koli:   'satis_fiyati_toptanci',
    palet:      'satis_fiyati_alt_bayi',
    alt_bayi:   'satis_fiyati_alt_bayi',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function money(v: number | null | undefined): string {
    if (v === null || v === undefined) return '—';
    return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + ' €';
}

function isNew(urun: Urun): boolean {
    if (!urun.created_at) return false;
    const created = new Date(urun.created_at);
    const now = new Date();
    return (now.getTime() - created.getTime()) < 60 * 24 * 60 * 60 * 1000; // 60 days
}

function getStorageType(urun: Urun): 'tiefkuehl' | 'kuehlware' | 'ambient' {
    const tempMax = urun.lagertemperatur_max_celsius;
    const loj = (urun.lojistik_sinifi || '').toLowerCase();
    if (tempMax !== null && tempMax !== undefined) {
        if (tempMax <= -10) return 'tiefkuehl';
        if (tempMax <= 10) return 'kuehlware';
        return 'ambient';
    }
    if (loj.includes('tiefkühl') || loj.includes('frozen')) return 'tiefkuehl';
    if (loj.includes('kühl') || loj.includes('chilled')) return 'kuehlware';
    return 'ambient';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StorageBadge({ urun, locale }: { urun: Urun; locale: string }) {
    const type = getStorageType(urun);
    const tempMax = urun.lagertemperatur_max_celsius;
    if (type === 'tiefkuehl') {
        const label = tempMax !== null && tempMax !== undefined ? `${tempMax}°C` : (locale === 'tr' ? 'Donuk' : locale === 'ar' ? 'مجمد' : locale === 'en' ? 'Frozen' : 'Tiefkühl');
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-sm">
                <LuThermometerSnowflake size={9} /> {label}
            </span>
        );
    }
    if (type === 'kuehlware') {
        const tempMin = urun.lagertemperatur_min_celsius;
        const label = (tempMin != null && tempMax != null) ? `${tempMin}–${tempMax}°C` : (locale === 'tr' ? 'Soğuk' : locale === 'ar' ? 'مبرد' : locale === 'en' ? 'Chilled' : 'Kühlware');
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300">
                <LuThermometer size={9} /> {label}
            </span>
        );
    }
    return null;
}

// ─── Main Catalog Card ────────────────────────────────────────────────────────

function CatalogCard({
    urun, locale, kategoriAdlariMap, isLoggedIn, partnerTier, onAddToMerkliste, inMerkliste, dictionary,
}: {
    urun: Urun;
    locale: string;
    kategoriAdlariMap: Map<string, string>;
    isLoggedIn?: boolean;
    partnerTier?: string;
    onAddToMerkliste?: (id: string) => void;
    inMerkliste?: boolean;
    dictionary?: any;
}) {
    const tekniks = (urun.teknik_ozellikler || {}) as Record<string, unknown>;
    const name = urun.ad?.[locale] || urun.ad?.['de'] || urun.ad?.['tr'] || '';
    const kategoriAdi = urun.kategori_id ? kategoriAdlariMap.get(urun.kategori_id) : '';

    const koliIciAdet = Number(urun.koli_ici_adet ?? 0);
    const paletIciKoliAdet = Number(urun.palet_ici_adet ?? 0);

    const inStock = (urun.stok_miktari ?? 0) > 0;
    const isNeues = isNew(urun);
    const isBestseller = urun.is_bestseller === true;
    const isFeatured = urun.is_featured === true;

    // 3-tier pricing rows
    const pricingRows = [
        {
            label: dictionary?.publicProductsPage?.oneCarton || (locale === 'tr' ? '1 Koli' : locale === 'en' ? '1 Carton' : locale === 'ar' ? '1 كرتونة' : '1 Karton'),
            price: urun.satis_fiyati_musteri,
            tierKey: 'koli_bazli',
        },
        {
            label: dictionary?.publicProductsPage?.from5Cartons || (locale === 'tr' ? '5 Koli+' : locale === 'en' ? '5 Cartons+' : locale === 'ar' ? '5 كراتين+' : 'Ab 5 Kartons'),
            price: urun.satis_fiyati_toptanci,
            tierKey: 'cok_koli',
        },
        {
            label: paletIciKoliAdet > 0
                ? (locale === 'tr' ? `1 Palet (${paletIciKoliAdet} koli)` : locale === 'en' ? `1 Pallet (${paletIciKoliAdet} ctns)` : locale === 'ar' ? `1 منصة (${paletIciKoliAdet} كرتونة)` : `1 Palette (${paletIciKoliAdet} Ktn.)`)
                : (locale === 'tr' ? '1 Palet' : locale === 'en' ? '1 Pallet' : locale === 'ar' ? '1 منصة' : '1 Palette'),
            price: urun.satis_fiyati_alt_bayi,
            tierKey: 'palet',
        },
    ];

    const hasAnyPrice = pricingRows.some(r => r.price != null && r.price > 0);

    return (
        <div className="group h-full flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-400 hover:shadow-lg transition-all duration-200 will-change-transform">

            {/* Image area */}
            <Link href={`/${locale}/products/${urun.slug}`} className="block relative h-36 bg-slate-50 overflow-hidden flex-shrink-0 will-change-transform">
                {urun.ana_resim_url ? (
                    <Image src={urun.ana_resim_url} alt={name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="object-contain p-1 group-hover:scale-105 transition-transform duration-300" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <FiPackage className="w-10 h-10 text-slate-300" />
                    </div>
                )}


                {/* Status badges — top right, stacked */}
                <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                    {isBestseller && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white shadow-sm">
                            🏆 Bestseller
                        </span>
                    )}
                    {isFeatured && !isBestseller && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white shadow-sm">
                            Empfohlen
                        </span>
                    )}
                </div>

                {/* Storage badge — top left */}
                <div className="absolute top-2 left-2">
                    <StorageBadge urun={urun} locale={locale} />
                </div>
            </Link>

            {/* Content */}
            <div className="flex flex-col flex-1 p-2.5 gap-1">

                {/* Kategori + stok */}
                <div className="flex items-center justify-between gap-1">
                    {kategoriAdi && (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 truncate">
                            {kategoriAdi}
                        </span>
                    )}
                    <span className={`ml-auto flex items-center gap-1 text-[9px] font-medium flex-shrink-0 ${inStock ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${inStock ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        {inStock
                            ? (dictionary?.publicProductsPage?.available || 'Verfügbar')
                            : (dictionary?.publicProductsPage?.onRequest || 'Auf Anfrage')}
                    </span>
                </div>

                {/* EAN */}
                {urun.ean_gtin && (
                    <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1 leading-none">
                        <LuBarcode size={9} /> {urun.ean_gtin}
                    </span>
                )}

                {/* Product name */}
                <Link href={`/${locale}/products/${urun.slug}`}>
                    <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-slate-600">
                        {name}
                    </h3>
                </Link>

                {/* Quantity chips (ONCE only — no duplicate below) */}
                <div className="flex flex-wrap gap-1">
                    {koliIciAdet > 0 && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold border px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border-sky-200">
                            <LuPackage size={9} />
                            {koliIciAdet} {dictionary?.publicProductsPage?.piecesPerCarton || 'Stk./Ktn.'}
                        </span>
                    )}
                    {paletIciKoliAdet > 0 && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold border px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border-violet-200">
                            {paletIciKoliAdet} {dictionary?.publicProductsPage?.cartonsPerPallet || 'Ktn./Pal.'}
                        </span>
                    )}
                </div>

                {/* Quality/cert badges row */}
                <div className="flex flex-wrap gap-1 min-h-[16px]">
                    {BADGE_DEFS.filter(b => {
                        const v = tekniks[b.key];
                        return v === true || v === 'true' || v === 'evet' || v === 1;
                    }).slice(0, 3).map(b => (
                        <span key={b.key} title={getBadgeText(b.key as any, locale as any)}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${b.bg}`}>
                            {b.short}
                        </span>
                    ))}
                    {urun.zertifikate?.filter(z => z !== 'BRC' && z !== 'Halal').slice(0, 2).map(z => {
                        const cfg = ZERTIFIKAT_CONFIG[z];
                        if (!cfg) return null;
                        return (
                            <span key={z} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${cfg.bg}`}>
                                {cfg.label}
                            </span>
                        );
                    })}
                </div>

                {/* Pricing area */}
                <div className="mt-auto pt-2 border-t border-slate-100">
                    {!isLoggedIn ? (
                        /* Guest state */
                        <div className="space-y-2">
                            <p className="text-xs italic text-slate-400">
                                {dictionary?.publicProductsPage?.priceLogin || 'Preis auf Anfrage'}
                            </p>
                            <Link href={`/${locale}/products/${urun.slug}`}
                                className="flex items-center justify-center gap-1 w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-600 hover:border-slate-500 hover:text-slate-800 transition-colors">
                                {dictionary?.publicProductsPage?.details || 'Details'} <FiChevronRight size={11} />
                            </Link>
                        </div>
                    ) : (
                        /* Partner logged-in state */
                        <div className="space-y-1.5">
                            {hasAnyPrice ? (
                                <div className="space-y-0.5">
                                    {pricingRows.map((row, i) => {
                                        if (!row.price || row.price <= 0) return null;
                                        const isHighlighted = partnerTier === row.tierKey;
                                        return (
                                            <div key={i}
                                                className={`flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] transition-colors
                                                    ${isHighlighted
                                                        ? 'bg-indigo-50 border border-indigo-200 font-bold text-indigo-900'
                                                        : 'text-slate-600'}`}>
                                                <span className={isHighlighted ? 'text-indigo-700' : 'text-slate-500'}>{row.label}</span>
                                                <span className={`font-semibold ${isHighlighted ? 'text-indigo-900' : 'text-slate-800'}`}>
                                                    {money(row.price)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    <p className="text-[8px] text-slate-400 text-right">zzgl. MwSt.</p>
                                </div>
                            ) : (
                                <p className="text-[10px] italic text-slate-400">
                                    {dictionary?.publicProductsPage?.priceOnRequest || 'Preis auf Anfrage'}
                                </p>
                            )}
                            <div className="flex gap-1.5">
                                <Link href={`/${locale}/products/${urun.slug}`}
                                    className="flex items-center justify-center gap-1 flex-1 px-2 py-1.5 text-[10px] font-semibold rounded-lg border border-slate-300 text-slate-600 hover:border-slate-500 transition-colors">
                                    {dictionary?.publicProductsPage?.details || 'Details'}
                                </Link>
                                <button
                                    onClick={() => onAddToMerkliste?.(urun.id)}
                                    className={`flex items-center justify-center gap-1 flex-1 px-2 py-1.5 text-[10px] font-semibold rounded-lg transition-colors
                                        ${inMerkliste
                                            ? 'bg-indigo-600 text-white border border-indigo-600'
                                            : 'bg-slate-900 text-white hover:bg-slate-700'}`}>
                                    {inMerkliste ? (dictionary?.publicProductsPage?.cartAdded || '✓ Gemerkt') : (dictionary?.publicProductsPage?.cartAdd || '＋ Merkliste')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Merkliste Drawer ─────────────────────────────────────────────────────────

function MerklisteDrawer({
    items, urunler, locale, partnerTier, onClose, onRemove, onChangeMenge,
}: {
    items: MerklisteItem[];
    urunler: Urun[];
    locale: string;
    partnerTier?: string;
    onClose: () => void;
    onRemove: (id: string) => void;
    onChangeMenge: (id: string, d: number) => void;
}) {
    const urunMap = useMemo(() => new Map(urunler.map(u => [u.id, u])), [urunler]);

    const totalValue = useMemo(() => {
        return items.reduce((sum, item) => {
            const u = urunMap.get(item.urunId);
            if (!u) return sum;
            const field = partnerTier ? TIER_FIELD[partnerTier] : 'satis_fiyati_musteri';
            const price = Number((u as any)[field] ?? 0);
            return sum + price * item.menge;
        }, 0);
    }, [items, urunMap, partnerTier]);

    const buildMailBody = () => {
        const lines = items.map(item => {
            const u = urunMap.get(item.urunId);
            if (!u) return '';
            const name = u.ad?.[locale] || u.ad?.['de'] || '';
            return `- ${name} × ${item.menge}`;
        }).filter(Boolean).join('\n');
        return encodeURIComponent(`Sehr geehrtes Elysion-Team,\n\nich möchte folgende Produkte anfragen:\n\n${lines}\n\nMit freundlichen Grüßen`);
    };

    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40" onClick={onClose} />
            <div className="w-full max-w-sm bg-white shadow-xl flex flex-col h-full overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                        <FiShoppingBag size={16} />
                        Merkliste ({items.length})
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><FiX size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {items.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-400">
                            {locale === 'tr' ? 'Merkliste boş.' : locale === 'en' ? 'No products in the list.' : locale === 'ar' ? 'لا توجد منتجات في القائمة.' : 'Keine Produkte auf der Merkliste.'}
                        </div>
                    ) : items.map(item => {
                        const u = urunMap.get(item.urunId);
                        if (!u) return null;
                        const name = u.ad?.[locale] || u.ad?.['de'] || '';
                        const field = partnerTier ? TIER_FIELD[partnerTier] : 'satis_fiyati_musteri';
                        const price = Number((u as any)[field] ?? 0);
                        return (
                            <div key={item.urunId} className="flex items-center gap-3 px-4 py-3">
                                {u.ana_resim_url && (
                                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                                        <Image src={u.ana_resim_url} alt={name} fill sizes="40px" className="object-cover" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-800 truncate">{name}</p>
                                    {price > 0 && (
                                        <p className="text-[10px] text-slate-500">{money(price * item.menge)}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => onChangeMenge(item.urunId, -1)}
                                        className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
                                        <FiMinus size={10} />
                                    </button>
                                    <span className="text-xs w-5 text-center font-medium">{item.menge}</span>
                                    <button onClick={() => onChangeMenge(item.urunId, 1)}
                                        className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
                                        <FiPlus size={10} />
                                    </button>
                                </div>
                                <button onClick={() => onRemove(item.urunId)} className="text-slate-300 hover:text-red-400 p-0.5">
                                    <FiX size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {items.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-200 space-y-2">
                        {totalValue > 0 && (
                            <div className="flex justify-between text-xs text-slate-600">
                                <span>{locale === 'tr' ? 'Tahmini toplam' : locale === 'en' ? 'Estimated total' : locale === 'ar' ? 'المجموع المقدر' : 'Geschätzter Gesamtwert'}</span>
                                <span className="font-semibold">{money(totalValue)}</span>
                            </div>
                        )}
                        <a href={`mailto:info@elysonsweets.de?subject=${encodeURIComponent('Anfrage / Bestellung')}&body=${buildMailBody()}`}
                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors">
                            <FiSend size={14} />
                            {locale === 'tr' ? 'Talep gönder' : locale === 'en' ? 'Send request' : locale === 'ar' ? 'ارسال الطلب' : 'Anfrage senden'}
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Bestseller Section ───────────────────────────────────────────────────────

function BestsellerSection({ urunler, locale, kategoriAdlariMap, isLoggedIn, partnerTier, onAddToMerkliste, merklisteIds, dictionary }: {
    urunler: Urun[];
    locale: string;
    kategoriAdlariMap: Map<string, string>;
    isLoggedIn?: boolean;
    partnerTier?: string;
    onAddToMerkliste?: (id: string) => void;
    merklisteIds: Set<string>;
    dictionary?: any;
}) {
    if (urunler.length === 0) return null;
    return (
        <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
                <h2 className="text-base font-bold text-slate-800">
                    {locale === 'tr' ? 'En Çok Satanlar' : locale === 'en' ? 'Our Bestsellers' : locale === 'ar' ? 'الأكثر مبيعاً' : 'Unsere Bestseller'} 🏆
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-orange-200 to-transparent" />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                {urunler.map(urun => (
                    <div key={urun.id} className="w-48 flex-shrink-0">
                        <CatalogCard
                            urun={urun}
                            locale={locale}
                            kategoriAdlariMap={kategoriAdlariMap}
                            isLoggedIn={isLoggedIn}
                            partnerTier={partnerTier}
                            onAddToMerkliste={onAddToMerkliste}
                            inMerkliste={merklisteIds.has(urun.id)}
                            dictionary={dictionary}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ pagination, locale }: { pagination: NonNullable<ProductGridClientProps['pagination']>; locale: string }) {
    const { page, perPage, total, query, basePath } = pagination;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    if (totalPages <= 1) return null;

    const makeHref = (p: number) => {
        const params = new URLSearchParams();
        params.set('page', String(p));
        params.set('limit', String(perPage));
        if (query) Object.entries(query).forEach(([key, value]) => { if (value) params.set(key, value); });
        return `${basePath || `/${locale}/products`}?${params.toString()}`;
    };

    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let p = start; p <= end; p++) pages.push(p);

    return (
        <nav className="mt-6 flex items-center justify-center gap-1.5 select-none">
            <Link href={page > 1 ? makeHref(page - 1) : '#'} aria-disabled={page === 1}
                className={`px-3 py-2 rounded-lg border text-sm ${page === 1 ? 'text-slate-300 border-slate-200 cursor-not-allowed' : 'text-slate-600 border-slate-200 hover:bg-slate-50'}`}>‹</Link>
            {start > 1 && (
                <>
                    <Link href={makeHref(1)} className="px-3 py-2 rounded-lg border text-sm text-slate-600 border-slate-200 hover:bg-slate-50">1</Link>
                    {start > 2 && <span className="px-2 text-slate-400">…</span>}
                </>
            )}
            {pages.map(p => (
                <Link key={p} href={makeHref(p)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium ${p === page ? 'bg-slate-800 text-white border-slate-800' : 'text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                    {p}
                </Link>
            ))}
            {end < totalPages && (
                <>
                    {end < totalPages - 1 && <span className="px-2 text-slate-400">…</span>}
                    <Link href={makeHref(totalPages)} className="px-3 py-2 rounded-lg border text-sm text-slate-600 border-slate-200 hover:bg-slate-50">{totalPages}</Link>
                </>
            )}
            <Link href={page < totalPages ? makeHref(page + 1) : '#'} aria-disabled={page === totalPages}
                className={`px-3 py-2 rounded-lg border text-sm ${page === totalPages ? 'text-slate-300 border-slate-200 cursor-not-allowed' : 'text-slate-600 border-slate-200 hover:bg-slate-50'}`}>›</Link>
        </nav>
    );
}

// ─── CatalogRow (list view) — unchanged structure, just remove PackagingQuantities ──

function CatalogRow({ urun, locale, kategoriAdlariMap, isLoggedIn }: {
    urun: Urun; locale: string; kategoriAdlariMap: Map<string, string>; isLoggedIn?: boolean;
}) {
    const tekniks = (urun.teknik_ozellikler || {}) as Record<string, unknown>;
    const name = urun.ad?.[locale] || urun.ad?.['de'] || urun.ad?.['tr'] || '';
    const kategoriAdi = urun.kategori_id ? kategoriAdlariMap.get(urun.kategori_id) : '';
    const koliIciAdet = Number(urun.koli_ici_adet ?? 0);
    const paletIciAdet = Number(urun.palet_ici_adet ?? 0);
    const activeBadges = BADGE_DEFS.filter(b => { const v = tekniks[b.key]; return v === true || v === 'true' || v === 'evet' || v === 1; });

    return (
        <Link href={`/${locale}/products/${urun.slug}`}
            className="group grid grid-cols-[40px_2.5fr_1fr_80px_80px_120px_100px_40px] items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer">
            <div className="relative w-10 h-10 rounded-md overflow-hidden bg-slate-50 flex-shrink-0 will-change-transform">
                {urun.ana_resim_url ? (
                    <Image src={urun.ana_resim_url} alt={name} fill sizes="40px" className="object-contain p-0.5" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <FiPackage className="w-4 h-4 text-slate-300" />
                    </div>
                )}
            </div>
            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-slate-600">{name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    {urun.ean_gtin && <span className="text-[10px] font-mono text-slate-400">{urun.ean_gtin}</span>}
                    <span className="text-[10px] text-slate-400">{kategoriAdi}</span>
                </div>
            </div>
            <StorageBadge urun={urun} locale={locale} />
            <div className="text-xs text-slate-600 text-center">{koliIciAdet > 0 ? `${koliIciAdet} ${locale === 'tr' ? 'Adet' : locale === 'en' ? 'Pcs' : locale === 'ar' ? 'قطعة' : 'Stk.'}` : '—'}</div>
            <div className="text-xs text-slate-600 text-center">{paletIciAdet > 0 ? `${paletIciAdet} ${locale === 'tr' ? 'Adet' : locale === 'en' ? 'Pcs' : locale === 'ar' ? 'قطعة' : 'Stk.'}` : '—'}</div>
            <div className="flex gap-1 flex-wrap">
                {activeBadges.slice(0, 2).map(b => (
                    <span key={b.key} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${b.bg}`}>{b.short}</span>
                ))}
            </div>
            <div className="text-xs text-slate-700 text-center">
                {isLoggedIn
                    ? (urun.satis_fiyati_musteri ? money(urun.satis_fiyati_musteri) : '—')
                    : <span className="italic text-slate-400 text-[10px]">Auf Anfrage</span>
                }
            </div>
            <FiChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 justify-self-end transition-colors" />
        </Link>
    );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function ProductGridClient({
    urunler, locale, kategoriAdlariMap, sablonMap, kategoriParentMap,
    pagination, dictionary, isLoggedIn, partnerTier, bestsellerUrunler = [], featuredUrunler = [], searchQuery = '', geschmackCounts = {}, geschmackFilter = '', aktiveMerkmale = [], loginHref,
}: ProductGridClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchQuery);
    const [searchDebounce, setSearchDebounce] = useState<ReturnType<typeof setTimeout> | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [merklisteItems, setMerklisteItems] = useState<MerklisteItem[]>([]);
    const [merklisteOpen, setMerklisteOpen] = useState(false);

    // Client-side authentication state
    const [clientIsLoggedIn, setClientIsLoggedIn] = useState<boolean>(false);
    const [clientPartnerTier, setClientPartnerTier] = useState<string | undefined>(undefined);
    const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);

    const activeIsLoggedIn = isLoggedIn ?? clientIsLoggedIn;
    const activePartnerTier = partnerTier ?? clientPartnerTier;

    useEffect(() => {
        const fetchAuth = async () => {
            const { createDynamicSupabaseClient } = await import('@/lib/supabase/client');
            const supabase = createDynamicSupabaseClient(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setClientIsLoggedIn(true);
                const { data: profil } = await supabase
                    .from('profiller')
                    .select('firma_id, rol')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profil?.firma_id) {
                    const { data: firma } = await supabase
                        .from('firmalar')
                        .select('pricing_tier')
                        .eq('id', profil.firma_id)
                        .maybeSingle();
                    
                    let tier = firma?.pricing_tier;
                    if (!tier) {
                        if (profil.rol === 'Müşteri') tier = 'koli_bazli';
                        else if (profil.rol === 'Alt Bayi') tier = 'palet';
                    }
                    setClientPartnerTier(tier);
                }
            }
        };
        fetchAuth();
    }, []);

    const handleSearch = useCallback((value: string) => {
        setSearchTerm(value);

        if (searchDebounce) clearTimeout(searchDebounce);
        const timeout = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (value.trim()) params.set('q', value.trim());
            else params.delete('q');
            params.delete('page');
            router.push(`${pathname}?${params.toString()}`);
        }, 400);
        setSearchDebounce(timeout);
    }, [searchDebounce, searchParams, pathname, router]);

    // Load merkliste from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem('merkliste');
            if (stored) setMerklisteItems(JSON.parse(stored));
        } catch {}
        try {
            setBannerDismissed(sessionStorage.getItem('guest_banner_dismissed') === '1');
        } catch {}
    }, []);

    // Persist merkliste
    useEffect(() => {
        try { localStorage.setItem('merkliste', JSON.stringify(merklisteItems)); } catch {}
    }, [merklisteItems]);

    const merklisteIds = useMemo(() => new Set(merklisteItems.map(i => i.urunId)), [merklisteItems]);

    const addToMerkliste = useCallback((urunId: string) => {
        setMerklisteItems(prev => {
            if (prev.some(i => i.urunId === urunId)) return prev.filter(i => i.urunId !== urunId);
            return [...prev, { urunId, menge: 1 }];
        });
    }, []);

    const changeItemMenge = useCallback((urunId: string, delta: number) => {
        setMerklisteItems(prev => prev
            .map(i => i.urunId === urunId ? { ...i, menge: Math.max(1, i.menge + delta) } : i)
        );
    }, []);

    const removeFromMerkliste = useCallback((urunId: string) => {
        setMerklisteItems(prev => prev.filter(i => i.urunId !== urunId));
    }, []);

    const dismissBanner = () => {
        setBannerDismissed(true);
        try { sessionStorage.setItem('guest_banner_dismissed', '1'); } catch {}
    };

    // Server-side arama — filteredUrunler = urunler (server zaten filtredi)
    const filteredUrunler = urunler;

    const searchPlaceholder = dictionary?.publicProductsPage?.searchPlaceholderGrid || 'Produkt, Art.-Nr. oder EAN suchen…';

    // All urunler for merkliste price lookup (page + bestsellers)
    const allUrunler = useMemo(() => {
        const map = new Map<string, Urun>();
        [...urunler, ...bestsellerUrunler, ...featuredUrunler].forEach(u => map.set(u.id, u));
        return Array.from(map.values());
    }, [urunler, bestsellerUrunler]);

    return (
        <div className="space-y-4">

            {/* Guest banner */}
            {!activeIsLoggedIn && !bannerDismissed && (
                <div className="flex items-center justify-between gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                    <p className="text-sm text-indigo-800">
                        <span className="font-semibold hidden sm:inline">
                            {dictionary?.publicProductsPage?.guestBannerPrefix || 'Für Preise und Bestellungen'}
                        </span>
                        {' '}
                        <span className="text-indigo-700">
                            {dictionary?.publicProductsPage?.guestBannerSuffix || 'bitte im Partnerportal anmelden.'}
                        </span>
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {loginHref && (
                            <Link href={loginHref}
                                className="text-xs font-semibold px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap">
                                {dictionary?.publicProductsPage?.loginNow || 'Jetzt anmelden →'}
                            </Link>
                        )}
                        <button onClick={dismissBanner} className="text-indigo-400 hover:text-indigo-600 p-1">
                            <FiX size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Özellik filtreleri + Arama + Aroma chip'leri */}
            <div className="space-y-2">
                    {/* Arama kutusu + Görünüm toggle */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                            <input
                                type="text"
                                placeholder={searchPlaceholder}
                                value={searchTerm}
                                onChange={e => handleSearch(e.target.value)}
                                className="w-full pl-9 pr-8 py-2.5 text-sm border-2 border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 shadow-sm placeholder:text-slate-400"
                            />
                            {searchTerm && (
                                <button onClick={() => handleSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                                    ✕
                                </button>
                            )}
                        </div>
                        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm flex-shrink-0">
                            <button onClick={() => setViewMode('grid')}
                                title={dictionary?.publicProductsPage?.gridTitle || 'Gitteransicht'}
                                className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                                <FiGrid size={15} />
                            </button>
                            <button onClick={() => setViewMode('list')}
                                title={dictionary?.publicProductsPage?.listTitle || 'Listenansicht'}
                                className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                                <FiList size={15} />
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Features Dropdown */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex-shrink-0">
                                {dictionary?.publicProductsPage?.features || 'Merkmale:'}
                            </span>
                            <div className="relative">
                                <select
                                    value={aktiveMerkmale.length > 0 ? aktiveMerkmale[0] : ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const newParams = new URLSearchParams(searchParams.toString());
                                        if (val) newParams.set('merkmal', val);
                                        else newParams.delete('merkmal');
                                        newParams.delete('page');
                                        router.push(`${pathname}?${newParams.toString()}`);
                                    }}
                                    className="appearance-none pl-3 pr-8 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 shadow-sm hover:border-slate-300 transition-colors"
                                >
                                    <option value="">
                                        {locale === 'tr' ? 'Tümü' : locale === 'en' ? 'All' : locale === 'ar' ? 'الكل' : 'Alle'}
                                    </option>
                                    {[
                                        { key: 'vegan',       label: dictionary?.productsProfessionalFilter?.featureOptions?.vegan || 'Vegan',       emoji: '🌱' },
                                        { key: 'glutenfrei',  label: dictionary?.productsProfessionalFilter?.featureOptions?.glutenFree || 'Glutenfrei',  emoji: '🌾' },
                                        { key: 'laktosefrei', label: dictionary?.productsProfessionalFilter?.featureOptions?.lactoseFree || 'Laktosefrei', emoji: '🥛' },
                                        { key: 'ohne_zucker', label: dictionary?.productsProfessionalFilter?.featureOptions?.sugarFree || 'Zuckerfrei',  emoji: '🍬' },
                                        { key: 'bio',         label: dictionary?.productsProfessionalFilter?.featureOptions?.organic || 'Bio',          emoji: '♻️' },
                                        { key: 'halal',       label: locale === 'tr' ? 'Helal' : locale === 'ar' ? 'حلال' : 'Halal',        emoji: '✓' },
                                    ].map(f => (
                                        <option key={f.key} value={f.key}>
                                            {f.emoji} {f.label}
                                        </option>
                                    ))}
                                </select>
                                <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>
                        </div>
                    {/* Aroma Dropdown */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex-shrink-0">
                            {dictionary?.publicProductsPage?.flavor || 'Aroma:'}
                        </span>
                        <div className="relative">
                            <select
                                value={geschmackFilter || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const newParams = new URLSearchParams(searchParams.toString());
                                    if (val) newParams.set('geschmack', val);
                                    else newParams.delete('geschmack');
                                    newParams.delete('page');
                                    router.push(`${pathname}?${newParams.toString()}`);
                                }}
                                className="appearance-none pl-3 pr-8 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 shadow-sm hover:border-slate-300 transition-colors"
                            >
                                <option value="">
                                    {locale === 'tr' ? 'Tümü' : locale === 'en' ? 'All' : locale === 'ar' ? 'الكل' : 'Alle'}
                                </option>
                                {Object.entries(geschmackCounts)
                                    .filter(([key]) => TAT_CONFIG[key])
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([key, count]) => {
                                        const cfg = TAT_CONFIG[key];
                                        return (
                                            <option key={key} value={key}>
                                                {cfg.emoji} {(cfg as any)?.[locale] || cfg.de} ({count})
                                            </option>
                                        );
                                    })}
                            </select>
                            <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ElysonSweets Empfiehlt */}
            {featuredUrunler.length > 0 && !searchQuery && !geschmackFilter && (
                <div className={viewMode === 'grid' ? 'bg-amber-50 border border-amber-100 rounded-2xl p-4' : 'border border-amber-100 rounded-xl overflow-hidden'}>
                    <div className={`flex items-center gap-2 ${viewMode === 'grid' ? 'mb-3' : 'px-3 py-2 bg-amber-50'}`}>
                        <span className="text-sm font-bold text-amber-900">
                            ⭐ {dictionary?.publicProductsPage?.elysonRecommends || 'ElysonSweets empfiehlt'}
                        </span>
                        <span className="text-xs text-amber-600">
                            {dictionary?.publicProductsPage?.personallySelected || '– persönlich ausgewählt'}
                        </span>
                    </div>
                    {viewMode === 'grid' ? (
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                            {featuredUrunler.map((urun, index) => (
                                <motion.div 
                                    key={urun.id} 
                                    custom={index}
                                    variants={itemVariants}
                                    initial="hidden"
                                    whileInView="show"
                                    viewport={{ once: true, amount: 0.1 }}
                                    className="w-40 flex-shrink-0 will-change-transform h-full"
                                >
                                    <CatalogCard
                                        urun={urun}
                                        locale={locale}
                                        kategoriAdlariMap={kategoriAdlariMap}
                                        isLoggedIn={activeIsLoggedIn}
                                        partnerTier={activePartnerTier}
                                        onAddToMerkliste={activeIsLoggedIn ? addToMerkliste : undefined}
                                        inMerkliste={merklisteIds.has(urun.id)}
                                        dictionary={dictionary}
                                    />
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white divide-y divide-slate-100">
                            {featuredUrunler.map((urun, index) => (
                                <motion.div 
                                    key={urun.id} 
                                    custom={index}
                                    variants={itemVariants}
                                    initial="hidden"
                                    whileInView="show"
                                    viewport={{ once: true, amount: 0.1 }}
                                    className="will-change-transform"
                                >
                                    <CatalogRow urun={urun} locale={locale} kategoriAdlariMap={kategoriAdlariMap} isLoggedIn={activeIsLoggedIn} />
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Bestseller section */}
            {bestsellerUrunler.length > 0 && !searchTerm && (
                viewMode === 'grid' ? (
                    <BestsellerSection
                        urunler={bestsellerUrunler}
                        locale={locale}
                        kategoriAdlariMap={kategoriAdlariMap}
                        isLoggedIn={activeIsLoggedIn}
                        partnerTier={activePartnerTier}
                        onAddToMerkliste={activeIsLoggedIn ? addToMerkliste : undefined}
                        merklisteIds={merklisteIds}
                        dictionary={dictionary}
                    />
                ) : (
                    <div className="border border-orange-100 rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50">
                            <span className="text-sm font-bold text-orange-900">
                                🏆 {locale === 'tr' ? 'En Çok Satanlar' : locale === 'en' ? 'Our Bestsellers' : locale === 'ar' ? 'الأكثر مبيعاً' : 'Unsere Bestseller'}
                            </span>
                        </div>
                        <div className="bg-white divide-y divide-slate-100">
                            {bestsellerUrunler.map((urun, index) => (
                                <motion.div 
                                    key={urun.id} 
                                    custom={index}
                                    variants={itemVariants}
                                    initial="hidden"
                                    whileInView="show"
                                    viewport={{ once: true, amount: 0.1 }}
                                    className="will-change-transform"
                                >
                                    <CatalogRow urun={urun} locale={locale} kategoriAdlariMap={kategoriAdlariMap} isLoggedIn={activeIsLoggedIn} />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )
            )}

            {/* Arama sonucu bilgisi */}
            {searchQuery && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                    <FiSearch size={14} className="text-slate-400 flex-shrink-0" />
                    <span>
                        <strong>"{searchQuery}"</strong>
                        {' '}
                        {locale === 'tr' ? `— ${urunler.length} sonuç` : locale === 'en' ? `— ${urunler.length} results` : locale === 'ar' ? `— ${urunler.length} نتيجة` : `— ${urunler.length} Ergebnisse`}
                    </span>
                    <a href={pathname}
                        className="ml-auto text-xs text-red-500 hover:text-red-700 flex items-center gap-1 flex-shrink-0">
                        <FiX size={12} />
                        {locale === 'tr' ? 'Aramayı temizle' : locale === 'en' ? 'Clear search' : locale === 'ar' ? 'مسح البحث' : 'Suche löschen'}
                    </a>
                </div>
            )}

            {/* Ürün sayısı */}
            {filteredUrunler.length > 0 && (
                <p className="text-xs text-slate-400">
                    {locale === 'tr' ? `${filteredUrunler.length} ürün` : locale === 'en' ? `${filteredUrunler.length} items` : locale === 'ar' ? `${filteredUrunler.length} منتجات` : `${filteredUrunler.length} Artikel`}
                </p>
            )}

            {/* Content */}
            {filteredUrunler.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                    <FiPackage className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-500">
                        {dictionary?.publicProductsPage?.noProductsFound || 'Keine Produkte gefunden'}
                    </p>
                </div>
            ) : viewMode === 'grid' ? (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                        {filteredUrunler.map((urun, index) => (
                            <motion.div 
                                key={urun.id} 
                                custom={index}
                                variants={itemVariants} 
                                initial="hidden"
                                whileInView="show"
                                viewport={{ once: true, amount: 0.1 }}
                                className="will-change-transform h-full"
                            >
                                <CatalogCard
                                    urun={urun}
                                    locale={locale}
                                    kategoriAdlariMap={kategoriAdlariMap}
                                    isLoggedIn={activeIsLoggedIn}
                                    partnerTier={activePartnerTier}
                                    onAddToMerkliste={activeIsLoggedIn ? addToMerkliste : undefined}
                                    inMerkliste={merklisteIds.has(urun.id)}
                                    dictionary={dictionary}
                                />
                            </motion.div>
                        ))}
                    </div>
                    {pagination && <Pagination pagination={pagination} locale={locale} />}
                </>
            ) : (
                <>
                    <div className="hidden lg:grid grid-cols-[40px_2.5fr_1fr_80px_80px_120px_100px_40px] gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 bg-slate-50 rounded-t-lg">
                        <span />
                        <span>{locale === 'tr' ? 'Ürün' : locale === 'en' ? 'Product' : locale === 'ar' ? 'المنتج' : 'Produkt'}</span>
                        <span>{locale === 'tr' ? 'Depolama' : locale === 'en' ? 'Storage' : locale === 'ar' ? 'تخزين' : 'Lagerung'}</span>
                        <span className="text-center">{locale === 'tr' ? 'Adet/Koli' : locale === 'en' ? 'Pcs/Ctn' : locale === 'ar' ? 'قطعة/كرتونة' : 'Stk./Ktn.'}</span>
                        <span className="text-center">{locale === 'tr' ? 'Adet/Palet' : locale === 'en' ? 'Pcs/Pal' : locale === 'ar' ? 'قطعة/منصة' : 'Stk./Pal.'}</span>
                        <span>{locale === 'tr' ? 'Özellikler' : locale === 'en' ? 'Features' : locale === 'ar' ? 'الميزات' : 'Merkmale'}</span>
                        <span className="text-center">{locale === 'tr' ? 'Fiyat' : locale === 'en' ? 'Price' : locale === 'ar' ? 'السعر' : 'Preis'}</span>
                        <span />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                        {filteredUrunler.map((urun, index) => (
                            <motion.div 
                                key={urun.id} 
                                custom={index}
                                variants={itemVariants} 
                                initial="hidden"
                                whileInView="show"
                                viewport={{ once: true, amount: 0.1 }}
                                className="will-change-transform"
                            >
                                <CatalogRow urun={urun} locale={locale} kategoriAdlariMap={kategoriAdlariMap} isLoggedIn={activeIsLoggedIn} />
                            </motion.div>
                        ))}
                    </div>
                    {pagination && <Pagination pagination={pagination} locale={locale} />}
                </>
            )}

            {/* Merkliste floating button (logged-in only) */}
            {activeIsLoggedIn && merklisteItems.length > 0 && (
                <button
                    onClick={() => setMerklisteOpen(true)}
                    className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-full shadow-lg hover:bg-slate-700 transition-colors">
                    <FiShoppingBag size={18} />
                    <span className="text-sm font-semibold">{merklisteItems.length}</span>
                </button>
            )}

            {/* Merkliste drawer */}
            {merklisteOpen && activeIsLoggedIn && (
                <MerklisteDrawer
                    items={merklisteItems}
                    urunler={allUrunler}
                    locale={locale}
                    partnerTier={activePartnerTier}
                    onClose={() => setMerklisteOpen(false)}
                    onRemove={removeFromMerkliste}
                    onChangeMenge={changeItemMenge}
                />
            )}
        </div>
    );
}
