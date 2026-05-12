// src/app/[locale]/(public)/products/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
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
import { cookies } from 'next/headers';
import { FiPackage, FiMail } from 'react-icons/fi';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
    params
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const dictionary = await getDictionary(locale as any);
    return {
        title: dictionary.seo?.products?.title || 'B2B Produktkatalog | Elysion Sweets',
        description: dictionary.seo?.products?.description || '',
        openGraph: {
            title: dictionary.seo?.products?.title || 'B2B Produktkatalog | Elysion Sweets',
            description: dictionary.seo?.products?.description || '',
            locale,
            type: 'website',
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
        q?: string;
        page?: string;
        limit?: string;
        segment?: string;
    }>;
}) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { locale } = await params;
    const sp = await searchParams;

    const page = Math.max(1, Number.parseInt(sp.page || '1') || 1);
    const perPage = Math.min(48, Math.max(12, Number.parseInt(sp.limit || '24') || 24));

    const altKategoriFilter = sp.altKategori;
    const segmentFilter = sp.segment; // 'cafe' | 'hotel' | 'patisserie' | 'dessertbar'

    let seciliKategoriSlug: string | undefined;
    if (sp.kategori && sp.kategori.toLowerCase() !== 'null' && !isPublicCategorySlugHidden(sp.kategori)) {
        seciliKategoriSlug = sp.kategori;
    }

    // ── Auth check — detect if user is a logged-in partner ───────────────────
    let isLoggedIn = false;
    let partnerTier: string | undefined;
    let partnerFirmaId: string | undefined;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        isLoggedIn = true;
        // Fetch their profil and linked firma to get pricing tier
        const { data: profil } = await supabase
            .from('profiller')
            .select('firma_id')
            .eq('id', user.id)
            .maybeSingle();

        if (profil?.firma_id) {
            partnerFirmaId = profil.firma_id;
            const { data: firma } = await (supabase as any)
                .from('firmalar')
                .select('pricing_tier')
                .eq('id', profil.firma_id)
                .maybeSingle();
            partnerTier = firma?.pricing_tier ?? undefined;
        }
    }

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

    // Category product counts (includes subcategory products in parent count)
    const categoryProductCounts: Record<string, number> = {};
    const kategoriMap = new Map(kategoriler.map(k => [k.id, k.ust_kategori_id]));
    tumUrunler.forEach((u: any) => {
        const catId = u.kategori_id;
        if (!catId) return;
        categoryProductCounts[catId] = (categoryProductCounts[catId] || 0) + 1;
        const parentId = kategoriMap.get(catId);
        if (parentId) categoryProductCounts[parentId] = (categoryProductCounts[parentId] || 0) + 1;
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
        koli_ici_adet, palet_ici_adet, palet_ici_koli_adet,
        stok_kodu, ean_gtin, stok_miktari, created_at,
        lagertemperatur_min_celsius, lagertemperatur_max_celsius,
        mindest_bestellmenge, mindest_bestellmenge_einheit,
        zertifikate, haltbarkeit_monate, lieferzeit_werktage, lojistik_sinifi,
        satis_fiyati_musteri, satis_fiyati_toptanci, satis_fiyati_alt_bayi,
        produktdatenblatt_url
    `;

    let urunlerQuery = (supabase as any)
        .from('urunler')
        .select(productSelectFields, { count: 'exact' })
        .eq('aktif', true);

    // Try to fetch is_bestseller/is_featured (may not exist yet)
    // We handle this gracefully — if missing, defaults to false

    if (filtrelenecekKategoriIdleri.length > 0) {
        urunlerQuery = urunlerQuery.in('kategori_id', filtrelenecekKategoriIdleri);
    }

    const urunlerRes = await urunlerQuery.order('ad', { ascending: true });

    // Filter hidden categories
    let sortedData: any[] = (urunlerRes.data || []).filter(
        (u: any) => !hiddenKategoriIds.has(u.kategori_id ?? '')
    );

    // Sort: category order → rating → name
    const kategoriById = new Map(kategoriler.map(k => [k.id, k]));
    const getRootSlug = (catId?: string | null) => {
        let cur = catId ? kategoriById.get(catId) : null;
        let guard = 0;
        while (cur?.ust_kategori_id && guard < 10) { cur = kategoriById.get(cur.ust_kategori_id) || null; guard++; }
        return cur?.slug || null;
    };

    if (sortedData.length > 0) {
        sortedData = [...sortedData].sort((a: any, b: any) => {
            const ai = visibleMainCategoryOrder.indexOf(getRootSlug(a.kategori_id) as any);
            const bi = visibleMainCategoryOrder.indexOf(getRootSlug(b.kategori_id) as any);
            const sa = ai === -1 ? 999 : ai;
            const sb = bi === -1 ? 999 : bi;
            if (sa !== sb) return sa - sb;
            const pa = a.ortalama_puan || 0, pb = b.ortalama_puan || 0;
            if (pa !== pb) return pb - pa;
            return String(a.ad?.[locale] || a.ad?.de || '').localeCompare(String(b.ad?.[locale] || b.ad?.de || ''));
        });
    }

    const from = (page - 1) * perPage;
    const paginatedData = sortedData.slice(from, from + perPage);
    const totalCount = sortedData.length;
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

    let seciliKategoriAdi = 'Alle Produkte';
    if (seciliKategoriSlug) {
        const sk = kategoriler.find(k => k.slug === seciliKategoriSlug);
        if (sk) seciliKategoriAdi = sk.ad?.[locale] || sk.ad?.['de'] || seciliKategoriAdi;
    }

    const buildProductsHref = (p: Record<string, string | undefined>) => {
        const q = new URLSearchParams();
        Object.entries(p).forEach(([k, v]) => { if (v) q.set(k, v); });
        const qs = q.toString();
        return `/${locale}/products${qs ? `?${qs}` : ''}`;
    };

    const currentQuery = {
        kategori: seciliKategoriSlug,
        altKategori: sp.altKategori,
    };

    const activeFilterCount = [seciliKategoriSlug, sp.altKategori].filter(Boolean).length;

    return (
        <div className="min-h-screen bg-slate-50">

            {/* ── Page Header ─────────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200">
                <div className="container mx-auto px-4 sm:px-8 py-5">

                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                                {locale === 'de' ? 'B2B Großhandels-Katalog' : 'B2B Toptan Katalog'}
                            </p>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                                {locale === 'de' ? 'Sortiment für Profi-Küchen & Gastronomie' : 'Profesyonel Mutfaklar İçin Ürün Gamı'}
                            </h1>
                            <p className="mt-1 text-sm text-slate-500 max-w-xl">
                                {locale === 'de'
                                    ? 'Tiefkühl-Desserts, Sirupe, Kaffee und Backzutaten – direkt für Cafés, Hotels und Patisserien.'
                                    : 'Donuk tatlılar, şuruplar, kahve ve pastane malzemeleri.'}
                            </p>
                        </div>

                        <div className="flex flex-col items-end gap-2 self-start sm:self-auto">
                            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                {totalAllProducts} {locale === 'de' ? 'Artikel im Sortiment' : 'ürün katalogda'}
                            </div>
                            <a href={`mailto:info@elysonsweets.de?subject=${encodeURIComponent('Preisanfrage / B2B Katalog')}`}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-slate-400 hover:shadow-sm transition-all">
                                <FiMail size={12} /> {locale === 'de' ? 'Preisanfrage' : 'Fiyat Teklifi'}
                            </a>
                        </div>
                    </div>

                    {/* ── Business Segment Quick Filters ────────────────────── */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                            {locale === 'de' ? 'Für Ihr Geschäft' : 'İşletmenize Göre'}
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {[
                                {
                                    icon: '☕',
                                    label: { de: 'Café & Bistro', tr: 'Kafe & Bistro' },
                                    desc:  { de: 'Sirupe, Kaffee, Torten', tr: 'Şurup, kahve, pasta' },
                                    href: buildProductsHref({ kategori: 'ho-re-ca-icecekler-soslar' }),
                                    active: seciliKategoriSlug === 'ho-re-ca-icecekler-soslar',
                                },
                                {
                                    icon: '🏨',
                                    label: { de: 'Hotel & Catering', tr: 'Otel & Catering' },
                                    desc:  { de: 'Portionsdesserts & Premium', tr: 'Porsiyon tatlılar' },
                                    href: buildProductsHref({ kategori: 'dondurmacılık' }),
                                    active: seciliKategoriSlug === 'dondurmacılık',
                                },
                                {
                                    icon: '🎂',
                                    label: { de: 'Konditorei & Bäckerei', tr: 'Pastane & Fırın' },
                                    desc:  { de: 'Cheesecakes, Backzutaten', tr: 'Cheesecake, pastane' },
                                    href: buildProductsHref({ kategori: 'pastalar-kekler' }),
                                    active: seciliKategoriSlug === 'pastalar-kekler',
                                },
                                {
                                    icon: '🍦',
                                    label: { de: 'Dessert-Bar', tr: 'Dessert Bar' },
                                    desc:  { de: 'Portionsdesserts & Eis', tr: 'Porsiyon tatlı, dondurma' },
                                    href: buildProductsHref({ kategori: 'kurabiyeler-muffinler' }),
                                    active: seciliKategoriSlug === 'kurabiyeler-muffinler',
                                },
                            ].map(seg => (
                                <Link key={seg.icon} href={seg.href}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all flex-shrink-0
                                        ${seg.active
                                            ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:shadow-sm'}`}>
                                    <span className="text-lg leading-none">{seg.icon}</span>
                                    <div>
                                        <p className={`text-xs font-semibold leading-tight ${seg.active ? 'text-white' : 'text-slate-800'}`}>
                                            {(seg.label as any)[locale] || seg.label.de}
                                        </p>
                                        <p className={`text-[10px] leading-tight mt-0.5 hidden sm:block ${seg.active ? 'text-slate-300' : 'text-slate-400'}`}>
                                            {(seg.desc as any)[locale] || seg.desc.de}
                                        </p>
                                    </div>
                                </Link>
                            ))}
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
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                                {locale === 'de' ? 'Kategorien' : 'Kategoriler'}
                            </p>
                            <div className="space-y-0.5">
                                <Link href={buildProductsHref({})}
                                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-sm transition-colors
                                        ${!seciliKategoriSlug ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}>
                                    <span>{locale === 'de' ? 'Alle Kategorien' : 'Tüm Kategoriler'}</span>
                                    <span className="text-[10px] text-slate-400">{totalAllProducts}</span>
                                </Link>

                                {visibleKategoriler
                                    .filter(k => !k.ust_kategori_id)
                                    .sort((a, b) => {
                                        const ai = visibleMainCategoryOrder.indexOf((a.slug ?? '') as any);
                                        const bi = visibleMainCategoryOrder.indexOf((b.slug ?? '') as any);
                                        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
                                    })
                                    .map(k => {
                                        const count = categoryProductCounts[k.id] || 0;
                                        if (!count) return null;
                                        const isSelected = seciliKategoriSlug === k.slug;
                                        const subKats = visibleKategoriler.filter(sk => sk.ust_kategori_id === k.id && (categoryProductCounts[sk.id] || 0) > 0);
                                        return (
                                            <div key={k.id}>
                                                <Link href={buildProductsHref({ kategori: k.slug || undefined })}
                                                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-sm transition-colors
                                                        ${isSelected ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}>
                                                    <span className="truncate">{getLocalizedName(k.ad, locale as any)}</span>
                                                    <span className="text-[10px] text-slate-400 ml-1 flex-shrink-0">{count}</span>
                                                </Link>
                                                {isSelected && subKats.length > 0 && (
                                                    <div className="ml-3 mt-0.5 space-y-0.5 border-l border-slate-200 pl-2">
                                                        {subKats.map(sk => (
                                                            <Link key={sk.id}
                                                                href={buildProductsHref({ kategori: k.slug || undefined, altKategori: sk.slug || undefined })}
                                                                className={`flex items-center justify-between w-full px-2 py-1 rounded text-xs transition-colors
                                                                    ${sp.altKategori === sk.slug ? 'text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}>
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

                        {/* Filter zurücksetzen */}
                        {activeFilterCount > 0 && (
                            <Link href={`/${locale}/products`}
                                className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:border-red-300 hover:text-red-500 transition-colors">
                                ✕ {locale === 'de' ? 'Filter zurücksetzen' : 'Filtreleri temizle'}
                            </Link>
                        )}
                    </aside>

                    {/* ── Product area ────────────────────────────────────────── */}
                    <div className="flex-1 min-w-0">

                        {/* Mobile: horizontal scrollable category chips */}
                        <div className="flex gap-1.5 mb-4 lg:hidden overflow-x-auto pb-1 scrollbar-hide">
                            <Link href={buildProductsHref({})}
                                className={`px-3 py-1.5 text-xs rounded-lg font-medium border whitespace-nowrap transition-colors flex-shrink-0
                                    ${!seciliKategoriSlug ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                                {locale === 'de' ? 'Alle' : 'Tümü'} ({totalAllProducts})
                            </Link>
                            {visibleKategoriler
                                .filter(k => !k.ust_kategori_id && (categoryProductCounts[k.id] || 0) > 0)
                                .sort((a, b) => {
                                    const ai = visibleMainCategoryOrder.indexOf((a.slug ?? '') as any);
                                    const bi = visibleMainCategoryOrder.indexOf((b.slug ?? '') as any);
                                    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
                                })
                                .map(k => (
                                    <Link key={k.id}
                                        href={buildProductsHref({ kategori: k.slug || undefined })}
                                        className={`px-3 py-1.5 text-xs rounded-lg font-medium border whitespace-nowrap transition-colors flex-shrink-0
                                            ${seciliKategoriSlug === k.slug ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                                        {getLocalizedName(k.ad, locale as any)} ({categoryProductCounts[k.id] || 0})
                                    </Link>
                                ))}
                        </div>

                        {/* Active filter tags */}
                        {activeFilterCount > 0 && (
                            <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                                <span className="text-slate-500">{totalCount} {locale === 'de' ? 'Ergebnisse' : 'sonuç'}</span>
                                {seciliKategoriSlug && (
                                    <Link href={buildProductsHref({ ...currentQuery, kategori: undefined, altKategori: undefined })}
                                        className="inline-flex items-center gap-1 bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium hover:bg-slate-300">
                                        {seciliKategoriAdi} ✕
                                    </Link>
                                )}
                                <Link href={`/${locale}/products`} className="text-slate-400 hover:text-slate-600 underline ml-1">
                                    {locale === 'de' ? 'Alle Filter zurücksetzen' : 'Filtreleri temizle'}
                                </Link>
                            </div>
                        )}

                        {urunler.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                                <FiPackage className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm font-medium text-slate-600">
                                    {locale === 'de' ? 'Keine Produkte gefunden' : 'Ürün bulunamadı'}
                                </p>
                                <Link href={`/${locale}/products`} className="mt-3 inline-flex text-xs text-slate-500 underline hover:text-slate-700">
                                    {locale === 'de' ? 'Alle Produkte ansehen' : 'Tüm ürünleri gör'}
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
                                bestsellerUrunler={!seciliKategoriSlug && !sp.altKategori ? bestsellerUrunler : []}
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
        </div>
    );
}
