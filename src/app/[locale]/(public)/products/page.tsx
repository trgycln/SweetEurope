// src/app/[locale]/products/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/dictionaries';
import { ProductGridClient } from './product-grid-client';
import ProfesyonelFiltre from './profesyonel-filtre';
import { getLocalizedName } from '@/lib/utils';
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
        ozellik?: string;
        tat?: string;
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
    const ozellikFilter = sp.ozellik;
    const tatFilter = sp.tat;
    
    if (sp.kategori && sp.kategori.toLowerCase() !== 'null') {
        seciliKategoriSlug = sp.kategori;
    }

    const [dictionary, kategorilerRes, sablonlarRes] = await Promise.all([
        getDictionary(locale as any),
        supabase.from('kategoriler').select('id, ad, slug, ust_kategori_id'),
        supabase.from('kategori_ozellik_sablonlari').select('kategori_id, alan_adi, gosterim_adi, sira')
    ]);

    const kategoriler: Kategori[] = kategorilerRes.data || [];
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

    // Tüm ürünleri çek (sayım için)
    const { data: tumUrunler } = await supabase
        .from('urunler')
        .select('kategori_id')
        .eq('aktif', true); // Only count active products

    const totalAllProducts = tumUrunler?.length || 0; // Toplam tüm ürün sayısı (filtresiz)

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
        const anaKategori = kategoriler.find(k => k.slug === seciliKategoriSlug);

        if (anaKategori) {
            // Eğer alt kategori filtresi varsa, sadece o alt kategoriyi ekle
            if (altKategoriFilter) {
                const altKat = kategoriler.find(k => k.slug === altKategoriFilter);
                if (altKat) {
                    filtrelenecekKategoriIdleri.push(altKat.id);
                }
            } else {
                // Alt kategori filtresi yoksa, ana kategori + tüm alt kategorileri
                filtrelenecekKategoriIdleri.push(anaKategori.id);
                const altKategoriler = kategoriler.filter(k => k.ust_kategori_id === anaKategori.id);
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
        .select(`id, ad, slug, ana_resim_url, kategori_id, ortalama_puan, degerlendirme_sayisi, teknik_ozellikler, aciklamalar`, { count: 'exact' })
        .eq('aktif', true); // Only show active products

    if (filtrelenecekKategoriIdleri.length > 0) {
        urunlerQuery = urunlerQuery.in('kategori_id', filtrelenecekKategoriIdleri); 
    }
    
    // Porsiyon Filter - teknik_ozellikler içinde dilim_adedi veya kutu_ici_adet
    if (porsiyonFilter) {
        urunlerQuery = urunlerQuery.or(`teknik_ozellikler->>dilim_adedi.eq.${porsiyonFilter},teknik_ozellikler->>kutu_ici_adet.eq.${porsiyonFilter}`);
    }

    // Özellik ve Tat filtreleri için veriyi çek, sonra client-side filtrele
    // Server-side JSONB boolean/string kontrolü PostgREST'te karmaşık olduğu için client-side yapıyoruz
    
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    
    // Fetch all matching products first (no range, no order yet)
    let urunlerRes = await urunlerQuery
        .order('ad', { ascending: true, foreignTable: undefined });
    
    // Özellik ve Tat filtresi - client-side (yapılandırılmış alanları kontrol et)
    if (urunlerRes.data && (ozellikFilter || tatFilter)) {
        const filteredData = urunlerRes.data.filter((urun: any) => {
            let matches = true;
            
            if (ozellikFilter) {
                // Yapılandırılmış checkbox alanlarını kontrol et (vegan, glutenfrei, laktosefrei, bio)
                const teknikOzellikler = urun.teknik_ozellikler || {};
                matches = matches && (teknikOzellikler[ozellikFilter] === true);
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
    
    // Custom sorting: Eğer kategori filtresi yoksa (Alle), önce Torten&Kuchen, sonra yıldız
    let sortedData = urunlerRes.data || [];
    if (!seciliKategoriSlug && sortedData.length > 0) {
        // Find Torten&Kuchen category ID
        const tortenKuchenKat = kategoriler.find(k => k.slug === 'cakes-and-tarts');
        const tortenKuchenId = tortenKuchenKat?.id;
        const tortenKuchenAltIds = kategoriler
            .filter(k => k.ust_kategori_id === tortenKuchenId)
            .map(k => k.id);
        
        sortedData = sortedData.sort((a: any, b: any) => {
            const aIsTortenKuchen = a.kategori_id === tortenKuchenId || tortenKuchenAltIds.includes(a.kategori_id);
            const bIsTortenKuchen = b.kategori_id === tortenKuchenId || tortenKuchenAltIds.includes(b.kategori_id);
            
            // Torten&Kuchen önce
            if (aIsTortenKuchen && !bIsTortenKuchen) return -1;
            if (!aIsTortenKuchen && bIsTortenKuchen) return 1;
            
            // Aynı kategori grubunda ise yıldıza göre sırala (yüksek önce)
            if (aIsTortenKuchen && bIsTortenKuchen) {
                const aPuan = a.ortalama_puan || 0;
                const bPuan = b.ortalama_puan || 0;
                return bPuan - aPuan; // Descending
            }
            
            // Diğerleri alfabetik
            const aAd = a.ad?.de || a.ad?.tr || '';
            const bAd = b.ad?.de || b.ad?.tr || '';
            return aAd.localeCompare(bAd);
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

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 sm:px-8 py-4">
                {/* Kategori Butonları - Kompakt */}
                <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={`/${locale}/products`}
                            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
                                !seciliKategoriSlug
                                    ? 'bg-accent text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                            }`}
                        >
                            Alle ({totalAllProducts})
                        </Link>
                        {kategoriler
                            .filter(k => !k.ust_kategori_id)
                            .sort((a, b) => {
                                const order = ['cakes-and-tarts', 'cookies-and-muffins', 'pizza-and-fast-food', 'sauces-and-ingredients', 'coffee', 'drinks'];
                                return order.indexOf(a.slug || '') - order.indexOf(b.slug || '');
                            })
                            .map(k => {
                                const count = categoryProductCounts[k.id] || 0;
                                return (
                                    <Link
                                        key={k.id}
                                        href={`/${locale}/products?kategori=${k.slug}`}
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
                    totalCount={totalCount}
                    labels={dictionary.productsProfessionalFilter}
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
                        pagination={{ page: clampedPage, perPage, total: totalCount, kategori: seciliKategoriSlug }}
                    />
                )}
            </div>
        </div>
    );
}