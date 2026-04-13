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
import { FiPackage } from 'react-icons/fi';
import type { Metadata } from 'next';

// HATA ÇÖZÜMÜ: Bu satır, Next.js'e sayfanın her zaman dinamik olarak
// render edilmesi gerektiğini söyleyerek tüm "should be awaited" hatalarını çözer.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ 
    params 
}: { 
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const dictionary = await getDictionary(locale as any);
    
    return {
        title: dictionary.seo?.products?.title || 'Products | Elysion Sweets',
        description: dictionary.seo?.products?.description || '',
        openGraph: {
            title: dictionary.seo?.products?.title || 'Products | Elysion Sweets',
            description: dictionary.seo?.products?.description || '',
            locale: locale,
            type: 'website',
        },
    };
}

export default async function PublicUrunlerPage({ 
    params, 
    searchParams 
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
        page?: string; 
        limit?: string;
    }>;
}) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { locale } = await params;
    
    const sp = await searchParams;
    let seciliKategoriSlug: string | undefined;
    const page = Math.max(1, Number.parseInt(sp.page || '1') || 1);
    const perPage = Math.min(48, Math.max(12, Number.parseInt(sp.limit || '24') || 24));
    
    // Filtre parametreleri
    const altKategoriFilter = sp.altKategori;
    const porsiyonFilter = sp.porsiyon;
    const hacimFilter = sp.hacim;
    const ozellikFilter = sp.ozellik;
    const tatFilter = sp.tat;
    const seciliUrunGami = isProductLineKey(sp.urunGami) ? sp.urunGami : undefined;
    
    if (
        sp.kategori &&
        sp.kategori.toLowerCase() !== 'null' &&
        !isPublicCategorySlugHidden(sp.kategori)
    ) {
        seciliKategoriSlug = sp.kategori;
    }

    const [dictionary, kategorilerRes, sablonlarRes] = await Promise.all([
        getDictionary(locale as any),
        supabase.from('kategoriler').select('id, ad, slug, ust_kategori_id'),
        supabase.from('kategori_ozellik_sablonlari').select('kategori_id, alan_adi, gosterim_adi, sira')
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
        const ad = k.ad?.[locale] || k.ad?.['de'] || 'Kategori Yok';
        kategoriAdlariMap.set(k.id, ad);
    });

    // Parent map for inheritance (subcategory -> parent id)
    const kategoriParentMap: Record<string, string | null> = {};
    kategoriler.forEach(k => { kategoriParentMap[k.id] = k.ust_kategori_id || null; });

    // Build template map: kategori_id -> sorted fields
    const sablonMap: Record<string, Array<{ alan_adi: string; gosterim_adi: any; sira: number }>> = {};
    if (sablonlarRes.data) {
        for (const row of sablonlarRes.data as any[]) {
            const list = sablonMap[row.kategori_id] || [];
            list.push({ alan_adi: row.alan_adi, gosterim_adi: row.gosterim_adi, sira: row.sira ?? 0 });
            sablonMap[row.kategori_id] = list;
        }
        for (const key of Object.keys(sablonMap)) {
            sablonMap[key] = sablonMap[key].sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
        }
    }

    // Tüm ürünleri çek (sayım ve porsiyon seçenekleri için)
    const { data: tumUrunlerData } = await supabase
        .from('urunler')
        .select('kategori_id, teknik_ozellikler')
        .eq('aktif', true); // Only count active products

    const tumUrunler = (tumUrunlerData || []).filter(
        (urun: any) =>
            !hiddenKategoriIds.has(urun.kategori_id ?? '') &&
            matchesSelectedProductLine(urun.kategori_id)
    );
    const totalAllProducts = tumUrunler.length || 0; // Toplam public ürün sayısı (filtresiz)
    
    // Benzersiz porsiyon / hacim seçeneklerini çıkar
    const uniquePorsiyonlar = new Set<number>();
    const uniqueHacimler = new Set<number>();
    tumUrunler?.forEach((urun: any) => {
        const teknikOzellikler = urun.teknik_ozellikler || {};
        
        if (teknikOzellikler.dilim_adedi) {
            const dilim = parseInt(String(teknikOzellikler.dilim_adedi));
            if (!isNaN(dilim)) uniquePorsiyonlar.add(dilim);
        }
        
        if (teknikOzellikler.kutu_ici_adet) {
            const kutu = parseInt(String(teknikOzellikler.kutu_ici_adet));
            if (!isNaN(kutu)) uniquePorsiyonlar.add(kutu);
        }

        const hacim = teknikOzellikler.hacim_ml || teknikOzellikler.hacim;
        if (hacim) {
            const parsed = parseInt(String(hacim).replace(/[^\d]/g, ''));
            if (!isNaN(parsed)) uniqueHacimler.add(parsed);
        }
    });
    
    const availablePorsiyonlar = Array.from(uniquePorsiyonlar).sort((a, b) => a - b);
    const availableHacimler = Array.from(uniqueHacimler).sort((a, b) => a - b);

    // Kategori ID'lerine göre ürün sayısını hesapla (ana kategori + alt kategorilerindeki ürünler)
    const categoryProductCounts: Record<string, number> = {};
    const kategoriMap = new Map(kategoriler.map(k => [k.id, k.ust_kategori_id]));
    
    if (tumUrunler) {
        tumUrunler.forEach((urun: any) => {
            const categoryId = urun.kategori_id;
            if (!categoryId) return;
            
            const parentId = kategoriMap.get(categoryId);
            
            // Alt kategoriyse, hem kendisine hem ana kategoriye say
            if (parentId) {
                categoryProductCounts[parentId] = (categoryProductCounts[parentId] || 0) + 1;
            }
            // Her ürünü kendi kategorisine say
            categoryProductCounts[categoryId] = (categoryProductCounts[categoryId] || 0) + 1;
        });
    }

    let filtrelenecekKategoriIdleri: string[] = []; 
    let seciliAnaKategoriId: string | undefined; 

    if (seciliKategoriSlug) {
        const anaKategori = lineVisibleKategoriler.find(k => k.slug === seciliKategoriSlug);

        if (anaKategori) {
            // Eğer alt kategori filtresi varsa, sadece o alt kategoriyi ekle
            if (altKategoriFilter) {
                const altKat = lineVisibleKategoriler.find(k => k.slug === altKategoriFilter);
                if (altKat) {
                    filtrelenecekKategoriIdleri.push(altKat.id);
                }
            } else {
                // Alt kategori filtresi yoksa, ana kategori + tüm alt kategorileri
                filtrelenecekKategoriIdleri.push(anaKategori.id);
                const altKategoriler = lineVisibleKategoriler.filter(k => k.ust_kategori_id === anaKategori.id);
                altKategoriler.forEach(altKategori => {
                    filtrelenecekKategoriIdleri.push(altKategori.id);
                });
            }
            
            seciliAnaKategoriId = anaKategori.ust_kategori_id || anaKategori.id;

        } else {
            console.warn(`Server URL'deki kategori slug'ı (${seciliKategoriSlug}) bulunamadı. Filtre uygulanmayacak.`);
        }
    }
    
    let urunlerQuery = supabase
        .from('urunler')
        .select(`id, ad, slug, ana_resim_url, galeri_resim_urls, kategori_id, ortalama_puan, degerlendirme_sayisi, teknik_ozellikler, aciklamalar`, { count: 'exact' })
        .eq('aktif', true); // Only show active products

    if (filtrelenecekKategoriIdleri.length > 0) {
        urunlerQuery = urunlerQuery.in('kategori_id', filtrelenecekKategoriIdleri); 
    }
    
    // Porsiyon Filter - teknik_ozellikler içinde dilim_adedi veya kutu_ici_adet
    if (porsiyonFilter) {
        urunlerQuery = urunlerQuery.or(`teknik_ozellikler->>dilim_adedi.eq.${porsiyonFilter},teknik_ozellikler->>kutu_ici_adet.eq.${porsiyonFilter}`);
    }

    if (hacimFilter) {
        urunlerQuery = urunlerQuery.or(`teknik_ozellikler->>hacim_ml.eq.${hacimFilter},teknik_ozellikler->>hacim.eq.${hacimFilter}`);
    }

    // Özellik ve Tat filtreleri için veriyi çek, sonra client-side filtrele
    // Server-side JSONB boolean/string kontrolü PostgREST'te karmaşık olduğu için client-side yapıyoruz
    
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    
    // Fetch all matching products first (no range, no order yet)
    let urunlerRes = await urunlerQuery
        .order('ad', { ascending: true, foreignTable: undefined });

    if (urunlerRes.data) {
        const visibleData = urunlerRes.data.filter(
            (urun: any) =>
                !hiddenKategoriIds.has(urun.kategori_id ?? '') &&
                matchesSelectedProductLine(urun.kategori_id)
        );
        urunlerRes = { ...urunlerRes, data: visibleData, count: visibleData.length };
    }
    
    // Özellik ve Tat filtresi - client-side (yapılandırılmış alanları kontrol et)
    if (urunlerRes.data && (ozellikFilter || tatFilter)) {
        const filteredData = urunlerRes.data.filter((urun: any) => {
            let matches = true;
            
            if (ozellikFilter) {
                const teknikOzellikler = urun.teknik_ozellikler || {};
                const rawValue = teknikOzellikler[ozellikFilter];
                const truthyValue = rawValue === true
                    || rawValue === 'true'
                    || rawValue === 'yes'
                    || rawValue === 'evet'
                    || (typeof rawValue === 'number' && rawValue > 0)
                    || (typeof rawValue === 'string' && rawValue.trim().length > 0);
                matches = matches && truthyValue;
            }
            
            if (tatFilter) {
                // Yapılandırılmış geschmack alanını kontrol et (supports both string and array)
                const teknikOzellikler = urun.teknik_ozellikler || {};
                const geschmack = teknikOzellikler.geschmack;
                
                if (Array.isArray(geschmack)) {
                    // Multiple flavors: check if selected flavor is in the array
                    matches = matches && geschmack.includes(tatFilter);
                } else {
                    // Single flavor (backward compatibility): exact match
                    matches = matches && (geschmack === tatFilter);
                }
            }
            
            return matches;
        });
        
        urunlerRes = { ...urunlerRes, data: filteredData, count: filteredData.length };
    }
    
    // Custom sorting: keep curated category order within each product line and then sort by rating/name.
    const kategoriById = new Map(kategoriler.map(k => [k.id, k]));
    const getRootKategoriSlug = (categoryId?: string | null) => {
        let current = categoryId ? kategoriById.get(categoryId) : null;
        let guard = 0;
        while (current?.ust_kategori_id && guard < 10) {
            current = kategoriById.get(current.ust_kategori_id) || null;
            guard += 1;
        }
        return current?.slug || null;
    };

    let sortedData = urunlerRes.data || [];
    if (sortedData.length > 0) {
        sortedData = sortedData.sort((a: any, b: any) => {
            const aRootSlug = getRootKategoriSlug(a.kategori_id) || '';
            const bRootSlug = getRootKategoriSlug(b.kategori_id) || '';
            const indexA = visibleMainCategoryOrder.indexOf(aRootSlug as any);
            const indexB = visibleMainCategoryOrder.indexOf(bRootSlug as any);
            const safeIndexA = indexA === -1 ? 999 : indexA;
            const safeIndexB = indexB === -1 ? 999 : indexB;

            if (safeIndexA !== safeIndexB) {
                return safeIndexA - safeIndexB;
            }

            const aPuan = a.ortalama_puan || 0;
            const bPuan = b.ortalama_puan || 0;
            if (aPuan !== bPuan) {
                return bPuan - aPuan;
            }

            const aAd = a.ad?.[locale] || a.ad?.de || a.ad?.tr || '';
            const bAd = b.ad?.[locale] || b.ad?.de || b.ad?.tr || '';
            return String(aAd).localeCompare(String(bAd));
        });
    }
    
    // Apply pagination after sorting
    const paginatedData = sortedData.slice(from, from + perPage);
    const totalCount = sortedData.length;
    
    const urunler: Urun[] = paginatedData as unknown as Urun[];
    const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
    const clampedPage = Math.min(page, totalPages);
    
    if (kategorilerRes.error) {
        console.error("Kategoriler hatası:", kategorilerRes.error); 
        return <p className="p-8 text-center text-red-500">Kategoriler yüklenirken bir sorun oluştu.</p>;
    }

    // Seçili kategori adını bul
    let seciliKategoriAdi = pageContent.allProducts;
    if (seciliKategoriSlug) {
        const seciliKat = kategoriler.find(k => k.slug === seciliKategoriSlug);
        if (seciliKat) {
            seciliKategoriAdi = seciliKat.ad?.[locale] || seciliKat.ad?.['de'] || seciliKategoriAdi;
        }
    }

    const buildProductsHref = (params: Record<string, string | undefined>) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value) query.set(key, value);
        });
        const qs = query.toString();
        return `/${locale}/products${qs ? `?${qs}` : ''}`;
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* ── B2B Page Header ─────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200">
                <div className="container mx-auto px-4 sm:px-8 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
                                {locale === 'de' ? 'B2B Produktkatalog' : locale === 'tr' ? 'B2B Ürün Kataloğu' : locale === 'en' ? 'B2B Product Catalog' : 'كتالوج المنتجات B2B'}
                            </p>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                                {locale === 'de' ? 'Sortiment für Profi-Küchen' : locale === 'tr' ? 'Profesyonel Mutfaklar İçin Ürün Gamı' : locale === 'en' ? 'Range for Professional Kitchens' : 'تشكيلة للمطابخ الاحترافية'}
                            </h1>
                            <p className="mt-1 text-sm text-slate-500 max-w-xl">
                                {locale === 'de'
                                    ? 'Tiefkühl-Desserts, Sirupe, Kaffee und Backzutaten – direkt für Cafés, Hotels und Patisserien.'
                                    : locale === 'tr'
                                    ? 'Donuk tatlılar, şuruplar, kahve ve pastane malzemeleri — kafeler, oteller ve pastaneler için doğrudan.'
                                    : locale === 'en'
                                    ? 'Frozen desserts, syrups, coffee and bakery ingredients — direct for cafés, hotels and pastry shops.'
                                    : 'حلويات مجمدة وشراب وقهوة ومكونات للحلويات — مباشرةً للمقاهي والفنادق والمخابز.'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 self-start sm:self-auto">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                            {totalAllProducts} {locale === 'de' ? 'Artikel im Sortiment' : locale === 'tr' ? 'ürün katalogda' : locale === 'en' ? 'items in catalog' : 'منتج في الكتالوج'}
                        </div>
                    </div>

                    {/* ── Business Segment Quick Links ───────────────────────── */}
                    <div className="mt-5 pt-4 border-t border-slate-100">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                            {locale === 'de' ? 'Für Ihr Unternehmen' : locale === 'tr' ? 'İşletmenize Göre' : locale === 'en' ? 'For Your Business' : 'لنشاطك التجاري'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                {
                                    icon: '☕',
                                    label: { de: 'Café & Bistro', tr: 'Kafe & Bistro', en: 'Café & Bistro', ar: 'مقهى' },
                                    desc: { de: 'Sirupe, Kaffee, Torten & Barista-Essentials', tr: 'Şurup, kahve, pasta ve barista ürünleri', en: 'Syrups, coffee, cakes & barista essentials', ar: 'شراب وقهوة وكيك' },
                                    href: buildProductsHref({ urunGami: 'barista-bakery-essentials' }),
                                    active: seciliUrunGami === 'barista-bakery-essentials',
                                },
                                {
                                    icon: '🏨',
                                    label: { de: 'Hotel & Catering', tr: 'Otel & Catering', en: 'Hotel & Catering', ar: 'فندق' },
                                    desc: { de: 'Portionierte Desserts, Torten und Premium-Sirupe', tr: 'Porsiyon tatlılar, pastalar ve premium şuruplar', en: 'Portioned desserts, cakes and premium syrups', ar: 'حلويات مجزأة وكيك' },
                                    href: buildProductsHref({ urunGami: 'frozen-desserts' }),
                                    active: seciliUrunGami === 'frozen-desserts',
                                },
                                {
                                    icon: '🎂',
                                    label: { de: 'Konditorei & Bäckerei', tr: 'Pastane & Fırın', en: 'Patisserie & Bakery', ar: 'المخبز' },
                                    desc: { de: 'Cheesecakes, Backzutaten und Fertigböden', tr: 'Cheesecake, pastane malzemeleri ve bitmiş tabanlar', en: 'Cheesecakes, bakery ingredients and ready bases', ar: 'تشيز كيك ومكونات الحلويات' },
                                    href: buildProductsHref({ kategori: 'cakes-and-tarts' }),
                                    active: seciliKategoriSlug === 'cakes-and-tarts',
                                },
                                {
                                    icon: '🍦',
                                    label: { de: 'Dessert-Bar', tr: 'Dessert Bar', en: 'Dessert Bar', ar: 'بار الحلويات' },
                                    desc: { de: 'Portionsdesserts, Cups und Eis-Spezialitäten', tr: 'Porsiyon tatlı, kuplar ve dondurma ürünleri', en: 'Portioned desserts, cups and frozen specialties', ar: 'حلويات مجزأة وتخصصات مجمدة' },
                                    href: buildProductsHref({ urunGami: 'frozen-desserts' }),
                                    active: false,
                                },
                            ].map((seg) => (
                                <Link
                                    key={seg.icon}
                                    href={seg.href}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all group
                                        ${seg.active
                                            ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:shadow-sm'}`}
                                >
                                    <span className="text-lg leading-none">{seg.icon}</span>
                                    <div>
                                        <p className={`text-xs font-semibold leading-tight ${seg.active ? 'text-white' : 'text-slate-800'}`}>
                                            {seg.label[locale as keyof typeof seg.label] || seg.label.de}
                                        </p>
                                        <p className={`text-[10px] leading-tight mt-0.5 hidden sm:block ${seg.active ? 'text-slate-300' : 'text-slate-400'}`}>
                                            {seg.desc[locale as keyof typeof seg.desc] || seg.desc.de}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Content: Sidebar + Product Grid ────────────────────── */}
            <div className="container mx-auto px-4 sm:px-8 py-6">
                <div className="flex gap-6">
                    {/* ─ Left sidebar: Filters ─ */}
                    <aside className="hidden lg:flex flex-col gap-4 w-52 flex-shrink-0">

                        {/* Product Line */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                                {locale === 'de' ? 'Produktlinie' : locale === 'tr' ? 'Ürün Gamı' : locale === 'en' ? 'Product Line' : 'خط المنتجات'}
                            </p>
                            <div className="space-y-1">
                                <Link href={buildProductsHref({})}
                                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-sm transition-colors
                                        ${!seciliUrunGami ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}>
                                    <span>{locale === 'de' ? 'Alle' : locale === 'tr' ? 'Tümü' : 'All'}</span>
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

                        {/* Categories */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                                {locale === 'de' ? 'Kategorien' : locale === 'tr' ? 'Kategoriler' : locale === 'en' ? 'Categories' : 'الفئات'}
                            </p>
                            <div className="space-y-1">
                                <Link href={buildProductsHref({ urunGami: seciliUrunGami })}
                                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-sm transition-colors
                                        ${!seciliKategoriSlug ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}>
                                    <span>{locale === 'de' ? 'Alle Kategorien' : locale === 'tr' ? 'Tüm Kategoriler' : 'All Categories'}</span>
                                </Link>
                                {lineVisibleKategoriler
                                    .filter(k => !k.ust_kategori_id && visibleMainCategoryOrder.includes((k.slug ?? '') as any))
                                    .sort((a, b) => visibleMainCategoryOrder.indexOf((a.slug ?? '') as any) - visibleMainCategoryOrder.indexOf((b.slug ?? '') as any))
                                    .map(k => {
                                        const count = categoryProductCounts[k.id] || 0;
                                        const isSelected = seciliKategoriSlug === k.slug;
                                        // Subcategories for this main category
                                        const subKats = lineVisibleKategoriler.filter(sk => sk.ust_kategori_id === k.id);
                                        return (
                                            <div key={k.id}>
                                                <Link href={buildProductsHref({ urunGami: seciliUrunGami, kategori: k.slug || undefined })}
                                                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-sm transition-colors
                                                        ${isSelected ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}>
                                                    <span className="truncate">{getLocalizedName(k.ad, locale as any)}</span>
                                                    <span className="text-[10px] text-slate-400 ml-1 flex-shrink-0">{count}</span>
                                                </Link>
                                                {/* Subcategories shown when parent selected */}
                                                {isSelected && subKats.length > 0 && (
                                                    <div className="ml-3 mt-0.5 space-y-0.5 border-l border-slate-200 pl-2">
                                                        {subKats.map(sk => (
                                                            <Link key={sk.id}
                                                                href={buildProductsHref({ urunGami: seciliUrunGami, kategori: k.slug || undefined, altKategori: sk.slug || undefined })}
                                                                className={`flex items-center justify-between w-full px-2 py-1 rounded text-xs transition-colors
                                                                    ${sp.altKategori === sk.slug ? 'text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}>
                                                                <span className="truncate">{getLocalizedName(sk.ad, locale as any)}</span>
                                                                <span className="text-[10px] text-slate-400 ml-1 flex-shrink-0">{categoryProductCounts[sk.id] || 0}</span>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>

                        {/* Portion filter */}
                        {availablePorsiyonlar.length > 0 && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                                    {locale === 'de' ? 'Portionen / Stück' : locale === 'tr' ? 'Porsiyon / Adet' : 'Portion size'}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {availablePorsiyonlar.map(v => (
                                        <Link key={v}
                                            href={buildProductsHref({ ...Object.fromEntries(Object.entries({ urunGami: seciliUrunGami, kategori: seciliKategoriSlug, porsiyon: String(v) }).filter(([, val]) => Boolean(val))) })}
                                            className={`px-2 py-0.5 rounded border text-xs font-medium transition-colors
                                                ${sp.porsiyon === String(v) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                                            {v}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </aside>

                    {/* ─ Main product area ─ */}
                    <div className="flex-1 min-w-0">
                        {/* Mobile category row */}
                        <div className="flex flex-wrap gap-1.5 mb-4 lg:hidden">
                            <Link href={buildProductsHref({})}
                                className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors
                                    ${!seciliKategoriSlug && !seciliUrunGami ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                                {locale === 'de' ? 'Alle' : locale === 'tr' ? 'Tümü' : 'All'} ({totalAllProducts})
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

                        {/* Result count + active filters bar */}
                        {(seciliKategoriSlug || seciliUrunGami || sp.altKategori || sp.porsiyon) && (
                            <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                                <span className="text-slate-500">
                                    {totalCount} {locale === 'de' ? 'Ergebnisse' : locale === 'tr' ? 'sonuç' : 'results'}
                                </span>
                                {seciliKategoriSlug && (
                                    <Link href={buildProductsHref({ urunGami: seciliUrunGami })}
                                        className="inline-flex items-center gap-1 bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium hover:bg-slate-300">
                                        {seciliKategoriAdi} ✕
                                    </Link>
                                )}
                                {seciliUrunGami && (
                                    <Link href={buildProductsHref({})}
                                        className="inline-flex items-center gap-1 bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium hover:bg-slate-300">
                                        {getProductLineLabel(seciliUrunGami, locale as any)} ✕
                                    </Link>
                                )}
                                {(seciliKategoriSlug || seciliUrunGami) && (
                                    <Link href={buildProductsHref({})} className="text-slate-400 hover:text-slate-600 underline">
                                        {locale === 'de' ? 'Alle Filter löschen' : locale === 'tr' ? 'Filtreleri temizle' : 'Clear all'}
                                    </Link>
                                )}
                            </div>
                        )}

                        {urunler.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                                <FiPackage className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm font-medium text-slate-600">
                                    {locale === 'de' ? 'Keine Produkte gefunden' : locale === 'tr' ? 'Ürün bulunamadı' : 'No products found'}
                                </p>
                                <Link href={`/${locale}/products`} className="mt-3 inline-flex text-xs text-slate-500 underline hover:text-slate-700">
                                    {locale === 'de' ? 'Alle Produkte ansehen' : locale === 'tr' ? 'Tüm ürünleri gör' : 'View all products'}
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
                                    query: {
                                        kategori: seciliKategoriSlug,
                                        urunGami: seciliUrunGami,
                                        altKategori: sp.altKategori,
                                        porsiyon: sp.porsiyon,
                                        hacim: sp.hacim,
                                        ozellik: sp.ozellik,
                                        tat: sp.tat,
                                    },
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
