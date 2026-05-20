'use client';

import { useState, useTransition, useMemo, useEffect } from "react";
import { Tables, Enums } from "@/lib/supabase/database.types";
import Image from "next/image";
import { FiHeart, FiSearch, FiX, FiImage, FiList, FiGrid } from "react-icons/fi";
import { LuPackage, LuBarcode } from "react-icons/lu";
import { toggleFavoriteAction } from "@/app/actions/favoriten-actions";
import { Locale } from "@/i18n-config";
import { Dictionary } from "@/dictionaries";
import { ProduktMitPreis, Kategorie } from "@/app/[locale]/portal/katalog/types";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { toast } from "sonner";
import { usePortal } from '@/contexts/PortalContext';
import { FiShoppingCart } from 'react-icons/fi';
import {
    PUBLIC_HIDDEN_MAIN_CATEGORY_SLUGS,
    PUBLIC_VISIBLE_MAIN_CATEGORY_ORDER,
} from "@/lib/public-category-visibility";

interface KatalogClientProps {
    initialProdukte: ProduktMitPreis[];
    kategorien: Kategorie[];
    favoritenIds: Set<string>;
    locale: Locale;
    dictionary: Dictionary | null | undefined;
    initialSearchQuery: string;
    initialCategoryFilter: string;
    userRole?: string;
}

// Badge-Konfiguration (aus public catalog adaptiert)
const BADGE_DEFS = [
    { key: 'vegan', short: 'Vegan', bg: 'bg-green-100 text-green-800 border-green-200' },
    { key: 'glutenfrei', short: 'Glutenfrei', bg: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { key: 'laktosefrei', short: 'Laktosefrei', bg: 'bg-blue-100 text-blue-800 border-blue-200' },
    { key: 'bio', short: 'Bio', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { key: 'ohne_zucker', short: 'Zuckerfrei', bg: 'bg-sky-100 text-sky-800 border-sky-200' },
] as const;

const TAT_CONFIG: Record<string, { de: string; tr: string; emoji: string }> = {
    'erdbeere':        { de: 'Erdbeere',         tr: 'Çilek',            emoji: '🍓' },
    'schokolade':      { de: 'Schokolade',        tr: 'Çikolata',         emoji: '🍫' },
    'banane':          { de: 'Banane',            tr: 'Muz',              emoji: '🍌' },
    'vanille':         { de: 'Vanille',           tr: 'Vanilya',          emoji: '🌿' },
    'karamell':        { de: 'Karamell',          tr: 'Karamel',          emoji: '🍮' },
    'zitrone':         { de: 'Zitrone',           tr: 'Limon',            emoji: '🍋' },
    'himbeere':        { de: 'Himbeere',          tr: 'Ahududu',          emoji: '🫐' },
    'blaubeere':       { de: 'Blaubeere',         tr: 'Yaban Mersini',    emoji: '🫐' },
    'mango':           { de: 'Mango',             tr: 'Mango',            emoji: '🥭' },
    'hindistancevizi': { de: 'Kokos',             tr: 'Hindistan Cevizi', emoji: '🥥' },
    'apfel':           { de: 'Apfel',             tr: 'Elma',             emoji: '🍏' },
    'pfirsich':        { de: 'Pfirsich',          tr: 'Şeftali',          emoji: '🍑' },
    'kirsche':         { de: 'Kirsche',           tr: 'Kiraz/Vişne',      emoji: '🍒' },
    'brombeere':       { de: 'Brombeere',         tr: 'Böğürtlen',        emoji: '🍇' },
    'ananas':          { de: 'Ananas',            tr: 'Ananas',           emoji: '🍍' },
    'kaffee':          { de: 'Kaffee',            tr: 'Kahve',            emoji: '☕' },
    'nuss':            { de: 'Nuss',              tr: 'Fındık/Badem',     emoji: '🌰' },
};

const ZERTIFIKAT_CONFIG: Record<string, { label: string; bg: string }> = {
    'Halal': { label: 'Halal', bg: 'bg-teal-50 text-teal-800 border-teal-300' },
};

type Birim = 'adet' | 'koli' | 'palet';

function getBirimFiyatKatalog(produkt: ProduktMitPreis, birim: Birim, miktar: number): number {
    if (birim === 'palet') {
        return Number((produkt as any).satis_fiyati_alt_bayi ?? produkt.satis_fiyati_musteri ?? 0);
    }
    if (birim === 'koli' && miktar >= 5) {
        return Number((produkt as any).satis_fiyati_toptanci ?? produkt.satis_fiyati_musteri ?? 0);
    }
    return Number(produkt.satis_fiyati_musteri ?? produkt.partnerPreis ?? 0);
}

function getToplamAdetKatalog(produkt: ProduktMitPreis, birim: Birim, miktar: number): number {
    const koliAdet = Number((produkt as any).koli_ici_adet ?? 1);
    if (birim === 'palet') return Number((produkt as any).palet_ici_adet ?? koliAdet) * miktar;
    if (birim === 'koli') return koliAdet * miktar;
    return miktar;
}

const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};

const getLocalizedName = (adObj: any, locale: Locale, fallback = 'Unbenannt') => {
    if (!adObj) return fallback;
    if (typeof adObj === 'string') return adObj;
    return adObj[locale] || adObj['de'] || Object.values(adObj)[0] as string || fallback;
};

// ─── Sepete Ekle Modal ────────────────────────────────────────────────────
function SepeteEkleModal({
    produkt,
    locale,
    onClose,
    onAdd,
}: {
    produkt: ProduktMitPreis;
    locale: string;
    onClose: () => void;
    onAdd: (miktar: number, birim: Birim) => void;
}) {
    const [birim, setBirim] = useState<Birim>('koli');
    const [miktar, setMiktar] = useState(1);

    const koliAdet = Number((produkt as any).koli_ici_adet ?? 1);
    const paletAdet = Number((produkt as any).palet_ici_adet ?? 0);
    const toplamAdet = getToplamAdetKatalog(produkt, birim, miktar);
    const adetFiyat = getBirimFiyatKatalog(produkt, birim, miktar);
    const toplamFiyat = toplamAdet * adetFiyat;
    const produktName = getLocalizedName(produkt.ad, locale as Locale);

    const birimOptions: { key: Birim; labelDe: string; labelTr: string; sub: string }[] = [
        { key: 'koli', labelDe: 'Karton', labelTr: 'Koli', sub: `${koliAdet} adet` },
        { key: 'adet', labelDe: 'Stück', labelTr: 'Adet', sub: locale === 'de' ? 'Einzeln' : 'Tekli' },
        ...(paletAdet > 0 ? [{
            key: 'palet' as Birim,
            labelDe: 'Palette', labelTr: 'Palet',
            sub: `${paletAdet} adet`
        }] : []),
    ];

    const fiyatKademe = birim === 'palet'
        ? { label: locale === 'de' ? 'Palettenpreis' : 'Palet fiyatı', color: 'text-purple-700' }
        : birim === 'koli' && miktar >= 5
            ? { label: locale === 'de' ? 'Mengenrabatt aktiv ✓' : '5+ koli indirimi ✓', color: 'text-green-600' }
            : birim === 'koli' && miktar < 5
                ? { label: locale === 'de' ? `Ab 5 Kartons günstiger` : `5 koli alınca indirim`, color: 'text-amber-600' }
                : null;

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden pointer-events-auto">
                    {/* Header */}
                    <div className="flex items-center gap-3 p-4 border-b">
                        {produkt.ana_resim_url ? (
                            <Image
                                src={produkt.ana_resim_url}
                                alt={produktName}
                                width={48} height={48}
                                className="rounded-lg object-cover flex-shrink-0"
                            />
                        ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FiImage size={20} className="text-gray-300" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-gray-800 line-clamp-2 leading-tight">
                                {produktName}
                            </p>
                            <p className="text-[11px] text-gray-400 font-mono">{produkt.stok_kodu}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 flex-shrink-0"
                        >
                            <FiX size={18} />
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Birim seçimi */}
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                                {locale === 'de' ? 'Einheit wählen' : 'Birim Seçin'}
                            </p>
                            <div className={`grid gap-2 ${birimOptions.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                {birimOptions.map(opt => (
                                    <button
                                        key={opt.key}
                                        onClick={() => { setBirim(opt.key); setMiktar(1); }}
                                        className={`flex flex-col items-center p-2.5 rounded-xl border-2 transition-all ${
                                            birim === opt.key
                                                ? 'border-accent bg-accent/5'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className={`text-sm font-bold ${birim === opt.key ? 'text-accent' : 'text-gray-700'}`}>
                                            {locale === 'de' ? opt.labelDe : opt.labelTr}
                                        </span>
                                        <span className="text-[10px] text-gray-400 mt-0.5">{opt.sub}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Miktar */}
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                                {locale === 'de' ? 'Menge' : 'Miktar'}
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setMiktar(m => Math.max(1, m - 1))}
                                    className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 font-bold text-lg"
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    value={miktar}
                                    onChange={e => setMiktar(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="flex-1 text-center text-lg font-bold border-2 border-gray-200 rounded-xl py-2 focus:ring-2 focus:ring-accent/30 focus:border-accent"
                                    min="1"
                                />
                                <button
                                    onClick={() => setMiktar(m => m + 1)}
                                    className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 font-bold text-lg"
                                >
                                    +
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 text-center mt-1.5">
                                = {toplamAdet} {locale === 'de' ? 'Stück gesamt' : 'adet toplam'}
                            </p>
                        </div>

                        {/* Fiyat özeti */}
                        <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">
                                    {locale === 'de' ? 'Stückpreis' : 'Adet fiyatı'}
                                </span>
                                <span className="font-semibold text-gray-700">
                                    {formatCurrency(adetFiyat)}
                                </span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-sm text-gray-500">
                                    {toplamAdet} × {formatCurrency(adetFiyat)}
                                </span>
                                <span className="font-bold text-gray-800 text-lg">
                                    {formatCurrency(toplamFiyat)}
                                </span>
                            </div>
                            {fiyatKademe && (
                                <p className={`text-[11px] font-semibold ${fiyatKademe.color}`}>
                                    {fiyatKademe.label}
                                </p>
                            )}
                        </div>

                        {/* Sepete ekle */}
                        <button
                            onClick={() => onAdd(miktar, birim)}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent/90 transition-colors"
                        >
                            <FiShoppingCart size={16} />
                            {locale === 'de' ? 'In den Warenkorb' : 'Sepete Ekle'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Grid Card View ────────────────────────────────────────────────────────
function ProduktGridCard({
    produkt,
    isFavorit,
    locale,
    dictionary,
    isPending,
    onToggleFavorite,
    onQuickAdd,
}: {
    produkt: ProduktMitPreis;
    isFavorit: boolean;
    locale: Locale;
    dictionary: Dictionary | null | undefined;
    isPending: boolean;
    onToggleFavorite: (e: React.MouseEvent) => void;
    onQuickAdd: (e: React.MouseEvent) => void;
}) {
    const catalogContent = (dictionary as any)?.portal?.catalogPage || {};
    const produktName = getLocalizedName(produkt.ad, locale);
    const tekniks = (produkt.teknik_ozellikler || {}) as Record<string, unknown>;

    const paletKoli = Number(produkt.palet_ici_koli_adet ?? produkt.palet_ici_adet ?? 0);
    const koliAdet = Number(produkt.koli_ici_adet ?? 0);
    const kg = produkt.birim_agirlik_kg;

    const pricingRows = [
        {
            label: locale === 'de'
                ? `1 Karton${koliAdet > 0 ? ` (${koliAdet} Stk.)` : ''}`
                : `1 Koli${koliAdet > 0 ? ` (${koliAdet} adet)` : ''}`,
            sublabel: locale === 'de' ? 'pro Karton' : 'koli fiyatı',
            price: produkt.satis_fiyati_musteri,
            highlight: false,
        },
        {
            label: locale === 'de' ? 'Ab 5 Kartons' : '5+ Koli',
            sublabel: locale === 'de' ? 'pro Karton' : 'koli fiyatı',
            price: produkt.satis_fiyati_toptanci,
            highlight: false,
        },
        {
            label: paletKoli > 0
                ? (locale === 'de' ? `1 Palette (${paletKoli} Ktn.)` : `1 Palet (${paletKoli} koli)`)
                : (locale === 'de' ? '1 Palette' : '1 Palet'),
            sublabel: locale === 'de' ? 'pro Karton' : 'koli fiyatı',
            price: produkt.satis_fiyati_alt_bayi,
            highlight: true,
        },
    ];

    // Nur zeige "Ihr Preis" wenn unterschiedlich von letztem Tier price
    const showIhrPreis = produkt.partnerPreis !== null && produkt.partnerPreis !== produkt.satis_fiyati_alt_bayi;

    return (
        <Link
            href={`/${locale}/portal/katalog/${produkt.id}`}
            className="block bg-white rounded-lg shadow border border-gray-200 overflow-hidden group relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
        >
            {/* Favoriten-Button */}
            <button
                onClick={onToggleFavorite}
                disabled={isPending}
                title={isFavorit ? (catalogContent.toggleFavoriteRemove || "Von Favoriten entfernen") : (catalogContent.toggleFavoriteAdd || "Zu Favoriten hinzufügen")}
                className={`absolute top-2 right-2 z-10 p-1.5 rounded-full ${isFavorit ? 'bg-red-500 text-white' : 'bg-white/70 text-gray-600 hover:bg-red-100 hover:text-red-500'} transition-colors disabled:opacity-50`}
            >
                <FiHeart size={16} fill={isFavorit ? 'currentColor' : 'none'} />
            </button>

            {/* Bild */}
            <div className="relative w-full aspect-[4/3] bg-gray-50">
                <Image
                    src={produkt.ana_resim_url || '/placeholder.png'}
                    alt={produktName}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.src = '/placeholder.png'; }}
                />
                {!produkt.ana_resim_url && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
                        <FiImage size={48} />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* SKU + Barkod */}
                <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                        <LuBarcode size={12} />
                        <span>{produkt.stok_kodu || '—'}</span>
                    </div>
                    {produkt.ean_gtin && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                            <LuBarcode size={11} />
                            <span className="font-mono">{produkt.ean_gtin}</span>
                        </div>
                    )}
                </div>

                {/* Stok durumu */}
                {(() => {
                  const miktar = produkt.stok_miktari ?? null;
                  const esik = produkt.stok_esigi ?? 10;
                  if (miktar === null) return null;
                  if (miktar <= 0) return (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"/>
                      {locale === 'de' ? 'Ausverkauft' : 'Stok yok'}
                    </span>
                  );
                  if (miktar <= esik) return (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"/>
                      {locale === 'de' ? 'Wenig Bestand' : 'Az stok'}
                    </span>
                  );
                  return (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"/>
                      {locale === 'de' ? 'Auf Lager' : 'Stokta var'}
                    </span>
                  );
                })()}

                {/* Name */}
                <h3 className="font-semibold text-primary text-sm line-clamp-2" title={produktName}>
                    {produktName}
                </h3>

                {/* Quantity & Weight Chips */}
                <div className="flex flex-wrap gap-1">
                    {koliAdet > 0 && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                            <LuPackage size={9} />
                            {koliAdet} {locale === 'de' ? 'Stk./Ktn.' : 'adet/koli'}
                        </span>
                    )}
                    {paletKoli > 0 && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                            {paletKoli} {locale === 'de' ? 'Ktn./Pal.' : 'koli/palet'}
                        </span>
                    )}
                    {kg && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            {kg} kg
                        </span>
                    )}
                </div>

                {/* Quality Badges */}
                <div className="flex flex-wrap gap-1 min-h-[16px]">
                    {BADGE_DEFS.filter(b => {
                        const v = tekniks[b.key];
                        return v === true || v === 'true' || v === 'evet' || v === 1;
                    }).slice(0, 3).map(b => (
                        <span
                            key={b.key}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${b.bg}`}
                        >
                            {b.short}
                        </span>
                    ))}
                    {produkt.zertifikate?.slice(0, 2).map(z => {
                        const cfg = ZERTIFIKAT_CONFIG[z];
                        if (!cfg) return null;
                        return (
                            <span
                                key={z}
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${cfg.bg}`}
                            >
                                {cfg.label}
                            </span>
                        );
                    })}
                </div>

                {/* Pricing */}
                <div className="border-t border-gray-100 pt-2 space-y-1">
                    {pricingRows.map((row, i) => {
                        const mobileHidden = i > 0;
                        return row.price ? (
                            <div key={i} className={`flex items-center justify-between px-1 py-0.5 rounded text-[10px] ${
                                row.highlight ? 'bg-blue-50 border border-blue-100' : ''
                            } ${mobileHidden ? 'hidden sm:flex' : ''}`}>
                                <div className="flex flex-col">
                                    <span className={`font-semibold ${row.highlight ? 'text-blue-800' : 'text-gray-600'}`}>
                                        {row.label}
                                    </span>
                                    <span className="text-[9px] text-gray-400">{row.sublabel}</span>
                                </div>
                                <span className={`font-bold ${row.highlight ? 'text-blue-700' : 'text-gray-800'}`}>
                                    {formatCurrency(row.price)}
                                </span>
                            </div>
                        ) : null;
                    })}
                    {showIhrPreis && (
                        <div className="flex justify-between items-center px-1 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-[10px] text-indigo-900 font-bold">
                            <span>{locale === 'de' ? 'Ihr Preis' : 'Size Özel'}</span>
                            <span>{formatCurrency(produkt.partnerPreis)}</span>
                        </div>
                    )}
                </div>

                {/* Hızlı sepete ekle */}
                <button
                  onClick={onQuickAdd}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors"
                >
                  <FiShoppingCart size={13} />
                  {locale === 'de' ? 'In den Warenkorb' : 'Sepete Ekle'}
                </button>
            </div>
        </Link>
    );
}

// ─── List Row View ────────────────────────────────────────────────────────
function ProduktListRow({
    produkt,
    isFavorit,
    locale,
    dictionary,
    isPending,
    onToggleFavorite,
    onQuickAdd,
}: {
    produkt: ProduktMitPreis;
    isFavorit: boolean;
    locale: Locale;
    dictionary: Dictionary | null | undefined;
    isPending: boolean;
    onToggleFavorite: (e: React.MouseEvent) => void;
    onQuickAdd: (e: React.MouseEvent) => void;
}) {
    const produktName = getLocalizedName(produkt.ad, locale);
    const tekniks = (produkt.teknik_ozellikler || {}) as Record<string, unknown>;

    const paletKoli = Number(produkt.palet_ici_koli_adet ?? produkt.palet_ici_adet ?? 0);
    const koliAdet = Number(produkt.koli_ici_adet ?? 0);
    const kg = produkt.birim_agirlik_kg;

    const pricingRows = [
        {
            label: locale === 'de'
                ? `1 Karton${koliAdet > 0 ? ` (${koliAdet} Stk.)` : ''}`
                : `1 Koli${koliAdet > 0 ? ` (${koliAdet} adet)` : ''}`,
            sublabel: locale === 'de' ? 'pro Karton' : 'koli fiyatı',
            price: produkt.satis_fiyati_musteri,
            highlight: false,
        },
        {
            label: locale === 'de' ? 'Ab 5 Kartons' : '5+ Koli',
            sublabel: locale === 'de' ? 'pro Karton' : 'koli fiyatı',
            price: produkt.satis_fiyati_toptanci,
            highlight: false,
        },
        {
            label: paletKoli > 0
                ? (locale === 'de' ? `1 Palette (${paletKoli} Ktn.)` : `1 Palet (${paletKoli} koli)`)
                : (locale === 'de' ? '1 Palette' : '1 Palet'),
            sublabel: locale === 'de' ? 'pro Karton' : 'koli fiyatı',
            price: produkt.satis_fiyati_alt_bayi,
            highlight: true,
        },
    ];

    const showIhrPreis = produkt.partnerPreis !== null &&
        produkt.partnerPreis !== produkt.satis_fiyati_alt_bayi;

    // Stok durumu
    const stokMiktar = produkt.stok_miktari ?? null;
    const stokEsik = produkt.stok_esigi ?? 10;
    const stokBadge = stokMiktar === null ? null : stokMiktar <= 0
        ? { label: locale === 'de' ? 'Ausverkauft' : 'Stok yok', dot: 'bg-red-500', bg: 'bg-red-50 text-red-700 border-red-200' }
        : stokMiktar <= stokEsik
        ? { label: locale === 'de' ? 'Wenig Bestand' : 'Az stok', dot: 'bg-amber-400', bg: 'bg-amber-50 text-amber-700 border-amber-200' }
        : { label: locale === 'de' ? 'Auf Lager' : 'Stokta var', dot: 'bg-green-500', bg: 'bg-green-50 text-green-700 border-green-200' };

    return (
        <Link
            href={`/${locale}/portal/katalog/${produkt.id}`}
            className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow group"
        >
            {/* Thumbnail */}
            <div className="relative w-14 h-14 bg-gray-50 rounded-md flex-shrink-0 overflow-hidden">
                <Image
                    src={produkt.ana_resim_url || '/placeholder.png'}
                    alt={produktName}
                    fill
                    sizes="56px"
                    className="object-cover"
                    loading="lazy"
                />
            </div>

            {/* Sol: İsim + SKU + Stok + Badges — flex-1 */}
            <div className="flex-1 min-w-0 space-y-1">
                <h4 className="font-semibold text-sm text-primary group-hover:text-blue-600 truncate">
                    {produktName}
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400 flex items-center gap-0.5 font-mono">
                        <LuBarcode size={11} />
                        {produkt.stok_kodu || '—'}
                    </span>
                    {produkt.ean_gtin && (
                        <span className="text-xs text-gray-300 flex items-center gap-0.5 font-mono">
                            <LuBarcode size={10} />
                            {produkt.ean_gtin}
                        </span>
                    )}
                    {stokBadge && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${stokBadge.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full inline-block ${stokBadge.dot}`} />
                            {stokBadge.label}
                        </span>
                    )}
                </div>
                {/* Quality Badges */}
                <div className="flex flex-wrap gap-1">
                    {BADGE_DEFS.filter(b => {
                        const v = tekniks[b.key];
                        return v === true || v === 'true' || v === 'evet' || v === 1;
                    }).slice(0, 3).map(b => (
                        <span key={b.key} className={`text-[9px] font-bold px-1.5 py-0 rounded border ${b.bg}`}>
                            {b.short}
                        </span>
                    ))}
                </div>
            </div>

            {/* Orta: Lojistik chip'leri — sabit genişlik */}
            <div className="hidden sm:flex flex-col gap-1 flex-shrink-0 w-28">
                {koliAdet > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 whitespace-nowrap">
                        <LuPackage size={9} />
                        {koliAdet} {locale === 'de' ? 'St./Ktn.' : 'adet/koli'}
                    </span>
                )}
                {paletKoli > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 whitespace-nowrap">
                        {paletKoli} {locale === 'de' ? 'Ktn./Pal.' : 'koli/pal.'}
                    </span>
                )}
                {kg && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                        {kg} kg
                    </span>
                )}
            </div>

            {/* Sağ: Fiyat kolonu */}
            <div className="flex-shrink-0 w-28 sm:w-40 space-y-0.5">
                {pricingRows.map((row, i) =>
                    row.price ? (
                        <div key={i} className={`flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] ${
                            row.highlight ? 'bg-blue-50 border border-blue-100' : ''
                        }`}>
                            <span className={`hidden sm:inline ${row.highlight ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}>
                                {row.label}
                            </span>
                            <span className={`font-bold ${row.highlight ? 'text-blue-700' : 'text-gray-700'}`}>
                                {formatCurrency(row.price)}
                            </span>
                        </div>
                    ) : null
                )}
                {showIhrPreis && (
                    <div className="flex justify-between items-center px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-[10px] text-indigo-900 font-bold">
                        <span>{locale === 'de' ? 'Ihr Preis' : 'Size Özel'}</span>
                        <span>{formatCurrency(produkt.partnerPreis)}</span>
                    </div>
                )}
            </div>

            {/* Aksiyonlar: Sepet + Favori */}
            <div className="flex flex-col gap-1.5 flex-shrink-0 items-center">
                <button
                    onClick={onQuickAdd}
                    className="p-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
                    title={locale === 'de' ? 'In den Warenkorb' : 'Sepete Ekle'}
                >
                    <FiShoppingCart size={14} />
                </button>
                <button
                    onClick={onToggleFavorite}
                    disabled={isPending}
                    className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isFavorit ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'}`}
                >
                    <FiHeart size={14} fill={isFavorit ? 'currentColor' : 'none'} />
                </button>
            </div>
        </Link>
    );
}

// ─── Main Katalog Client Component ────────────────────────────────────────
export function KatalogClient({
    initialProdukte,
    kategorien,
    favoritenIds: initialFavoritenIds,
    locale,
    dictionary,
    initialSearchQuery,
    initialCategoryFilter,
    userRole,
}: KatalogClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const content = (dictionary as any)?.portal?.catalogPage || {
        title: "Produktkatalog",
        description: "Sortiment durchstöbern.",
        searchPlaceholder: "Suchen...",
        allCategories: "Alle Kategorien",
        noProductsFoundFilter: "Keine Produkte für Filter gefunden.",
        noProductsFound: "Keine Produkte verfügbar.",
        toggleFavoriteAdd: "Zu Favoriten",
        toggleFavoriteRemove: "Von Favoriten entfernen",
        listView: "Listenansicht",
        gridView: "Gitteransicht",
    };

    const initialShowFavorites = searchParams.get('favoriten') === 'true';

    const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
    const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter);
    const [showFavorites, setShowFavorites] = useState(initialShowFavorites);
    const [favoriten, setFavoriten] = useState(initialFavoritenIds);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc' | 'new'>('name');
    const [stokFilter, setStokFilter] = useState(false);
    const [badgeFilters, setBadgeFilters] = useState<Set<string>>(new Set());
    const [zertifikatFilters, setZertifikatFilters] = useState<Set<string>>(new Set());
    const [tatFilters, setTatFilters] = useState<Set<string>>(new Set());
    const [modalProdukt, setModalProdukt] = useState<ProduktMitPreis | null>(null);

    const { addToWarenkorb } = usePortal();

    // localStorage für viewMode Preference
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('katalog-view-mode');
            if (saved === 'grid') setViewMode('grid');
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('katalog-view-mode', viewMode);
        }
    }, [viewMode]);

    const handleFilterChange = useDebouncedCallback((name: 'q' | 'kategorie' | 'favoriten', value: string | boolean) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(name, String(value));
        } else {
            params.delete(name);
        }
        router.replace(`${pathname}?${params.toString()}`);
    }, 500);

    const toggleShowFavorites = () => {
        const newValue = !showFavorites;
        setShowFavorites(newValue);
        handleFilterChange('favoriten', newValue);
    };

    const relevanteKategorieIDs = useMemo(() => {
        const set = new Set<string>();
        if (!categoryFilter) return set;
        set.add(categoryFilter);
        if (Array.isArray(kategorien)) {
            const queue = [categoryFilter];
            while (queue.length > 0) {
                const current = queue.shift()!;
                kategorien
                    .filter(k => k.ust_kategori_id === current)
                    .forEach(child => {
                        if (!set.has(child.id)) {
                            set.add(child.id);
                            queue.push(child.id);
                        }
                    });
            }
        }
        return set;
    }, [categoryFilter, kategorien]);

    const gefilterteUrunler = useMemo(() => {
        let result = (initialProdukte || []).filter(produkt => {
            const q = searchQuery.toLowerCase();

            const name = (produkt.ad as any)?.[locale]?.toLowerCase() ||
                         (produkt.ad as any)?.de?.toLowerCase() || '';
            const sku = produkt.stok_kodu?.toLowerCase() || '';
            const ean = (produkt as any).ean_gtin?.toLowerCase() || '';
            const aciklama = (produkt.aciklamalar as any)?.[locale]?.toLowerCase() ||
                             (produkt.aciklamalar as any)?.de?.toLowerCase() || '';
            const tekniks = (produkt.teknik_ozellikler || {}) as Record<string, unknown>;
            const zertStr = ((produkt as any).zertifikate || []).join(' ').toLowerCase();
            const badgeStr = BADGE_DEFS
                .filter(b => {
                    const v = tekniks[b.key];
                    return v === true || v === 'true' || v === 'evet' || v === 1;
                })
                .map(b => b.short.toLowerCase())
                .join(' ');

            const passtZuSuche = !q ||
                name.includes(q) ||
                sku.includes(q) ||
                ean.includes(q) ||
                aciklama.includes(q) ||
                zertStr.includes(q) ||
                badgeStr.includes(q);

            const passtZuFavoriten = !showFavorites || favoriten.has(produkt.id);
            const passtZuKategorie = !categoryFilter || relevanteKategorieIDs.has(produkt.kategori_id);
            const passtZuStok = !stokFilter || ((produkt as any).stok_miktari ?? 1) > 0;

            const passtZuBadge = badgeFilters.size === 0 || Array.from(badgeFilters).every(key => {
                const v = tekniks[key];
                return v === true || v === 'true' || v === 'evet' || v === 1;
            });

            const passtZuZertifikat = zertifikatFilters.size === 0 ||
                Array.from(zertifikatFilters).every(z =>
                    ((produkt as any).zertifikate || []).includes(z)
                );

            // Tat filtresi — DB'deki geschmack alanından oku
            const produktTatlar: string[] = (() => {
                const g = (produkt.teknik_ozellikler as any)?.geschmack;
                if (!g) return [];
                if (Array.isArray(g)) return g;
                try { return JSON.parse(g); } catch { return []; }
            })();

            const passtZuTat = tatFilters.size === 0 ||
                Array.from(tatFilters).some(t => produktTatlar.includes(t));

            return passtZuSuche && passtZuFavoriten && passtZuKategorie &&
                   passtZuStok && passtZuBadge && passtZuZertifikat && passtZuTat;
        });

        result = [...result].sort((a, b) => {
            if (sortBy === 'price_asc') {
                return (a.satis_fiyati_musteri ?? 0) - (b.satis_fiyati_musteri ?? 0);
            }
            if (sortBy === 'price_desc') {
                return (b.satis_fiyati_musteri ?? 0) - (a.satis_fiyati_musteri ?? 0);
            }
            if (sortBy === 'new') {
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            }
            const na = getLocalizedName(a.ad, locale).toLowerCase();
            const nb = getLocalizedName(b.ad, locale).toLowerCase();
            return na.localeCompare(nb);
        });

        return result;
    }, [
        initialProdukte, searchQuery, showFavorites, favoriten,
        categoryFilter, locale, relevanteKategorieIDs,
        stokFilter, badgeFilters, zertifikatFilters, tatFilters, sortBy,
    ]);

    // Hauptkategorien mit Unterkategorien
    const kategorienMitProdukten = new Set<string>();
    (initialProdukte || []).forEach(p => {
        if (p.kategori_id) kategorienMitProdukten.add(p.kategori_id);
    });

    const idToCategory = new Map(kategorien.map(k => [k.id, k]));
    const hauptIDsMitProdukten = new Set<string>();
    kategorienMitProdukten.forEach(id => {
        let current = idToCategory.get(id);
        const guard = new Set<string>();
        while (current && !guard.has(current.id)) {
            guard.add(current.id);
            if (current.ust_kategori_id === null) {
                hauptIDsMitProdukten.add(current.id);
                break;
            }
            current = idToCategory.get(current.ust_kategori_id || '');
        }
    });

    const hidden = new Set<string>(PUBLIC_HIDDEN_MAIN_CATEGORY_SLUGS as readonly string[]);
    const sichtbareHauptKategorien = kategorien
        .filter(k =>
            k.ust_kategori_id === null
            && !hidden.has(k.slug || '')
            && hauptIDsMitProdukten.has(k.id)
        )
        .sort((a, b) => {
            const orderIndex = new Map<string, number>();
            (PUBLIC_VISIBLE_MAIN_CATEGORY_ORDER as readonly string[]).forEach((slug, i) => orderIndex.set(slug, i));
            const ia = orderIndex.has(a.slug || '') ? orderIndex.get(a.slug || '')! : Number.MAX_SAFE_INTEGER;
            const ib = orderIndex.has(b.slug || '') ? orderIndex.get(b.slug || '')! : Number.MAX_SAFE_INTEGER;
            if (ia !== ib) return ia - ib;
            const na = (a.ad as any)?.[locale] || (a.ad as any)?.de || '';
            const nb = (b.ad as any)?.[locale] || (b.ad as any)?.de || '';
            return String(na).localeCompare(String(nb));
        });

    useEffect(() => {
        setFavoriten(initialFavoritenIds);
    }, [initialFavoritenIds]);

    useEffect(() => {
        setShowFavorites(searchParams.get('favoriten') === 'true');
    }, [searchParams]);

    const handleModalAdd = (miktar: number, birim: Birim) => {
        if (!modalProdukt) return;
        const adetFiyat = getBirimFiyatKatalog(modalProdukt, birim, miktar);

        addToWarenkorb(
            { ...modalProdukt, partnerPreis: adetFiyat },
            miktar,
            birim as any
        );

        const birimLabel = locale === 'de'
            ? birim === 'koli' ? 'Karton' : birim === 'palet' ? 'Palette' : 'Stück'
            : birim === 'koli' ? 'koli' : birim === 'palet' ? 'palet' : 'adet';

        toast.success(
            `${miktar} ${birimLabel} → ${getLocalizedName(modalProdukt.ad, locale)}`
        );
        setModalProdukt(null);
    };

    // ProduktKarte wrapper mit Favoriten-Toggle und Quick Add
    const ProduktKarteWithFavorite = ({ produkt }: { produkt: ProduktMitPreis }) => {
        const [isPending, startTransition] = useTransition();
        const isFavorit = favoriten.has(produkt.id);

        const handleToggleFavorite = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            startTransition(async () => {
                const result = await toggleFavoriteAction(produkt.id, isFavorit);
                if (result.success) {
                    setFavoriten(prev => {
                        const newSet = new Set(prev);
                        if (isFavorit) {
                            newSet.delete(produkt.id);
                        } else {
                            newSet.add(produkt.id);
                        }
                        return newSet;
                    });
                } else {
                    console.error("Favoritenfehler:", result.error);
                    toast.error(result.error || "Favoritenstatus konnte nicht geändert werden.");
                }
            });
        };

        const handleQuickAdd = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setModalProdukt(produkt);
        };

        if (viewMode === 'list') {
            return (
                <ProduktListRow
                    produkt={produkt}
                    isFavorit={isFavorit}
                    locale={locale}
                    dictionary={dictionary}
                    isPending={isPending}
                    onToggleFavorite={handleToggleFavorite}
                    onQuickAdd={handleQuickAdd}
                />
            );
        }

        return (
            <ProduktGridCard
                produkt={produkt}
                isFavorit={isFavorit}
                locale={locale}
                dictionary={dictionary}
                isPending={isPending}
                onToggleFavorite={handleToggleFavorite}
                onQuickAdd={handleQuickAdd}
            />
        );
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-2xl sm:text-4xl font-bold text-primary">{content.title}</h1>
                <p className="text-text-main/80 mt-1">{content.description}</p>
            </header>

            {/* Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Row 1: Search + Category + Sort */}
                <div className="flex flex-col md:flex-row gap-3 p-4 border-b border-gray-100">
                    {/* Search */}
                    <div className="relative flex-grow">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder={locale === 'de'
                                ? 'Name, Artikelnr., EAN, Inhalt suchen...'
                                : 'Ürün adı, kod, EAN, içerik ara...'}
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); handleFilterChange('q', e.target.value); }}
                            className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent/30 focus:border-accent text-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => { setSearchQuery(''); handleFilterChange('q', ''); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <FiX size={16} />
                            </button>
                        )}
                    </div>

                    {/* Category */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => { setCategoryFilter(e.target.value); handleFilterChange('kategorie', e.target.value); }}
                        className="border border-gray-200 rounded-lg py-2.5 px-3 md:w-72 bg-white text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    >
                        <option value="">{locale === 'de' ? 'Alle Kategorien' : 'Tüm Kategoriler'}</option>
                        {sichtbareHauptKategorien.map(hauptKat => {
                            const name = getLocalizedName(hauptKat.ad, locale);
                            const altKats = kategorien
                                .filter(k => k.ust_kategori_id === hauptKat.id)
                                .sort((a, b) => getLocalizedName(a.ad, locale).localeCompare(getLocalizedName(b.ad, locale)));
                            if (altKats.length === 0) {
                                return <option key={hauptKat.id} value={hauptKat.id}>{name}</option>;
                            }
                            return (
                                <optgroup key={hauptKat.id} label={name}>
                                    <option value={hauptKat.id}>— {locale === 'de' ? 'Alle' : 'Tümü'} —</option>
                                    {altKats.map(alt => (
                                        <option key={alt.id} value={alt.id}>
                                            &nbsp;&nbsp;{getLocalizedName(alt.ad, locale)}
                                        </option>
                                    ))}
                                </optgroup>
                            );
                        })}
                    </select>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="border border-gray-200 rounded-lg py-2.5 px-3 md:w-52 bg-white text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    >
                        <option value="name">{locale === 'de' ? 'Name A–Z' : 'İsim A–Z'}</option>
                        <option value="price_asc">{locale === 'de' ? 'Preis: niedrigste zuerst' : 'Fiyat: Düşükten Yükseğe'}</option>
                        <option value="price_desc">{locale === 'de' ? 'Preis: höchste zuerst' : 'Fiyat: Yüksekten Düşüğe'}</option>
                        <option value="new">{locale === 'de' ? 'Neueste zuerst' : 'En Yeni'}</option>
                    </select>
                </div>

                {/* Row 2: Quick filters */}
                <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
                    <div className="flex gap-2 flex-shrink-0">
                    {/* Sadece favoriler */}
                    <button
                        onClick={toggleShowFavorites}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            showFavorites
                                ? 'bg-red-500 text-white border-red-500'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <FiHeart size={12} fill={showFavorites ? 'currentColor' : 'none'} />
                        {locale === 'de' ? 'Nur Favoriten' : 'Sadece Favoriler'}
                    </button>

                    {/* Stokta var */}
                    <button
                        onClick={() => setStokFilter(p => !p)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            stokFilter
                                ? 'bg-green-600 text-white border-green-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${stokFilter ? 'bg-white' : 'bg-green-500'}`} />
                        {locale === 'de' ? 'Auf Lager' : 'Stokta Var'}
                    </button>

                    {/* Badge filtreleri */}
                    {BADGE_DEFS.map(b => (
                        <button
                            key={b.key}
                            onClick={() => setBadgeFilters(prev => {
                                const next = new Set(prev);
                                if (next.has(b.key)) next.delete(b.key);
                                else next.add(b.key);
                                return next;
                            })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                badgeFilters.has(b.key)
                                    ? `${b.bg} border-current`
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            {b.short}
                        </button>
                    ))}

                    {/* Sertifika filtreleri */}
                    {['Halal', 'Bio', 'Kosher', 'IFS', 'Vegan_Zert'].map(z => {
                        const cfg = ZERTIFIKAT_CONFIG[z];
                        if (!cfg) return null;
                        return (
                            <button
                                key={z}
                                onClick={() => setZertifikatFilters(prev => {
                                    const next = new Set(prev);
                                    if (next.has(z)) next.delete(z);
                                    else next.add(z);
                                    return next;
                                })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                    zertifikatFilters.has(z)
                                        ? `${cfg.bg} border-current`
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                {cfg.label}
                            </button>
                        );
                    })}

                    </div>
                    {/* View mode + aktif filtre temizle */}
                    <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                        {(searchQuery || categoryFilter || showFavorites || stokFilter ||
                          badgeFilters.size > 0 || zertifikatFilters.size > 0 || tatFilters.size > 0) && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setCategoryFilter('');
                                    setShowFavorites(false);
                                    setStokFilter(false);
                                    setBadgeFilters(new Set());
                                    setZertifikatFilters(new Set());
                                    setTatFilters(new Set());
                                    router.replace(pathname);
                                }}
                                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-50 transition-colors"
                            >
                                <FiX size={12} />
                                {locale === 'de' ? 'Alle Filter zurücksetzen' : 'Filtreleri Temizle'}
                            </button>
                        )}
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <FiList size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <FiGrid size={16} />
                        </button>
                    </div>
                </div>

                {/* Row 3: Tat/Aroma filtreleri */}
                <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
                    <span className="text-xs font-semibold text-gray-400 self-center mr-1 flex-shrink-0">
                        {locale === 'de' ? 'Geschmack:' : 'Aroma:'}
                    </span>
                    {Object.entries(TAT_CONFIG).map(([key, cfg]) => {
                        const urunSayisi = (initialProdukte || []).filter(p => {
                            const g = (p.teknik_ozellikler as any)?.geschmack;
                            if (!g) return false;
                            const arr = Array.isArray(g) ? g : (() => {
                                try { return JSON.parse(g); } catch { return []; }
                            })();
                            return arr.includes(key);
                        }).length;

                        if (urunSayisi === 0) return null;

                        return (
                            <button
                                key={key}
                                onClick={() => setTatFilters(prev => {
                                    const next = new Set(prev);
                                    if (next.has(key)) next.delete(key);
                                    else next.add(key);
                                    return next;
                                })}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex-shrink-0 ${
                                    tatFilters.has(key)
                                        ? 'bg-orange-100 text-orange-800 border-orange-300'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-orange-200 hover:text-orange-700'
                                }`}
                            >
                                <span>{cfg.emoji}</span>
                                {locale === 'de' ? cfg.de : cfg.tr}
                                <span className="text-[10px] opacity-50 ml-0.5">({urunSayisi})</span>
                            </button>
                        );
                    })}
                </div>

                {/* Aktif filtre badge'leri */}
                {(badgeFilters.size > 0 || zertifikatFilters.size > 0 || tatFilters.size > 0 || stokFilter || categoryFilter) && (
                    <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                        <span className="text-xs text-gray-400 self-center">
                            {locale === 'de' ? 'Aktiv:' : 'Aktif:'}
                        </span>
                        {categoryFilter && (() => {
                            const kat = kategorien.find(k => k.id === categoryFilter);
                            return kat ? (
                                <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                    {getLocalizedName(kat.ad, locale)}
                                    <button onClick={() => { setCategoryFilter(''); handleFilterChange('kategorie', ''); }}>
                                        <FiX size={10} />
                                    </button>
                                </span>
                            ) : null;
                        })()}
                        {stokFilter && (
                            <span className="flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                {locale === 'de' ? 'Auf Lager' : 'Stokta Var'}
                                <button onClick={() => setStokFilter(false)}><FiX size={10} /></button>
                            </span>
                        )}
                        {Array.from(badgeFilters).map(key => {
                            const b = BADGE_DEFS.find(b => b.key === key);
                            return b ? (
                                <span key={key} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${b.bg}`}>
                                    {b.short}
                                    <button onClick={() => setBadgeFilters(p => { const n = new Set(p); n.delete(key); return n; })}>
                                        <FiX size={10} />
                                    </button>
                                </span>
                            ) : null;
                        })}
                        {Array.from(zertifikatFilters).map(z => {
                            const cfg = ZERTIFIKAT_CONFIG[z];
                            return cfg ? (
                                <span key={z} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.bg}`}>
                                    {cfg.label}
                                    <button onClick={() => setZertifikatFilters(p => { const n = new Set(p); n.delete(z); return n; })}>
                                        <FiX size={10} />
                                    </button>
                                </span>
                            ) : null;
                        })}
                        {Array.from(tatFilters).map(key => {
                            const cfg = TAT_CONFIG[key];
                            return cfg ? (
                                <span key={key} className="flex items-center gap-1 text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                                    {cfg.emoji} {locale === 'de' ? cfg.de : cfg.tr}
                                    <button onClick={() => setTatFilters(p => { const n = new Set(p); n.delete(key); return n; })}>
                                        <FiX size={10} />
                                    </button>
                                </span>
                            ) : null;
                        })}
                    </div>
                )}
            </div>

            {/* Sonuç sayacı */}
            <div className="flex items-center justify-between text-sm text-gray-500 px-1">
                <span>
                  {gefilterteUrunler.length === initialProdukte?.length
                    ? locale === 'de'
                      ? `${gefilterteUrunler.length} Produkte`
                      : `${gefilterteUrunler.length} ürün`
                    : locale === 'de'
                      ? `${gefilterteUrunler.length} von ${initialProdukte?.length ?? 0} Produkten`
                      : `${initialProdukte?.length ?? 0} üründen ${gefilterteUrunler.length} tanesi`
                  }
                </span>
                {(searchQuery || categoryFilter || showFavorites || stokFilter ||
                  badgeFilters.size > 0 || zertifikatFilters.size > 0 || tatFilters.size > 0) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('');
                      setShowFavorites(false);
                      setStokFilter(false);
                      setBadgeFilters(new Set());
                      setZertifikatFilters(new Set());
                      setTatFilters(new Set());
                      router.replace(pathname);
                    }}
                    className="text-xs text-accent hover:underline flex items-center gap-1"
                  >
                    <FiX size={12} />
                    {locale === 'de' ? 'Filter zurücksetzen' : 'Filtreleri temizle'}
                  </button>
                )}
            </div>

            {/* Products */}
            {(!initialProdukte || initialProdukte.length === 0) && !searchQuery && !categoryFilter && !showFavorites ? (
                <div className="text-center py-16 text-gray-500">{content.noProductsFound}</div>
            ) : gefilterteUrunler.length === 0 ? (
                <div className="text-center py-16 text-gray-500">{content.noProductsFoundFilter}</div>
            ) : (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {gefilterteUrunler.map(produkt => (
                                <ProduktKarteWithFavorite key={produkt.id} produkt={produkt} />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {gefilterteUrunler.map(produkt => (
                                <ProduktKarteWithFavorite key={produkt.id} produkt={produkt} />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Sepete Ekle Modal */}
            {modalProdukt && (
                <SepeteEkleModal
                    produkt={modalProdukt}
                    locale={locale}
                    onClose={() => setModalProdukt(null)}
                    onAdd={handleModalAdd}
                />
            )}
        </div>
    );
}
