import { computeTedarikDurumu } from '@/lib/utils';
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiHeart, FiX, FiImage, FiShoppingCart } from "react-icons/fi";
import { LuPackage, LuBarcode } from "react-icons/lu";
import { Locale } from "@/i18n-config";
import { Dictionary } from "@/dictionaries";
import { ProduktMitPreis } from "@/app/[locale]/portal/katalog/types";
import { ProductDietaryBadges } from "@/components/DietaryStickers";
import { UniversalProductCard } from "@/components/products/UniversalProductCard";

// Badge-Konfiguration (aus public catalog adaptiert)
export const BADGE_DEFS = [
    { key: 'vegan', short: 'Vegan', shortDe: 'Vegan', shortTr: 'Vegan', shortEn: 'Vegan', shortAr: 'نباتي', icon: '🌱', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { key: 'laktosefrei', short: 'Laktosefrei', shortDe: 'Laktosefrei', shortTr: 'Laktozsuz', shortEn: 'Lactose Free', shortAr: 'خالٍ من اللاكتوز', icon: '🥛', bg: 'bg-sky-50 text-sky-800 border-sky-200' },
    { key: 'glutenfrei', short: 'Glutenfrei', shortDe: 'Glutenfrei', shortTr: 'Glutensiz', shortEn: 'Gluten Free', shortAr: 'خالٍ من الغلوتين', icon: '🌾', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
    { key: 'ohne_zucker', short: 'Zuckerfrei', shortDe: 'Zuckerfrei', shortTr: 'Şekersiz', shortEn: 'Sugar Free', shortAr: 'خالٍ من السكر', icon: '💎', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
    { key: 'bio', short: 'Bio', shortDe: 'Bio', shortTr: 'Organik', shortEn: 'Organic', shortAr: 'عضوي', icon: '🍃', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
] as const;

export const TAT_CONFIG: Record<string, { de: string; tr: string; emoji: string }> = {
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

export const ZERTIFIKAT_CONFIG: Record<string, { label: string; bg: string }> = {
    'Halal': { label: 'Halal', bg: 'bg-teal-50 text-teal-800 border-teal-300' },
};

export type Birim = 'adet' | 'koli' | 'palet';

export function getBirimFiyatKatalog(produkt: ProduktMitPreis, birim: Birim, miktar: number, userRole?: string): number {
    if (userRole === 'Alt Bayi') {
        return Number((produkt as any).satis_fiyati_alt_bayi ?? (produkt as any).satis_fiyati_palet ?? (produkt as any).satis_fiyati_toptanci ?? produkt.satis_fiyati_musteri ?? 0);
    }
    if (birim === 'palet') {
        return Number((produkt as any).satis_fiyati_palet ?? (produkt as any).satis_fiyati_toptanci ?? produkt.satis_fiyati_musteri ?? 0);
    }
    if (birim === 'koli' && miktar >= 5) {
        return Number((produkt as any).satis_fiyati_toptanci ?? produkt.satis_fiyati_musteri ?? 0);
    }
    return Number(produkt.satis_fiyati_musteri ?? produkt.partnerPreis ?? 0);
}

// palet_ici_adet = 1 paletteki KOLİ sayısı (örn. 125 koli/palet)
// Toplam adet = palet_ici_adet × koli_ici_adet
export function getPaletToplamAdet(produkt: ProduktMitPreis): number {
    const koliAdet = Number((produkt as any).koli_ici_adet ?? 1);
    const paletIciKoli = Number((produkt as any).palet_ici_koli_adet ?? (produkt as any).palet_ici_adet ?? 0);
    return paletIciKoli * koliAdet;
}

export function getToplamAdetKatalog(produkt: ProduktMitPreis, birim: Birim, miktar: number): number {
    const koliAdet = Number((produkt as any).koli_ici_adet ?? 1);
    if (birim === 'palet') return getPaletToplamAdet(produkt) * miktar;
    if (birim === 'koli') return koliAdet * miktar;
    return miktar;
}

export const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};

export const getLocalizedName = (adObj: any, locale: Locale, fallback = 'Unbenannt') => {
    if (!adObj) return fallback;
    if (typeof adObj === 'string') return adObj;
    return adObj[locale] || adObj['de'] || Object.values(adObj)[0] as string || fallback;
};

// ─── Sepete Ekle Modal ────────────────────────────────────────────────────
export function SepeteEkleModal({
    produkt,
    locale,
    onClose,
    onAdd,
    onTalep,
}: {
    produkt: ProduktMitPreis;
    locale: string;
    onClose: () => void;
    onAdd: (miktar: number, birim: Birim) => void;
    onTalep?: (miktar: number, birim: Birim, notlar: string) => Promise<void>;
}) {
    const [birim, setBirim] = useState<Birim>('koli');
    const [miktar, setMiktar] = useState(1);

    const koliAdet = Number((produkt as any).koli_ici_adet ?? 1);
    // palet_ici_adet = 1 paletteki KOLİ sayısı; toplam adet = koli sayısı × koli başına adet
    const paletIciKoli = Number((produkt as any).palet_ici_koli_adet ?? (produkt as any).palet_ici_adet ?? 0);
    const paletToplamAdet = getPaletToplamAdet(produkt);
    const toplamAdet = getToplamAdetKatalog(produkt, birim, miktar);
    const adetFiyat = getBirimFiyatKatalog(produkt, birim, miktar);
    const toplamFiyat = toplamAdet * adetFiyat;
    const produktName = getLocalizedName(produkt.ad, locale as Locale);

    const birimOptions: { key: Birim; labelDe: string; labelTr: string; sub: string }[] = [
        { key: 'koli', labelDe: 'Karton', labelTr: 'Koli', sub: `${koliAdet} ${locale === 'de' ? 'Stk.' : 'adet'}` },
        { key: 'adet', labelDe: 'Stück', labelTr: 'Adet', sub: locale === 'de' ? 'Einzeln' : 'Tekli' },
        ...(paletIciKoli > 0 ? [{
            key: 'palet' as Birim,
            labelDe: 'Palette', labelTr: 'Palet',
            // Göster: "125 koli" ve "750 adet" gibi
            sub: locale === 'de'
                ? `${paletIciKoli} Ktn. / ${paletToplamAdet} Stk.`
                : `${paletIciKoli} koli / ${paletToplamAdet} adet`
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
                            {/* Palet seçiliyse koli/adet dökümünü göster */}
                            {birim === 'palet' && paletIciKoli > 0 && (
                                <p className="text-[10px] text-gray-400">
                                    {miktar} {locale === 'de' ? 'Palette' : 'palet'}
                                    {' × '}{paletIciKoli} {locale === 'de' ? 'Ktn.' : 'koli'}
                                    {' × '}{koliAdet} {locale === 'de' ? 'Stk.' : 'adet'}
                                    {' = '}{toplamAdet} {locale === 'de' ? 'Stück' : 'adet'}
                                </p>
                            )}
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
export function ProduktGridCard({
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
    return (
        <UniversalProductCard
            urun={produkt}
            locale={locale}
            detailHref={`/${locale}/portal/katalog/${produkt.id}`}
            isLoggedIn={true}
            isFavorit={isFavorit}
            onToggleFavorite={onToggleFavorite}
            isFavoritePending={isPending}
            onAction={onQuickAdd}
            actionType="cart"
            actionTooltip={locale === 'de' ? 'In den Warenkorb legen' : 'Sepete Ekle'}
            dictionary={dictionary}
        />
    );
}

// ─── List Row View ────────────────────────────────────────────────────────
export function ProduktListRow({
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
    const paletToplamAdet = paletKoli * koliAdet;
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
                ? (locale === 'de'
                    ? `1 Palette (${paletKoli} Ktn. = ${paletToplamAdet} Stk.)`
                    : `1 Palet (${paletKoli} koli = ${paletToplamAdet} adet)`)
                : (locale === 'de' ? '1 Palette' : '1 Palet'),
            sublabel: locale === 'de' ? 'Palettenpreis' : 'palet fiyatı',
            price: (produkt as any).satis_fiyati_palet ?? produkt.satis_fiyati_toptanci ?? produkt.satis_fiyati_musteri,
            highlight: true,
        },
    ];

    const showIhrPreis = produkt.partnerPreis !== null &&
        produkt.partnerPreis !== ((produkt as any).satis_fiyati_palet ?? produkt.satis_fiyati_alt_bayi);

    // Stok durumu
    const stokMiktar = produkt.stok_miktari ?? 0;
    const stokEsik = produkt.stok_esigi ?? 10;
    const durum = computeTedarikDurumu(stokMiktar, (produkt as any).stok_tukenme_tarihi);
      
    let stokBadge: { label: string; dot: string; bg: string } | null = null;
    if (durum === 'talep_uzerine') {
        stokBadge = { label: locale === 'de' ? 'Nicht auf Lager' : 'Stokta yok', dot: 'bg-violet-500', bg: 'bg-violet-50 text-violet-700 border-violet-200' };
    } else if (durum === 'tukendi') {
        stokBadge = { label: locale === 'de' ? 'Ausverkauft' : 'Tükendi', dot: 'bg-red-500', bg: 'bg-red-50 text-red-700 border-red-200' };
    } else if (stokMiktar <= stokEsik) {
        stokBadge = { label: locale === 'de' ? 'Wenig Bestand' : 'Az stok', dot: 'bg-amber-400', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    } else {
        stokBadge = { label: locale === 'de' ? 'Auf Lager' : 'Stokta var', dot: 'bg-green-500', bg: 'bg-green-50 text-green-700 border-green-200' };
    }

    return (
        <Link
            href={`/${locale}/portal/katalog/${produkt.id}`}
            className="block bg-white border border-stone-200/90 rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200 group relative"
        >
            {/* Top Area: Image + Full Title + Action Icons */}
            <div className="flex items-start gap-3 sm:gap-4">
                {/* Thumbnail */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-stone-50 border border-stone-100 rounded-xl overflow-hidden flex-shrink-0 p-1">
                    <Image
                        src={produkt.ana_resim_url || '/placeholder.png'}
                        alt={produktName}
                        fill
                        sizes="80px"
                        className="object-contain group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                    />
                </div>

                {/* Main Content Area (Spans full available width) */}
                <div className="flex-1 min-w-0">
                    {/* Header: Title & Heart Favorite */}
                    <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-sm sm:text-base text-stone-900 group-hover:text-amber-600 transition-colors leading-snug break-words" title={produktName}>
                            {produktName}
                        </h4>
                        
                        {/* Favorite button */}
                        <button
                            onClick={onToggleFavorite}
                            disabled={isPending}
                            className={`p-1.5 rounded-lg border transition-colors flex-shrink-0 ${
                                isFavorit
                                    ? 'bg-red-50 border-red-200 text-red-500'
                                    : 'border-stone-200 text-stone-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50/50'
                            }`}
                            title={isFavorit ? (locale === 'de' ? 'Von Favoriten entfernen' : 'Favorilerden çıkar') : (locale === 'de' ? 'Zu Favoriten hinzufügen' : 'Favorilere ekle')}
                        >
                            <FiHeart size={15} fill={isFavorit ? 'currentColor' : 'none'} />
                        </button>
                    </div>

                    {/* Metadata line: SKU, Barcode, Stock badge */}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                            <LuBarcode size={12} className="text-stone-400" />
                            {produkt.stok_kodu || '—'}
                        </span>
                        {produkt.ean_gtin && (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-stone-500 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-200/60">
                                {produkt.ean_gtin}
                            </span>
                        )}
                        {stokBadge && (
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${stokBadge.bg}`}>
                                <span className={`w-1.5 h-1.5 rounded-full inline-block ${stokBadge.dot}`} />
                                {stokBadge.label}
                            </span>
                        )}
                    </div>

                    {/* Logistics & Dietary Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {koliAdet > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200/70 whitespace-nowrap">
                                <LuPackage size={10} />
                                {koliAdet} {locale === 'de' ? 'Stk./Ktn.' : 'adet/koli'}
                            </span>
                        )}
                        {paletKoli > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/70 whitespace-nowrap">
                                {paletKoli} {locale === 'de' ? 'Ktn./Pal.' : 'koli/pal.'}
                            </span>
                        )}
                        {kg && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/70 whitespace-nowrap">
                                {kg} kg
                            </span>
                        )}
                        <ProductDietaryBadges
                            teknikOzellikler={produkt.teknik_ozellikler as any}
                            zertifikate={produkt.zertifikate}
                            size="xs"
                        />
                    </div>
                </div>
            </div>

            {/* Bottom Row: Tiered Pricing Bar & Add To Cart Button */}
            <div className="mt-3 pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Pricing Badges / Tiers */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                    {pricingRows.map((row, i) =>
                        row.price ? (
                            <div
                                key={i}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${
                                    row.highlight
                                        ? 'bg-blue-50/80 border border-blue-200/80 text-blue-900'
                                        : 'bg-stone-50 border border-stone-200/70 text-stone-700'
                                }`}
                            >
                                <span className="text-[10px] text-stone-400 font-medium">{row.label}:</span>
                                <span className={`font-bold ${row.highlight ? 'text-blue-700' : 'text-stone-900'}`}>
                                    {formatCurrency(row.price)}
                                </span>
                            </div>
                        ) : null
                    )}
                    {showIhrPreis && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-900 font-bold">
                            <span className="text-[10px] text-amber-700">{locale === 'de' ? 'Ihr Preis:' : 'Size Özel:'}</span>
                            <span className="text-amber-900 font-extrabold">{formatCurrency(produkt.partnerPreis)}</span>
                        </div>
                    )}
                </div>

                {/* Add To Cart Button */}
                <div className="flex items-center justify-end flex-shrink-0">
                    <button
                        onClick={onQuickAdd}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold shadow-sm shadow-amber-600/20 transition-all"
                    >
                        <FiShoppingCart size={14} />
                        <span>{locale === 'de' ? 'In den Warenkorb' : 'Sepete Ekle'}</span>
                    </button>
                </div>
            </div>
        </Link>
    );
}
