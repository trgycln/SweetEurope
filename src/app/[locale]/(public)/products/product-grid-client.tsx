'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { type Urun } from './types';
import { FiSearch, FiPackage, FiGrid, FiList, FiChevronRight, FiDownload } from 'react-icons/fi';
import { LuPackage, LuPackage2, LuWeight, LuDroplets, LuBarcode, LuThermometerSnowflake, LuThermometer, LuTruck, LuShieldCheck } from 'react-icons/lu';
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

// ── Quality badge definitions ────────────────────────────────────────────────

const BADGE_DEFS = [
    { key: 'vegan',       short: 'Vegan',    bg: 'bg-green-100 text-green-800 border-green-200' },
    { key: 'glutenfrei',  short: 'GF',        bg: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { key: 'laktosefrei', short: 'LF',        bg: 'bg-blue-100 text-blue-800 border-blue-200' },
    { key: 'bio',         short: 'Bio',       bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { key: 'ohne_zucker', short: 'Ø Zucker',  bg: 'bg-sky-100 text-sky-800 border-sky-200' },
    { key: 'pompa_uyumlu', short: 'Pump',     bg: 'bg-orange-100 text-orange-800 border-orange-200' },
    { key: 'katkisiz',    short: 'Pure',      bg: 'bg-teal-100 text-teal-800 border-teal-200' },
    { key: 'vegetarisch', short: 'Veg.',      bg: 'bg-lime-100 text-lime-800 border-lime-200' },
] as const;

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

// ── Helper: storage type ─────────────────────────────────────────────────────

function getStorageType(urun: Urun): 'tiefkuehl' | 'kuehlware' | 'ambient' {
    const tempMax = urun.lagertemperatur_max_celsius;
    const loj = (urun.lojistik_sinifi || '').toLowerCase();
    const tekniks = (urun.teknik_ozellikler || {}) as Record<string, unknown>;

    if (tempMax !== null && tempMax !== undefined) {
        if (tempMax <= -10) return 'tiefkuehl';
        if (tempMax <= 10) return 'kuehlware';
        return 'ambient';
    }

    if (loj.includes('tiefkühl') || loj.includes('tiefkuehl') || loj.includes('frozen') || loj.includes('dondurulmuş')) return 'tiefkuehl';
    if (loj.includes('kühl') || loj.includes('chilled')) return 'kuehlware';
    if (tekniks.tiefkuehl === true || tekniks.tiefkuehl === 'true') return 'tiefkuehl';

    return 'ambient';
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StorageBadge({ urun, locale }: { urun: Urun; locale: string }) {
    const type = getStorageType(urun);
    const tempMax = urun.lagertemperatur_max_celsius;

    if (type === 'tiefkuehl') {
        const label = tempMax !== null && tempMax !== undefined
            ? `${tempMax}°C`
            : (locale === 'de' ? 'Tiefkühl' : 'Frozen');
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-sm">
                <LuThermometerSnowflake size={9} /> {label}
            </span>
        );
    }
    if (type === 'kuehlware') {
        const tempMin = urun.lagertemperatur_min_celsius;
        const label = (tempMin !== null && tempMin !== undefined && tempMax !== null && tempMax !== undefined)
            ? `${tempMin}–${tempMax}°C`
            : (locale === 'de' ? 'Kühlware' : 'Chilled');
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300">
                <LuThermometer size={9} /> {label}
            </span>
        );
    }
    return null;
}

function ZertifikatBadges({ zertifikate, max = 3 }: { zertifikate?: string[] | null; max?: number }) {
    if (!zertifikate || zertifikate.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-1">
            {zertifikate.slice(0, max).map(z => {
                const cfg = ZERTIFIKAT_CONFIG[z];
                if (!cfg) return null;
                return (
                    <span key={z} className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border ${cfg.bg}`}>
                        <LuShieldCheck size={8} /> {cfg.label}
                    </span>
                );
            })}
            {zertifikate.length > max && (
                <span className="text-[9px] text-slate-400">+{zertifikate.length - max}</span>
            )}
        </div>
    );
}

function PackagingInfo({ urun, locale }: { urun: Urun; locale: string }) {
    const tekniks = (urun.teknik_ozellikler || {}) as Record<string, unknown>;

    const dilimAdet = Number(tekniks.dilim_adedi || tekniks.porsiyon_sayisi || 0);
    const kutuIciAdet = Number(tekniks.kutu_ici_adet || 0);
    const koliIciKutu = Number(urun.koli_ici_kutu_adet ?? tekniks.koli_ici_kutu_adet ?? tekniks.koli_ici_kutu ?? 0);
    const birimKg = Number(urun.birim_agirlik_kg ?? 0);
    const weightRawG = tekniks.net_agirlik_gram ?? tekniks.net_agirlik_gr ?? tekniks.net_agirlik ?? tekniks.gramaj;
    const numericG = typeof weightRawG === 'number' ? weightRawG : parseFloat(String(weightRawG || ''));
    const weightDisplay = birimKg > 0
        ? (birimKg < 1 ? `${Math.round(birimKg * 1000)} g` : `${birimKg % 1 === 0 ? birimKg : birimKg.toFixed(1)} kg`)
        : (weightRawG && Number.isFinite(numericG))
        ? (numericG >= 1000 ? `${(numericG / 1000).toFixed(1)} kg` : `${Math.round(numericG)} g`)
        : null;
    const volumeNum = Number(tekniks.hacim_ml ?? tekniks.hacim ?? 0);
    const volumeDisplay = volumeNum > 0
        ? (volumeNum >= 1000 ? `${volumeNum % 1000 === 0 ? volumeNum / 1000 : (volumeNum / 1000).toFixed(1)} L` : `${volumeNum} ml`)
        : null;

    type Chip = { icon: React.ReactNode; label: string; cls: string };
    const chips: Chip[] = [];

    const kutuLabel = dilimAdet > 0
        ? (locale === 'de' ? `${dilimAdet} Sch./Ktn.` : `${dilimAdet} dilim/kutu`)
        : kutuIciAdet > 1
        ? (locale === 'de' ? `${kutuIciAdet} Stk./Ktn.` : `${kutuIciAdet} adet/kutu`)
        : null;
    if (kutuLabel) chips.push({ icon: <LuPackage size={10} />, label: kutuLabel, cls: 'bg-sky-50 text-sky-700 border-sky-200' });

    if (koliIciKutu > 0) chips.push({
        icon: <LuPackage2 size={10} />,
        label: `${koliIciKutu} ${locale === 'de' ? 'Ktn./Kiste' : 'kutu/koli'}`,
        cls: 'bg-violet-50 text-violet-700 border-violet-200',
    });

    if (weightDisplay) chips.push({ icon: <LuWeight size={10} />, label: weightDisplay, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' });

    if (volumeDisplay && !weightDisplay) chips.push({ icon: <LuDroplets size={10} />, label: volumeDisplay, cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' });

    if (chips.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-1 mt-1.5">
            {chips.map((chip, i) => (
                <span key={i} className={`inline-flex items-center gap-1 text-[10px] font-semibold border px-1.5 py-0.5 rounded-full ${chip.cls}`}>
                    {chip.icon} {chip.label}
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
        <div className="flex flex-wrap gap-1 mt-1">
            {active.map(b => (
                <span key={b.key} title={getBadgeText(b.key as any, locale as any)}
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${b.bg}`}>
                    {b.short}
                </span>
            ))}
        </div>
    );
}

// ── Pagination ───────────────────────────────────────────────────────────────

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

// ── Catalog Card (B2B Grid View) ─────────────────────────────────────────────

function CatalogCard({ urun, locale, kategoriAdlariMap }: {
    urun: Urun;
    locale: string;
    kategoriAdlariMap: Map<string, string>;
}) {
    const tekniks = (urun.teknik_ozellikler || {}) as Record<string, unknown>;
    const name = urun.ad?.[locale] || urun.ad?.['de'] || urun.ad?.['tr'] || '';
    const kategoriAdi = urun.kategori_id ? kategoriAdlariMap.get(urun.kategori_id) : '';
    const moq = urun.mindest_bestellmenge ?? 1;
    const moqEinheit = urun.mindest_bestellmenge_einheit
        ?? (locale === 'de' ? 'Karton' : locale === 'tr' ? 'Karton' : 'Box');

    return (
        <Link href={`/${locale}/products/${urun.slug}`}
            className="group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-400 hover:shadow-lg transition-all duration-200">

            {/* Image */}
            <div className="relative h-48 bg-slate-50 overflow-hidden flex-shrink-0">
                {urun.ana_resim_url ? (
                    <Image src={urun.ana_resim_url} alt={name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <FiPackage className="w-10 h-10 text-slate-300" />
                    </div>
                )}

                {/* Storage badge — top left */}
                <div className="absolute top-2 left-2">
                    <StorageBadge urun={urun} locale={locale} />
                </div>

                {/* Category ribbon — bottom */}
                {kategoriAdi && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/55 to-transparent px-2.5 py-2.5">
                        <span className="text-white text-[9px] font-bold tracking-widest uppercase">{kategoriAdi}</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 p-3 gap-1">
                {/* Art.-Nr. */}
                {urun.stok_kodu && (
                    <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1 leading-none">
                        <LuBarcode size={9} /> {urun.stok_kodu}
                    </span>
                )}

                {/* Product name */}
                <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-slate-600">
                    {name}
                </h3>

                {/* Packaging chips */}
                <PackagingInfo urun={urun} locale={locale} />

                {/* Quality + Certifications row */}
                <div className="flex flex-wrap gap-1 mt-1 min-h-[18px]">
                    {BADGE_DEFS.filter(b => {
                        const v = tekniks[b.key];
                        return v === true || v === 'true' || v === 'evet' || v === 1;
                    }).slice(0, 3).map(b => (
                        <span key={b.key} title={getBadgeText(b.key as any, locale as any)}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${b.bg}`}>
                            {b.short}
                        </span>
                    ))}
                    {urun.zertifikate?.slice(0, 2).map(z => {
                        const cfg = ZERTIFIKAT_CONFIG[z];
                        if (!cfg) return null;
                        return (
                            <span key={z} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${cfg.bg}`}>
                                {cfg.label}
                            </span>
                        );
                    })}
                </div>

                {/* Footer: MOQ + Arrow */}
                <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <LuPackage size={10} className="text-slate-400" />
                        <span className="font-medium">
                            {locale === 'de' ? `ab ${moq} ${moqEinheit}` :
                             locale === 'tr' ? `min. ${moq} ${moqEinheit}` :
                             `min. ${moq} ${moqEinheit}`}
                        </span>
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5 group-hover:text-slate-700 transition-colors">
                        {locale === 'de' ? 'Details' : locale === 'tr' ? 'Detay' : 'Details'}
                        <FiChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                </div>
            </div>
        </Link>
    );
}

// ── Catalog Row (B2B List View) ──────────────────────────────────────────────

function CatalogRow({ urun, locale, kategoriAdlariMap }: {
    urun: Urun;
    locale: string;
    kategoriAdlariMap: Map<string, string>;
}) {
    const tekniks = (urun.teknik_ozellikler || {}) as Record<string, unknown>;
    const name = urun.ad?.[locale] || urun.ad?.['de'] || urun.ad?.['tr'] || '';
    const kategoriAdi = urun.kategori_id ? kategoriAdlariMap.get(urun.kategori_id) : '';

    const dilimAdet = Number(tekniks.dilim_adedi || tekniks.porsiyon_sayisi || 0);
    const kutuIciAdet = Number(tekniks.kutu_ici_adet || 0);
    const koliIciKutu = Number(urun.koli_ici_kutu_adet || tekniks.koli_ici_kutu_adet || tekniks.koli_ici_kutu || 0);
    const birimKg = Number(urun.birim_agirlik_kg || 0);
    const weightRaw = tekniks.net_agirlik_gram ?? tekniks.net_agirlik_gr ?? tekniks.net_agirlik ?? tekniks.gramaj;
    const numericWeight = typeof weightRaw === 'number' ? weightRaw : parseFloat(String(weightRaw || ''));
    const weight = birimKg > 0
        ? (birimKg >= 1 ? `${birimKg.toFixed(birimKg === Math.floor(birimKg) ? 0 : 1)} kg` : `${Math.round(birimKg * 1000)} g`)
        : (weightRaw && Number.isFinite(numericWeight))
        ? (numericWeight >= 1000 ? `${(numericWeight / 1000).toFixed(1)} kg` : `${numericWeight} g`)
        : '—';

    const unitLabel = dilimAdet > 0
        ? `${dilimAdet} ${locale === 'de' ? 'Sch.' : 'dilim'}`
        : kutuIciAdet > 0
        ? `${kutuIciAdet} ${locale === 'de' ? 'Stk.' : 'adet'}`
        : '—';

    const koliLabel = koliIciKutu > 0
        ? `${koliIciKutu} ${locale === 'de' ? 'Ktn.' : 'kutu'}`
        : '—';

    const moq = urun.mindest_bestellmenge ?? 1;
    const moqEinheit = urun.mindest_bestellmenge_einheit ?? (locale === 'de' ? 'Ktn.' : 'Box');

    const activeBadges = BADGE_DEFS.filter(b => {
        const v = tekniks[b.key];
        return v === true || v === 'true' || v === 'evet' || v === 1;
    });

    return (
        <Link href={`/${locale}/products/${urun.slug}`}
            className="group grid grid-cols-[48px_2.5fr_1fr_90px_80px_80px_80px_80px_90px_auto] items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">

            {/* Thumbnail */}
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                {urun.ana_resim_url
                    ? <Image src={urun.ana_resim_url} alt={name} fill sizes="48px" className="object-cover" />
                    : <FiPackage className="w-5 h-5 text-slate-300 absolute inset-0 m-auto" />}
            </div>

            {/* Name + Art.-Nr. + EAN */}
            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-slate-600">{name}</p>
                {urun.stok_kodu && (
                    <p className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <LuBarcode size={9} /> {urun.stok_kodu}
                    </p>
                )}
                {urun.ean_gtin && (
                    <p className="text-[9px] font-mono text-slate-300">EAN: {urun.ean_gtin}</p>
                )}
            </div>

            {/* Category */}
            <span className="text-xs text-slate-500 truncate hidden md:block">{kategoriAdi}</span>

            {/* Storage */}
            <div className="hidden lg:flex justify-center">
                <StorageBadge urun={urun} locale={locale} />
            </div>

            {/* Units */}
            <span className="text-xs text-slate-700 text-center font-medium">{unitLabel}</span>

            {/* Boxes/case */}
            <span className="text-xs text-slate-700 text-center font-medium">{koliLabel}</span>

            {/* Weight */}
            <span className="text-xs text-slate-700 text-center">{weight}</span>

            {/* MOQ */}
            <span className="text-xs text-slate-700 text-center font-medium hidden xl:block">
                {moq} {moqEinheit}
            </span>

            {/* Badges + Zertifikate */}
            <div className="flex gap-1 flex-wrap hidden lg:flex">
                {activeBadges.slice(0, 2).map(b => (
                    <span key={b.key} title={getBadgeText(b.key as any, locale as any)}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${b.bg}`}>
                        {b.short}
                    </span>
                ))}
                {urun.zertifikate?.slice(0, 1).map(z => {
                    const cfg = ZERTIFIKAT_CONFIG[z];
                    if (!cfg) return null;
                    return (
                        <span key={z} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${cfg.bg}`}>
                            {cfg.label}
                        </span>
                    );
                })}
            </div>

            {/* Arrow */}
            <FiChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 justify-self-end transition-colors" />
        </Link>
    );
}

// ── Main Export ──────────────────────────────────────────────────────────────

export function ProductGridClient({
    urunler, locale, kategoriAdlariMap, sablonMap, kategoriParentMap, pagination, dictionary
}: ProductGridClientProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const filteredUrunler = useMemo(() => {
        if (!searchTerm) return urunler;
        const q = searchTerm.toLowerCase();
        return urunler.filter(urun => {
            const name = (urun.ad?.[locale] || urun.ad?.['de'] || '').toLowerCase();
            const sku = (urun.stok_kodu || '').toLowerCase();
            const ean = (urun.ean_gtin || '').toLowerCase();
            return name.includes(q) || sku.includes(q) || ean.includes(q);
        });
    }, [urunler, searchTerm, locale]);

    const L = {
        searchPlaceholder: locale === 'de'
            ? 'Produkt, Art.-Nr. oder EAN suchen…'
            : locale === 'tr' ? 'Ürün adı, stok kodu veya EAN…'
            : locale === 'en' ? 'Search by product, SKU or EAN…'
            : '…',
        noResults: locale === 'de' ? 'Keine Produkte gefunden' : locale === 'tr' ? 'Ürün bulunamadı' : 'No products found',
        unitsCol:    locale === 'de' ? 'Stk./Ktn.' : locale === 'tr' ? 'Adet/Kutu'  : 'Units/Box',
        boxesCol:    locale === 'de' ? 'Ktn./Kiste': locale === 'tr' ? 'Kutu/Koli'  : 'Boxes/Case',
        weightCol:   locale === 'de' ? 'Gewicht'   : locale === 'tr' ? 'Ağırlık'    : 'Weight',
        badgesCol:   locale === 'de' ? 'Merkmale'  : locale === 'tr' ? 'Özellikler' : 'Properties',
        categoryCol: locale === 'de' ? 'Kategorie' : locale === 'tr' ? 'Kategori'   : 'Category',
        productCol:  locale === 'de' ? 'Produkt'   : locale === 'tr' ? 'Ürün'       : 'Product',
        storageCol:  locale === 'de' ? 'Lagerung'  : locale === 'tr' ? 'Depolama'   : 'Storage',
        moqCol:      locale === 'de' ? 'MOQ'       : locale === 'tr' ? 'MOQ'        : 'MOQ',
        countLabel: (n: number) => locale === 'de' ? `${n} Artikel` : locale === 'tr' ? `${n} ürün` : `${n} items`,
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                    <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    <input
                        type="text"
                        placeholder={L.searchPlaceholder}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-7 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
                    )}
                </div>

                <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm ml-auto">
                    <button onClick={() => setViewMode('grid')}
                        title={locale === 'de' ? 'Kachelansicht' : 'Grid view'}
                        className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <FiGrid size={15} />
                    </button>
                    <button onClick={() => setViewMode('list')}
                        title={locale === 'de' ? 'Listenansicht' : 'List view'}
                        className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <FiList size={15} />
                    </button>
                </div>

                {filteredUrunler.length > 0 && (
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                        {L.countLabel(filteredUrunler.length)}
                    </span>
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                        {filteredUrunler.map(urun => (
                            <CatalogCard key={urun.id} urun={urun} locale={locale} kategoriAdlariMap={kategoriAdlariMap} />
                        ))}
                    </div>
                    {pagination && <Pagination pagination={pagination} locale={locale} />}
                </>
            ) : (
                <>
                    {/* Table header */}
                    <div className="hidden lg:grid grid-cols-[48px_2.5fr_1fr_90px_80px_80px_80px_80px_90px_auto] gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 bg-slate-50 rounded-t-lg">
                        <span />
                        <span>{L.productCol}</span>
                        <span>{L.categoryCol}</span>
                        <span className="text-center">{L.storageCol}</span>
                        <span className="text-center">{L.unitsCol}</span>
                        <span className="text-center">{L.boxesCol}</span>
                        <span className="text-center">{L.weightCol}</span>
                        <span className="text-center">{L.moqCol}</span>
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
