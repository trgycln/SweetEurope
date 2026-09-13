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
import { FiPackage, FiMail, FiX } from 'react-icons/fi';
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
    let perPage = Math.min(48, Math.max(12, Number.parseInt(sp.limit || '24') || 24));

    const altKategoriFilter = sp.altKategori;
    const geschmackFilter = sp.geschmack;
    const searchQuery = sp.q?.trim() || '';
    const segmentFilter = sp.segment; // 'cafe' | 'hotel' | 'patisserie' | 'dessertbar'
    const aktifMerkmale = sp.merkmal ? sp.merkmal.split(',').filter(Boolean) : [];
    // Removed gamFilter

    let seciliKategoriSlug: string | undefined;
    if (sp.kategori && sp.kategori.toLowerCase() !== 'null' && !isPublicCategorySlugHidden(sp.kategori)) {
        seciliKategoriSlug = sp.kategori;
        // Kategori seçiliyse (veya alt kategori), ürünleri gruplayabilmek için tümünü tek sayfada gösteriyoruz (Max 1000)
        perPage = 1000;
    }

    // Auth moved to client component to enable static caching of this page
    let isLoggedIn = undefined;
    let partnerTier = undefined;

    const [dictionary, kategorilerRes, sablonlarRes] = await Promise.all([
        getDictionary(locale as any),
        supabase.from('kategoriler').select('id, ad, slug, ust_kategori_id'),
        supabase.from('kategori_ozellik_sablonlari').select('kategori_id, alan_adi, gosterim_adi, sira'),
    ]);

    const kategoriler: Kategori[] = (kategorilerRes.data as any) || [];
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
        cafe:       { kategori: undefined },
        hotel:      { lagerung: 'tiefkuehl' },
        patisserie: { kategori: 'cakes-and-tarts' },
        dessertbar: { lagerung: 'tiefkuehl' },
    };

    // Helper to get all descendant category IDs recursively
    const getAllDescendantIds = (catId: string, allCats: Kategori[]): string[] => {
        const ids = [catId];
        const directChildren = allCats.filter(k => k.ust_kategori_id === catId);
        for (const child of directChildren) {
            ids.push(...getAllDescendantIds(child.id, allCats));
        }
        return ids;
    };

    const CATEGORY_SLUG_ALIASES: Record<string, string> = {
        'coffee': 'syrups',
        'drinks': 'powdered-beverages',
        'cocktail-syrups': 'flavored-cocktail-syrups',
        'premium-syrups': 'premium-cocktail-syrups',
        'fruited-sauces': 'fruit-sauces',
        'powder-drinks': 'powdered-beverages',
        'sauces': 'cafe-bar-sauces',
        'ice-cream': 'ice-cream-gelato',
        'dondurmacilik': 'ice-cream-gelato',
        'pastacilik': 'pastry-bakery',
        'pastacilik-ic-dolgular-dekorasyon': 'pastry-bakery',
    };

    // Resolve selected category + IDs to filter
    let filtrelenecekKategoriIdleri: string[] = [];
    let isCategoryFilterActive = false;

    if (seciliKategoriSlug) {
        isCategoryFilterActive = true;
        const targetSlug = CATEGORY_SLUG_ALIASES[seciliKategoriSlug] || seciliKategoriSlug;
        const anaKategori = visibleKategoriler.find(
            k => k.slug === targetSlug || k.slug === seciliKategoriSlug || k.id === seciliKategoriSlug
        );

        if (anaKategori) {
            if (altKategoriFilter) {
                const targetAltSlug = CATEGORY_SLUG_ALIASES[altKategoriFilter] || altKategoriFilter;
                const altKat = visibleKategoriler.find(
                    k => k.slug === targetAltSlug || k.slug === altKategoriFilter || k.id === altKategoriFilter
                );
                if (altKat) {
                    filtrelenecekKategoriIdleri = getAllDescendantIds(altKat.id, visibleKategoriler);
                } else {
                    filtrelenecekKategoriIdleri = getAllDescendantIds(anaKategori.id, visibleKategoriler);
                }
            } else {
                filtrelenecekKategoriIdleri = getAllDescendantIds(anaKategori.id, visibleKategoriler);
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
        satis_fiyati_musteri, satis_fiyati_toptanci, satis_fiyati_palet, satis_fiyati_alt_bayi,
        produktdatenblatt_url
    `;

    let sortedData: any[] = [];
    let totalCount = 0;

    let urunlerQuery = (supabase as any)
        .from('urunler')
        .select(productSelectFields, { count: 'exact' })
        .eq('aktif', true);

    if (isCategoryFilterActive) {
        if (filtrelenecekKategoriIdleri.length > 0) {
            urunlerQuery = urunlerQuery.in('kategori_id', filtrelenecekKategoriIdleri);
        } else {
            urunlerQuery = urunlerQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        }
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
            satis_fiyati_musteri, satis_fiyati_toptanci, satis_fiyati_palet, satis_fiyati_alt_bayi,
            created_at, mindest_bestellmenge, mindest_bestellmenge_einheit, aktif`;
        let retryQuery = supabase.from('urunler').select(minimalFields).eq('aktif', true);
        if (isCategoryFilterActive) {
            if (filtrelenecekKategoriIdleri.length > 0) {
                retryQuery = retryQuery.in('kategori_id', filtrelenecekKategoriIdleri);
            } else {
                retryQuery = retryQuery.eq('id', '00000000-0000-0000-0000-000000000000');
            }
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
    if (!seciliKategoriSlug && !sp.altKategori && !searchQuery) {
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
    }

    let featuredUrunler: Urun[] = [];
    if (!seciliKategoriSlug && !sp.altKategori && !searchQuery) {
        try {
            let featuredQuery = (supabase as any)
                .from('urunler')
                .select(productSelectFields)
                .eq('aktif', true)
                .eq('is_featured', true);

            const { data: featuredData } = await featuredQuery
                .order('featured_sira', { ascending: true });
            featuredUrunler = (featuredData || []).filter(
                (u: any) => !hiddenKategoriIds.has(u.kategori_id ?? '')
            ) as unknown as Urun[];
        } catch {
            featuredUrunler = [];
        }
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
        const targetSlug = CATEGORY_SLUG_ALIASES[seciliKategoriSlug] || seciliKategoriSlug;
        const sk = kategoriler.find(k => k.slug === targetSlug || k.slug === seciliKategoriSlug || k.id === seciliKategoriSlug);
        if (sk) seciliKategoriAdi = sk.ad?.[locale] || sk.ad?.['de'] || seciliKategoriAdi;
    }

    // Aktif geschmack ve merkmal filtreleri her zaman korunur, p ile override edilebilir
    const buildProductsHref = (p: Record<string, string | undefined>) => {
        const q = new URLSearchParams();
        if (geschmackFilter && !('geschmack' in p)) q.set('geschmack', geschmackFilter);
        if (sp.merkmal && !('merkmal' in p)) q.set('merkmal', sp.merkmal);

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

    const activeFilterCount = [seciliKategoriSlug, sp.altKategori].filter(Boolean).length;

    return (
        <div className="min-h-screen flex flex-col font-sans bg-[#FBF9F5]">

            {/* ── Page Header ─────────────────────────────────────────────── */}
            <div className="border-b border-stone-200/70 sticky top-0 z-30 shadow-xs relative overflow-hidden bg-white/85 backdrop-blur-md">
                
                <div className="container mx-auto px-4 sm:px-8 py-6 relative z-10">

                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-2">
                                {dictionary.publicProductsPage?.b2bCatalogLabel || 'B2B Großhandels-Katalog'}
                            </p>
                            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 tracking-tight">
                                {dictionary.publicProductsPage?.heroTitle || 'Sortiment für Profi-Küchen & Gastronomie'}
                            </h1>
                            <p className="mt-2.5 text-sm text-stone-600 max-w-xl leading-relaxed">
                                {dictionary.publicProductsPage?.heroDescription || 'Tiefkühl-Desserts, Sirupe, Kaffee und Backzutaten – direkt für Cafés, Hotels und Patisserien.'}
                            </p>
                        </div>

                        <div className="flex flex-col items-end gap-2 self-start sm:self-auto mt-2 sm:mt-0">
                            <div className="flex items-center gap-2 text-xs text-stone-700 bg-white border border-stone-200 shadow-xs rounded-xl px-4 py-2.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-xs" />
                                {totalAllProducts} {dictionary.publicProductsPage?.totalProductsInCatalog || 'Artikel im Sortiment'}
                            </div>
                            <Link href={`/${locale}/contact?subject=${encodeURIComponent('Preisanfrage / B2B Katalog')}`}
                                className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-stone-900 shadow-xs rounded-xl px-5 py-2.5 hover:bg-stone-800 transition-all duration-200">
                                <FiMail size={14} className="text-amber-400" /> {dictionary.publicProductsPage?.priceRequest || 'Preisanfrage'}
                            </Link>
                        </div>
                    </div>

                </div>
            </div>

            {/* ── Main: Sidebar + Grid ─────────────────────────────────────── */}
            <div className="container mx-auto px-4 sm:px-8 py-8">
                <div className="flex gap-6">

                    {/* ── Control Panel (Sidebar) ─────────────────────────────────────── */}
                    <aside className="hidden lg:flex flex-col gap-6 w-64 flex-shrink-0 p-5 bg-white border border-stone-200/80 shadow-xs rounded-2xl sticky top-28">

                        {/* Kategorien — real DB categories */}
                        <div className="relative">
                            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-stone-400 mb-4 ml-1 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                                {dictionary.publicProductsPage?.categories || 'Kategorien'}
                            </p>
                            <div className="space-y-1">
                                <Link href={buildProductsHref({})}
                                    className={`relative flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs transition-all duration-200
                                        ${!seciliKategoriSlug ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200/80 shadow-xs' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900 border border-transparent'}`}>
                                    <span className="relative z-10 flex items-center gap-2">
                                        <span className={`w-1 h-3 rounded-full transition-all duration-200 ${!seciliKategoriSlug ? 'bg-amber-500' : 'bg-stone-300'}`}></span>
                                        {dictionary.publicProductsPage?.allCategories || (locale === 'tr' ? 'Tüm Kategoriler' : locale === 'en' ? 'All Categories' : locale === 'ar' ? 'جميع الفئات' : 'Alle Kategorien')}
                                    </span>
                                    <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-md ${!seciliKategoriSlug ? 'bg-amber-100/80 text-amber-900' : 'bg-stone-100 text-stone-500'}`}>{totalAllProducts}</span>
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
                                        const targetSelectedSlug = CATEGORY_SLUG_ALIASES[seciliKategoriSlug || ''] || seciliKategoriSlug;
                                        const isSelected = seciliKategoriSlug === k.slug || targetSelectedSlug === k.slug || seciliKategoriSlug === k.id;
                                        const subKats = visibleKategoriler.filter(sk => sk.ust_kategori_id === k.id && (categoryProductCounts[sk.id] || 0) > 0);
                                        return (
                                            <div key={k.id} className="relative">
                                                <Link href={buildProductsHref({ kategori: k.slug || undefined })}
                                                    className={`relative flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs transition-all duration-200
                                                        ${isSelected ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200/80 shadow-xs' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900 border border-transparent'}`}>
                                                    <span className="relative z-10 flex items-center gap-2 pr-2 truncate">
                                                        <span className={`w-1 h-3 rounded-full transition-all duration-200 ${isSelected ? 'bg-amber-500' : 'bg-stone-300'}`}></span>
                                                        <span className="leading-tight truncate">{getLocalizedName(k.ad, locale as any)}</span>
                                                    </span>
                                                    <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-md flex-shrink-0 ${isSelected ? 'bg-amber-100/80 text-amber-900' : 'bg-stone-100 text-stone-500'}`}>{count}</span>
                                                </Link>
                                                {subKats.length > 0 && (
                                                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-stone-200 pl-3 py-1">
                                                        {subKats.map(sk => (
                                                            <Link key={sk.id}
                                                                href={buildProductsHref({ kategori: k.slug || undefined, altKategori: sk.slug || undefined })}
                                                                className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-[11px] transition-all duration-200
                                                                    ${sp.altKategori === sk.slug ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200/60' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50 border border-transparent'}`}>
                                                                <span className="leading-tight pr-2 flex items-center gap-1.5 truncate">
                                                                    <span className={`w-1 h-1 rounded-full ${sp.altKategori === sk.slug ? 'bg-amber-500' : 'bg-stone-300'}`}></span>
                                                                    {getLocalizedName(sk.ad, locale as any)}
                                                                </span>
                                                                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md ${sp.altKategori === sk.slug ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-500'}`}>{categoryProductCounts[sk.id] || 0}</span>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                        {(activeFilterCount > 0) && (
                            <Link href={`/${locale}/products`}
                                className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-xs font-mono font-medium text-red-600 hover:bg-red-100 transition-all duration-200 mt-2">
                                ✕ {dictionary.publicProductsPage?.resetFilter || 'FILTER RESET'}
                            </Link>
                        )}
                    </aside>

                    {/* ── Product area ────────────────────────────────────────── */}
                    <div className="flex-1 min-w-0">

                        <div className="flex gap-2 mb-6 lg:hidden overflow-x-auto pb-3 pt-1 px-1 scrollbar-hide snap-x">
                            <Link href={buildProductsHref({})}
                                className={`px-5 py-2.5 text-xs rounded-full font-bold whitespace-nowrap transition-all duration-500 shadow-sm snap-start
                                    ${!seciliKategoriSlug ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/20' : 'bg-white/5 backdrop-blur-md text-slate-400 border border-white/5 hover:bg-white/10 hover:text-white'}`}>
                                {dictionary.publicProductsPage?.all || 'Alle'} <span className="opacity-60 ml-1">{totalAllProducts}</span>
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
                                        className={`px-5 py-2.5 text-xs rounded-full font-bold whitespace-nowrap transition-all duration-500 shadow-sm snap-start
                                            ${seciliKategoriSlug === k.slug ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/20' : 'bg-white/5 backdrop-blur-md text-slate-400 border border-white/5 hover:bg-white/10 hover:text-white'}`}>
                                        {getLocalizedName(k.ad, locale as any)} <span className="opacity-60 ml-1">{categoryProductCounts[k.id] || 0}</span>
                                    </Link>
                                ))}
                        </div>

                        {/* Active filter tags */}
                        {activeFilterCount > 0 && (
                            <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                                <span className="text-slate-400">{totalCount} {dictionary.publicProductsPage?.results || 'Ergebnisse'}</span>
                                {seciliKategoriSlug && (
                                    <Link href={buildProductsHref({ ...currentQuery, kategori: undefined, altKategori: undefined })}
                                        className="inline-flex items-center gap-1 bg-white/10 text-white border border-white/20 px-2.5 py-1 rounded-md font-medium hover:bg-white/20 transition-colors">
                                        {seciliKategoriAdi} <FiX size={12}/>
                                    </Link>
                                )}

                                <Link href={`/${locale}/products`} className="text-slate-500 hover:text-white underline ml-1 transition-colors">
                                    {dictionary.publicProductsPage?.resetAllFilters || 'Alle Filter zurücksetzen'}
                                </Link>
                            </div>
                        )}

                        {urunler.length === 0 ? (
                            <div className="text-center py-16 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
                                <FiPackage className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <p className="text-base font-medium text-slate-300">
                                    {dictionary.publicProductsPage?.noProductsFound || 'Keine Produkte gefunden'}
                                </p>
                                <Link href={`/${locale}/products`} className="mt-4 inline-flex text-sm text-slate-500 underline hover:text-slate-300 transition-colors">
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
            <div className="mt-16 py-20 border-t border-stone-200/80 bg-white relative overflow-hidden">
                <div className="container mx-auto px-4 max-w-4xl relative z-10">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-serif font-bold text-stone-900 mb-3 tracking-tight">{locale === 'tr' ? 'Sıkça Sorulan Sorular' : 'Häufig gestellte Fragen (FAQ)'}</h2>
                        <p className="text-stone-500 text-sm max-w-xl mx-auto">
                            {locale === 'tr' ? 'Kahve şurupları ve pastacılık ürünlerimiz hakkında merak edilenler' : 'Wichtige Informationen zu unserem Sortiment, Konditionen und Belieferung.'}
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="bg-[#FAF9F6] p-6 rounded-2xl border border-stone-200/80 hover:shadow-sm transition-all duration-200">
                            <h3 className="font-semibold text-stone-900 text-base mb-2.5 flex items-center gap-2">
                                <span className="text-amber-600 text-lg">•</span> {locale === 'tr' ? 'Fo kahve şurubu çeşitleri nelerdir?' : 'Welche Sorten von Fo Sirup sind erhältlich?'}
                            </h3>
                            <p className="text-stone-600 text-sm leading-relaxed">
                                {locale === 'tr' ? 'Fo markası, kafeler ve baristalar için geniş bir şurup yelpazesi sunar. En çok tercih edilen aromalar arasında Vanilya, Karamel, Fındık, Çikolata, İrlanda Kremi, Nane, Çilek ve Beyaz Çikolata bulunur.' : 'Das Sortiment umfasst klassische Barista-Sirupe (Vanille, Karamell, Haselnuss, Schokolade), fruchtige Cocktailsirupe (Mango, Passionsfrucht, Erdbeere) sowie zuckerfreie Varianten in Gastronomie-Qualität.'}
                            </p>
                        </div>
                        <div className="bg-[#FAF9F6] p-6 rounded-2xl border border-stone-200/80 hover:shadow-sm transition-all duration-200">
                            <h3 className="font-semibold text-stone-900 text-base mb-2.5 flex items-center gap-2">
                                <span className="text-amber-600 text-lg">•</span> {locale === 'tr' ? 'Kafeler için en çok tercih edilen Fo şurup aromaları hangileridir?' : 'Welche Geschmacksrichtungen sind bei Cafés am beliebtesten?'}
                            </h3>
                            <p className="text-stone-600 text-sm leading-relaxed">
                                {locale === 'tr' ? 'Baristaların imza kahveler yaratmak için en sık kullandığı şuruplar Karamel, Vanilya ve Fındık şuruplarıdır. Soğuk içecekler ve kokteyller için ise Blue Curaçao, Grenadine ve Meyve Püreleri yoğun talep görmektedir.' : 'Für Kaffeespezialitäten sind Karamell, Vanille und Haselnuss die klaren Favoriten. Für Eistees, Mocktails und Cocktails werden Blue Curaçao, Wassermelone, Mango und Minze besonders stark nachgefragt.'}
                            </p>
                        </div>
                        <div className="bg-[#FAF9F6] p-6 rounded-2xl border border-stone-200/80 hover:shadow-sm transition-all duration-200">
                            <h3 className="font-semibold text-stone-900 text-base mb-2.5 flex items-center gap-2">
                                <span className="text-amber-600 text-lg">•</span> {locale === 'tr' ? 'Almanya\'da toptan Fo şurubu nereden alınır?' : 'Wie erfolgt die B2B-Bestellung und Lieferung in Deutschland?'}
                            </h3>
                            <p className="text-stone-600 text-sm leading-relaxed">
                                {locale === 'tr' ? 'ElysonSweets, Almanya başta olmak üzere Avrupa\'daki HORECA (Otel, Restoran, Kafe) işletmelerine toptan Fo şurubu tedariki sağlamaktadır. Uygun fiyatlar ve hızlı sevkiyat ile orijinal ürünleri sitemizden sipariş edebilirsiniz.' : 'ElysonSweets beliefert gewerbliche Kunden in Deutschland und der EU ab unserem Zentrallager in Köln. Bestellungen sind karton- oder palettenweise mit transparenten Staffelpreisen möglich.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
