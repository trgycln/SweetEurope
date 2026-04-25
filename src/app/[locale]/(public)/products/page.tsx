// src/app/[locale]/products/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/dictionaries';
import { ProductGridClient } from './product-grid-client';
import { getLocalizedName } from '@/lib/utils';
import {
    PUBLIC_VISIBLE_MAIN_CATEGORY_ORDER,
    buildHiddenPublicCategoryIds,
    isPublicCategorySlugHidden,
} from '@/lib/public-category-visibility';
import {
    PRODUCT_LINE_ORDER,
    PRODUCT_LINE_META,
    getProductLineLabel,
    inferProductLineFromCategoryId,
    isProductLineKey,
} from '@/lib/product-lines';
import Link from 'next/link';
import { type Kategori, type Urun } from './types';
import { cookies } from 'next/headers';
import { FiPackage, FiMail } from 'react-icons/fi';
import { LuThermometerSnowflake, LuThermometer, LuPackage2, LuShieldCheck } from 'react-icons/lu';
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

// ── Available certifications for filter ──────────────────────────────────────
const ZERTIFIKAT_FILTER_OPTIONS = [
    { key: 'Halal',   icon: '☪️', label: { de: 'Halal',       tr: 'Helal',    en: 'Halal' } },
    { key: 'Bio',     icon: '🌿', label: { de: 'Bio',          tr: 'Bio',      en: 'Organic' } },
    { key: 'IFS',     icon: '✓',  label: { de: 'IFS Food',     tr: 'IFS',      en: 'IFS Food' } },
    { key: 'Kosher',  icon: '✡️', label: { de: 'Kosher',       tr: 'Koşer',    en: 'Kosher' } },
    { key: 'Vegan_Zert', icon: '🌱', label: { de: 'Vegan zert.', tr: 'Vegan ser.', en: 'Vegan cert.' } },
    { key: 'Rainforest', icon: '🌲', label: { de: 'Rainforest',  tr: 'Rainforest', en: 'Rainforest' } },
];

const LAGERUNG_OPTIONS = [
    {
        key: undefined,
        label: { de: 'Alle Lagerarten', tr: 'Tüm Depolama', en: 'All storage types' },
        icon: null,
    },
    {
        key: 'tiefkuehl',
        label: { de: 'Tiefkühlware', tr: 'Derin Dondurucu', en: 'Frozen' },
        icon: 'snow',
        desc: { de: '≤ −18 °C', tr: '≤ −18 °C', en: '≤ −18 °C' },
    },
    {
        key: 'kuehlware',
        label: { de: 'Kühlware', tr: 'Soğutmalı', en: 'Chilled' },
        icon: 'cool',
        desc: { de: '2–8 °C', tr: '2–8 °C', en: '2–8 °C' },
    },
    {
        key: 'ambient',
        label: { de: 'Ambient / Trocken', tr: 'Kuru / Oda Sıcaklığı', en: 'Ambient / Dry' },
        icon: 'box',
        desc: { de: 'Raumtemperatur', tr: 'Oda sıcaklığı', en: 'Room temperature' },
    },
];

export default async function PublicUrunlerPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{
        kategori?: string;
        altKategori?: string;
        porsiyon?: string;
        hacim?: string;
        ozellik?: string;
        tat?: string;
        urunGami?: string;
        lagerung?: string;
        zertifikat?: string;
        page?: string;
        limit?: string;
    }>;
}) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { locale } = await params;
    const sp = await searchParams;

    const page = Math.max(1, Number.parseInt(sp.page || '1') || 1);
    const perPage = Math.min(48, Math.max(12, Number.parseInt(sp.limit || '24') || 24));

    const altKategoriFilter = sp.altKategori;
    const porsiyonFilter = sp.porsiyon;
    const hacimFilter = sp.hacim;
    const ozellikFilter = sp.ozellik;
    const tatFilter = sp.tat;
    const lagerungFilter = sp.lagerung;
    const zertifikatFilter = sp.zertifikat;
    const seciliUrunGami = isProductLineKey(sp.urunGami) ? sp.urunGami : undefined;

    let seciliKategoriSlug: string | undefined;
    if (sp.kategori && sp.kategori.toLowerCase() !== 'null' && !isPublicCategorySlugHidden(sp.kategori)) {
        seciliKategoriSlug = sp.kategori;
    }

    const [dictionary, kategorilerRes, sablonlarRes] = await Promise.all([
        getDictionary(locale as any),
        supabase.from('kategoriler').select('id, ad, slug, ust_kategori_id'),
        supabase.from('kategori_ozellik_sablonlari').select('kategori_id, alan_adi, gosterim_adi, sira'),
    ]);

    const kategoriler: Kategori[] = kategorilerRes.data || [];
    const hiddenKategoriIds = buildHiddenPublicCategoryIds(kategoriler);
    const visibleKategoriler = kategoriler.filter(k => !hiddenKategoriIds.has(k.id));

    const matchesSelectedProductLine = (categoryId?: string | null) => {
        if (!seciliUrunGami) return true;
        return inferProductLineFromCategoryId(kategoriler, categoryId) === seciliUrunGami;
    };
    const lineVisibleKategoriler = visibleKategoriler.filter(k => matchesSelectedProductLine(k.id));
    const visibleMainCategoryOrder = seciliUrunGami
        ? PRODUCT_LINE_META[seciliUrunGami].mainCategorySlugs.filter(slug =>
              PUBLIC_VISIBLE_MAIN_CATEGORY_ORDER.includes(slug as any)
          )
        : PUBLIC_VISIBLE_MAIN_CATEGORY_ORDER;

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

    // ── Fetch all products for counts + filter options ────────────────────────
    const { data: tumUrunlerData } = await supabase
        .from('urunler')
        .select('kategori_id, teknik_ozellikler, lagertemperatur_max_celsius, zertifikate, lojistik_sinifi')
        .eq('aktif', true);

    const tumUrunler = (tumUrunlerData || []).filter(
        (u: any) => !hiddenKategoriIds.has(u.kategori_id ?? '') && matchesSelectedProductLine(u.kategori_id)
    );
    const totalAllProducts = tumUrunler.length;

    // Unique portionen/hacim
    const uniquePorsiyonlar = new Set<number>();
    const uniqueHacimler = new Set<number>();
    tumUrunler.forEach((u: any) => {
        const t = u.teknik_ozellikler || {};
        if (t.dilim_adedi) { const v = parseInt(String(t.dilim_adedi)); if (!isNaN(v)) uniquePorsiyonlar.add(v); }
        if (t.kutu_ici_adet) { const v = parseInt(String(t.kutu_ici_adet)); if (!isNaN(v)) uniquePorsiyonlar.add(v); }
        const h = t.hacim_ml || t.hacim;
        if (h) { const v = parseInt(String(h).replace(/[^\d]/g, '')); if (!isNaN(v)) uniqueHacimler.add(v); }
    });
    const availablePorsiyonlar = Array.from(uniquePorsiyonlar).sort((a, b) => a - b);

    // Storage type counts
    function getStorageTypeFromData(u: any): 'tiefkuehl' | 'kuehlware' | 'ambient' {
        const tempMax = u.lagertemperatur_max_celsius;
        const loj = (u.lojistik_sinifi || '').toLowerCase();
        const t = u.teknik_ozellikler || {};
        if (tempMax !== null && tempMax !== undefined) {
            if (tempMax <= -10) return 'tiefkuehl';
            if (tempMax <= 10) return 'kuehlware';
            return 'ambient';
        }
        if (loj.includes('tiefkühl') || loj.includes('frozen')) return 'tiefkuehl';
        if (loj.includes('kühl') || loj.includes('chilled')) return 'kuehlware';
        if (t.tiefkuehl === true || t.tiefkuehl === 'true') return 'tiefkuehl';
        return 'ambient';
    }

    const storageCounts = { tiefkuehl: 0, kuehlware: 0, ambient: 0 };
    tumUrunler.forEach((u: any) => { storageCounts[getStorageTypeFromData(u)]++; });

    // Available certifications in current product set
    const availableZertifikate = new Set<string>();
    tumUrunler.forEach((u: any) => {
        if (Array.isArray(u.zertifikate)) u.zertifikate.forEach((z: string) => availableZertifikate.add(z));
    });

    // Category product counts
    const categoryProductCounts: Record<string, number> = {};
    const kategoriMap = new Map(kategoriler.map(k => [k.id, k.ust_kategori_id]));
    tumUrunler.forEach((u: any) => {
        const catId = u.kategori_id;
        if (!catId) return;
        const parentId = kategoriMap.get(catId);
        if (parentId) categoryProductCounts[parentId] = (categoryProductCounts[parentId] || 0) + 1;
        categoryProductCounts[catId] = (categoryProductCounts[catId] || 0) + 1;
    });

    // Resolve selected category
    let filtrelenecekKategoriIdleri: string[] = [];
    let seciliAnaKategoriId: string | undefined;
    if (seciliKategoriSlug) {
        const anaKategori = lineVisibleKategoriler.find(k => k.slug === seciliKategoriSlug);
        if (anaKategori) {
            if (altKategoriFilter) {
                const altKat = lineVisibleKategoriler.find(k => k.slug === altKategoriFilter);
                if (altKat) filtrelenecekKategoriIdleri.push(altKat.id);
            } else {
                filtrelenecekKategoriIdleri.push(anaKategori.id);
                lineVisibleKategoriler.filter(k => k.ust_kategori_id === anaKategori.id)
                    .forEach(ak => filtrelenecekKategoriIdleri.push(ak.id));
            }
            seciliAnaKategoriId = anaKategori.ust_kategori_id || anaKategori.id;
        }
    }

    // ── Main product query ────────────────────────────────────────────────────
    let urunlerQuery = supabase
        .from('urunler')
        .select(
            `id, ad, slug, ana_resim_url, galeri_resim_urls,
             kategori_id, ortalama_puan, degerlendirme_sayisi,
             teknik_ozellikler, aciklamalar, koli_ici_kutu_adet, birim_agirlik_kg,
             stok_kodu, ean_gtin,
             lagertemperatur_min_celsius, lagertemperatur_max_celsius,
             mindest_bestellmenge, mindest_bestellmenge_einheit,
             zertifikate, haltbarkeit_monate, lieferzeit_werktage, lojistik_sinifi`,
            { count: 'exact' }
        )
        .eq('aktif', true);

    if (filtrelenecekKategoriIdleri.length > 0) {
        urunlerQuery = urunlerQuery.in('kategori_id', filtrelenecekKategoriIdleri);
    }
    if (porsiyonFilter) {
        urunlerQuery = urunlerQuery.or(`teknik_ozellikler->>dilim_adedi.eq.${porsiyonFilter},teknik_ozellikler->>kutu_ici_adet.eq.${porsiyonFilter}`);
    }
    if (hacimFilter) {
        urunlerQuery = urunlerQuery.or(`teknik_ozellikler->>hacim_ml.eq.${hacimFilter},teknik_ozellikler->>hacim.eq.${hacimFilter}`);
    }

    let urunlerRes = await urunlerQuery.order('ad', { ascending: true });

    // Visibility + product line filter
    if (urunlerRes.data) {
        const visible = urunlerRes.data.filter(
            (u: any) => !hiddenKategoriIds.has(u.kategori_id ?? '') && matchesSelectedProductLine(u.kategori_id)
        );
        urunlerRes = { ...urunlerRes, data: visible, count: visible.length };
    }

    // Client-side filters
    if (urunlerRes.data && (ozellikFilter || tatFilter || lagerungFilter || zertifikatFilter)) {
        const filtered = urunlerRes.data.filter((u: any) => {
            const tekniks = u.teknik_ozellikler || {};

            if (ozellikFilter) {
                const raw = tekniks[ozellikFilter];
                const ok = raw === true || raw === 'true' || raw === 'yes' || raw === 'evet'
                    || (typeof raw === 'number' && raw > 0)
                    || (typeof raw === 'string' && raw.trim().length > 0);
                if (!ok) return false;
            }

            if (tatFilter) {
                const g = tekniks.geschmack;
                if (Array.isArray(g)) { if (!g.includes(tatFilter)) return false; }
                else if (g !== tatFilter) return false;
            }

            if (lagerungFilter) {
                if (getStorageTypeFromData(u) !== lagerungFilter) return false;
            }

            if (zertifikatFilter) {
                const zerts: string[] = u.zertifikate || [];
                if (!zerts.includes(zertifikatFilter)) return false;
            }

            return true;
        });
        urunlerRes = { ...urunlerRes, data: filtered, count: filtered.length };
    }

    // Sort: category order → rating → name
    const kategoriById = new Map(kategoriler.map(k => [k.id, k]));
    const getRootSlug = (catId?: string | null) => {
        let cur = catId ? kategoriById.get(catId) : null;
        let guard = 0;
        while (cur?.ust_kategori_id && guard < 10) { cur = kategoriById.get(cur.ust_kategori_id) || null; guard++; }
        return cur?.slug || null;
    };

    let sortedData = urunlerRes.data || [];
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

    let seciliKategoriAdi = pageContent.allProducts;
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
        urunGami: seciliUrunGami,
        kategori: seciliKategoriSlug,
        altKategori: sp.altKategori,
        porsiyon: sp.porsiyon,
        hacim: sp.hacim,
        ozellik: sp.ozellik,
        tat: sp.tat,
        lagerung: lagerungFilter,
        zertifikat: zertifikatFilter,
    };

    const L = {
        de: {
            b2bLabel: 'B2B Großhandels-Katalog',
            headline: 'Sortiment für Profi-Küchen & Gastronomie',
            subline: 'Tiefkühl-Desserts, Sirupe, Kaffee und Backzutaten – direkt für Cafés, Hotels und Patisserien.',
            itemsLabel: `${totalAllProducts} Artikel im Sortiment`,
            forBusiness: 'Für Ihr Geschäft',
            allLine: 'Alle Produktlinien',
            allCats: 'Alle Kategorien',
            prodLine: 'Produktlinie',
            categories: 'Kategorien',
            lagerung: 'Lagerung',
            zertifikate: 'Zertifikate & Labels',
            portionen: 'Portionen / Stück',
            clearAll: 'Alle Filter zurücksetzen',
            results: 'Ergebnisse',
            noProducts: 'Keine Produkte gefunden',
            viewAll: 'Alle Produkte ansehen',
            contactCta: 'Preisanfrage',
            contactEmail: 'info@sweetheaven.de',
        },
        tr: {
            b2bLabel: 'B2B Toptan Katalog',
            headline: 'Profesyonel Mutfaklar İçin Ürün Gamı',
            subline: 'Donuk tatlılar, şuruplar, kahve ve pastane malzemeleri — kafeler, oteller ve pastaneler için.',
            itemsLabel: `${totalAllProducts} ürün katalogda`,
            forBusiness: 'İşletmenize Göre',
            allLine: 'Tüm Ürün Gamı',
            allCats: 'Tüm Kategoriler',
            prodLine: 'Ürün Gamı',
            categories: 'Kategoriler',
            lagerung: 'Depolama Koşulu',
            zertifikate: 'Sertifikalar',
            portionen: 'Porsiyon / Adet',
            clearAll: 'Filtreleri temizle',
            results: 'sonuç',
            noProducts: 'Ürün bulunamadı',
            viewAll: 'Tüm ürünleri gör',
            contactCta: 'Fiyat Teklifi',
            contactEmail: 'info@sweetheaven.de',
        },
        en: {
            b2bLabel: 'B2B Wholesale Catalog',
            headline: 'Range for Professional Kitchens & Food Service',
            subline: 'Frozen desserts, syrups, coffee and bakery ingredients — for cafés, hotels and pastry shops.',
            itemsLabel: `${totalAllProducts} items in catalog`,
            forBusiness: 'For Your Business',
            allLine: 'All Product Lines',
            allCats: 'All Categories',
            prodLine: 'Product Line',
            categories: 'Categories',
            lagerung: 'Storage Type',
            zertifikate: 'Certifications',
            portionen: 'Portion / Unit',
            clearAll: 'Clear all filters',
            results: 'results',
            noProducts: 'No products found',
            viewAll: 'View all products',
            contactCta: 'Request Quote',
            contactEmail: 'info@sweetheaven.de',
        },
    } as const;
    const lc = (L as any)[locale] ?? L.de;
    const lk = (locale as keyof typeof L.de.de) ?? 'de';

    const activeFilterCount = [seciliKategoriSlug, seciliUrunGami, sp.altKategori, sp.porsiyon, lagerungFilter, zertifikatFilter].filter(Boolean).length;

    return (
        <div className="min-h-screen bg-slate-50">

            {/* ── Page Header ──────────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200">
                <div className="container mx-auto px-4 sm:px-8 py-5">

                    {/* Title row */}
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                                {lc.b2bLabel}
                            </p>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                                {lc.headline}
                            </h1>
                            <p className="mt-1 text-sm text-slate-500 max-w-xl">{lc.subline}</p>
                        </div>

                        <div className="flex flex-col items-end gap-2 self-start sm:self-auto">
                            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                {lc.itemsLabel}
                            </div>
                            <a href={`mailto:${lc.contactEmail}?subject=${encodeURIComponent('Preisanfrage / B2B Katalog')}`}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-slate-400 hover:shadow-sm transition-all">
                                <FiMail size={12} /> {lc.contactCta}
                            </a>
                        </div>
                    </div>

                    {/* ── Business Segment Quick Links ──────────────────────── */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">{lc.forBusiness}</p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                {
                                    icon: '☕',
                                    label: { de: 'Café & Bistro', tr: 'Kafe & Bistro', en: 'Café & Bistro' },
                                    desc:  { de: 'Sirupe, Kaffee, Torten & Barista-Essentials', tr: 'Şurup, kahve, pasta ve barista', en: 'Syrups, coffee, cakes & barista essentials' },
                                    href: buildProductsHref({ urunGami: 'barista-bakery-essentials' }),
                                    active: seciliUrunGami === 'barista-bakery-essentials',
                                },
                                {
                                    icon: '🏨',
                                    label: { de: 'Hotel & Catering', tr: 'Otel & Catering', en: 'Hotel & Catering' },
                                    desc:  { de: 'Portionsdesserts, Torten & Premium-Sirupe', tr: 'Porsiyon tatlılar, pastalar ve şuruplar', en: 'Portioned desserts, cakes & syrups' },
                                    href: buildProductsHref({ urunGami: 'frozen-desserts' }),
                                    active: seciliUrunGami === 'frozen-desserts',
                                },
                                {
                                    icon: '🎂',
                                    label: { de: 'Konditorei & Bäckerei', tr: 'Pastane & Fırın', en: 'Patisserie & Bakery' },
                                    desc:  { de: 'Cheesecakes, Backzutaten & Fertigböden', tr: 'Cheesecake, pastane malzemeleri', en: 'Cheesecakes, bakery ingredients' },
                                    href: buildProductsHref({ kategori: 'cakes-and-tarts' }),
                                    active: seciliKategoriSlug === 'cakes-and-tarts',
                                },
                                {
                                    icon: '🍦',
                                    label: { de: 'Dessert-Bar', tr: 'Dessert Bar', en: 'Dessert Bar' },
                                    desc:  { de: 'Portionsdesserts, Cups & Eis-Spezialitäten', tr: 'Porsiyon tatlı, kuplar ve dondurma', en: 'Portioned desserts, cups & frozen' },
                                    href: buildProductsHref({ lagerung: 'tiefkuehl' }),
                                    active: lagerungFilter === 'tiefkuehl' && !seciliUrunGami,
                                },
                            ].map(seg => (
                                <Link key={seg.icon} href={seg.href}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all
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

                        {/* Produktlinie */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{lc.prodLine}</p>
                            <div className="space-y-0.5">
                                <Link href={buildProductsHref({})}
                                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-sm transition-colors
                                        ${!seciliUrunGami ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}>
                                    <span>{lc.allLine}</span>
                                    <span className={`text-[10px] ${!seciliUrunGami ? 'text-slate-300' : 'text-slate-400'}`}>{totalAllProducts}</span>
                                </Link>
                                {PRODUCT_LINE_ORDER.map(line => (
                                    <Link key={line} href={buildProductsHref({ urunGami: line })}
                                        className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-sm transition-colors
                                            ${seciliUrunGami === line ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}>
                                        <span>{getProductLineLabel(line, locale as any)}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Kategorien */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{lc.categories}</p>
                            <div className="space-y-0.5">
                                <Link href={buildProductsHref({ urunGami: seciliUrunGami })}
                                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-sm transition-colors
                                        ${!seciliKategoriSlug ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}>
                                    <span>{lc.allCats}</span>
                                </Link>
                                {lineVisibleKategoriler
                                    .filter(k => !k.ust_kategori_id && visibleMainCategoryOrder.includes((k.slug ?? '') as any))
                                    .sort((a, b) => visibleMainCategoryOrder.indexOf((a.slug ?? '') as any) - visibleMainCategoryOrder.indexOf((b.slug ?? '') as any))
                                    .map(k => {
                                        const count = categoryProductCounts[k.id] || 0;
                                        const isSelected = seciliKategoriSlug === k.slug;
                                        const subKats = lineVisibleKategoriler.filter(sk => sk.ust_kategori_id === k.id);
                                        return (
                                            <div key={k.id}>
                                                <Link href={buildProductsHref({ urunGami: seciliUrunGami, kategori: k.slug || undefined })}
                                                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-sm transition-colors
                                                        ${isSelected ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}>
                                                    <span className="truncate">{getLocalizedName(k.ad, locale as any)}</span>
                                                    <span className="text-[10px] text-slate-400 ml-1 flex-shrink-0">{count}</span>
                                                </Link>
                                                {isSelected && subKats.length > 0 && (
                                                    <div className="ml-3 mt-0.5 space-y-0.5 border-l border-slate-200 pl-2">
                                                        {subKats.map(sk => (
                                                            <Link key={sk.id}
                                                                href={buildProductsHref({ urunGami: seciliUrunGami, kategori: k.slug || undefined, altKategori: sk.slug || undefined })}
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

                        {/* ── Lagerung ───────────────────────────────────────── */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{lc.lagerung}</p>
                            <div className="space-y-0.5">
                                {LAGERUNG_OPTIONS.map(opt => {
                                    const isActive = lagerungFilter === opt.key;
                                    const cnt = opt.key ? storageCounts[opt.key as keyof typeof storageCounts] : totalAllProducts;
                                    return (
                                        <Link key={opt.key ?? 'all'}
                                            href={buildProductsHref({ ...currentQuery, lagerung: opt.key, page: undefined })}
                                            className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-sm transition-colors
                                                ${isActive ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}>
                                            <span className="flex items-center gap-1.5">
                                                {opt.icon === 'snow' && <LuThermometerSnowflake size={12} className={isActive ? 'text-blue-300' : 'text-blue-500'} />}
                                                {opt.icon === 'cool' && <LuThermometer size={12} className={isActive ? 'text-cyan-300' : 'text-cyan-500'} />}
                                                {opt.icon === 'box' && <LuPackage2 size={12} className={isActive ? 'text-amber-300' : 'text-amber-500'} />}
                                                <span className="truncate">{(opt.label as any)[locale] || opt.label.de}</span>
                                            </span>
                                            {opt.key && (
                                                <span className={`text-[10px] ml-1 flex-shrink-0 ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>{cnt}</span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Zertifikate ────────────────────────────────────── */}
                        {ZERTIFIKAT_FILTER_OPTIONS.some(z => availableZertifikate.has(z.key)) && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{lc.zertifikate}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {ZERTIFIKAT_FILTER_OPTIONS.filter(z => availableZertifikate.has(z.key)).map(z => {
                                        const isActive = zertifikatFilter === z.key;
                                        return (
                                            <Link key={z.key}
                                                href={buildProductsHref({ ...currentQuery, zertifikat: isActive ? undefined : z.key, page: undefined })}
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold transition-colors
                                                    ${isActive
                                                        ? 'bg-teal-700 text-white border-teal-700'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400 hover:text-teal-700'}`}>
                                                <LuShieldCheck size={10} />
                                                {(z.label as any)[locale] || z.label.de}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Portionen ──────────────────────────────────────── */}
                        {availablePorsiyonlar.length > 0 && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{lc.portionen}</p>
                                <div className="flex flex-wrap gap-1">
                                    {availablePorsiyonlar.map(v => (
                                        <Link key={v}
                                            href={buildProductsHref({ ...currentQuery, porsiyon: sp.porsiyon === String(v) ? undefined : String(v), page: undefined })}
                                            className={`px-2 py-0.5 rounded border text-xs font-medium transition-colors
                                                ${sp.porsiyon === String(v)
                                                    ? 'bg-slate-800 text-white border-slate-800'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                                            {v}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Clear all ──────────────────────────────────────── */}
                        {activeFilterCount > 0 && (
                            <Link href={`/${locale}/products`}
                                className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:border-red-300 hover:text-red-500 transition-colors">
                                ✕ {lc.clearAll}
                            </Link>
                        )}
                    </aside>

                    {/* ── Product area ────────────────────────────────────────── */}
                    <div className="flex-1 min-w-0">

                        {/* Mobile category pills */}
                        <div className="flex flex-wrap gap-1.5 mb-4 lg:hidden">
                            <Link href={buildProductsHref({})}
                                className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors
                                    ${!seciliKategoriSlug && !seciliUrunGami && !lagerungFilter ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                                {locale === 'de' ? 'Alle' : 'All'} ({totalAllProducts})
                            </Link>
                            {lineVisibleKategoriler
                                .filter(k => !k.ust_kategori_id && visibleMainCategoryOrder.includes((k.slug ?? '') as any))
                                .sort((a, b) => visibleMainCategoryOrder.indexOf((a.slug ?? '') as any) - visibleMainCategoryOrder.indexOf((b.slug ?? '') as any))
                                .map(k => (
                                    <Link key={k.id}
                                        href={buildProductsHref({ urunGami: seciliUrunGami, kategori: k.slug || undefined })}
                                        className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors
                                            ${seciliKategoriSlug === k.slug ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                                        {getLocalizedName(k.ad, locale as any)} ({categoryProductCounts[k.id] || 0})
                                    </Link>
                                ))}
                        </div>

                        {/* Active filter tags */}
                        {activeFilterCount > 0 && (
                            <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                                <span className="text-slate-500">{totalCount} {lc.results}</span>
                                {seciliKategoriSlug && (
                                    <Link href={buildProductsHref({ ...currentQuery, kategori: undefined, altKategori: undefined })}
                                        className="inline-flex items-center gap-1 bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium hover:bg-slate-300">
                                        {seciliKategoriAdi} ✕
                                    </Link>
                                )}
                                {seciliUrunGami && (
                                    <Link href={buildProductsHref({ ...currentQuery, urunGami: undefined })}
                                        className="inline-flex items-center gap-1 bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium hover:bg-slate-300">
                                        {getProductLineLabel(seciliUrunGami, locale as any)} ✕
                                    </Link>
                                )}
                                {lagerungFilter && (
                                    <Link href={buildProductsHref({ ...currentQuery, lagerung: undefined })}
                                        className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium hover:bg-blue-200">
                                        {LAGERUNG_OPTIONS.find(o => o.key === lagerungFilter)?.label?.[locale as 'de' | 'tr' | 'en'] || lagerungFilter} ✕
                                    </Link>
                                )}
                                {zertifikatFilter && (
                                    <Link href={buildProductsHref({ ...currentQuery, zertifikat: undefined })}
                                        className="inline-flex items-center gap-1 bg-teal-100 text-teal-700 px-2 py-0.5 rounded font-medium hover:bg-teal-200">
                                        {zertifikatFilter} ✕
                                    </Link>
                                )}
                                <Link href={`/${locale}/products`} className="text-slate-400 hover:text-slate-600 underline ml-1">
                                    {lc.clearAll}
                                </Link>
                            </div>
                        )}

                        {urunler.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                                <FiPackage className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm font-medium text-slate-600">{lc.noProducts}</p>
                                <Link href={`/${locale}/products`} className="mt-3 inline-flex text-xs text-slate-500 underline hover:text-slate-700">
                                    {lc.viewAll}
                                </Link>
                            </div>
                        ) : (
                            <ProductGridClient
                                urunler={urunler}
                                locale={locale}
                                kategoriAdlariMap={kategoriAdlariMap}
                                kategoriParentMap={kategoriParentMap}
                                sablonMap={sablonMap}
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
