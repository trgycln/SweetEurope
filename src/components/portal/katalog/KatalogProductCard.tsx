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
                                    {locale === 'de' ? 'Stückpreis (Netto)' : 'Adet fiyatı (Net)'}
                                </span>
                                <span className="font-semibold text-gray-700">
                                    {formatCurrency(adetFiyat)}
                                </span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-sm text-gray-500">
                                    {toplamAdet} × {formatCurrency(adetFiyat)}
                                </span>
                                <div className="text-right">
                                    <div className="font-bold text-gray-800 text-lg">
                                        {formatCurrency(toplamFiyat)} <span className="text-xs font-normal text-gray-500">Netto</span>
                                    </div>
                                    <div className="text-[11px] text-gray-400">
                                        zzgl. 7% MwSt. ({formatCurrency(toplamFiyat * 1.07)} Brutto)
                                    </div>
                                </div>
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

// ─── Grid Card View (Standardized onto UniversalProductCard) ───────────────
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
            layout="grid"
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

// ─── List Row View (Standardized onto UniversalProductCard) ────────────────
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
    return (
        <UniversalProductCard
            urun={produkt}
            locale={locale}
            layout="list"
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
