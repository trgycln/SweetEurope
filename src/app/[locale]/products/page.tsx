// src/app/[locale]/products/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/dictionaries';
import { KategoriFiltreMenusu } from './kategori-filtre-menusu';
import Link from 'next/link';
import { type Kategori, type Urun } from './types'; // Tipleri ortak dosyadan import et

export default async function PublicUrunlerPage({ 
    params, 
    searchParams 
}: { 
    params: { locale: string };
    searchParams: { kategori?: string };
}) {
    const supabase = createSupabaseServerClient();
    const { locale } = params;
    const seciliKategoriSlug = searchParams.kategori;

    // Hem sözlüğü hem de veritabanı verilerini paralel olarak çek
    const [dictionary, kategorilerRes, urunlerRes] = await Promise.all([
        getDictionary(locale as any),
        supabase.from('kategoriler').select('id, ad, slug, ust_kategori_id').order(`ad->>${locale}`),
        (() => {
            let query = supabase
                .from('urunler')
                .select(`id, ad, slug, kategoriler!inner(ad, slug)`) // !inner ile kategorisi olan ürünleri garantile
                .eq('aktif', true);

            if (seciliKategoriSlug) {
                query = query.eq('kategoriler.slug', seciliKategoriSlug);
            }

            return query.order(`ad->>${locale}`, { ascending: true });
        })()
    ]);

    const kategoriler: Kategori[] = kategorilerRes.data || [];
    const urunler: Urun[] = urunlerRes.data as any || [];
    const pageContent = dictionary.productsPage; // Sayfa metinlerini sözlükten al

    if (kategorilerRes.error || urunlerRes.error) {
        console.error("Hata:", kategorilerRes.error || urunlerRes.error);
        return <p className="p-8 text-center text-red-500">Ürünler yüklenirken bir sorun oluştu.</p>;
    }

    return (
        <div className="container mx-auto p-4 sm:p-8">
            <h1 className="text-4xl font-serif font-bold text-primary mb-8 border-b pb-4">
                {pageContent.title} {/* DİNAMİK METİN */}
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Sol Taraf: Filtreleme Menüsü */}
                <aside className="md:col-span-1">
                    <div className="sticky top-24">
                        <KategoriFiltreMenusu 
                            kategoriler={kategoriler}
                            locale={locale}
                            seciliSlug={seciliKategoriSlug}
                            dictionary={pageContent} // Filtre menüsüne metinleri gönder
                        />
                    </div>
                </aside>

                {/* Sağ Taraf: Ürün Listesi */}
                <main className="md:col-span-3">
                    {urunler.length === 0 ? (
                        <div className="text-center text-gray-500 p-10 bg-white rounded-lg shadow-sm border">
                            <p className="font-semibold">Bu kategoride gösterilecek ürün bulunamadı.</p>
                            <Link href={`/${locale}/products`} className="text-sm text-accent hover:underline mt-2 inline-block">
                                {pageContent.allProducts}
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {urunler.map(urun => (
                                <Link 
                                    key={urun.id} 
                                    href={`/${locale}/products/${urun.slug}`} 
                                    className="group bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col"
                                >
                                    <div className="h-48 bg-gray-200 flex items-center justify-center">
                                        <span className="text-gray-400">Ürün Resmi</span>
                                    </div>
                                    <div className="p-4 flex flex-col flex-grow">
                                        <p className="text-xs font-semibold text-accent uppercase tracking-wider">
                                            {urun.kategoriler?.ad?.[locale] || urun.kategoriler?.ad?.['de']}
                                        </p>
                                        <h2 className="text-lg font-bold text-primary group-hover:text-accent transition-colors mt-1">
                                            {urun.ad?.[locale] || urun.ad?.['de']}
                                        </h2>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}