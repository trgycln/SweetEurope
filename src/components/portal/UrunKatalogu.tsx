'use client';

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { usePortal, ProduktImWarenkorb, SepetUrunu } from '@/contexts/PortalContext';
import { getLocalizedName, formatCurrency } from '@/lib/utils';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import {
    FiPlus, FiCheck, FiImage, FiShoppingCart,
    FiX, FiPackage
} from 'react-icons/fi';
import { toast } from 'sonner';

type Urun = ProduktImWarenkorb;
type Kategori = { id: string; ad: any; ust_kategori_id: string | null };
type Birim = 'adet' | 'koli' | 'palet';

interface UrunKataloguProps {
    initialUrunler: Urun[];
    kategoriler: Kategori[];
    favoriIdSet: Set<string>;
    dictionary: Dictionary;
    locale: Locale;
    userRole?: string;
}

// ── Fiyat hesabı ──────────────────────────────────────────────────────────
function getBirimFiyat(urun: Urun, birim: Birim, miktar: number): number {
    if (birim === 'palet') {
        return Number(urun.satis_fiyati_alt_bayi ?? urun.satis_fiyati_musteri ?? 0);
    }
    if (birim === 'koli' && miktar >= 5) {
        return Number(urun.satis_fiyati_toptanci ?? urun.satis_fiyati_musteri ?? 0);
    }
    return Number(urun.satis_fiyati_musteri ?? urun.partnerPreis ?? 0);
}

function getToplamAdet(urun: Urun, birim: Birim, miktar: number): number {
    const koliAdet = Number(urun.koli_ici_adet ?? 1);
    if (birim === 'palet') return Number(urun.palet_ici_adet ?? koliAdet) * miktar;
    if (birim === 'koli') return koliAdet * miktar;
    return miktar;
}

// ── Mini Sepet Modal ───────────────────────────────────────────────────────
function SepeteEkleModal({
    urun,
    locale,
    onClose,
    onAdd,
}: {
    urun: Urun;
    locale: Locale;
    onClose: () => void;
    onAdd: (miktar: number, birim: Birim) => void;
}) {
    const [birim, setBirim] = useState<Birim>('koli');
    const [miktar, setMiktar] = useState(1);

    const koliAdet = Number(urun.koli_ici_adet ?? 1);
    const paletAdet = Number(urun.palet_ici_adet ?? 0);
    const toplamAdet = getToplamAdet(urun, birim, miktar);
    const adetFiyat = getBirimFiyat(urun, birim, miktar);
    const toplamFiyat = toplamAdet * adetFiyat;

    const birimOptions: { key: Birim; labelDe: string; labelTr: string; sub: string }[] = [
        { key: 'koli', labelDe: 'Karton', labelTr: 'Koli', sub: `${koliAdet} Stk./${koliAdet} adet` },
        { key: 'adet', labelDe: 'Stück', labelTr: 'Adet', sub: locale === 'de' ? 'Einzeln' : 'Tekli' },
        ...(paletAdet > 0 ? [{ key: 'palet' as Birim, labelDe: 'Palette', labelTr: 'Palet', sub: `${paletAdet} Stk./${paletAdet} adet` }] : []),
    ];

    const fiyatKademe = birim === 'palet'
        ? { label: locale === 'de' ? 'Palettenpreis' : 'Palet fiyatı', color: 'text-blue-700' }
        : birim === 'koli' && miktar >= 5
            ? { label: locale === 'de' ? 'Mengenrabatt aktiv ✓' : '5+ koli indirimi ✓', color: 'text-green-600' }
            : birim === 'koli' && miktar < 5
                ? { label: locale === 'de' ? `Ab 5 Kartons günstiger` : `5+ koli alınca indirim`, color: 'text-amber-600' }
                : null;

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-3 p-4 border-b">
                        {urun.ana_resim_url ? (
                            <Image
                                src={urun.ana_resim_url}
                                alt={getLocalizedName(urun.ad, locale)}
                                width={48} height={48}
                                className="rounded-lg object-cover flex-shrink-0"
                            />
                        ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FiPackage className="text-gray-400" size={20} />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-gray-800 line-clamp-2">
                                {getLocalizedName(urun.ad, locale)}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">{urun.stok_kodu}</p>
                        </div>
                        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                            <FiX size={18} />
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Birim seçimi */}
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                                {locale === 'de' ? 'Einheit' : 'Birim'}
                            </p>
                            <div className="grid grid-cols-3 gap-2">
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
                                    {formatCurrency(adetFiyat, locale)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">
                                    {toplamAdet} × {formatCurrency(adetFiyat, locale)}
                                </span>
                                <span className="font-bold text-gray-800 text-base">
                                    {formatCurrency(toplamFiyat, locale)}
                                </span>
                            </div>
                            {fiyatKademe && (
                                <p className={`text-[11px] font-semibold ${fiyatKademe.color}`}>
                                    {fiyatKademe.label}
                                </p>
                            )}
                        </div>

                        {/* Sepete ekle butonu */}
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

// ── Ana Katalog ────────────────────────────────────────────────────────────
export function UrunKatalogu({
    initialUrunler, kategoriler,
    dictionary, locale,
}: UrunKataloguProps) {
    const { addToWarenkorb, warenkorb } = usePortal();
    const [aramaMetni, setAramaMetni] = useState('');
    const [seciliKategori, setSeciliKategori] = useState('');
    const [modalUrun, setModalUrun] = useState<Urun | null>(null);

    const content = (dictionary as any)?.portal?.newOrderPage || {};

    const kategorieHiyerarsisi = useMemo(() => {
        const anaKategoriler: (Kategori & { altKategoriler: Kategori[] })[] = [];
        const altKategoriMap = new Map<string, Kategori[]>();
        kategoriler.forEach(k => {
            if (k.ust_kategori_id) {
                if (!altKategoriMap.has(k.ust_kategori_id)) altKategoriMap.set(k.ust_kategori_id, []);
                altKategoriMap.get(k.ust_kategori_id)!.push(k);
            }
        });
        kategoriler.forEach(k => {
            if (!k.ust_kategori_id) {
                anaKategoriler.push({ ...k, altKategoriler: altKategoriMap.get(k.id) || [] });
            }
        });
        return anaKategoriler;
    }, [kategoriler]);

    const filtrelenmisUrunler = useMemo(() => {
        return initialUrunler.filter(urun => {
            const ad = getLocalizedName(urun.ad, locale, '').toLowerCase();
            const arama = aramaMetni.toLowerCase();
            const aramaEslesmesi = !arama || ad.includes(arama) || urun.stok_kodu?.toLowerCase().includes(arama);
            const kategoriEslesmesi = !seciliKategori || urun.kategori_id === seciliKategori;
            return aramaEslesmesi && kategoriEslesmesi;
        });
    }, [initialUrunler, aramaMetni, seciliKategori, locale]);

    const sepetMap = useMemo(() => {
        const map = new Map<string, SepetUrunu>();
        warenkorb.forEach(item => map.set(item.produkt.id, item));
        return map;
    }, [warenkorb]);

    const handleAdd = useCallback((urun: Urun, miktar: number, birim: Birim) => {
        const adetFiyat = getBirimFiyat(urun, birim, miktar);

        addToWarenkorb(
            { ...urun, partnerPreis: adetFiyat },
            miktar,
            birim
        );

        const birimLabel = locale === 'de'
            ? birim === 'koli' ? 'Karton' : birim === 'palet' ? 'Palette' : 'Stück'
            : birim === 'koli' ? 'koli' : birim === 'palet' ? 'palet' : 'adet';

        toast.success(`${miktar} ${birimLabel} → ${getLocalizedName(urun.ad, locale)}`);
        setModalUrun(null);
    }, [addToWarenkorb, locale]);

    return (
        <div className="space-y-4 bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            {/* Filtreler */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                    type="text"
                    placeholder={content.searchPlaceholder || (locale === 'de' ? 'Produkt suchen...' : 'Ürün ara...')}
                    value={aramaMetni}
                    onChange={e => setAramaMetni(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
                <select
                    value={seciliKategori}
                    onChange={e => setSeciliKategori(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-accent/30 focus:border-accent"
                >
                    <option value="">{locale === 'de' ? 'Alle Kategorien' : 'Tüm Kategoriler'}</option>
                    {kategorieHiyerarsisi.map(ana => (
                        <optgroup key={ana.id} label={getLocalizedName(ana.ad, locale)}>
                            {ana.altKategoriler.map(alt => (
                                <option key={alt.id} value={alt.id}>
                                    &nbsp;&nbsp;{getLocalizedName(alt.ad, locale)}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>

            {/* Ürün tablosu */}
            <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-400 uppercase w-14" />
                            <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-400 uppercase">
                                {locale === 'de' ? 'Produkt' : 'Ürün'}
                            </th>
                            <th className="px-3 py-3 text-right text-[11px] font-bold text-gray-400 uppercase">
                                {locale === 'de' ? '1 Ktn.' : '1 Koli'}
                            </th>
                            <th className="px-3 py-3 text-right text-[11px] font-bold text-gray-400 uppercase">
                                {locale === 'de' ? '5+ Ktn.' : '5+ Koli'}
                            </th>
                            <th className="px-3 py-3 text-right text-[11px] font-bold text-gray-400 uppercase">
                                {locale === 'de' ? 'Palette' : 'Palet'}
                            </th>
                            <th className="px-3 py-3 text-center text-[11px] font-bold text-gray-400 uppercase w-32" />
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                        {filtrelenmisUrunler.length > 0 ? filtrelenmisUrunler.map(urun => {
                            const sepetItem = sepetMap.get(urun.id);
                            const isOutOfStock = (urun.stok_miktari ?? 0) <= 0;
                            const koliAdet = Number(urun.koli_ici_adet ?? 1);

                            return (
                                <tr
                                    key={urun.id}
                                    className={`hover:bg-gray-50/50 transition-colors ${isOutOfStock ? 'opacity-50' : ''}`}
                                >
                                    {/* Görsel */}
                                    <td className="px-3 py-2.5">
                                        <div className="relative w-11 h-11 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                            {urun.ana_resim_url ? (
                                                <Image
                                                    src={urun.ana_resim_url}
                                                    alt={getLocalizedName(urun.ad, locale)}
                                                    fill sizes="44px"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <FiImage size={16} />
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* İsim + kod */}
                                    <td className="px-3 py-2.5">
                                        <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight">
                                            {getLocalizedName(urun.ad, locale)}
                                        </p>
                                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                                            {urun.stok_kodu}
                                            {koliAdet > 1 && (
                                                <span className="ml-1.5 text-gray-300">
                                                    · {koliAdet} {locale === 'de' ? 'Stk/Ktn' : 'adet/koli'}
                                                </span>
                                            )}
                                        </p>
                                        {isOutOfStock && (
                                            <span className="text-[10px] text-red-500 font-semibold">
                                                {locale === 'de' ? 'Ausverkauft' : 'Stok yok'}
                                            </span>
                                        )}
                                    </td>

                                    {/* Fiyat 1 koli */}
                                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                        <span className="text-sm font-semibold text-gray-700">
                                            {formatCurrency(Number(urun.satis_fiyati_musteri ?? urun.partnerPreis ?? 0), locale)}
                                        </span>
                                    </td>

                                    {/* Fiyat 5+ koli */}
                                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                        {urun.satis_fiyati_toptanci ? (
                                            <span className="text-sm font-semibold text-blue-700">
                                                {formatCurrency(Number(urun.satis_fiyati_toptanci), locale)}
                                            </span>
                                        ) : <span className="text-gray-300">—</span>}
                                    </td>

                                    {/* Fiyat palet */}
                                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                        {urun.satis_fiyati_alt_bayi ? (
                                            <span className="text-sm font-semibold text-purple-700">
                                                {formatCurrency(Number(urun.satis_fiyati_alt_bayi), locale)}
                                            </span>
                                        ) : <span className="text-gray-300">—</span>}
                                    </td>

                                    {/* Aksiyon */}
                                    <td className="px-3 py-2.5 text-center">
                                        {sepetItem ? (
                                            <div className="flex flex-col items-center gap-0.5">
                                                <div className="flex items-center gap-1 text-green-600 font-semibold text-[11px] bg-green-50 border border-green-200 rounded-full px-2 py-1">
                                                    <FiCheck size={11} />
                                                    {sepetItem.menge} {locale === 'de'
                                                        ? sepetItem.birim === 'koli' ? 'Ktn.' : sepetItem.birim === 'palet' ? 'Pal.' : 'Stk.'
                                                        : sepetItem.birim === 'koli' ? 'koli' : sepetItem.birim === 'palet' ? 'palet' : 'adet'
                                                    }
                                                </div>
                                                <button
                                                    onClick={() => setModalUrun(urun)}
                                                    className="text-[10px] text-gray-400 hover:text-accent"
                                                >
                                                    {locale === 'de' ? 'ändern' : 'değiştir'}
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => !isOutOfStock && setModalUrun(urun)}
                                                disabled={isOutOfStock}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                                    isOutOfStock
                                                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                        : 'bg-accent text-white border-accent hover:bg-accent/90'
                                                }`}
                                            >
                                                <FiPlus size={13} />
                                                {locale === 'de' ? 'Hinzufügen' : 'Ekle'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                                    {content.noProductsFound || (locale === 'de' ? 'Keine Produkte gefunden.' : 'Ürün bulunamadı.')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mini Modal */}
            {modalUrun && (
                <SepeteEkleModal
                    urun={modalUrun}
                    locale={locale}
                    onClose={() => setModalUrun(null)}
                    onAdd={(miktar, birim) => handleAdd(modalUrun, miktar, birim)}
                />
            )}
        </div>
    );
}
