// src/components/urun-detay-gorunumu.tsx — B2B Product Detail
'use client';

import React from 'react';
import Image from 'next/image';
import { Tables } from '@/lib/supabase/database.types';
import { getLocalizedName, Locale } from '@/lib/utils';
import { FiTag, FiInfo, FiMail } from 'react-icons/fi';
import { LuPackage, LuPackage2, LuWarehouse, LuBarcode, LuTruck } from 'react-icons/lu';
import { getBadgeText, getFlavorLabel } from '@/lib/labels';

// Types
type Urun = Tables<'urunler'> & {
    kategoriler?: Pick<Tables<'kategoriler'>, 'ad'> | null;
};
type Sablon = Pick<Tables<'kategori_ozellik_sablonlari'>, 'alan_adi' | 'gosterim_adi'>;

interface UrunDetayGorunumuProps {
    urun: Urun;
    ozellikSablonu: Sablon[];
    locale: Locale;
}

// ── Localized string helpers ──────────────────────────────────────────────────
const t = {
    de: {
        category: 'Kategorie',
        sku: 'Art.-Nr.',
        description: 'Produktbeschreibung',
        specs: 'Technische Details',
        packaging: 'Verpackung & Logistik',
        unit: 'Einheit',
        box: 'Karton',
        case: 'Kiste',
        pallet: 'Palette',
        slices: 'Scheiben',
        piecesPerBox: 'Stk./Karton',
        boxesPerCase: 'Ktn./Kiste',
        casesPerPallet: 'Kisten/Palette',
        unitsPerPallet: 'Einh./Palette',
        weight: 'Gewicht',
        volume: 'Volumen',
        contact: 'Preisanfrage stellen',
        contactSub: 'Für Großbestellungen und Preislisten kontaktieren Sie uns.',
        dietary: 'Qualitätsmerkmale',
        flavors: 'Geschmack',
        logistics: 'Logistikklasse',
    },
    tr: {
        category: 'Kategori',
        sku: 'Ürün Kodu',
        description: 'Ürün Açıklaması',
        specs: 'Teknik Özellikler',
        packaging: 'Ambalaj & Lojistik',
        unit: 'Birim',
        box: 'Kutu',
        case: 'Koli',
        pallet: 'Palet',
        slices: 'dilim',
        piecesPerBox: 'adet/kutu',
        boxesPerCase: 'kutu/koli',
        casesPerPallet: 'koli/palet',
        unitsPerPallet: 'ürün/palet',
        weight: 'Ağırlık',
        volume: 'Hacim',
        contact: 'Fiyat Teklifi İste',
        contactSub: 'Toptan siparişler ve fiyat listesi için bizimle iletişime geçin.',
        dietary: 'Kalite Özellikleri',
        flavors: 'Lezzet',
        logistics: 'Lojistik Sınıfı',
    },
    en: {
        category: 'Category',
        sku: 'SKU',
        description: 'Product Description',
        specs: 'Technical Details',
        packaging: 'Packaging & Logistics',
        unit: 'Unit',
        box: 'Box',
        case: 'Case',
        pallet: 'Pallet',
        slices: 'slices',
        piecesPerBox: 'pcs./box',
        boxesPerCase: 'boxes/case',
        casesPerPallet: 'cases/pallet',
        unitsPerPallet: 'units/pallet',
        weight: 'Weight',
        volume: 'Volume',
        contact: 'Request a Quote',
        contactSub: 'Contact us for bulk orders and price lists.',
        dietary: 'Quality Features',
        flavors: 'Flavors',
        logistics: 'Logistics Class',
    },
} as const;

function lx(locale: string): typeof t.de {
    return (t as any)[locale] ?? t.de;
}

function fmtWeight(kg: number | null | undefined, grams?: number | null): string | null {
    if (kg && kg > 0) {
        return kg >= 1
            ? `${kg % 1 === 0 ? kg : kg.toFixed(1)} kg`
            : `${Math.round(kg * 1000)} g`;
    }
    if (grams && grams > 0) {
        return grams >= 1000 ? `${(grams / 1000).toFixed(1)} kg` : `${grams} g`;
    }
    return null;
}

// ── Packaging tier card ───────────────────────────────────────────────────────
function TierCard({ icon, title, lines, accent }: {
    icon: React.ReactNode;
    title: string;
    lines: (string | null)[];
    accent: string;
}) {
    const validLines = lines.filter(Boolean) as string[];
    if (validLines.length === 0) return null;
    return (
        <div className={`rounded-xl border ${accent} p-4 flex flex-col gap-1.5`}>
            <div className="flex items-center gap-2 mb-1">
                <span className="opacity-70">{icon}</span>
                <span className="text-xs font-bold uppercase tracking-wide opacity-70">{title}</span>
            </div>
            {validLines.map((line, i) => (
                <span key={i} className="text-sm font-semibold">{line}</span>
            ))}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export function UrunDetayGorunumu({ urun, ozellikSablonu, locale }: UrunDetayGorunumuProps) {
    const lc = lx(locale);
    const urunAdi = getLocalizedName(urun.ad, locale);
    const aciklama = getLocalizedName(urun.aciklamalar, locale);
    const kategorieAdi = urun.kategoriler ? getLocalizedName(urun.kategoriler.ad, locale) : '';
    const tekniks: Record<string, unknown> = (urun.teknik_ozellikler as any) ?? {};

    // ── Dietary / quality badges ──
    const BADGE_KEYS = ['vegan', 'vegetarisch', 'glutenfrei', 'laktosefrei', 'bio'] as const;
    const activeBadges = BADGE_KEYS.filter(k => tekniks[k] === true);
    const flavorList: string[] = Array.isArray(tekniks.geschmack)
        ? (tekniks.geschmack as string[])
        : tekniks.geschmack ? [tekniks.geschmack as string] : [];

    // ── Packaging numbers ─────────────────────────────────────────────────────
    const dilimAdet = Number(tekniks.dilim_adedi ?? tekniks.porsiyon_sayisi ?? 0);
    const kutuIciAdet = Number(tekniks.kutu_ici_adet ?? 0);
    const unitWeightKg = urun.birim_agirlik_kg ?? null;
    const unitWeightG = Number(
        tekniks.net_agirlik_gram ?? tekniks.net_agirlik_gr ?? tekniks.net_agirlik ?? tekniks.gramaj ?? 0
    ) || null;
    const hacimMl = Number(tekniks.hacim_ml ?? 0) || null;

    // Koli
    const koliIciKutu = Number(urun.koli_ici_kutu_adet ?? tekniks.koli_ici_kutu_adet ?? tekniks.koli_ici_kutu ?? 0) || null;
    const koliIciAdet = Number((urun as any).koli_ici_adet ?? tekniks.koli_ici_adet ?? 0) || null;

    // Palet
    const paletIciKoli = Number(urun.palet_ici_koli_adet ?? 0) || null;
    const paletIciKutu = Number(urun.palet_ici_kutu_adet ?? 0) || null;
    const paletIciAdet = Number(urun.palet_ici_adet ?? 0) || null;

    // Computed totals — koli weight = box weight × boxes/case
    const koliAgirlik = (unitWeightKg && koliIciKutu)
        ? fmtWeight(unitWeightKg * koliIciKutu, null)
        : (unitWeightG && koliIciKutu)
        ? fmtWeight((unitWeightG / 1000) * koliIciKutu, null)
        : null;
    const paletKoliCount = paletIciKoli ?? (paletIciKutu && koliIciKutu ? Math.round(paletIciKutu / koliIciKutu) : null);
    const paletAgirlik = (paletKoliCount && (unitWeightKg || unitWeightG) && koliIciKutu)
        ? fmtWeight(((unitWeightKg ?? (unitWeightG! / 1000))) * koliIciKutu * paletKoliCount, null)
        : null;

    const hasPackagingData = dilimAdet > 0 || kutuIciAdet > 0 || koliIciKutu || koliIciAdet || paletIciKoli || paletIciKutu || paletIciAdet;

    // ── Category template specs ───────────────────────────────────────────────
    const specRows = ozellikSablonu
        .map(s => {
            const val = (tekniks as any)[s.alan_adi];
            if (val === null || val === undefined || val === '') return null;
            return { label: getLocalizedName(s.gosterim_adi, locale), val };
        })
        .filter(Boolean) as { label: string; val: unknown }[];

    // ── Gallery ───────────────────────────────────────────────────────────────
    const allImages = [urun.ana_resim_url, ...(urun.galeri_resim_urls ?? [])].filter(Boolean) as string[];
    const [activeImg, setActiveImg] = React.useState(allImages[0] ?? null);

    return (
        <div className="bg-slate-50 min-h-screen py-10 md:py-16">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">

                    {/* ── Left: Gallery ── */}
                    <div className="sticky top-24">
                        {activeImg ? (
                            <div className="aspect-square w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <Image src={activeImg} alt={urunAdi} width={800} height={800}
                                    className="w-full h-full object-cover" priority />
                            </div>
                        ) : (
                            <div className="aspect-square w-full rounded-2xl border bg-slate-100 flex items-center justify-center">
                                <LuPackage2 className="w-16 h-16 text-slate-300" />
                            </div>
                        )}
                        {allImages.length > 1 && (
                            <div className="mt-3 grid grid-cols-5 gap-2">
                                {allImages.map((img, i) => (
                                    <button key={i} onClick={() => setActiveImg(img)}
                                        className={`aspect-square overflow-hidden rounded-lg border-2 transition ${activeImg === img ? 'border-slate-700' : 'border-transparent hover:border-slate-300'}`}>
                                        <Image src={img} alt={`${i + 1}`} width={120} height={120} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Right: Info ── */}
                    <div className="flex flex-col gap-6">

                        {/* Category + Title + SKU */}
                        <div>
                            {kategorieAdi && (
                                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
                                    <FiTag size={12} /> {kategorieAdi}
                                </p>
                            )}
                            <h1 className="text-3xl md:text-4xl font-serif text-slate-900 leading-tight mb-2">
                                {urunAdi}
                            </h1>
                            {urun.stok_kodu && (
                                <p className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                                    <LuBarcode size={13} />
                                    <span className="font-semibold text-slate-500">{lc.sku}:</span> {urun.stok_kodu}
                                </p>
                            )}
                        </div>

                        {/* Dietary / Quality badges */}
                        {(activeBadges.length > 0 || flavorList.length > 0) && (
                            <div>
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{lc.dietary}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {activeBadges.map(k => (
                                        <span key={k} className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            {getBadgeText(k, locale as any)}
                                        </span>
                                    ))}
                                    {flavorList.length > 0 && (
                                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200">
                                            {getFlavorLabel(flavorList.join(', '), locale as any)}
                                        </span>
                                    )}
                                    {urun.lojistik_sinifi && (
                                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                                            <LuTruck size={10} /> {urun.lojistik_sinifi}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        {aciklama && (
                            <div>
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{lc.description}</h3>
                                <div className="text-sm text-slate-600 leading-relaxed prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: aciklama.replace(/\n/g, '<br />') }} />
                            </div>
                        )}

                        {/* ── Packaging & Logistics ── */}
                        {hasPackagingData && (
                            <div>
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                                    <LuWarehouse size={12} /> {lc.packaging}
                                </h3>
                                <div className="grid grid-cols-3 gap-3">

                                    {/* Kutu / Karton */}
                                    <TierCard
                                        icon={<LuPackage size={16} />}
                                        title={lc.box}
                                        accent="bg-sky-50 border-sky-200 text-sky-800"
                                        lines={[
                                            // Primary: slices per box (e.g. "10 dilim")
                                            dilimAdet > 0
                                                ? (locale === 'de' ? `${dilimAdet} Scheiben` : `${dilimAdet} dilim`)
                                                : kutuIciAdet > 0
                                                ? (locale === 'de' ? `${kutuIciAdet} Stk.` : `${kutuIciAdet} adet`)
                                                : null,
                                            // Unit weight of one box
                                            fmtWeight(unitWeightKg, unitWeightG)
                                                ? `${locale === 'de' ? 'Gewicht' : 'Ağırlık'}: ${fmtWeight(unitWeightKg, unitWeightG)}`
                                                : null,
                                            hacimMl && !unitWeightKg && !unitWeightG ? `${hacimMl} ml` : null,
                                        ]}
                                    />

                                    {/* Koli / Kiste */}
                                    <TierCard
                                        icon={<LuPackage2 size={16} />}
                                        title={lc.case}
                                        accent="bg-violet-50 border-violet-200 text-violet-800"
                                        lines={[
                                            koliIciKutu ? (locale === 'de' ? `${koliIciKutu} Karton` : `${koliIciKutu} Kutu`) : null,
                                            koliIciAdet && !koliIciKutu ? (locale === 'de' ? `${koliIciAdet} Stk.` : `${koliIciAdet} adet`) : null,
                                            koliAgirlik ? `${locale === 'de' ? 'Kistengewicht' : 'Koli ağırlığı'}: ~${koliAgirlik}` : null,
                                        ]}
                                    />

                                    {/* Palet / Palette */}
                                    <TierCard
                                        icon={<LuWarehouse size={16} />}
                                        title={lc.pallet}
                                        accent="bg-slate-100 border-slate-300 text-slate-700"
                                        lines={[
                                            paletIciKoli ? (locale === 'de' ? `${paletIciKoli} Kisten` : `${paletIciKoli} Koli`) : null,
                                            paletIciKutu && !paletIciKoli ? (locale === 'de' ? `${paletIciKutu} Karton` : `${paletIciKutu} Kutu`) : null,
                                            paletIciAdet && !paletIciKoli && !paletIciKutu ? (locale === 'de' ? `${paletIciAdet} Stk.` : `${paletIciAdet} adet`) : null,
                                            paletAgirlik ? `${locale === 'de' ? 'Palettengewicht' : 'Palet ağırlığı'}: ~${paletAgirlik}` : null,
                                        ]}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── Category template specs ── */}
                        {specRows.length > 0 && (
                            <div>
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                                    <FiInfo size={11} /> {lc.specs}
                                </h3>
                                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-white">
                                    {specRows.map(item => (
                                        <div key={item.label} className="flex justify-between items-center px-4 py-2.5 text-sm">
                                            <span className="text-slate-500 font-medium">{item.label}</span>
                                            <span className="font-semibold text-slate-800 text-right max-w-[55%]">
                                                {Array.isArray(item.val)
                                                    ? (item.val as string[]).map(v => getFlavorLabel(v, locale as any)).join(', ')
                                                    : String(item.val)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── CTA ── */}
                        <div className="rounded-2xl bg-slate-900 text-white p-6 flex flex-col gap-3">
                            <p className="text-xs text-slate-400">{lc.contactSub}</p>
                            <a href={`mailto:info@sweetheaven.de?subject=${encodeURIComponent(urunAdi)}`}
                                className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 font-semibold text-sm px-5 py-3 rounded-xl hover:bg-slate-100 transition-colors">
                                <FiMail size={15} /> {lc.contact}
                            </a>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}