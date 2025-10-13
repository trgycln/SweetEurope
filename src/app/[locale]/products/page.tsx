// src/app/[locale]/products/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/dictionaries';
import { KategoriFiltreMenusu } from './kategori-filtre-menusu';
import Link from 'next/link';
import Image from 'next/image'; 
import { type Kategori, type Urun } from './types'; 

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
    const supabase = createSupabaseServerClient();
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
        .select(`id, ad, slug, ana_resim_url, kategori_id`);

    if (filtrelenecekKategoriIdleri.length > 0) {
        urunlerQuery = urunlerQuery.in('kategori_id', filtrelenecekKategoriIdleri); 
    } 
    
    const urunlerRes = await urunlerQuery.order(`ad->>${locale}`, { ascending: true });
    const urunler: Urun[] = urunlerRes.data as Urun[] || [];
    
    if (kategorilerRes.error || urunlerRes.error) {
        console.error("Hata Detayı:", kategorilerRes.error || urunlerRes.error); 
        return <p className="p-8 text-center text-red-500">Ürünler yüklenirken bir sorun oluştu.</p>;
    }

    return (
        <div className="container mx-auto p-4 sm:p-8">
            <h1 className="text-4xl font-serif font-bold text-text-main mb-8 border-b pb-4"> 
                {pageContent.title}
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <aside className="md:col-span-1">
                    <div className="sticky top-24">
                        <KategoriFiltreMenusu 
                            kategoriler={kategoriler}
                            locale={locale}
                            seciliSlug={seciliKategoriSlug}
                            varsayilanAcikKategoriId={seciliAnaKategoriId}
                            dictionary={pageContent}
                        />
                    </div>
                </aside>

                <main className="md:col-span-3">
                    {urunler.length === 0 ? (
                        <div className="text-center text-gray-500 p-10 bg-secondary rounded-lg shadow-sm border border-bg-subtle">
                            <p className="font-semibold">{pageContent.noProducts}</p> 
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
                                    className="group bg-secondary border border-bg-subtle rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col"
                                >
                                    <div className="h-48 relative bg-bg-subtle/50"> 
                                        {urun.ana_resim_url ? (
                                            <Image 
                                                src={urun.ana_resim_url as string}
                                                alt={urun.ad?.[locale] || "Ürün Görseli"}
                                                fill 
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                className="object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-in-out" 
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-text-main/50 text-sm font-sans">Resim Yok</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 flex flex-col flex-grow">
                                        <p className="text-xs font-semibold text-accent uppercase tracking-wider">
                                            {urun.kategori_id ? kategoriAdlariMap.get(urun.kategori_id) : 'Kategori Yok'}
                                        </p>
                                        <h2 className="text-lg font-bold text-primary font-serif group-hover:text-accent transition-colors mt-1">
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