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
    params: { locale: string };
    searchParams: { kategori?: string };
}) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const locale = params.locale;
    
    let seciliKategoriSlug: string | undefined;
    if (searchParams.kategori && searchParams.kategori.toLowerCase() !== 'null') {
        seciliKategoriSlug = searchParams.kategori;
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
        .select(`id, ad, slug, ana_resim_url, kategori_id, ortalama_puan, degerlendirme_sayisi`);

    if (filtrelenecekKategoriIdleri.length > 0) {
        urunlerQuery = urunlerQuery.in('kategori_id', filtrelenecekKategoriIdleri); 
    } 
    
    const urunlerRes = await urunlerQuery.order(`ad->>${locale}`, { ascending: true });
    const urunler: Urun[] = (urunlerRes.data ?? []) as unknown as Urun[];
    
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
            {/* Hero Section with Animated Background */}
            <div className="relative bg-gradient-to-r from-primary via-accent to-primary overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] animate-pulse"></div>
                </div>
                <div className="container mx-auto px-4 sm:px-8 py-12 relative z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                                    <FiPackage className="w-8 h-8 text-white" />
                                </div>
                                <h1 className="text-4xl md:text-5xl font-serif font-bold text-white drop-shadow-lg"> 
                                    {pageContent.title}
                                </h1>
                            </div>
                            <p className="text-white/90 text-lg max-w-2xl drop-shadow">
                                Entdecken Sie unsere Premium-Produkte • Yüksek kaliteli ürünlerimizi keşfedin
                            </p>
                        </div>
                        <div className="hidden lg:flex items-center gap-4">
                            <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 text-center">
                                <p className="text-3xl font-bold text-white">{urunler.length}</p>
                                <p className="text-white/80 text-sm">Produkte</p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 text-center">
                                <p className="text-3xl font-bold text-white">{kategoriler.filter(k => !k.ust_kategori_id).length}</p>
                                <p className="text-white/80 text-sm">Kategorien</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="container mx-auto px-4 sm:px-8 py-8">
                {/* Breadcrumb & Filter Info */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm">
                        <Link href={`/${locale}`} className="text-gray-500 hover:text-primary transition-colors">
                            Home
                        </Link>
                        <span className="text-gray-400">/</span>
                        <Link href={`/${locale}/products`} className="text-gray-500 hover:text-primary transition-colors">
                            {pageContent.title}
                        </Link>
                        {seciliKategoriSlug && (
                            <>
                                <span className="text-gray-400">/</span>
                                <span className="text-primary font-semibold">{seciliKategoriAdi}</span>
                            </>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                        <FiGrid className="text-accent" />
                        <span className="text-sm font-medium text-gray-700">
                            {urunler.length} {urunler.length === 1 ? 'Produkt' : 'Produkte'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <aside className="lg:col-span-1">
                        <div className="sticky top-24 space-y-6">
                            {/* Filter Section */}
                            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                                    <div className="flex items-center gap-2 text-white">
                                        <FiFilter className="w-5 h-5" />
                                        <h2 className="text-lg font-bold">Kategorien filtern</h2>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <KategoriFiltreMenusu 
                                        kategoriler={kategoriler}
                                        locale={locale}
                                        seciliSlug={seciliKategoriSlug}
                                        varsayilanAcikKategoriId={seciliAnaKategoriId}
                                        dictionary={pageContent}
                                    />
                                </div>
                            </div>

                            {/* Trust Badges */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 shadow-lg border border-green-100">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Unsere Garantien
                                </h3>
                                <ul className="space-y-3 text-sm text-gray-700">
                                    <li className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>Premium Qualität garantiert</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>Schnelle Lieferung</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>Sichere Zahlung</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>Zertifizierte Produkte</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Customer Stats */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 shadow-lg border border-blue-100">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                    </svg>
                                    Kundenzufriedenheit
                                </h3>
                                <div className="space-y-4">
                                    <div className="text-center">
                                        <div className="text-4xl font-bold text-blue-600">98%</div>
                                        <div className="text-sm text-gray-600">Zufriedene Kunden</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-center">
                                        <div className="bg-white rounded-lg p-3 shadow-sm">
                                            <div className="text-2xl font-bold text-gray-800">500+</div>
                                            <div className="text-xs text-gray-600">Bestellungen</div>
                                        </div>
                                        <div className="bg-white rounded-lg p-3 shadow-sm">
                                            <div className="text-2xl font-bold text-gray-800">4.8★</div>
                                            <div className="text-xs text-gray-600">Bewertung</div>
                                        </div>
                                    </div>
                                </div>
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
                            />
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}