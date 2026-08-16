// src/app/[locale]/(public)/products/page.tsx

import { getDictionary } from '@/dictionaries';
import { ProductGridClient } from './product-grid-client';
import { getLocalizedName } from '@/lib/utils';
import {
    PUBLIC_VISIBLE_MAIN_CATEGORY_ORDER,
    buildHiddenPublicCategoryIds,
    isPublicCategorySlugHidden,
} from '@/lib/public-category-visibility';
import Link from 'next/link';
import { type Kategori, type Urun } from './types';
import { FiPackage, FiMail } from 'react-icons/fi';
import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 3600; // 1 hour caching (ISR)

const baseUrl = 'https://www.elysonsweets.de';
const locales = ['de', 'en', 'tr', 'ar'];

export async function generateMetadata({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ kategori?: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const { kategori } = await searchParams;
    const dictionary = await getDictionary(locale as any);

    const canonicalPath = kategori
        ? `${baseUrl}/${locale}/products?kategori=${kategori}`
        : `${baseUrl}/${locale}/products`;

    const alternates: Record<string, string> = {};
    locales.forEach((l) => {
        alternates[l] = kategori
            ? `${baseUrl}/${l}/products?kategori=${kategori}`
            : `${baseUrl}/${l}/products`;
    });

    return {
        title: dictionary.seo?.products?.title || 'B2B Produktkatalog | ElysonSweets',
        description: dictionary.seo?.products?.description || '',
        alternates: {
            canonical: canonicalPath,
            languages: alternates,
        },
        openGraph: {
            title: dictionary.seo?.products?.title || 'B2B Produktkatalog | ElysonSweets',
            description: dictionary.seo?.products?.description || '',
            locale,
            type: 'website',
            url: canonicalPath,
        },
    };
}

export default async function PublicUrunlerPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{
        kategori?: string;
        altKategori?: string;
        geschmack?: string;
        merkmal?: string;
        q?: string;
        page?: string;
        limit?: string;
        segment?: string;
        gam?: string;
    }>;
}) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { locale } = await params;
    const sp = await searchParams;

    const page = Math.max(1, Number.parseInt(sp.page || '1') || 1);
    const perPage = Math.min(48, Math.max(12, Number.parseInt(sp.limit || '24') || 24));

    const altKategoriFilter = sp.altKategori;
    const geschmackFilter = sp.geschmack;
    const searchQuery = sp.q?.trim() || '';
    const segmentFilter = sp.segment; // 'cafe' | 'hotel' | 'patisserie' | 'dessertbar'
    const aktifMerkmale = sp.merkmal ? sp.merkmal.split(',').filter(Boolean) : [];
    const gamFilter = ['barista', 'dondurma', 'pastaci', 'icecek'].includes(sp.gam ?? '') ? sp.gam : undefined;

    let seciliKategoriSlug: string | undefined;
    if (sp.kategori && sp.kategori.toLowerCase() !== 'null' && !isPublicCategorySlugHidden(sp.kategori)) {
        seciliKategoriSlug = sp.kategori;
    }

    // Auth moved to client component to enable static caching of this page
    let isLoggedIn = undefined;
    let partnerTier = undefined;

    const [dictionary, kategorilerRes, sablonlarRes] = await Promise.all([
        getDictionary(locale as any),
        supabase.from('kategoriler').select('id, ad, slug, ust_kategori_id'),
        supabase.from('kategori_ozellik_sablonlari').select('kategori_id, alan_adi, gosterim_adi, sira'),
    ]);

    const kategoriler: Kategori[] = kategorilerRes.data || [];
    const hiddenKategoriIds = buildHiddenPublicCategoryIds(kategoriler);
    const visibleKategoriler = kategoriler.filter(k => !hiddenKategoriIds.has(k.id));

    const visibleMainCategoryOrder = PUBLIC_VISIBLE_MAIN_CATEGORY_ORDER;

    const pageContent = dictionary.productsPage;

    const kategoriAdlariMap = new Map<string, string>();
    kategoriler.forEach(k => {
        kategoriAdlariMap.set(k.id, k.ad?.[locale] || k.ad?.['de'] || '');
    });

    const kategoriParentMap: Record<string, string | null> = {};
    kategoriler.forEach(k => { kategoriParentMap[k.id] = k.ust_kategori_id || null; });

    const sablonMap: Record<string, Array<{ alan_adi: string; gosterim_adi: any; sira: number }>> = {};
    if (sablonlarRes.data) {
        for (const row of sablonlarRes.data as any[]) {
            const list = sablonMap[row.kategori_id] || [];
            list.push({ alan_adi: row.alan_adi, gosterim_adi: row.gosterim_adi, sira: row.sira ?? 0 });
            sablonMap[row.kategori_id] = list;
        }
        for (const key of Object.keys(sablonMap)) {
            sablonMap[key] = sablonMap[key].sort((a, b) => a.sira - b.sira);
        }
    }

    // ── Fetch all products for category counts ────────────────────────────────
    const { data: tumUrunlerData } = await supabase
        .from('urunler')
        .select('id, kategori_id')
        .eq('aktif', true);

    const tumUrunler = (tumUrunlerData || []).filter(
        (u: any) => !hiddenKategoriIds.has(u.kategori_id ?? '')
    );
    const totalAllProducts = tumUrunler.length;

    // Category product counts — recursively propagate to ALL ancestors
    const categoryProductCounts: Record<string, number> = {};
    const kategoriParentLookup = new Map(kategoriler.map(k => [k.id, k.ust_kategori_id ?? null]));

    tumUrunler.forEach((u: any) => {
        const catId = u.kategori_id;
        if (!catId) return;
        // Walk up the full ancestor chain
        let current: string | null = catId;
        let guard = 0;
        while (current && guard++ < 10) {
            categoryProductCounts[current] = (categoryProductCounts[current] || 0) + 1;
            current = kategoriParentLookup.get(current) ?? null;
        }
    });

    // ── Business segment → category slug mapping ─────────────────────────────
    // These map segment filter to real category/query
    const SEGMENT_CATEGORY_MAP: Record<string, { kategori?: string; lagerung?: string }> = {
        cafe:       { kategori: undefined },  // barista line — use urunGami in href
        hotel:      { lagerung: 'tiefkuehl' },
        patisserie: { kategori: 'cakes-and-tarts' },
        dessertbar: { lagerung: 'tiefkuehl' },
    };

    // Resolve selected category + IDs to filter
    let filtrelenecekKategoriIdleri: string[] = [];
    if (seciliKategoriSlug) {
        const anaKategori = visibleKategoriler.find(k => k.slug === seciliKategoriSlug);
        if (anaKategori) {
            if (altKategoriFilter) {
                const altKat = visibleKategoriler.find(k => k.slug === altKategoriFilter);
                if (altKat) filtrelenecekKategoriIdleri.push(altKat.id);
            } else {
                filtrelenecekKategoriIdleri.push(anaKategori.id);
                visibleKategoriler.filter(k => k.ust_kategori_id === anaKategori.id)
                    .forEach(ak => filtrelenecekKategoriIdleri.push(ak.id));
            }
        }
    }

    // ── Main product query ────────────────────────────────────────────────────
    const productSelectFields = `
        id, ad, slug, ana_resim_url, galeri_resim_urls,
        kategori_id, ortalama_puan, degerlendirme_sayisi,
        teknik_ozellikler, aciklamalar, birim_agirlik_kg,
        koli_ici_adet, palet_ici_adet,
        stok_kodu, ean_gtin, stok_miktari, created_at,
        lagertemperatur_min_celsius, lagertemperatur_max_celsius,
        mindest_bestellmenge, mindest_bestellmenge_einheit,
        zertifikate, haltbarkeit_monate, lieferzeit_werktage, lojistik_sinifi,
        satis_fiyati_musteri, satis_fiyati_toptanci, satis_fiyati_alt_bayi,
        produktdatenblatt_url
    `;

    let sortedData: any[] = [];
    let totalCount = 0;

    let urunlerQuery = (supabase as any)
        .from('urunler')
        .select(productSelectFields, { count: 'exact' })
        .eq('aktif', true);

    if (filtrelenecekKategoriIdleri.length > 0) {
        urunlerQuery = urunlerQuery.in('kategori_id', filtrelenecekKategoriIdleri);
    }

    if (gamFilter) {
        urunlerQuery = urunlerQuery.eq('urun_gami', gamFilter);
    }

    if (geschmackFilter) {
        urunlerQuery = urunlerQuery.contains(
            'teknik_ozellikler->geschmack',
            JSON.stringify([geschmackFilter])
        );
    }

    for (const merkmal of aktifMerkmale) {
        urunlerQuery = (urunlerQuery as any).contains('teknik_ozellikler', { [merkmal]: true });
    }

    if (searchQuery) {
        const queryStr = `%${searchQuery}%`;
        urunlerQuery = urunlerQuery.or(
            `ad->>de.ilike.${queryStr},ad->>en.ilike.${queryStr},ad->>tr.ilike.${queryStr},ad->>ar.ilike.${queryStr},stok_kodu.ilike.${queryStr},ean_gtin.ilike.${queryStr}`
        );
    }

    let urunlerRes = await urunlerQuery.order('ad', { ascending: true });

    if (urunlerRes.error) {
        console.error('Product query error, retrying:', urunlerRes.error.message);
        const minimalFields = `id, ad, slug, ana_resim_url, kategori_id, stok_kodu, stok_miktari,
            koli_ici_adet, palet_ici_adet, teknik_ozellikler, lojistik_sinifi,
            lagertemperatur_min_celsius, lagertemperatur_max_celsius, zertifikate,
            satis_fiyati_musteri, satis_fiyati_toptanci, satis_fiyati_alt_bayi,
            created_at, mindest_bestellmenge, mindest_bestellmenge_einheit, aktif`;
        let retryQuery = supabase.from('urunler').select(minimalFields).eq('aktif', true);
        if (filtrelenecekKategoriIdleri.length > 0) {
            retryQuery = retryQuery.in('kategori_id', filtrelenecekKategoriIdleri);
        }
        if (searchQuery) {
            const queryStr = `%${searchQuery}%`;
            retryQuery = retryQuery.or(
                `ad->>de.ilike.${queryStr},ad->>en.ilike.${queryStr},ad->>tr.ilike.${queryStr},ad->>ar.ilike.${queryStr},stok_kodu.ilike.${queryStr},ean_gtin.ilike.${queryStr}`
            );
        }
        urunlerRes = await retryQuery.order('ad', { ascending: true });
    }

    sortedData = (urunlerRes.data || []).filter(
        (u: any) => !hiddenKategoriIds.has(u.kategori_id ?? '')
    );
    totalCount = sortedData.length;

    // Sort by category order
    const kategoriById = new Map(kategoriler.map(k => [k.id, k]));
    const getRootSlug = (catId?: string | null) => {
        let cur = catId ? kategoriById.get(catId) : null;
        let guard = 0;
        while (cur?.ust_kategori_id && guard < 10) {
            cur = kategoriById.get(cur.ust_kategori_id) || null;
            guard++;
        }
        return cur?.slug || null;
    };

    if (sortedData.length > 0) {
        sortedData = [...sortedData].sort((a: any, b: any) => {
            const ai = visibleMainCategoryOrder.indexOf(getRootSlug(a.kategori_id) as any);
            const bi = visibleMainCategoryOrder.indexOf(getRootSlug(b.kategori_id) as any);
            const sa = ai === -1 ? 999 : ai;
            const sb = bi === -1 ? 999 : bi;
            if (sa !== sb) return sa - sb;
            
            if (searchQuery) {
                // If there's a search query, try to bring exact matches closer
                const sq = searchQuery.toLowerCase();
                const aName = String(a.ad?.[locale] || a.ad?.de || '').toLowerCase();
                const bName = String(b.ad?.[locale] || b.ad?.de || '').toLowerCase();
                const aSku = String(a.stok_kodu || '').toLowerCase();
                const bSku = String(b.stok_kodu || '').toLowerCase();
                const aEan = String(a.ean_gtin || '').toLowerCase();
                const bEan = String(b.ean_gtin || '').toLowerCase();
                
                const aScore = (aName.includes(sq) ? 1 : 0) + (aSku.includes(sq) ? 2 : 0) + (aEan === sq ? 3 : 0);
                const bScore = (bName.includes(sq) ? 1 : 0) + (bSku.includes(sq) ? 2 : 0) + (bEan === sq ? 3 : 0);
                
                if (aScore !== bScore) return bScore - aScore;
            }
            
            const pa = a.ortalama_puan || 0, pb = b.ortalama_puan || 0;
            if (pa !== pb) return pb - pa;
            return String(a.ad?.[locale] || a.ad?.de || '')
                .localeCompare(String(b.ad?.[locale] || b.ad?.de || ''));
        });
    }

    const from = (page - 1) * perPage;
    const paginatedData = sortedData.slice(from, from + perPage);
    const urunler: Urun[] = paginatedData as unknown as Urun[];
    const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
    const clampedPage = Math.min(page, totalPages);

    // ── Bestseller products (max 8) ───────────────────────────────────────────
    let bestsellerUrunler: Urun[] = [];
    try {
        const { data: bsData } = await (supabase as any)
            .from('urunler')
            .select(productSelectFields)
            .eq('aktif', true)
            .eq('is_bestseller', true)
            .limit(8);
        bestsellerUrunler = (bsData || []).filter(
            (u: any) => !hiddenKategoriIds.has(u.kategori_id ?? '')
        ) as unknown as Urun[];
    } catch {
        // is_bestseller column not yet added to DB — skip
        bestsellerUrunler = [];
    }

    let featuredUrunler: Urun[] = [];
    try {
        let featuredQuery = (supabase as any)
            .from('urunler')
            .select(productSelectFields)
            .eq('aktif', true)
            .eq('is_featured', true);
        if (gamFilter) {
            featuredQuery = featuredQuery.eq('urun_gami', gamFilter);
        }
        const { data: featuredData } = await featuredQuery
            .order('featured_sira', { ascending: true })
            .limit(6);
        featuredUrunler = (featuredData || []).filter(
            (u: any) => !hiddenKategoriIds.has(u.kategori_id ?? '')
        ) as unknown as Urun[];
    } catch {
        featuredUrunler = [];
    }

    // Aroma sayılarını hesapla — tüm aktif ürünlerden
    const geschmackCounts: Record<string, number> = {};
    try {
        const { data: allTeknik } = await supabase
            .from('urunler')
            .select('teknik_ozellikler')
            .eq('aktif', true);

        (allTeknik || []).forEach((u: any) => {
            const g = u.teknik_ozellikler?.geschmack;
            if (!g) return;
            const arr = Array.isArray(g) ? g :
                (typeof g === 'string' ? (() => {
                    try { return JSON.parse(g); } catch { return []; }
                })() : []);
            arr.forEach((tat: string) => {
                if (tat) geschmackCounts[tat] = (geschmackCounts[tat] || 0) + 1;
            });
        });
    } catch {}

    let seciliKategoriAdi = dictionary.publicProductsPage?.allProducts || (locale === 'tr' ? 'Tüm Ürünler' : locale === 'en' ? 'All Products' : locale === 'ar' ? 'جميع المنتجات' : 'Alle Produkte');
    if (seciliKategoriSlug) {
        const sk = kategoriler.find(k => k.slug === seciliKategoriSlug);
        if (sk) seciliKategoriAdi = sk.ad?.[locale] || sk.ad?.['de'] || seciliKategoriAdi;
    }

    // Aktif geschmack, merkmal ve gam filtreleri her zaman korunur, p ile override edilebilir
    const buildProductsHref = (p: Record<string, string | undefined>) => {
        const q = new URLSearchParams();
        if (geschmackFilter && !('geschmack' in p)) q.set('geschmack', geschmackFilter);
        if (sp.merkmal && !('merkmal' in p)) q.set('merkmal', sp.merkmal);
        if (gamFilter && !('gam' in p)) q.set('gam', gamFilter);
        Object.entries(p).forEach(([k, v]) => { if (v) q.set(k, v); else q.delete(k); });
        const qs = q.toString();
        return `/${locale}/products${qs ? `?${qs}` : ''}`;
    };

    const currentQuery = {
        kategori: seciliKategoriSlug,
        altKategori: sp.altKategori,
        geschmack: geschmackFilter,
        merkmal: sp.merkmal || undefined,
        q: searchQuery || undefined,
    };

    const activeFilterCount = [seciliKategoriSlug, sp.altKategori, gamFilter].filter(Boolean).length;

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans">

            {/* ── Page Header ─────────────────────────────────────────────── */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-white/50 sticky top-0 z-30 shadow-sm">
                <div className="container mx-auto px-4 sm:px-8 py-5">

                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">
                                {dictionary.publicProductsPage?.b2bCatalogLabel || 'B2B Großhandels-Katalog'}
                            </p>
                            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                                {dictionary.publicProductsPage?.heroTitle || 'Sortiment für Profi-Küchen & Gastronomie'}
                            </h1>
                            <p className="mt-1 text-sm text-slate-500 max-w-xl">
                                {dictionary.publicProductsPage?.heroDescription || 'Tiefkühl-Desserts, Sirupe, Kaffee und Backzutaten – direkt für Cafés, Hotels und Patisserien.'}
                            </p>
                        </div>

                        <div className="flex flex-col items-end gap-2 self-start sm:self-auto mt-2 sm:mt-0">
                            <div className="flex items-center gap-2 text-xs text-stone-600 bg-white/60 backdrop-blur-md border border-white/80 shadow-sm rounded-xl px-3 py-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                {totalAllProducts} {dictionary.publicProductsPage?.totalProductsInCatalog || 'Artikel im Sortiment'}
                            </div>
                            <a href={`mailto:info@elysonsweets.de?subject=${encodeURIComponent('Preisanfrage / B2B Katalog')}`}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 bg-white border border-white/80 shadow-[0_4px_14px_0_rgb(0,0,0,0.05)] rounded-xl px-4 py-2 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] transition-all duration-300">
                                <FiMail size={14} className="text-amber-600" /> {dictionary.publicProductsPage?.priceRequest || 'Preisanfrage'}
                            </a>
                        </div>
                    </div>

                </div>
            </div>

            {/* ── Main: Sidebar + Grid ─────────────────────────────────────── */}
            <div className="container mx-auto px-4 sm:px-8 py-6">
                <div className="flex gap-6">

                    {/* ── Filter Sidebar ─────────────────────────────────────── */}
                    <aside className="hidden lg:flex flex-col gap-5 w-52 flex-shrink-0">

                        {/* Kategorien — real DB categories */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3 ml-1">
                                {dictionary.publicProductsPage?.categories || 'Kategorien'}
                            </p>
                            <div className="space-y-0.5">
                                <Link href={buildProductsHref({})}
                                    className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm transition-all duration-300
                                        ${!seciliKategoriSlug ? 'bg-amber-50 text-amber-900 font-bold shadow-sm border border-amber-100' : 'text-stone-600 hover:bg-white hover:shadow-sm'}`}>
                                    <span>{dictionary.publicProductsPage?.allCategories || (locale === 'tr' ? 'Tüm Kategoriler' : locale === 'en' ? 'All Categories' : locale === 'ar' ? 'جميع الفئات' : 'Alle Kategorien')}</span>
                                    <span className="text-[10px] text-slate-400">{totalAllProducts}</span>
                                </Link>

                                {visibleKategoriler
                                    .filter(k => !k.ust_kategori_id && (categoryProductCounts[k.id] || 0) > 0)
                                    .sort((a, b) => {
                                        // Sort by known order first, then alphabetically
                                        const ai = visibleMainCategoryOrder.indexOf((a.slug ?? '') as any);
                                        const bi = visibleMainCategoryOrder.indexOf((b.slug ?? '') as any);
                                        if (ai !== -1 && bi !== -1) return ai - bi;
                                        if (ai !== -1) return -1;
                                        if (bi !== -1) return 1;
                                        return getLocalizedName(a.ad, locale as any).localeCompare(getLocalizedName(b.ad, locale as any));
                                    })
                                    .map(k => {
                                        const count = categoryProductCounts[k.id] || 0;
                                        const isSelected = seciliKategoriSlug === k.slug;
                                        const subKats = visibleKategoriler.filter(sk => sk.ust_kategori_id === k.id && (categoryProductCounts[sk.id] || 0) > 0);
                                        return (
                                            <div key={k.id}>
                                                <Link href={buildProductsHref({ kategori: k.slug || undefined })}
                                                    className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm transition-all duration-300
                                                        ${isSelected ? 'bg-amber-50 text-amber-900 font-bold shadow-sm border border-amber-100' : 'text-stone-600 hover:bg-white hover:shadow-sm'}`}>
                                                    <span className="truncate">{getLocalizedName(k.ad, locale as any)}</span>
                                                    <span className="text-[10px] text-slate-400 ml-1 flex-shrink-0">{count}</span>
                                                </Link>
                                                {subKats.length > 0 && (
                                                    <div className="ml-3 mt-0.5 space-y-0.5 border-l border-slate-200 pl-2">
                                                        {subKats.map(sk => (
                                                            <Link key={sk.id}
                                                                href={buildProductsHref({ kategori: k.slug || undefined, altKategori: sk.slug || undefined })}
                                                                className={`flex items-center justify-between w-full px-3 py-1.5 rounded-xl text-xs transition-all duration-300
                                                                    ${sp.altKategori === sk.slug ? 'text-amber-900 font-bold bg-amber-50/50' : 'text-stone-500 hover:text-stone-900 hover:bg-white/50'}`}>
                                                                <span className="truncate">{getLocalizedName(sk.ad, locale as any)}</span>
                                                                <span className="text-[10px] text-slate-400">{categoryProductCounts[sk.id] || 0}</span>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>

                        {/* Ürün Serisi / Gam Filter */}
                        <div className="mt-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3 ml-1">
                                {dictionary.publicProductsPage?.productSeries || 'Produktserie'}
                            </p>
                            <div className="space-y-0.5">
                                {[
                                    { key: 'barista', emoji: '☕' },
                                    { key: 'dondurma', emoji: '🍦' },
                                    { key: 'pastaci', emoji: '🥐' },
                                    { key: 'icecek', emoji: '🥤' },
                                ].map(({ key, emoji }) => {
                                    const label = dictionary.gamLabels?.[key] || key;
                                    const isActive = gamFilter === key;
                                    return (
                                        <Link
                                            key={key}
                                            href={buildProductsHref({ gam: isActive ? undefined : key, page: undefined })}
                                            className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm transition-all duration-300
                                                ${isActive ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200 shadow-sm' : 'text-stone-600 hover:bg-white hover:shadow-sm'}`}
                                        >
                                            <span>{emoji}</span>
                                            <span className="truncate">{label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Filter zurücksetzen */}
                        {(activeFilterCount > 0 || gamFilter) && (
                            <Link href={`/${locale}/products`}
                                className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl border-2 border-dashed border-stone-200 text-xs font-medium text-stone-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-all duration-300">
                                ✕ {dictionary.publicProductsPage?.resetFilter || 'Filter zurücksetzen'}
                            </Link>
                        )}
                    </aside>

                    {/* ── Product area ────────────────────────────────────────── */}
                    <div className="flex-1 min-w-0">

                        {/* Mobile: horizontal scrollable category chips */}
                        <div className="flex gap-1.5 mb-4 lg:hidden overflow-x-auto pb-1 scrollbar-hide">
                            <Link href={buildProductsHref({})}
                                className={`px-4 py-2 text-xs rounded-xl font-medium whitespace-nowrap transition-all duration-300 shadow-sm
                                    ${!seciliKategoriSlug ? 'bg-stone-900 text-white shadow-stone-900/20' : 'bg-white text-stone-600 border border-white/80'}`}>
                                {dictionary.publicProductsPage?.all || 'Alle'} ({totalAllProducts})
                            </Link>
                            {visibleKategoriler
                                .filter(k => !k.ust_kategori_id && (categoryProductCounts[k.id] || 0) > 0)
                                .sort((a, b) => {
                                    const ai = visibleMainCategoryOrder.indexOf((a.slug ?? '') as any);
                                    const bi = visibleMainCategoryOrder.indexOf((b.slug ?? '') as any);
                                    if (ai !== -1 && bi !== -1) return ai - bi;
                                    if (ai !== -1) return -1;
                                    if (bi !== -1) return 1;
                                    return getLocalizedName(a.ad, locale as any).localeCompare(getLocalizedName(b.ad, locale as any));
                                })
                                .map(k => (
                                    <Link key={k.id}
                                        href={buildProductsHref({ kategori: k.slug || undefined })}
                                        className={`px-4 py-2 text-xs rounded-xl font-medium whitespace-nowrap transition-all duration-300 shadow-sm
                                            ${seciliKategoriSlug === k.slug ? 'bg-stone-900 text-white shadow-stone-900/20' : 'bg-white text-stone-600 border border-white/80'}`}>
                                        {getLocalizedName(k.ad, locale as any)} ({categoryProductCounts[k.id] || 0})
                                    </Link>
                                ))}
                        </div>

                        {/* Active filter tags */}
                        {activeFilterCount > 0 && (
                            <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                                <span className="text-slate-500">{totalCount} {dictionary.publicProductsPage?.results || 'Ergebnisse'}</span>
                                {seciliKategoriSlug && (
                                    <Link href={buildProductsHref({ ...currentQuery, kategori: undefined, altKategori: undefined })}
                                        className="inline-flex items-center gap-1 bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium hover:bg-slate-300">
                                        {seciliKategoriAdi} ✕
                                    </Link>
                                )}
                                {gamFilter && (
                                    <Link href={buildProductsHref({ gam: undefined })}
                                        className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium hover:bg-indigo-200">
                                        {dictionary.gamLabels?.[gamFilter] || gamFilter} ✕
                                    </Link>
                                )}
                                <Link href={`/${locale}/products`} className="text-slate-400 hover:text-slate-600 underline ml-1">
                                    {dictionary.publicProductsPage?.resetAllFilters || 'Alle Filter zurücksetzen'}
                                </Link>
                            </div>
                        )}

                        {urunler.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                                <FiPackage className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm font-medium text-slate-600">
                                    {dictionary.publicProductsPage?.noProductsFound || 'Keine Produkte gefunden'}
                                </p>
                                <Link href={`/${locale}/products`} className="mt-3 inline-flex text-xs text-slate-500 underline hover:text-slate-700">
                                    {dictionary.publicProductsPage?.viewAllProducts || 'Alle Produkte ansehen'}
                                </Link>
                            </div>
                        ) : (
                            <ProductGridClient
                                urunler={urunler}
                                locale={locale}
                                kategoriAdlariMap={kategoriAdlariMap}
                                kategoriParentMap={kategoriParentMap}
                                sablonMap={sablonMap}
                                isLoggedIn={isLoggedIn}
                                partnerTier={partnerTier}
                                bestsellerUrunler={!seciliKategoriSlug && !sp.altKategori && !searchQuery ? bestsellerUrunler : []}
                                featuredUrunler={!seciliKategoriSlug && !sp.altKategori && !searchQuery ? featuredUrunler : []}
                                searchQuery={searchQuery}
                                geschmackCounts={geschmackCounts}
                                geschmackFilter={geschmackFilter}
                                aktiveMerkmale={aktifMerkmale}
                                loginHref={`/${locale}/login`}
                                pagination={{
                                    page: clampedPage,
                                    perPage,
                                    total: totalCount,
                                    kategori: seciliKategoriSlug,
                                    query: currentQuery,
                                    basePath: `/${locale}/products`,
                                }}
                                dictionary={dictionary}
                            />
                        )}
                    </div>
                </div>
            </div>
            
            {/* SEO & GEO FAQ Section */}
            <div className="mt-16 py-16 relative">
                <div className="absolute inset-0 bg-stone-100/50 backdrop-blur-3xl -skew-y-2 origin-top-left -z-10" />
                <div className="container mx-auto px-4 max-w-4xl relative z-10">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-extrabold text-stone-900 mb-4 tracking-tight">{locale === 'tr' ? 'Sıkça Sorulan Sorular' : 'Frequently Asked Questions'}</h2>
                        <p className="text-stone-500 text-sm max-w-xl mx-auto">
                            {locale === 'tr' ? 'Kahve şurupları ve pastacılık ürünlerimiz hakkında merak edilenler' : 'Frequently asked questions about our coffee syrups and pastry products'}
                        </p>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 hover:-translate-y-1 transition-transform duration-300">
                            <h3 className="font-bold text-stone-900 text-lg mb-3 flex items-center gap-2"><span className="text-amber-500 text-xl">•</span> {locale === 'tr' ? 'Fo kahve şurubu çeşitleri nelerdir?' : 'What are the varieties of Fo coffee syrup?'}</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                {locale === 'tr' ? 'Fo markası, kafeler ve baristalar için geniş bir şurup yelpazesi sunar. En çok tercih edilen aromalar arasında Vanilya, Karamel, Fındık, Çikolata, İrlanda Kremi, Nane, Çilek ve Beyaz Çikolata bulunur.' : 'The Fo brand offers a wide range of syrups for cafes and baristas. The most preferred flavors include Vanilla, Caramel, Hazelnut, Chocolate, Irish Cream, Mint, Strawberry, and White Chocolate.'}
                            </p>
                        </div>
                        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 hover:-translate-y-1 transition-transform duration-300">
                            <h3 className="font-bold text-stone-900 text-lg mb-3 flex items-center gap-2"><span className="text-amber-500 text-xl">•</span> {locale === 'tr' ? 'Kafeler için en çok tercih edilen Fo şurup aromaları hangileridir?' : 'Which Fo syrup flavors are most preferred for cafes?'}</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                {locale === 'tr' ? 'Baristaların imza kahveler yaratmak için en sık kullandığı şuruplar Karamel, Vanilya ve Fındık şuruplarıdır. Soğuk içecekler ve kokteyller için ise Blue Curaçao, Grenadine ve Meyve Püreleri yoğun talep görmektedir.' : 'The syrups most frequently used by baristas to create signature coffees are Caramel, Vanilla, and Hazelnut. For cold drinks and cocktails, Blue Curaçao, Grenadine, and Fruit Purees are in high demand.'}
                            </p>
                        </div>
                        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 hover:-translate-y-1 transition-transform duration-300">
                            <h3 className="font-bold text-stone-900 text-lg mb-3 flex items-center gap-2"><span className="text-amber-500 text-xl">•</span> {locale === 'tr' ? 'Almanya\'da toptan Fo şurubu nereden alınır?' : 'Where can I buy wholesale Fo syrup in Germany?'}</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                {locale === 'tr' ? 'ElysonSweets, Almanya başta olmak üzere Avrupa\'daki HORECA (Otel, Restoran, Kafe) işletmelerine toptan Fo şurubu tedariki sağlamaktadır. Uygun fiyatlar ve hızlı sevkiyat ile orijinal ürünleri sitemizden sipariş edebilirsiniz.' : 'ElysonSweets provides wholesale Fo syrup supply to HORECA (Hotel, Restaurant, Cafe) businesses in Europe, primarily in Germany. You can order original products from our site with affordable prices and fast shipping.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
