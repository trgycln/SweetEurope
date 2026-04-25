// src/components/urun-detay-gorunumu.tsx — B2B Product Detail (Germany / EU)
'use client';

import React from 'react';
import Image from 'next/image';
import { Tables } from '@/lib/supabase/database.types';
import { getLocalizedName, Locale } from '@/lib/utils';
import { FiTag, FiInfo, FiMail, FiDownload, FiAlertTriangle } from 'react-icons/fi';
import { LuPackage, LuPackage2, LuWarehouse, LuBarcode, LuTruck, LuThermometerSnowflake, LuThermometer, LuShieldCheck, LuClock, LuCalendar } from 'react-icons/lu';
import { getBadgeText, getFlavorLabel } from '@/lib/labels';

// ── Types ────────────────────────────────────────────────────────────────────
// All B2B fields are now in Tables<'urunler'> after database.types.ts regeneration

type Urun = Tables<'urunler'> & {
    kategoriler?: Pick<Tables<'kategoriler'>, 'ad'> | null;
};

type Sablon = Pick<Tables<'kategori_ozellik_sablonlari'>, 'alan_adi' | 'gosterim_adi'>;

interface UrunDetayGorunumuProps {
    urun: Urun;
    ozellikSablonu: Sablon[];
    locale: Locale;
}

// ── EU 14 Major Allergens (LMIV Anhang II) ──────────────────────────────────

const ALLERGEN_DEFS = [
    { key: 'gluten',         de: 'Glutenhaltiges Getreide', en: 'Gluten (cereals)',  tr: 'Gluten (tahıllar)',    icon: '🌾' },
    { key: 'krebstiere',     de: 'Krebstiere',              en: 'Crustaceans',        tr: 'Kabuklu deniz ür.',   icon: '🦐' },
    { key: 'eier',           de: 'Eier',                    en: 'Eggs',               tr: 'Yumurta',             icon: '🥚' },
    { key: 'fisch',          de: 'Fisch',                   en: 'Fish',               tr: 'Balık',               icon: '🐟' },
    { key: 'erdnuesse',      de: 'Erdnüsse',                en: 'Peanuts',            tr: 'Yer fıstığı',         icon: '🥜' },
    { key: 'soja',           de: 'Soja',                    en: 'Soybeans',           tr: 'Soya',                icon: '🫘' },
    { key: 'milch',          de: 'Milch / Laktose',         en: 'Milk / Lactose',     tr: 'Süt / Laktoz',       icon: '🥛' },
    { key: 'nuesse',         de: 'Schalenfrüchte',          en: 'Tree nuts',          tr: 'Kabuklu yemişler',    icon: '🌰' },
    { key: 'sellerie',       de: 'Sellerie',                en: 'Celery',             tr: 'Kereviz',             icon: '🥬' },
    { key: 'senf',           de: 'Senf',                    en: 'Mustard',            tr: 'Hardal',              icon: '🌿' },
    { key: 'sesam',          de: 'Sesam',                   en: 'Sesame',             tr: 'Susam',               icon: '⚪' },
    { key: 'schwefeldioxid', de: 'Schwefeldioxid / Sulfite',en: 'SO₂ / Sulphites',   tr: 'SO₂ / Sülfitler',    icon: '🧪' },
    { key: 'lupinen',        de: 'Lupinen',                 en: 'Lupin',              tr: 'Acı bakla',           icon: '🌱' },
    { key: 'weichtiere',     de: 'Weichtiere',              en: 'Molluscs',           tr: 'Yumuşakçalar',        icon: '🐚' },
] as const;

const ZERTIFIKAT_CONFIG: Record<string, { label: string; bg: string; icon: string }> = {
    'Halal':      { label: 'Halal',             bg: 'bg-teal-50 text-teal-800 border-teal-300',     icon: '☪️' },
    'Bio':        { label: 'Bio (EU-Öko)',       bg: 'bg-green-50 text-green-800 border-green-300',  icon: '🌿' },
    'IFS':        { label: 'IFS Food',           bg: 'bg-slate-50 text-slate-700 border-slate-300',  icon: '✓' },
    'BRC':        { label: 'BRC/BRCGS',          bg: 'bg-slate-50 text-slate-700 border-slate-300',  icon: '✓' },
    'Kosher':     { label: 'Kosher',             bg: 'bg-purple-50 text-purple-800 border-purple-200', icon: '✡️' },
    'HACCP':      { label: 'HACCP',              bg: 'bg-slate-50 text-slate-700 border-slate-300',  icon: '✓' },
    'Vegan_Zert': { label: 'Vegan (zertifiziert)', bg: 'bg-green-50 text-green-800 border-green-300', icon: '🌱' },
    'Rainforest': { label: 'Rainforest Alliance', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: '🌲' },
};

// ── Localization ─────────────────────────────────────────────────────────────

const T = {
    de: {
        category: 'Kategorie', sku: 'Art.-Nr.', ean: 'EAN / GTIN',
        description: 'Produktbeschreibung', specs: 'Technische Daten',
        packaging: 'Verpackung & Logistik',
        unit: 'Einheit', box: 'Karton', case: 'Kiste', pallet: 'Palette',
        weight: 'Gewicht', volume: 'Volumen',
        contact: 'Preisanfrage stellen',
        contactSub: 'Für Großbestellungen und individuelle Preislisten stehen wir Ihnen gerne zur Verfügung.',
        dietary: 'Qualitätsmerkmale', flavors: 'Geschmack', logistics: 'Logistikklasse',
        certifications: 'Zertifikate & Qualitätssiegel',
        orderInfo: 'Bestellinformation',
        moq: 'Mindestbestellmenge', delivery: 'Lieferzeit', validity: 'Mindesthaltbarkeit',
        validityAfterOpen: 'Nach Öffnung',
        storage: 'Lagerung', origin: 'Herkunftsland', manufacturer: 'Hersteller',
        datasheet: 'Produktdatenblatt herunterladen',
        ingredients: 'Zutaten / Inhaltsstoffe',
        allergens: 'Allergene (gem. LMIV Anhang II)',
        allergenContains: 'Enthält:', allergenTraces: 'Kann Spuren enthalten von:',
        nutritionTitle: 'Nährwertangaben',
        nutritionPer100: 'je 100 g',
        nutritionPerPortion: 'je Portion',
        portionSize: 'Portionsgröße',
        energy: 'Brennwert', fat: 'Fett', saturated: 'davon gesättigte Fettsäuren',
        carbs: 'Kohlenhydrate', sugars: 'davon Zucker', fiber: 'Ballaststoffe',
        protein: 'Eiweiß', salt: 'Salz',
        werktage: 'Werktage', months: 'Monate', days: 'Tage',
        tiefkuehl: 'Tiefkühlware (≤ −18 °C)', kuehlware: 'Kühlware', ambient: 'Trocken / Ambient',
        noAllergen: 'Keine deklarationspflichtigen Allergene.',
    },
    tr: {
        category: 'Kategori', sku: 'Ürün Kodu', ean: 'EAN / GTIN',
        description: 'Ürün Açıklaması', specs: 'Teknik Özellikler',
        packaging: 'Ambalaj & Lojistik',
        unit: 'Birim', box: 'Kutu', case: 'Koli', pallet: 'Palet',
        weight: 'Ağırlık', volume: 'Hacim',
        contact: 'Fiyat Teklifi İste',
        contactSub: 'Toptan siparişler ve fiyat listesi için bizimle iletişime geçin.',
        dietary: 'Kalite Özellikleri', flavors: 'Lezzet', logistics: 'Lojistik Sınıfı',
        certifications: 'Sertifikalar & Kalite Belgeleri',
        orderInfo: 'Sipariş Bilgileri',
        moq: 'Minimum Sipariş', delivery: 'Teslimat Süresi', validity: 'Son Kullanma',
        validityAfterOpen: 'Açıldıktan Sonra',
        storage: 'Depolama', origin: 'Menşei Ülke', manufacturer: 'Üretici',
        datasheet: 'Ürün Veri Sayfasını İndir',
        ingredients: 'İçindekiler',
        allergens: 'Alerjenler (LMIV Ek II)',
        allergenContains: 'İçerir:', allergenTraces: 'İz miktarda içerebilir:',
        nutritionTitle: 'Besin Değerleri',
        nutritionPer100: '100 g başına',
        nutritionPerPortion: 'Porsiyon başına',
        portionSize: 'Porsiyon büyüklüğü',
        energy: 'Enerji', fat: 'Yağ', saturated: 'doymuş yağ asitleri',
        carbs: 'Karbonhidrat', sugars: 'şeker', fiber: 'Lif',
        protein: 'Protein', salt: 'Tuz',
        werktage: 'iş günü', months: 'ay', days: 'gün',
        tiefkuehl: 'Derin Dondurulmuş (≤ −18 °C)', kuehlware: 'Soğutulmuş', ambient: 'Kuru / Oda Sıcaklığı',
        noAllergen: 'Beyan edilmesi gereken alerjen bulunmamaktadır.',
    },
    en: {
        category: 'Category', sku: 'SKU', ean: 'EAN / GTIN',
        description: 'Product Description', specs: 'Technical Details',
        packaging: 'Packaging & Logistics',
        unit: 'Unit', box: 'Box', case: 'Case', pallet: 'Pallet',
        weight: 'Weight', volume: 'Volume',
        contact: 'Request a Quote',
        contactSub: 'Contact us for bulk orders and custom price lists.',
        dietary: 'Quality Features', flavors: 'Flavors', logistics: 'Logistics Class',
        certifications: 'Certifications & Quality Labels',
        orderInfo: 'Order Information',
        moq: 'Min. Order Qty.', delivery: 'Delivery Time', validity: 'Best Before',
        validityAfterOpen: 'After Opening',
        storage: 'Storage', origin: 'Country of Origin', manufacturer: 'Manufacturer',
        datasheet: 'Download Product Datasheet',
        ingredients: 'Ingredients',
        allergens: 'Allergens (LMIV Annex II)',
        allergenContains: 'Contains:', allergenTraces: 'May contain traces of:',
        nutritionTitle: 'Nutritional Values',
        nutritionPer100: 'per 100 g',
        nutritionPerPortion: 'per portion',
        portionSize: 'Portion size',
        energy: 'Energy', fat: 'Fat', saturated: 'of which saturated',
        carbs: 'Carbohydrates', sugars: 'of which sugars', fiber: 'Dietary fibre',
        protein: 'Protein', salt: 'Salt',
        werktage: 'working days', months: 'months', days: 'days',
        tiefkuehl: 'Frozen (≤ −18 °C)', kuehlware: 'Chilled', ambient: 'Dry / Ambient',
        noAllergen: 'No declarable allergens.',
    },
} as const;

function lx(locale: string): typeof T.de {
    return (T as any)[locale] ?? T.de;
}

function fmtWeight(kg: number | null | undefined, grams?: number | null): string | null {
    if (kg && kg > 0) return kg >= 1 ? `${kg % 1 === 0 ? kg : kg.toFixed(1)} kg` : `${Math.round(kg * 1000)} g`;
    if (grams && grams > 0) return grams >= 1000 ? `${(grams / 1000).toFixed(1)} kg` : `${grams} g`;
    return null;
}

function fmtNumber(n: number | null | undefined): string {
    if (n === null || n === undefined) return '—';
    return n % 1 === 0 ? String(n) : n.toFixed(2);
}

// ── Packaging tier card ───────────────────────────────────────────────────────

function TierCard({ icon, title, lines, accent }: {
    icon: React.ReactNode; title: string; lines: (string | null)[]; accent: string;
}) {
    const valid = lines.filter(Boolean) as string[];
    if (valid.length === 0) return null;
    return (
        <div className={`rounded-xl border ${accent} p-3.5 flex flex-col gap-1.5`}>
            <div className="flex items-center gap-2 mb-0.5">
                <span className="opacity-60">{icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{title}</span>
            </div>
            {valid.map((line, i) => <span key={i} className="text-sm font-semibold">{line}</span>)}
        </div>
    );
}

// ── Quick Info Pill ───────────────────────────────────────────────────────────

function InfoPill({ icon, label, value, cls }: {
    icon: React.ReactNode; label: string; value: string; cls?: string;
}) {
    return (
        <div className={`flex flex-col items-center px-4 py-2.5 rounded-xl border text-center min-w-[90px] ${cls || 'bg-white border-slate-200'}`}>
            <span className="text-slate-400 mb-0.5">{icon}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-0.5">{label}</span>
            <span className="text-sm font-bold text-slate-800 leading-tight">{value}</span>
        </div>
    );
}

// ── Allergen indicator ────────────────────────────────────────────────────────

function AllergenRow({ present, label, icon }: { present: boolean; label: string; icon: string }) {
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
            present ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-slate-50 text-slate-400 border border-transparent'
        }`}>
            <span className="text-base leading-none">{icon}</span>
            <span className={`font-medium ${present ? 'font-semibold' : ''}`}>{label}</span>
            {present ? (
                <span className="ml-auto text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">✓</span>
            ) : (
                <span className="ml-auto text-[10px] text-slate-300">—</span>
            )}
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

    // ── B2B fields (all now properly typed via database.types.ts) ──
    const eanGtin = urun.ean_gtin ?? null;
    const herkunft = (urun.herkunftsland as Record<string, string> | null) ?? null;
    const moq: number = urun.mindest_bestellmenge ?? 1;
    const moqEinheit: string = urun.mindest_bestellmenge_einheit ?? lc.box;
    const tempMin = urun.lagertemperatur_min_celsius ?? null;
    const tempMax = urun.lagertemperatur_max_celsius ?? null;
    const haltbarkeitMonate = urun.haltbarkeit_monate ?? null;
    const haltbarkeitNachOeffnen = urun.haltbarkeit_nach_oeffnen_tage ?? null;
    const zertifikate: string[] = urun.zertifikate ?? [];
    const inhaltsstoffeJson = urun.inhaltsstoffe as Record<string, string> | null;
    const inhaltsstoffe: string | null = inhaltsstoffeJson?.[locale] ?? inhaltsstoffeJson?.de ?? null;
    const allergene: Record<string, boolean> = (urun.allergene as Record<string, boolean>) ?? {};
    const naehrwerte = urun.naehrwerte as {
        pro_100g?: { energie_kj?: number; energie_kcal?: number; fett?: number; davon_gesaettigt?: number; kohlenhydrate?: number; davon_zucker?: number; ballaststoffe?: number; eiweiss?: number; salz?: number };
        pro_portion?: { portion_gramm?: number; energie_kj?: number; energie_kcal?: number; fett?: number; davon_gesaettigt?: number; kohlenhydrate?: number; davon_zucker?: number; ballaststoffe?: number; eiweiss?: number; salz?: number };
    } | null;
    const lieferzeitWerktage = urun.lieferzeit_werktage ?? null;
    const produktdatenblattUrl = urun.produktdatenblatt_url ?? null;
    const herstellerName = urun.hersteller_name ?? null;
    const herstellerLand = urun.hersteller_land ?? null;

    // ── Storage type ──
    function getStorageLabel(): string | null {
        const loj = (urun.lojistik_sinifi || '').toLowerCase();
        if (tempMax !== null) {
            if (tempMax <= -10) return `${lc.tiefkuehl}`;
            if (tempMax <= 10) {
                return tempMin !== null ? `${lc.kuehlware} (${tempMin}–${tempMax} °C)` : lc.kuehlware;
            }
        }
        if (loj.includes('tiefkühl') || loj.includes('frozen')) return lc.tiefkuehl;
        if (loj.includes('kühl') || loj.includes('chilled')) return lc.kuehlware;
        if (loj.includes('trocken') || loj.includes('ambient') || loj.includes('dry')) return lc.ambient;
        if (urun.lojistik_sinifi) return urun.lojistik_sinifi;
        return null;
    }
    const storageLabel = getStorageLabel();
    const isFrozen = tempMax !== null ? tempMax <= -10 : (urun.lojistik_sinifi || '').toLowerCase().includes('tiefkühl');

    // ── Dietary / quality badges ──
    const BADGE_KEYS = ['vegan', 'vegetarisch', 'glutenfrei', 'laktosefrei', 'bio'] as const;
    const activeBadges = BADGE_KEYS.filter(k => tekniks[k] === true || tekniks[k] === 'true');
    const flavorList: string[] = Array.isArray(tekniks.geschmack)
        ? (tekniks.geschmack as string[])
        : tekniks.geschmack ? [tekniks.geschmack as string] : [];

    // ── Packaging numbers ──
    const dilimAdet = Number(tekniks.dilim_adedi ?? tekniks.porsiyon_sayisi ?? 0);
    const kutuIciAdet = Number(tekniks.kutu_ici_adet ?? 0);
    const unitWeightKg = urun.birim_agirlik_kg ?? null;
    const unitWeightG = Number(tekniks.net_agirlik_gram ?? tekniks.net_agirlik_gr ?? tekniks.net_agirlik ?? tekniks.gramaj ?? 0) || null;
    const hacimMl = Number(tekniks.hacim_ml ?? 0) || null;
    const koliIciKutu = Number(urun.koli_ici_kutu_adet ?? tekniks.koli_ici_kutu_adet ?? tekniks.koli_ici_kutu ?? 0) || null;
    const koliIciAdet = Number((urun as any).koli_ici_adet ?? tekniks.koli_ici_adet ?? 0) || null;
    const paletIciKoli = Number(urun.palet_ici_koli_adet ?? 0) || null;
    const paletIciKutu = Number(urun.palet_ici_kutu_adet ?? 0) || null;
    const paletIciAdet = Number(urun.palet_ici_adet ?? 0) || null;

    const koliAgirlik = (unitWeightKg && koliIciKutu)
        ? fmtWeight(unitWeightKg * koliIciKutu, null)
        : (unitWeightG && koliIciKutu)
        ? fmtWeight((unitWeightG / 1000) * koliIciKutu, null)
        : null;
    const paletKoliCount = paletIciKoli ?? (paletIciKutu && koliIciKutu ? Math.round(paletIciKutu / koliIciKutu) : null);
    const paletAgirlik = (paletKoliCount && koliIciKutu && (unitWeightKg || unitWeightG))
        ? fmtWeight(((unitWeightKg ?? (unitWeightG! / 1000))) * koliIciKutu * paletKoliCount, null)
        : null;

    const hasPackagingData = dilimAdet > 0 || kutuIciAdet > 0 || koliIciKutu || koliIciAdet || paletIciKoli || paletIciKutu || paletIciAdet;

    // ── Allergen lists ──
    const containsAllergens = ALLERGEN_DEFS.filter(a => allergene[a.key] === true);
    const traceKeys = ['spuren_gluten', 'spuren_milch', 'spuren_nuesse', 'spuren_soja', 'spuren_sesam'] as const;
    const traceAllergens = traceKeys.filter(k => allergene[k] === true);

    const traceLabels: Record<string, string> = {
        spuren_gluten: locale === 'de' ? 'Gluten' : locale === 'tr' ? 'Gluten' : 'Gluten',
        spuren_milch: locale === 'de' ? 'Milch' : locale === 'tr' ? 'Süt' : 'Milk',
        spuren_nuesse: locale === 'de' ? 'Schalenfrüchte' : locale === 'tr' ? 'Kuruyemiş' : 'Tree nuts',
        spuren_soja: locale === 'de' ? 'Soja' : locale === 'tr' ? 'Soya' : 'Soy',
        spuren_sesam: locale === 'de' ? 'Sesam' : locale === 'tr' ? 'Susam' : 'Sesame',
    };

    // ── Specs from category template ──
    const specRows = ozellikSablonu
        .map(s => {
            const val = (tekniks as any)[s.alan_adi];
            if (val === null || val === undefined || val === '') return null;
            return { label: getLocalizedName(s.gosterim_adi, locale), val };
        })
        .filter(Boolean) as { label: string; val: unknown }[];

    // ── Gallery ──
    const allImages = [urun.ana_resim_url, ...(urun.galeri_resim_urls ?? [])].filter(Boolean) as string[];
    const [activeImg, setActiveImg] = React.useState(allImages[0] ?? null);

    const n100 = naehrwerte?.pro_100g;
    const nPortion = naehrwerte?.pro_portion;
    const hasNaehrwerte = n100 && (n100.energie_kcal || n100.energie_kj);

    const herkunftLabel = herkunft ? (herkunft[locale] || herkunft.de || herkunft.en || Object.values(herkunft)[0]) : null;

    return (
        <div className="bg-slate-50 min-h-screen py-8 md:py-14">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">

                    {/* ── Left: Gallery ───────────────────────────────────── */}
                    <div className="sticky top-24">
                        {activeImg ? (
                            <div className="aspect-square w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm relative">
                                <Image src={activeImg} alt={urunAdi} width={800} height={800}
                                    className="w-full h-full object-cover" priority />
                                {/* Storage badge overlay on image */}
                                {storageLabel && (
                                    <div className="absolute top-3 left-3">
                                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full shadow-md
                                            ${isFrozen ? 'bg-blue-600 text-white' : 'bg-amber-50 text-amber-800 border border-amber-300'}`}>
                                            {isFrozen ? <LuThermometerSnowflake size={13} /> : <LuThermometer size={13} />}
                                            {storageLabel}
                                        </span>
                                    </div>
                                )}
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
                                        className={`aspect-square overflow-hidden rounded-xl border-2 transition ${activeImg === img ? 'border-slate-700' : 'border-transparent hover:border-slate-300'}`}>
                                        <Image src={img} alt={`${i + 1}`} width={120} height={120} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Right: Product Info ──────────────────────────────── */}
                    <div className="flex flex-col gap-6">

                        {/* Category + Title + SKU + EAN */}
                        <div>
                            {kategorieAdi && (
                                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                                    <FiTag size={11} /> {kategorieAdi}
                                </p>
                            )}
                            <h1 className="text-3xl md:text-4xl font-serif text-slate-900 leading-tight mb-3">
                                {urunAdi}
                            </h1>
                            <div className="flex flex-wrap gap-3">
                                {urun.stok_kodu && (
                                    <p className="flex items-center gap-1.5 text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                                        <LuBarcode size={12} />
                                        <span className="font-semibold text-slate-500">{lc.sku}:</span> {urun.stok_kodu}
                                    </p>
                                )}
                                {eanGtin && (
                                    <p className="flex items-center gap-1.5 text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                                        <LuBarcode size={12} />
                                        <span className="font-semibold">{lc.ean}:</span> {eanGtin}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* ── Quick Info Bar ─────────────────────────────────── */}
                        {(storageLabel || moq || lieferzeitWerktage || haltbarkeitMonate) && (
                            <div className="flex flex-wrap gap-2">
                                {storageLabel && (
                                    <InfoPill
                                        icon={isFrozen ? <LuThermometerSnowflake size={16} /> : <LuThermometer size={16} />}
                                        label={lc.storage}
                                        value={isFrozen ? (tempMax !== null ? `${tempMax} °C` : '−18 °C') : (storageLabel.length > 14 ? storageLabel.slice(0, 14) + '…' : storageLabel)}
                                        cls={isFrozen ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-cyan-50 border-cyan-200'}
                                    />
                                )}
                                <InfoPill
                                    icon={<LuPackage size={16} />}
                                    label={lc.moq}
                                    value={`${moq} ${moqEinheit}`}
                                />
                                {lieferzeitWerktage && (
                                    <InfoPill
                                        icon={<LuTruck size={16} />}
                                        label={lc.delivery}
                                        value={`${lieferzeitWerktage} ${lc.werktage}`}
                                    />
                                )}
                                {haltbarkeitMonate && (
                                    <InfoPill
                                        icon={<LuCalendar size={16} />}
                                        label={lc.validity}
                                        value={`${haltbarkeitMonate} ${lc.months}`}
                                    />
                                )}
                                {haltbarkeitNachOeffnen && (
                                    <InfoPill
                                        icon={<LuClock size={16} />}
                                        label={lc.validityAfterOpen}
                                        value={`${haltbarkeitNachOeffnen} ${lc.days}`}
                                    />
                                )}
                            </div>
                        )}

                        {/* ── Quality badges + Certifications ──────────────── */}
                        {(activeBadges.length > 0 || flavorList.length > 0 || zertifikate.length > 0 || urun.lojistik_sinifi) && (
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
                                </div>
                            </div>
                        )}

                        {/* ── Certifications ──────────────────────────────── */}
                        {zertifikate.length > 0 && (
                            <div>
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                                    <LuShieldCheck size={11} /> {lc.certifications}
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {zertifikate.map(z => {
                                        const cfg = ZERTIFIKAT_CONFIG[z];
                                        if (!cfg) return (
                                            <span key={z} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                {z}
                                            </span>
                                        );
                                        return (
                                            <span key={z} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${cfg.bg}`}>
                                                <span>{cfg.icon}</span> {cfg.label}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Description ─────────────────────────────────── */}
                        {aciklama && (
                            <div>
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{lc.description}</h3>
                                <div className="text-sm text-slate-600 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: aciklama.replace(/\n/g, '<br />') }} />
                            </div>
                        )}

                        {/* ── Packaging & Logistics ────────────────────────── */}
                        {hasPackagingData && (
                            <div>
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                                    <LuWarehouse size={11} /> {lc.packaging}
                                </h3>
                                <div className="grid grid-cols-3 gap-2.5">
                                    <TierCard
                                        icon={<LuPackage size={15} />}
                                        title={lc.box}
                                        accent="bg-sky-50 border-sky-200 text-sky-800"
                                        lines={[
                                            dilimAdet > 0 ? (locale === 'de' ? `${dilimAdet} Scheiben` : locale === 'tr' ? `${dilimAdet} dilim` : `${dilimAdet} slices`) : null,
                                            kutuIciAdet > 0 && dilimAdet === 0 ? (locale === 'de' ? `${kutuIciAdet} Stk.` : `${kutuIciAdet} adet`) : null,
                                            fmtWeight(unitWeightKg, unitWeightG) ? `${locale === 'de' ? 'Gewicht' : locale === 'tr' ? 'Ağırlık' : 'Weight'}: ${fmtWeight(unitWeightKg, unitWeightG)}` : null,
                                            hacimMl && !unitWeightKg && !unitWeightG ? `${hacimMl} ml` : null,
                                        ]}
                                    />
                                    <TierCard
                                        icon={<LuPackage2 size={15} />}
                                        title={lc.case}
                                        accent="bg-violet-50 border-violet-200 text-violet-800"
                                        lines={[
                                            koliIciKutu ? (locale === 'de' ? `${koliIciKutu} Karton` : locale === 'tr' ? `${koliIciKutu} Kutu` : `${koliIciKutu} boxes`) : null,
                                            koliIciAdet && !koliIciKutu ? (locale === 'de' ? `${koliIciAdet} Stk.` : `${koliIciAdet} adet`) : null,
                                            koliAgirlik ? `~${koliAgirlik}` : null,
                                        ]}
                                    />
                                    <TierCard
                                        icon={<LuWarehouse size={15} />}
                                        title={lc.pallet}
                                        accent="bg-slate-100 border-slate-300 text-slate-700"
                                        lines={[
                                            paletIciKoli ? (locale === 'de' ? `${paletIciKoli} Kisten` : locale === 'tr' ? `${paletIciKoli} Koli` : `${paletIciKoli} cases`) : null,
                                            paletIciKutu && !paletIciKoli ? (locale === 'de' ? `${paletIciKutu} Karton` : `${paletIciKutu} kutu`) : null,
                                            paletIciAdet && !paletIciKoli && !paletIciKutu ? (locale === 'de' ? `${paletIciAdet} Stk.` : `${paletIciAdet} adet`) : null,
                                            paletAgirlik ? `~${paletAgirlik}` : null,
                                        ]}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── Bestellinformation ──────────────────────────── */}
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{lc.orderInfo}</h3>
                            </div>
                            <div className="divide-y divide-slate-100">
                                <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                                    <span className="text-slate-500 font-medium">{lc.moq}</span>
                                    <span className="font-semibold text-slate-800">{moq} {moqEinheit}</span>
                                </div>
                                {lieferzeitWerktage && (
                                    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                                        <span className="text-slate-500 font-medium">{lc.delivery}</span>
                                        <span className="font-semibold text-slate-800">{lieferzeitWerktage} {lc.werktage}</span>
                                    </div>
                                )}
                                {storageLabel && (
                                    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                                        <span className="text-slate-500 font-medium">{lc.storage}</span>
                                        <span className={`font-semibold ${isFrozen ? 'text-blue-700' : 'text-slate-800'}`}>{storageLabel}</span>
                                    </div>
                                )}
                                {haltbarkeitMonate && (
                                    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                                        <span className="text-slate-500 font-medium">{lc.validity}</span>
                                        <span className="font-semibold text-slate-800">{haltbarkeitMonate} {lc.months}</span>
                                    </div>
                                )}
                                {herkunftLabel && (
                                    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                                        <span className="text-slate-500 font-medium">{lc.origin}</span>
                                        <span className="font-semibold text-slate-800">{herkunftLabel}</span>
                                    </div>
                                )}
                                {herstellerName && (
                                    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                                        <span className="text-slate-500 font-medium">{lc.manufacturer}</span>
                                        <span className="font-semibold text-slate-800">
                                            {herstellerName}{herstellerLand ? `, ${herstellerLand}` : ''}
                                        </span>
                                    </div>
                                )}
                            </div>
                            {produktdatenblattUrl && (
                                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
                                    <a href={produktdatenblattUrl} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
                                        <FiDownload size={14} /> {lc.datasheet}
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* ── Zutaten & Allergene (EU LMIV) ──────────────── */}
                        {(inhaltsstoffe || Object.keys(allergene).length > 0) && (
                            <div>
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                                    <FiAlertTriangle size={11} /> {lc.allergens}
                                </h3>

                                {inhaltsstoffe && (
                                    <div className="mb-3 p-3.5 rounded-xl border border-slate-200 bg-white">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{lc.ingredients}</p>
                                        <p className="text-xs text-slate-700 leading-relaxed">{inhaltsstoffe}</p>
                                    </div>
                                )}

                                {Object.keys(allergene).length > 0 && (
                                    <div className="space-y-1.5">
                                        {/* Present allergens */}
                                        {containsAllergens.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-bold text-red-600 mb-1.5 flex items-center gap-1">
                                                    <FiAlertTriangle size={9} /> {lc.allergenContains}
                                                </p>
                                                <div className="grid grid-cols-2 gap-1">
                                                    {containsAllergens.map(a => (
                                                        <AllergenRow
                                                            key={a.key}
                                                            present={true}
                                                            label={(a as any)[locale] || a.de}
                                                            icon={a.icon}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* All 14 allergens display */}
                                        {containsAllergens.length === 0 && Object.keys(allergene).length >= 10 && (
                                            <div className="grid grid-cols-2 gap-1">
                                                {ALLERGEN_DEFS.map(a => (
                                                    <AllergenRow
                                                        key={a.key}
                                                        present={allergene[a.key] === true}
                                                        label={(a as any)[locale] || a.de}
                                                        icon={a.icon}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {containsAllergens.length === 0 && Object.keys(allergene).length < 10 && (
                                            <p className="text-xs text-slate-500 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                                ✓ {lc.noAllergen}
                                            </p>
                                        )}

                                        {/* Trace allergens */}
                                        {traceAllergens.length > 0 && (
                                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2 mt-2">
                                                <FiAlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                                                <span>{lc.allergenTraces} {traceAllergens.map(k => traceLabels[k]).join(', ')}</span>
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Nährwertangaben (EU LMIV) ─────────────────── */}
                        {hasNaehrwerte && (
                            <div>
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                                    <FiInfo size={11} /> {lc.nutritionTitle}
                                </h3>
                                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                                    <div className="grid grid-cols-3 px-4 py-2 bg-slate-50 border-b border-slate-200">
                                        <span className="text-xs text-slate-400 font-medium col-span-1" />
                                        <span className="text-xs font-bold text-slate-700 text-right">{lc.nutritionPer100}</span>
                                        {nPortion && (
                                            <span className="text-xs font-bold text-slate-700 text-right">
                                                {lc.nutritionPerPortion}
                                                {nPortion.portion_gramm && <span className="font-normal text-slate-400 ml-1">({nPortion.portion_gramm} g)</span>}
                                            </span>
                                        )}
                                    </div>
                                    {[
                                        { label: lc.energy,   k100: n100?.energie_kj, kPor: nPortion?.energie_kj, unit: 'kJ', extra100: n100?.energie_kcal, extraPor: nPortion?.energie_kcal, extraUnit: 'kcal' },
                                        { label: lc.fat,      k100: n100?.fett, kPor: nPortion?.fett, unit: 'g' },
                                        { label: `  ${lc.saturated}`, k100: n100?.davon_gesaettigt, kPor: nPortion?.davon_gesaettigt, unit: 'g', sub: true },
                                        { label: lc.carbs,    k100: n100?.kohlenhydrate, kPor: nPortion?.kohlenhydrate, unit: 'g' },
                                        { label: `  ${lc.sugars}`,    k100: n100?.davon_zucker, kPor: nPortion?.davon_zucker, unit: 'g', sub: true },
                                        { label: lc.fiber,    k100: n100?.ballaststoffe, kPor: nPortion?.ballaststoffe, unit: 'g' },
                                        { label: lc.protein,  k100: n100?.eiweiss, kPor: nPortion?.eiweiss, unit: 'g' },
                                        { label: lc.salt,     k100: n100?.salz, kPor: nPortion?.salz, unit: 'g' },
                                    ].filter(r => r.k100 !== undefined && r.k100 !== null).map((row, i) => (
                                        <div key={i} className={`grid grid-cols-3 items-center px-4 py-2 border-b border-slate-100 last:border-0 ${(row as any).sub ? 'bg-slate-50' : ''}`}>
                                            <span className={`text-sm ${(row as any).sub ? 'text-slate-400 text-xs pl-3' : 'text-slate-700 font-medium'}`}>
                                                {row.label.trim()}
                                            </span>
                                            <span className="text-sm font-semibold text-slate-800 text-right">
                                                {(row as any).extra100
                                                    ? `${fmtNumber(row.k100)} kJ / ${fmtNumber((row as any).extra100)} kcal`
                                                    : `${fmtNumber(row.k100)} ${row.unit}`}
                                            </span>
                                            {nPortion && (
                                                <span className="text-sm font-semibold text-slate-600 text-right">
                                                    {(row as any).extraPor
                                                        ? `${fmtNumber(row.kPor)} kJ / ${fmtNumber((row as any).extraPor)} kcal`
                                                        : `${fmtNumber(row.kPor)} ${row.unit}`}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Category template specs ──────────────────────── */}
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

                        {/* ── CTA ──────────────────────────────────────────── */}
                        <div className="rounded-2xl bg-slate-900 text-white p-5 flex flex-col gap-3">
                            <p className="text-xs text-slate-400">{lc.contactSub}</p>
                            <div className="flex flex-wrap gap-2">
                                <a href={`mailto:info@sweetheaven.de?subject=${encodeURIComponent(`${lc.contact}: ${urunAdi}${urun.stok_kodu ? ` (${urun.stok_kodu})` : ''}`)}`}
                                    className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-slate-900 font-semibold text-sm px-5 py-3 rounded-xl hover:bg-slate-100 transition-colors min-w-[160px]">
                                    <FiMail size={14} /> {lc.contact}
                                </a>
                                {produktdatenblattUrl && (
                                    <a href={produktdatenblattUrl} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 bg-slate-800 text-white font-semibold text-sm px-4 py-3 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700">
                                        <FiDownload size={14} /> PDF
                                    </a>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
