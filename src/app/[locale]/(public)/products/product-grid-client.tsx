 'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { type Urun } from './types';
import { FiSearch, FiPackage, FiGrid, FiList, FiChevronRight } from 'react-icons/fi';
import { LuPackage, LuPackage2, LuWeight, LuDroplets } from 'react-icons/lu';
import { getBadgeText } from '@/lib/labels';

interface ProductGridClientProps {
    urunler: Urun[];
    locale: string;
    kategoriAdlariMap: Map<string, string>;
    sablonMap: Record<string, Array<{ alan_adi: string; gosterim_adi: any; sira: number }>>;
    kategoriParentMap: Record<string, string | null>;
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

// Badge definitions for B2B relevant attributes
const BADGE_DEFS = [
    { key: 'vegan',       short: 'Vegan',  bg: 'bg-green-100 text-green-800 border-green-200' },
    { key: 'glutenfrei',  short: 'GF',     bg: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { key: 'laktosefrei', short: 'LF',     bg: 'bg-blue-100 text-blue-800 border-blue-200' },
    { key: 'bio',         short: 'Bio',    bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { key: 'ohne_zucker', short: 'Ø Zucker', bg: 'bg-sky-100 text-sky-800 border-sky-200' },
    { key: 'pompa_uyumlu', short: 'Pump', bg: 'bg-orange-100 text-orange-800 border-orange-200' },
    { key: 'katkisiz',    short: 'Pure',   bg: 'bg-teal-100 text-teal-800 border-teal-200' },
] as const;

function PackagingInfo({ urun, locale }: { urun: Urun; locale: string }) {
    const tekniks = (urun.teknik_ozellikler || {}) as Record<string, unknown>;

    // 1. Portion/slice count per individual unit (e.g. 10 slices in 1 cheesecake)
    const dilimAdet = Number(tekniks.dilim_adedi || tekniks.porsiyon_sayisi || 0);

    // 2. Units per box (e.g. 1 cheesecake per box, or 6 bottles per box)
    const kutuIciAdet = Number(tekniks.kutu_ici_adet || 0);

    // 3. Boxes per case: prefer reliable DB column, fall back to teknik_ozellikler
    const koliIciKutu = Number(urun.koli_ici_kutu_adet ?? tekniks.koli_ici_kutu_adet ?? tekniks.koli_ici_kutu ?? 0);

    // 4. Weight: prefer direct DB column birim_agirlik_kg, fall back to teknik fields
    const birimKg = Number(urun.birim_agirlik_kg ?? 0);
    const weightRawG = tekniks.net_agirlik_gram ?? tekniks.net_agirlik_gr ?? tekniks.net_agirlik ?? tekniks.gramaj;
    const numericG = typeof weightRawG === 'number' ? weightRawG : parseFloat(String(weightRawG || ''));
    const weightDisplay = birimKg > 0
        ? (birimKg < 1 ? `${Math.round(birimKg * 1000)} g` : `${birimKg % 1 === 0 ? birimKg : birimKg.toFixed(1)} kg`)
        : (weightRawG && Number.isFinite(numericG))
        ? (numericG >= 1000 ? `${(numericG / 1000).toFixed(1)} kg` : `${Math.round(numericG)} g`)
        : null;

    // 5. Volume (syrups, drinks)
    const volumeNum = Number(tekniks.hacim_ml ?? tekniks.hacim ?? 0);
    const volumeDisplay = volumeNum > 0
        ? (volumeNum >= 1000 ? `${volumeNum % 1000 === 0 ? volumeNum / 1000 : (volumeNum / 1000).toFixed(1)} L` : `${volumeNum} ml`)
        : null;

    type Chip = { icon: React.ReactNode; label: string; cls: string };
    const chips: Chip[] = [];

    // Kutu chip: show slices/units per box as a combined label, e.g. "10 dilim/kutu" or "6 Stk./Ktn."
    // If dilimAdet > 0 it means each box holds dilimAdet slices.
    // kutuIciAdet is how many whole units are in a box (usually 1 for cakes).
    const kutuLabel = dilimAdet > 0
        ? (locale === 'de' ? `${dilimAdet} Sch./Ktn.` : `${dilimAdet} dilim/kutu`)
        : kutuIciAdet > 1
        ? (locale === 'de' ? `${kutuIciAdet} Stk./Ktn.` : `${kutuIciAdet} adet/kutu`)
        : null;
    if (kutuLabel) chips.push({
        icon: <LuPackage size={10} />,
        label: kutuLabel,
        cls: 'bg-sky-50 text-sky-700 border-sky-200',
    });

    // Koli içi kutu — violet: bulk/case ordering
    if (koliIciKutu > 0) chips.push({
        icon: <LuPackage2 size={10} />,
        label: `${koliIciKutu} ${locale === 'de' ? 'Ktn./Kiste' : 'kutu/koli'}`,
        cls: 'bg-violet-50 text-violet-700 border-violet-200',
    });

    // Ağırlık — emerald
    if (weightDisplay) chips.push({
        icon: <LuWeight size={10} />,
        label: weightDisplay,
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    });

    // Hacim — cyan (only if no weight info)
    if (volumeDisplay && !weightDisplay) chips.push({
        icon: <LuDroplets size={10} />,
        label: volumeDisplay,
        cls: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    });

    if (chips.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {chips.map((chip, i) => (
                <span key={i} className={`inline-flex items-center gap-1 text-[10px] font-semibold border px-2 py-0.5 rounded-full ${chip.cls}`}>
                    {chip.icon}
                    {chip.label}
                </span>
            ))}
        </div>
    );
}

function B2BBadges({ tekniks, locale }: { tekniks: Record<string, unknown>; locale: string }) {
    const active = BADGE_DEFS.filter(b => {
        const v = tekniks[b.key];
        return v === true || v === 'true' || v === 'evet' || v === 1;
    });
    if (active.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-1 mt-2">
            {active.map(b => (
                <span key={b.key} title={getBadgeText(b.key as any, locale as any)}
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${b.bg}`}>
                    {b.short}
                </span>
            ))}
        </div>
    );
}

// â”€â”€ Pagination â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Pagination({ pagination, locale }: { pagination: NonNullable<ProductGridClientProps['pagination']>; locale: string }) {
    const { page, perPage, total, query, basePath } = pagination;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    if (totalPages <= 1) return null;

    const makeHref = (p: number) => {
        const params = new URLSearchParams();
        params.set('page', String(p));
        params.set('limit', String(perPage));
        if (query) {
            Object.entries(query).forEach(([key, value]) => { if (value) params.set(key, value); });
        }
        return `${basePath || `/${locale}/products`}?${params.toString()}`;
    };

    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let p = start; p <= end; p++) pages.push(p);

    return (
        <nav className="mt-6 flex items-center justify-center gap-1.5 select-none">
            <Link href={page > 1 ? makeHref(page - 1) : '#'} aria-disabled={page === 1}
                className={`px-3 py-2 rounded-lg border text-sm ${page === 1 ? 'text-slate-300 border-slate-200 cursor-not-allowed' : 'text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                ‹
            </Link>
            {start > 1 && <><Link href={makeHref(1)} className="px-3 py-2 rounded-lg border text-sm text-slate-600 border-slate-200 hover:bg-slate-50">1</Link>{start > 2 && <span className="px-2 text-slate-400">…</span>}</>}
            {pages.map(p => (
                <Link key={p} href={makeHref(p)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium ${p === page ? 'bg-slate-800 text-white border-slate-800' : 'text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                    {p}
                </Link>
            ))}
            {end < totalPages && <>{end < totalPages - 1 && <span className="px-2 text-slate-400">…</span>}<Link href={makeHref(totalPages)} className="px-3 py-2 rounded-lg border text-sm text-slate-600 border-slate-200 hover:bg-slate-50">{totalPages}</Link></>}
            <Link href={page < totalPages ? makeHref(page + 1) : '#'} aria-disabled={page === totalPages}
                className={`px-3 py-2 rounded-lg border text-sm ${page === totalPages ? 'text-slate-300 border-slate-200 cursor-not-allowed' : 'text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                ›
            </Link>
        </nav>
    );
}

// â”€â”€ Catalog Card (compact B2B) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CatalogCard({ urun, locale, kategoriAdlariMap }: { urun: Urun; locale: string; kategoriAdlariMap: Map<string, string> }) {
    const tekniks = (urun.teknik_ozellikler || {}) as Record<string, unknown>;
    const name = urun.ad?.[locale] || urun.ad?.['de'] || urun.ad?.['tr'] || '';
    const stokKodu = (urun as any).stok_kodu as string | null;
    const kategoriAdi = urun.kategori_id ? kategoriAdlariMap.get(urun.kategori_id) : '';

    return (
        <Link href={`/${locale}/products/${urun.slug}`}
            className="group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-400 hover:shadow-md transition-all duration-200">

            {/* Image */}
            <div className="relative h-44 bg-slate-50 overflow-hidden flex-shrink-0">
                {urun.ana_resim_url ? (
                    <Image src={urun.ana_resim_url} alt={name} fill sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <FiPackage className="w-10 h-10 text-slate-300" />
                    </div>
                )}
                {/* Category ribbon */}
                {kategoriAdi && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/40 to-transparent px-2.5 py-1.5">
                        <span className="text-white text-[10px] font-semibold tracking-wide uppercase">{kategoriAdi}</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 p-3">
                {stokKodu && (
                    <span className="text-[10px] font-mono text-slate-400 mb-0.5">{stokKodu}</span>
                )}
                <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-slate-600">
                    {name}
                </h3>
                <PackagingInfo urun={urun} locale={locale} />
                <B2BBadges tekniks={tekniks} locale={locale} />
                <div className="mt-auto pt-2.5 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                        {locale === 'de' ? 'Details & Bestellung' : locale === 'tr' ? 'Detay & Talep' : locale === 'en' ? 'Details & Inquiry' : 'التفاصيل'}
                    </span>
                    <FiChevronRight size={14} className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
                </div>
            </div>
        </Link>
    );
}

// â”€â”€ Catalog Row (table/list view) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CatalogRow({ urun, locale, kategoriAdlariMap }: { urun: Urun; locale: string; kategoriAdlariMap: Map<string, string> }) {
    const tekniks = (urun.teknik_ozellikler || {}) as Record<string, unknown>;
    const name = urun.ad?.[locale] || urun.ad?.['de'] || urun.ad?.['tr'] || '';
    const stokKodu = (urun as any).stok_kodu as string | null;
    const kategoriAdi = urun.kategori_id ? kategoriAdlariMap.get(urun.kategori_id) : '';
    // Portion/slice count per unit (from teknik_ozellikler JSON)
    const dilimAdet = Number(tekniks.dilim_adedi || tekniks.porsiyon_sayisi || 0);
    // Units per box (only in teknik_ozellikler JSON)
    const kutuIciAdet = Number(tekniks.kutu_ici_adet || 0);
    // Boxes per case — direct DB column preferred
    const koliIciKutu = Number(urun.koli_ici_kutu_adet || tekniks.koli_ici_kutu_adet || tekniks.koli_ici_kutu || 0);
    // Weight — direct DB column preferred (birim_agirlik_kg in kg)
    const birimKg = Number(urun.birim_agirlik_kg || 0);
    const weightRaw = tekniks.net_agirlik_gram ?? tekniks.net_agirlik_gr ?? tekniks.net_agirlik ?? tekniks.gramaj;
    const numericWeight = typeof weightRaw === 'number' ? weightRaw : parseFloat(String(weightRaw || ''));
    const weight = birimKg > 0
        ? (birimKg >= 1 ? `${birimKg.toFixed(birimKg === Math.floor(birimKg) ? 0 : 1)} kg` : `${Math.round(birimKg * 1000)} g`)
        : (weightRaw && Number.isFinite(numericWeight))
            ? (numericWeight >= 1000 ? `${(numericWeight / 1000).toFixed(1)} kg` : `${numericWeight} g`)
            : '\u2014';
    const unitLabel = dilimAdet > 0
        ? `${dilimAdet} ${locale === 'de' ? 'Sch.' : 'dilim'}`
        : kutuIciAdet > 0
            ? `${kutuIciAdet} ${locale === 'de' ? 'Stk.' : 'adet'}`
            : '\u2014';
    const koliLabel = koliIciKutu > 0
        ? `${koliIciKutu} ${locale === 'de' ? 'Kiste' : 'koli'}`
        : '\u2014';
    const activeBadges = BADGE_DEFS.filter(b => {
        const v = tekniks[b.key];
        return v === true || v === 'true' || v === 'evet' || v === 1;
    });

    return (
        <Link href={`/${locale}/products/${urun.slug}`}
            className="group grid grid-cols-[48px_2fr_1fr_80px_80px_80px_90px_auto] items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">

            {/* Thumbnail */}
            <div className="relative w-12 h-12 rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
                {urun.ana_resim_url
                    ? <Image src={urun.ana_resim_url} alt={name} fill sizes="48px" className="object-cover" />
                    : <FiPackage className="w-5 h-5 text-slate-300 absolute inset-0 m-auto" />}
            </div>

            {/* Name + SKU */}
            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-slate-600">{name}</p>
                {stokKodu && <p className="text-[10px] font-mono text-slate-400">{stokKodu}</p>}
            </div>

            {/* Category */}
            <span className="text-xs text-slate-500 truncate hidden md:block">{kategoriAdi}</span>

            {/* Units (dilim or kutu içi adet) */}
            <span className="text-xs text-slate-700 text-center font-medium">{unitLabel}</span>

            {/* Boxes per case */}
            <span className="text-xs text-slate-700 text-center font-medium">{koliLabel}</span>

            {/* Weight */}
            <span className="text-xs text-slate-700 text-center">{weight}</span>

            {/* Badges */}
            <div className="flex gap-1 flex-wrap">
                {activeBadges.slice(0, 3).map(b => (
                    <span key={b.key} title={getBadgeText(b.key as any, locale as any)}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${b.bg}`}>
                        {b.short}
                    </span>
                ))}
            </div>

            {/* Arrow */}
            <FiChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 justify-self-end transition-colors" />
        </Link>
    );
}

// â”€â”€ Main Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function ProductGridClient({ urunler, locale, kategoriAdlariMap, sablonMap, kategoriParentMap, pagination, dictionary }: ProductGridClientProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const filteredUrunler = useMemo(() => {
        if (!searchTerm) return urunler;
        const q = searchTerm.toLowerCase();
        return urunler.filter(urun => {
            const name = (urun.ad?.[locale] || urun.ad?.['de'] || '').toLowerCase();
            const sku = ((urun as any).stok_kodu || '').toLowerCase();
            return name.includes(q) || sku.includes(q);
        });
    }, [urunler, searchTerm, locale]);

    const L = {
        searchPlaceholder: locale === 'de' ? 'Produkte / Art.-Nr. suchen…' : locale === 'tr' ? 'Ürün adı veya stok kodu…' : locale === 'en' ? 'Search products / SKU…' : 'ابحث عن المنتجات…',
        noResults: locale === 'de' ? 'Keine Produkte gefunden' : locale === 'tr' ? 'Ürün bulunamadı' : locale === 'en' ? 'No products found' : 'لم يتم العثور على منتجات',
        unitsCol: locale === 'de' ? 'Stk./Karton' : locale === 'tr' ? 'Adet/Kutu' : 'Units/Box',
        boxesCol: locale === 'de' ? 'Kartons/Kiste' : locale === 'tr' ? 'Kutu/Koli' : 'Boxes/Case',
        weightCol: locale === 'de' ? 'Gewicht' : locale === 'tr' ? 'Ağırlık' : 'Weight',
        badgesCol: locale === 'de' ? 'Eigenschaften' : locale === 'tr' ? 'Özellikler' : 'Properties',
        categoryCol: locale === 'de' ? 'Kategorie' : locale === 'tr' ? 'Kategori' : 'Category',
        productCol: locale === 'de' ? 'Produkt' : locale === 'tr' ? 'Ürün' : 'Product',
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    <input
                        type="text"
                        placeholder={L.searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-7 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
                    )}
                </div>
                <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm ml-auto">
                    <button onClick={() => setViewMode('grid')}
                        className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <FiGrid size={15} />
                    </button>
                    <button onClick={() => setViewMode('list')}
                        className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <FiList size={15} />
                    </button>
                </div>
                {filteredUrunler.length > 0 && (
                    <span className="text-xs text-slate-400 whitespace-nowrap">{filteredUrunler.length} Produkte</span>
                )}
            </div>

            {/* Content */}
            {filteredUrunler.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                    <FiPackage className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-500">{L.noResults}</p>
                </div>
            ) : viewMode === 'grid' ? (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {filteredUrunler.map(urun => (
                            <CatalogCard key={urun.id} urun={urun} locale={locale} kategoriAdlariMap={kategoriAdlariMap} />
                        ))}
                    </div>
                    {pagination && <Pagination pagination={pagination} locale={locale} />}
                </>
            ) : (
                <>
                    {/* Table header */}
                    <div className="hidden md:grid grid-cols-[48px_2fr_1fr_80px_80px_80px_90px_auto] gap-3 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <span />
                        <span>{L.productCol}</span>
                        <span>{L.categoryCol}</span>
                        <span className="text-center">{L.unitsCol}</span>
                        <span className="text-center">{L.boxesCol}</span>
                        <span className="text-center">{L.weightCol}</span>
                        <span>{L.badgesCol}</span>
                        <span />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                        {filteredUrunler.map(urun => (
                            <CatalogRow key={urun.id} urun={urun} locale={locale} kategoriAdlariMap={kategoriAdlariMap} />
                        ))}
                    </div>
                    {pagination && <Pagination pagination={pagination} locale={locale} />}
                </>
            )}
        </div>
    );
}
