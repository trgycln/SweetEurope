// src/app/[locale]/products/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/dictionaries';
import { KategoriFiltreMenusu } from './kategori-filtre-menusu';
import { ProductGridClient } from './product-grid-client';
import Link from 'next/link';
import { type Kategori, type Urun } from './types';
import { cookies } from 'next/headers';
import { FiGrid, FiFilter, FiPackage } from 'react-icons/fi';

// HATA ÇÖZÜMÜ: Bu satır, Next.js'e sayfanın her zaman dinamik olarak
// render edilmesi gerektiğini söyleyerek tüm "should be awaited" hatalarını çözer.
export const dynamic = 'force-dynamic';

export default async function PublicUrunlerPage({ 
    params, 
    searchParams 
}: { 
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ kategori?: string; page?: string; limit?: string }>;
}) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { locale } = await params;
    
    const sp = await searchParams;
    let seciliKategoriSlug: string | undefined;
    const page = Math.max(1, Number.parseInt(sp.page || '1') || 1);
    const perPage = Math.min(48, Math.max(12, Number.parseInt(sp.limit || '24') || 24));
    if (sp.kategori && sp.kategori.toLowerCase() !== 'null') {
        seciliKategoriSlug = sp.kategori;
    }

    const [dictionary, kategorilerRes] = await Promise.all([
        getDictionary(locale as any),
        supabase.from('kategoriler').select('id, ad, slug, ust_kategori_id'),
    ]);

    const kategoriler: Kategori[] = kategorilerRes.data || [];
    const pageContent = dictionary.productsPage; 
    
    const kategoriAdlariMap = new Map<string, string>();
    kategoriler.forEach(k => {
        const ad = k.ad?.[locale] || k.ad?.['de'] || 'Kategori Yok';
        kategoriAdlariMap.set(k.id, ad);
    });

    // Tüm ürünleri çek (sayım için)
    const { data: tumUrunler } = await supabase
        .from('urunler')
        .select('kategori_id');

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
        // Kategori, slug alanının basit bir metin olduğu varsayılarak bulunuyor
        const anaKategori = kategoriler.find(k => k.slug === seciliKategoriSlug);

        if (anaKategori) {
            filtrelenecekKategoriIdleri.push(anaKategori.id);

            const altKategoriler = kategoriler.filter(k => k.ust_kategori_id === anaKategori.id);
            altKategoriler.forEach(altKategori => {
                filtrelenecekKategoriIdleri.push(altKategori.id);
            });
            
            seciliAnaKategoriId = anaKategori.ust_kategori_id || anaKategori.id;

        } else {
            console.warn(`Server URL'deki kategori slug'ı (${seciliKategoriSlug}) bulunamadı. Filtre uygulanmayacak.`);
        }
    }
    
    let urunlerQuery = supabase
        .from('urunler')
        .select(`id, ad, slug, ana_resim_url, kategori_id, ortalama_puan, degerlendirme_sayisi`, { count: 'exact' });

    if (filtrelenecekKategoriIdleri.length > 0) {
        urunlerQuery = urunlerQuery.in('kategori_id', filtrelenecekKategoriIdleri); 
    } 
    
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const urunlerRes = await urunlerQuery
        .order(`ad->>${locale}`, { ascending: true })
        .range(from, to);
    const urunler: Urun[] = (urunlerRes.data ?? []) as unknown as Urun[];
    const totalCount = urunlerRes.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
    const clampedPage = Math.min(page, totalPages);
    
    if (kategorilerRes.error || urunlerRes.error) {
        console.error("Hata Detayı:", kategorilerRes.error || urunlerRes.error); 
        return <p className="p-8 text-center text-red-500">Ürünler yüklenirken bir sorun oluştu.</p>;
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
            {/* Compact Hero Section */}
            <div className="relative bg-gradient-to-br from-primary via-primary/95 to-primary/90 border-b border-primary/20">
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')]"></div>
                </div>
                <div className="container mx-auto px-4 sm:px-8 py-8 relative z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-accent/20 backdrop-blur-sm rounded-lg border border-accent/30">
                                <FiPackage className="w-5 h-5 text-accent" />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-serif font-bold text-white tracking-tight"> 
                                {pageContent.title}
                            </h1>
                        </div>
                        
                        <div className="hidden md:flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                                <span className="text-secondary/80 font-medium">{totalCount} Produkte</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                                <span className="text-secondary/80 font-medium">{kategoriler.filter(k => !k.ust_kategori_id).length} Kategorien</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="container mx-auto px-4 sm:px-8 py-8">
                {/* Breadcrumb */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <nav className="flex items-center gap-2 text-sm">
                        <Link href={`/${locale}`} className="text-gray-500 hover:text-accent transition-colors font-medium">
                            Home
                        </Link>
                        <span className="text-gray-300">/</span>
                        <Link href={`/${locale}/products`} className="text-gray-500 hover:text-accent transition-colors font-medium">
                            {pageContent.title}
                        </Link>
                        {seciliKategoriSlug && (
                            <>
                                <span className="text-gray-300">/</span>
                                <span className="text-accent font-semibold">{seciliKategoriAdi}</span>
                            </>
                        )}
                    </nav>
                    
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-100">
                        <FiGrid className="text-accent w-4 h-4" />
                        <span className="text-sm font-medium text-gray-700">
                            {urunler.length} {urunler.length === 1 ? 'Produkt' : 'Produkte'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <aside className="lg:col-span-1">
                        <div className="sticky top-24 space-y-6">
                            {/* Filter Section - Accent renk kullanımı */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-accent/5 border-b border-gray-100 p-4">
                                    <div className="flex items-center gap-2 text-accent">
                                        <FiFilter className="w-4 h-4" />
                                        <h2 className="text-base font-semibold">Kategorien filtern</h2>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <KategoriFiltreMenusu 
                                        kategoriler={kategoriler}
                                        locale={locale}
                                        seciliSlug={seciliKategoriSlug}
                                        varsayilanAcikKategoriId={seciliAnaKategoriId}
                                        dictionary={pageContent}
                                        categoryProductCounts={categoryProductCounts}
                                        totalProductCount={tumUrunler?.length || 0}
                                    />
                                </div>
                            </div>

                            {/* Trust Badges - Accent renk kullanımı */}
                            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Unsere Garantien
                                </h3>
                                <ul className="space-y-3 text-sm text-gray-600">
                                    <li className="flex items-start gap-2">
                                        <svg className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>Premium Qualität garantiert</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <svg className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>Schnelle Lieferung</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <svg className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>Sichere Zahlung</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="lg:col-span-3">
                        {urunler.length === 0 ? (
                            <div className="text-center p-16 bg-white rounded-2xl shadow-lg border-2 border-dashed border-gray-200">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
                                    <FiPackage className="w-10 h-10 text-gray-400" />
                                </div>
                                <p className="text-xl font-semibold text-gray-700 mb-2">{pageContent.noProducts}</p>
                                <p className="text-gray-500 mb-6">Keine Produkte in dieser Kategorie gefunden</p>
                                <Link 
                                    href={`/${locale}/products`} 
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-lg hover:shadow-lg transition-all duration-300 font-semibold"
                                >
                                    <FiGrid />
                                    {pageContent.allProducts}
                                </Link>
                            </div>
                        ) : (
                            <ProductGridClient 
                                urunler={urunler}
                                locale={locale}
                                kategoriAdlariMap={kategoriAdlariMap}
                                pagination={{ page: clampedPage, perPage, total: totalCount, kategori: seciliKategoriSlug }}
                            />
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}