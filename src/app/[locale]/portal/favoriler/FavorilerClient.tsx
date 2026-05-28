'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
    FiHeart, FiTrash2, FiShoppingCart, FiPackage,
    FiPlus, FiMinus, FiSearch, FiX, FiArrowRight, FiInfo,
    FiList, FiGrid,
} from 'react-icons/fi';
import { toast } from 'sonner';
import { getPortalLabels, formatCurrency } from '@/lib/portalLabels';
import { usePortal } from '@/contexts/PortalContext';

import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

type Birim = 'koli' | 'adet' | 'palet';

interface Urun {
    id: string;
    ad: any;
    slug: string;
    ana_resim_url: string | null;
    stok_kodu: string | null;
    koli_ici_adet: number | null;
    palet_ici_adet: number | null;
    stok_miktari: number | null;
    satis_fiyati_musteri: number | null;
    satis_fiyati_toptanci: number | null;
    satis_fiyati_alt_bayi: number | null;
    kategori_id: string | null;
    kategoriler?: { ad: any } | null;
    favori_eklenme_tarihi: string;
}

type SecimItem = { miktar: number; birim: Birim };

interface Props {
    favoriler: Urun[];
    locale: string;
    userRole: string;
    firmaId: string;
}

// ── Fiyat hesabı ─────────────────────────────────────────────────────────
function getAdetFiyat(u: Urun, birim: Birim, miktar: number, userRole: string): number {
    if (birim === 'palet') return Number(u.satis_fiyati_alt_bayi ?? u.satis_fiyati_musteri ?? 0);
    if (birim === 'koli' && miktar >= 5) return Number(u.satis_fiyati_toptanci ?? u.satis_fiyati_musteri ?? 0);
    if (userRole === 'Alt Bayi') return Number(u.satis_fiyati_alt_bayi ?? u.satis_fiyati_musteri ?? 0);
    return Number(u.satis_fiyati_musteri ?? 0);
}

function getToplamAdet(u: Urun, birim: Birim, miktar: number): number {
    const koliAdet = Number(u.koli_ici_adet ?? 1);
    const paletAdet = Number(u.palet_ici_adet ?? koliAdet);
    if (birim === 'palet') return paletAdet * miktar;
    if (birim === 'koli') return koliAdet * miktar;
    return miktar;
}

export default function FavorilerClient({ favoriler, locale, userRole, firmaId }: Props) {
    const router = useRouter();
    const { addToWarenkorb } = usePortal();
    const [isPending, startTransition] = useTransition();
    const [search, setSearch] = useState('');
    const [secimMap, setSecimMap] = useState<Map<string, SecimItem>>(new Map());
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        const saved = localStorage.getItem('favoriler-view-mode');
        if (saved === 'list' || saved === 'grid') setViewMode(saved);
    }, []);

    const toggleViewMode = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('favoriler-view-mode', mode);
    };

    const L = getPortalLabels(locale);
    const fmt = (v: number | null | undefined) => formatCurrency(v, locale, { maximumFractionDigits: 2 });

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return favoriler;
        return favoriler.filter(u => {
            const ad = (u.ad?.[locale] || u.ad?.de || u.ad?.tr || '').toLowerCase();
            return ad.includes(q) || (u.stok_kodu || '').toLowerCase().includes(q);
        });
    }, [favoriler, search, locale]);

    const setItem = (id: string, miktar: number, birim: Birim) => {
        const m = new Map(secimMap);
        if (miktar <= 0) m.delete(id);
        else m.set(id, { miktar, birim });
        setSecimMap(m);
    };

    const setBirim = (id: string, birim: Birim) => {
        const existing = secimMap.get(id);
        if (existing) setItem(id, 1, birim);
    };

    const tumunuTemizle = () => setSecimMap(new Map());

    // Toplam hesabı
    const { seciliSayi, toplamTutar, toplamAdetToplam } = useMemo(() => {
        let seciliSayi = 0, toplamTutar = 0, toplamAdetToplam = 0;
        for (const u of favoriler) {
            const secim = secimMap.get(u.id);
            if (!secim || secim.miktar <= 0) continue;
            seciliSayi++;
            const toplamAdet = getToplamAdet(u, secim.birim, secim.miktar);
            const adetFiyat = getAdetFiyat(u, secim.birim, secim.miktar, userRole);
            toplamTutar += toplamAdet * adetFiyat;
            toplamAdetToplam += toplamAdet;
        }
        return { seciliSayi, toplamTutar, toplamAdetToplam };
    }, [favoriler, secimMap, userRole]);

    const handleRemoveFavorite = (urunId: string) => {
        const confirmMsg = locale === 'de'
            ? 'Möchten Sie dieses Produkt wirklich aus den Favoriten entfernen?'
            : 'Bu ürünü favorilerden çıkarmak istediğinize emin misiniz?';
        if (!confirm(confirmMsg)) return;
        startTransition(async () => {
            const { createDynamicSupabaseClient } = await import('@/lib/supabase/client');
            const supabase = createDynamicSupabaseClient(true);
            const { data: { user } } = await getGlobalCachedUser();
            if (!user) { toast.error('Oturum bulunamadı'); return; }
            const { error } = await supabase.from('favori_urunler')
                .delete().eq('kullanici_id', user.id).eq('urun_id', urunId);
            if (error) {
                toast.error('Favoriden çıkarılamadı: ' + error.message);
            } else {
                toast.success(locale === 'de' ? 'Aus Favoriten entfernt' : 'Favorilerden çıkarıldı');
                router.refresh();
            }
        });
    };

    const handleSiparisOlustur = () => {
        if (seciliSayi === 0) {
            toast.error(locale === 'de' ? 'Bitte zuerst Produkte auswählen' : 'Önce ürün seçin');
            return;
        }

        // Seçili ürünleri PortalContext'e ekle
        for (const u of favoriler) {
            const secim = secimMap.get(u.id);
            if (!secim || secim.miktar <= 0) continue;
            const adetFiyat = getAdetFiyat(u, secim.birim, secim.miktar, userRole);
            addToWarenkorb(
                {
                    ...u,
                    partnerPreis: adetFiyat,
                    ana_resim_url: u.ana_resim_url,
                    galeri_resim_urls: null,
                } as any,
                secim.miktar,
                secim.birim
            );
        }

        toast.success(
            locale === 'de'
                ? `${seciliSayi} Produkte in den Warenkorb gelegt`
                : `${seciliSayi} ürün sepete eklendi`
        );
        router.push(`/${locale}/portal/siparisler/yeni`);
    };

    if (favoriler.length === 0) {
        return (
            <div className="space-y-5">
                <header>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FiHeart className="text-pink-500" /> {L.favoritesTitle}
                    </h1>
                </header>
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
                    <FiHeart className="mx-auto text-5xl text-slate-300 mb-4" />
                    <h2 className="text-lg font-semibold text-slate-700">{L.favoritesEmpty}</h2>
                    <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">{L.favoritesEmptyHint}</p>
                    <Link href={`/${locale}/portal/katalog`}
                        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">
                        <FiPackage size={14} /> {L.goCatalog}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-32">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FiHeart className="text-pink-500" /> {L.favoritesTitle}
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {favoriler.length} ürün · {L.favoritesSubtitle}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View mode toggle */}
                    <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                        <button
                            onClick={() => toggleViewMode('grid')}
                            className={`p-2 transition-colors ${
                                viewMode === 'grid'
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-white text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <FiGrid size={15} />
                        </button>
                        <button
                            onClick={() => toggleViewMode('list')}
                            className={`p-2 transition-colors ${
                                viewMode === 'list'
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-white text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <FiList size={15} />
                        </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder={L.searchFavorites}
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                        />
                    </div>
                </div>
            </div>

            {/* Bilgi bandı */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
                <FiInfo size={14} className="flex-shrink-0 mt-0.5" />
                <div>
                    <strong>{L.bulkOrderInfo}</strong> {L.bulkOrderInfoDesc}
                </div>
            </div>

            {viewMode === 'grid' ? (
                /* Grid görünümü */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map(u => {
                        const ad = u.ad?.[locale] || u.ad?.de || u.ad?.tr || 'Ürün';
                        const secim = secimMap.get(u.id);
                        const miktar = secim?.miktar ?? 0;
                        const birim = secim?.birim ?? 'koli';
                        const koliAdet = Number(u.koli_ici_adet ?? 1);
                        const paletAdet = Number(u.palet_ici_adet ?? 0);
                        const toplamAdet = miktar > 0 ? getToplamAdet(u, birim, miktar) : 0;
                        const adetFiyat = getAdetFiyat(u, birim, miktar || 1, userRole);
                        const toplamFiyat = toplamAdet * adetFiyat;
                        const inStock = (u.stok_miktari ?? 0) > 0;
                        const isSelected = miktar > 0;

                        return (
                            <div key={u.id}
                                className={`bg-white border rounded-xl overflow-hidden transition-all ${
                                    isSelected
                                        ? 'border-blue-400 shadow-md ring-2 ring-blue-100'
                                        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                }`}>
                                {/* Görsel */}
                                <div className="relative aspect-[4/3] bg-slate-50">
                                    <Link href={`/${locale}/portal/katalog/${u.id}`} className="block w-full h-full">
                                        {u.ana_resim_url ? (
                                            <Image src={u.ana_resim_url} alt={ad} fill sizes="300px" className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <FiPackage size={32} className="text-slate-300" />
                                            </div>
                                        )}
                                    </Link>
                                    <button onClick={() => handleRemoveFavorite(u.id)} disabled={isPending}
                                        className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors shadow-sm">
                                        <FiTrash2 size={13} />
                                    </button>
                                    {!inStock && (
                                        <span className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 bg-amber-500 text-white rounded-full">
                                            {L.stockOnRequest}
                                        </span>
                                    )}
                                    {u.kategoriler?.ad && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2.5 py-2">
                                            <span className="text-white text-[9px] font-bold tracking-widest uppercase">
                                                {u.kategoriler.ad?.[locale] || u.kategoriler.ad?.de || ''}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 space-y-2.5">
                                    {/* İsim + kod */}
                                    <div>
                                        <Link href={`/${locale}/portal/katalog/${u.id}`}>
                                            <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 hover:text-blue-600 transition-colors">
                                                {ad}
                                            </h3>
                                        </Link>
                                        {u.stok_kodu && (
                                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                {u.stok_kodu} · {koliAdet} adet/koli
                                            </p>
                                        )}
                                    </div>

                                    {/* Fiyat kademeleri */}
                                    <div className="space-y-0.5 text-[11px]">
                                        <div className="flex justify-between text-slate-600">
                                            <span>1 {locale === 'de' ? 'Ktn.' : 'koli'}</span>
                                            <span className="font-semibold">{fmt(Number(u.satis_fiyati_musteri ?? 0))}</span>
                                        </div>
                                        {u.satis_fiyati_toptanci && (
                                            <div className="flex justify-between text-blue-700">
                                                <span>5+ {locale === 'de' ? 'Ktn.' : 'koli'}</span>
                                                <span className="font-semibold">{fmt(Number(u.satis_fiyati_toptanci))}</span>
                                            </div>
                                        )}
                                        {u.satis_fiyati_alt_bayi && paletAdet > 0 && (
                                            <div className="flex justify-between text-purple-700">
                                                <span>{locale === 'de' ? 'Palette' : 'Palet'} ({paletAdet})</span>
                                                <span className="font-semibold">{fmt(Number(u.satis_fiyati_alt_bayi))}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Birim toggle (sadece seçilince) */}
                                    {isSelected && (
                                        <div className="flex gap-1">
                                            {(['koli', 'adet', ...(paletAdet > 0 ? ['palet'] : [])] as Birim[]).map(b => (
                                                <button key={b}
                                                    onClick={() => setBirim(u.id, b)}
                                                    className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                                                        birim === b
                                                            ? b === 'palet'
                                                                ? 'bg-purple-600 text-white border-purple-600'
                                                                : b === 'adet'
                                                                    ? 'bg-slate-700 text-white border-slate-700'
                                                                    : 'bg-blue-600 text-white border-blue-600'
                                                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    {b === 'koli'
                                                        ? locale === 'de' ? 'Ktn.' : 'Koli'
                                                        : b === 'palet'
                                                            ? locale === 'de' ? 'Pal.' : 'Palet'
                                                            : locale === 'de' ? 'Stk.' : 'Adet'}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Miktar seçici */}
                                    <div className="pt-1 border-t border-slate-100">
                                        {!isSelected ? (
                                            <button
                                                onClick={() => setItem(u.id, 1, 'koli')}
                                                className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                                            >
                                                <FiPlus size={12} />
                                                {locale === 'de' ? 'Hinzufügen' : 'Ekle'}
                                            </button>
                                        ) : (
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg p-1">
                                                    <button onClick={() => setItem(u.id, miktar - 1, birim)}
                                                        className="w-7 h-7 flex items-center justify-center text-blue-700 hover:bg-blue-100 rounded transition-colors">
                                                        <FiMinus size={13} />
                                                    </button>
                                                    <div className="flex-1 text-center">
                                                        <p className="text-sm font-bold text-blue-900">
                                                            {miktar} {birim === 'koli'
                                                                ? locale === 'de' ? 'Ktn.' : 'koli'
                                                                : birim === 'palet'
                                                                    ? locale === 'de' ? 'Pal.' : 'palet'
                                                                    : locale === 'de' ? 'Stk.' : 'adet'}
                                                        </p>
                                                        <p className="text-[9px] text-blue-600">
                                                            {toplamAdet} adet · {fmt(toplamFiyat)}
                                                        </p>
                                                    </div>
                                                    <button onClick={() => setItem(u.id, miktar + 1, birim)}
                                                        className="w-7 h-7 flex items-center justify-center text-blue-700 hover:bg-blue-100 rounded transition-colors">
                                                        <FiPlus size={13} />
                                                    </button>
                                                </div>

                                                {/* Kademe hint */}
                                                {birim === 'koli' && miktar >= 5 && (
                                                    <p className="text-[10px] text-green-600 font-semibold text-center">
                                                        ✓ {locale === 'de' ? 'Mengenrabatt aktiv' : '5+ koli indirimi aktif'}
                                                    </p>
                                                )}
                                                {birim === 'koli' && miktar < 5 && (
                                                    <p className="text-[10px] text-amber-600 text-center">
                                                        {5 - miktar} {locale === 'de' ? 'mehr für Mengenrabatt' : 'koli daha: indirim'}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Liste görünümü */
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    {/* Tablo başlığı */}
                    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                        <div className="w-10" />
                        <div>{locale === 'de' ? 'Produkt' : 'Ürün'}</div>
                        <div className="text-right hidden sm:block">
                            {locale === 'de' ? 'Staffelpreise' : 'Fiyat Kademeleri'}
                        </div>
                        <div className="text-center w-36">
                            {locale === 'de' ? 'Menge' : 'Miktar'}
                        </div>
                        <div className="text-right w-20">
                            {locale === 'de' ? 'Gesamt' : 'Toplam'}
                        </div>
                    </div>

                    <div className="divide-y divide-slate-50">
                        {filtered.map(u => {
                            const ad = u.ad?.[locale] || u.ad?.de || u.ad?.tr || 'Ürün';
                            const secim = secimMap.get(u.id);
                            const miktar = secim?.miktar ?? 0;
                            const birim = secim?.birim ?? 'koli';
                            const koliAdet = Number(u.koli_ici_adet ?? 1);
                            const paletAdet = Number(u.palet_ici_adet ?? 0);
                            const toplamAdet = miktar > 0 ? getToplamAdet(u, birim, miktar) : 0;
                            const adetFiyat = getAdetFiyat(u, birim, Math.max(miktar, 1), userRole);
                            const toplamFiyat = toplamAdet * adetFiyat;
                            const isSelected = miktar > 0;

                            return (
                                <div key={u.id}
                                    className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center px-4 py-3 transition-colors ${
                                        isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'
                                    }`}
                                >
                                    {/* Thumbnail */}
                                    <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                                        {u.ana_resim_url ? (
                                            <Image src={u.ana_resim_url} alt={ad}
                                                fill sizes="40px" className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <FiPackage size={14} />
                                            </div>
                                        )}
                                    </div>

                                    {/* İsim + bilgi */}
                                    <div className="min-w-0">
                                        <Link href={`/${locale}/portal/katalog/${u.id}`}>
                                            <p className="text-sm font-semibold text-slate-800 truncate hover:text-blue-600 transition-colors">
                                                {ad}
                                            </p>
                                        </Link>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            <span className="text-[10px] text-slate-400 font-mono">{u.stok_kodu}</span>
                                            <span className="text-[10px] text-slate-300">·</span>
                                            <span className="text-[10px] text-slate-400">{koliAdet} adet/koli</span>
                                            {/* Mobil fiyat */}
                                            <span className="text-[10px] text-blue-700 font-semibold sm:hidden">
                                                {fmt(Number(u.satis_fiyati_musteri ?? 0))}/koli
                                            </span>
                                        </div>
                                    </div>

                                    {/* Fiyat kademeleri — sadece desktop */}
                                    <div className="hidden sm:flex flex-col gap-0.5 text-right min-w-[140px]">
                                        <span className="text-[11px] text-slate-600">
                                            1 {locale === 'de' ? 'Ktn.' : 'koli'}: <strong>{fmt(Number(u.satis_fiyati_musteri ?? 0))}</strong>
                                        </span>
                                        {u.satis_fiyati_toptanci && (
                                            <span className="text-[11px] text-blue-700">
                                                5+ {locale === 'de' ? 'Ktn.' : 'koli'}: <strong>{fmt(Number(u.satis_fiyati_toptanci))}</strong>
                                            </span>
                                        )}
                                        {u.satis_fiyati_alt_bayi && paletAdet > 0 && (
                                            <span className="text-[11px] text-purple-700">
                                                {locale === 'de' ? 'Pal.' : 'Palet'}: <strong>{fmt(Number(u.satis_fiyati_alt_bayi))}</strong>
                                            </span>
                                        )}
                                    </div>

                                    {/* Miktar seçici */}
                                    <div className="flex flex-col items-center gap-1 w-36">
                                        {/* Birim toggle */}
                                        <div className="flex gap-0.5">
                                            {(['koli', 'adet', ...(paletAdet > 0 ? ['palet'] : [])] as Birim[]).map(b => (
                                                <button key={b}
                                                    onClick={() => isSelected
                                                        ? setBirim(u.id, b)
                                                        : setItem(u.id, 1, b)
                                                    }
                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                                        birim === b && isSelected
                                                            ? b === 'palet'
                                                                ? 'bg-purple-600 text-white border-purple-600'
                                                                : b === 'adet'
                                                                    ? 'bg-slate-700 text-white border-slate-700'
                                                                    : 'bg-blue-600 text-white border-blue-600'
                                                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    {b === 'koli'
                                                        ? locale === 'de' ? 'Ktn.' : 'Koli'
                                                        : b === 'palet'
                                                            ? locale === 'de' ? 'Pal.' : 'Palet'
                                                            : locale === 'de' ? 'Stk.' : 'Adet'}
                                                </button>
                                            ))}
                                        </div>

                                        {/* +/− miktar */}
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setItem(u.id, miktar - 1, birim)}
                                                className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 text-sm font-bold"
                                            >
                                                −
                                            </button>
                                            <input
                                                type="number"
                                                value={miktar}
                                                onChange={e => setItem(u.id, Math.max(0, parseInt(e.target.value) || 0), birim)}
                                                className={`w-10 text-center text-sm font-bold border rounded py-0.5 ${
                                                    isSelected
                                                        ? 'border-blue-300 bg-blue-50 text-blue-900'
                                                        : 'border-slate-200 text-slate-400'
                                                }`}
                                                min="0"
                                            />
                                            <button
                                                onClick={() => setItem(u.id, miktar + 1, birim)}
                                                className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 text-sm font-bold"
                                            >
                                                +
                                            </button>
                                        </div>
                                        {isSelected && (
                                            <p className="text-[10px] text-slate-400 text-center">
                                                = {toplamAdet} adet
                                            </p>
                                        )}
                                    </div>

                                    {/* Toplam fiyat */}
                                    <div className="text-right w-20">
                                        {isSelected ? (
                                            <div>
                                                <p className="text-sm font-bold text-blue-700">
                                                    {fmt(toplamFiyat)}
                                                </p>
                                                <button
                                                    onClick={() => setItem(u.id, 0, birim)}
                                                    className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                                                >
                                                    <FiX size={10} className="inline" /> {locale === 'de' ? 'entf.' : 'kaldır'}
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-300">—</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {filtered.length === 0 && search && (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                    <p className="text-sm text-slate-500">"{search}" {locale === 'de' ? 'nicht gefunden' : 'bulunamadı'}</p>
                </div>
            )}

            {/* Sticky alt bar */}
            {seciliSayi > 0 && (
                <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-white border-t-2 border-blue-500 shadow-2xl z-40">
                    <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <FiShoppingCart size={18} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">
                                    {seciliSayi} {L.selectedItems} · {toplamAdetToplam} {locale === 'de' ? 'Stk. gesamt' : 'adet toplam'}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {L.estimatedTotal} <strong className="text-blue-700">{fmt(toplamTutar)}</strong>
                                    <span className="text-[10px] text-slate-400 ml-1">{L.excludingVat}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={tumunuTemizle}
                                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1">
                                <FiX size={12} /> {L.clear}
                            </button>
                            <button onClick={handleSiparisOlustur}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-md">
                                {L.createOrder} <FiArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
