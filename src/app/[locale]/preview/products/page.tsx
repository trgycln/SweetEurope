// src/app/[locale]/products/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/dictionaries';
import { ProductGridClient } from './product-grid-client';
import ProfesyonelFiltre from './profesyonel-filtre';
import { getLocalizedName } from '@/lib/utils';
import {
    PUBLIC_VISIBLE_MAIN_CATEGORY_ORDER,
    buildHiddenPublicCategoryIds,
    isPublicCategorySlugHidden,
} from '@/lib/public-category-visibility';
import {
    PRODUCT_LINE_META,
    PRODUCT_LINE_ORDER,
    getProductLineLabel,
    inferProductLineFromCategoryId,
    isProductLineKey,
} from '@/lib/product-lines';
import Link from 'next/link';
import { type Kategori, type Urun } from './types';
import { cookies } from 'next/headers';
import { FiGrid, FiPackage } from 'react-icons/fi';

// HATA ÇÖZÜMÜ: Bu satır, Next.js'e sayfanın her zaman dinamik olarak
// render edilmesi gerektiğini söyleyerek tüm "should be awaited" hatalarını çözer.
export const dynamic = 'force-dynamic';

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

    const urunler: Urun[] = (sortedData ?? []) as unknown as Urun[];
    const totalCount = sortedData.length;
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
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 sm:px-8 py-4">
                {/* Ürün Gamı + Kategori Butonları */}
                <div className="mb-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={buildProductsHref({})}
                            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
                                !seciliUrunGami
                                    ? 'bg-primary text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                            }`}
                        >
                            {locale === 'de'
                                ? 'Alle Produktlinien'
                                : locale === 'en'
                                  ? 'All Product Lines'
                                  : locale === 'ar'
                                    ? 'كل خطوط المنتجات'
                                    : 'Tüm Ürün Gamları'}
                        </Link>
                        {PRODUCT_LINE_ORDER.map(line => (
                            <Link
                                key={line}
                                href={buildProductsHref({ urunGami: line })}
                                className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
                                    seciliUrunGami === line
                                        ? 'bg-primary text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                }`}
                            >
                                {getProductLineLabel(line, locale as any)}
                            </Link>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={buildProductsHref({ urunGami: seciliUrunGami })}
                            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
                                !seciliKategoriSlug
                                    ? 'bg-accent text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                            }`}
                        >
                            Alle ({totalAllProducts})
                        </Link>
                        {lineVisibleKategoriler
                            .filter(
                                k =>
                                    !k.ust_kategori_id &&
                                    visibleMainCategoryOrder.includes((k.slug ?? '') as any)
                            )
                            .sort((a, b) => {
                                return (
                                    visibleMainCategoryOrder.indexOf((a.slug ?? '') as any) -
                                    visibleMainCategoryOrder.indexOf((b.slug ?? '') as any)
                                );
                            })
                            .map(k => {
                                const count = categoryProductCounts[k.id] || 0;
                                return (
                                    <Link
                                        key={k.id}
                                        href={buildProductsHref({
                                            urunGami: seciliUrunGami,
                                            kategori: k.slug || undefined,
                                        })}
                                        className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
                                            seciliKategoriSlug === k.slug
                                                ? 'bg-accent text-white'
                                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                        }`}
                                    >
                                        {getLocalizedName(k.ad, locale as any)} ({count})
                                    </Link>
                                );
                            })}
                    </div>
                </div>

                {/* Profesyonel Filtre */}
                <ProfesyonelFiltre 
                    kategoriler={kategoriler}
                    locale={locale}
                    seciliKategoriSlug={seciliKategoriSlug}
                    seciliUrunGami={seciliUrunGami}
                    totalCount={totalCount}
                    labels={dictionary.productsProfessionalFilter}
                    availablePorsiyonlar={availablePorsiyonlar}
                    availableHacimler={availableHacimler}
                    basePath={`/${locale}/preview/products`}
                />

                {/* Ürünler Grid - Full Width */}
                {urunler.length === 0 ? (
                    <div className="text-center p-16 bg-white rounded-2xl shadow-sm border border-gray-200">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
                            <FiPackage className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-xl font-semibold text-gray-700 mb-2">Keine Produkte gefunden</p>
                        <p className="text-gray-500 mb-6">Versuchen Sie andere Filter oder durchsuchen Sie alle Kategorien</p>
                        <Link 
                            href={`/${locale}/products`} 
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-lg hover:shadow-lg transition-all duration-300 font-semibold"
                        >
                            <FiGrid />
                            Alle Produkte ansehen
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
                            basePath: `/${locale}/preview/products`,
                        }}
                    />
                )}
            </div>
        </div>
    );
}