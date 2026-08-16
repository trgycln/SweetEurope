import { computeTedarikDurumu } from '@/lib/utils';
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiHeart, FiX, FiImage, FiShoppingCart } from "react-icons/fi";
import { LuPackage, LuBarcode } from "react-icons/lu";
import { Locale } from "@/i18n-config";
import { Dictionary } from "@/dictionaries";
import { ProduktMitPreis } from "@/app/[locale]/portal/katalog/types";
import { DietaryStickers } from "@/components/DietaryStickers";

// Badge-Konfiguration (aus public catalog adaptiert)
export const BADGE_DEFS = [
    { key: 'vegan', short: 'Vegan', icon: '🌱', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { key: 'laktosefrei', short: 'Laktosefrei', icon: '🥛', bg: 'bg-sky-50 text-sky-800 border-sky-200' },
    { key: 'glutenfrei', short: 'Glutenfrei', icon: '🌾', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
    { key: 'ohne_zucker', short: 'Zuckerfrei', icon: '💎', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
    { key: 'bio', short: 'Bio', icon: '🍃', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
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

export function getBirimFiyatKatalog(produkt: ProduktMitPreis, birim: Birim, miktar: number): number {
    if (birim === 'palet') {
        return Number((produkt as any).satis_fiyati_alt_bayi ?? produkt.satis_fiyati_musteri ?? 0);
    }
    if (birim === 'koli' && miktar >= 5) {
        return Number((produkt as any).satis_fiyati_toptanci ?? produkt.satis_fiyati_musteri ?? 0);
    }
    return Number(produkt.satis_fiyati_musteri ?? produkt.partnerPreis ?? 0);
}

export function getToplamAdetKatalog(produkt: ProduktMitPreis, birim: Birim, miktar: number): number {
    const koliAdet = Number((produkt as any).koli_ici_adet ?? 1);
    if (birim === 'palet') return Number((produkt as any).palet_ici_adet ?? koliAdet) * miktar;
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
            className="flex flex-col h-full bg-white rounded-lg shadow border border-gray-200 overflow-hidden group relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
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
                    className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.src = '/placeholder.png'; }}
                />
                {!produkt.ana_resim_url && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
                        <FiImage size={48} />
                    </div>
                )}
                <div className="absolute bottom-2 left-2">
                    <DietaryStickers teknikOzellikler={produkt.teknik_ozellikler as any} size="sm" />
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3 flex flex-col flex-1">
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
                  const miktar = produkt.stok_miktari ?? 0;
                  const esik = produkt.stok_esigi ?? 10;
                  const durum = computeTedarikDurumu(miktar, (produkt as any).stok_tukenme_tarihi);
                  
                  if (durum === 'talep_uzerine') {
                      return (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block"/>
                            {locale === 'de' ? 'Nicht auf Lager' : 'Stokta yok'}
                          </span>
                      );
                  }
                  if (durum === 'tukendi') return (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"/>
                      {locale === 'de' ? 'Ausverkauft' : 'Tükendi'}
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
                <h3 className="font-semibold text-primary text-sm line-clamp-2 min-h-[40px]" title={produktName}>
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
                <div className="flex flex-wrap gap-1 min-h-[18px]">
                    {BADGE_DEFS.filter(b => {
                        const v = tekniks[b.key];
                        return v === true || v === 'true' || v === 'evet' || v === 1;
                    }).slice(0, 3).map(b => (
                        <span
                            key={b.key}
                            className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${b.bg}`}
                        >
                            <span>{b.icon}</span>
                            <span>{b.short}</span>
                        </span>
                    ))}
                    {produkt.zertifikate?.slice(0, 2).map(z => {
                        const cfg = ZERTIFIKAT_CONFIG[z];
                        if (!cfg) return null;
                        return (
                            <span
                                key={z}
                                className={`inline-flex items-center text-[9.5px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${cfg.bg}`}
                            >
                                {cfg.label}
                            </span>
                        );
                    })}
                </div>

                {/* Pricing */}
                <div className="border-t border-gray-100 pt-2 space-y-1 mt-auto">
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
