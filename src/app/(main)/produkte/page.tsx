import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getLocalizedName } from '@/lib/utils';
import ProductCard from '@/components/ProductCard';
import { ProduktFilterClient } from '@/components/produkt-filter-client';
import { dictionary } from '@/dictionaries/de'; 

export const revalidate = 0;

export default async function ProductsPage({
    searchParams,
}: {
    searchParams?: { [key: string]: string | undefined };
}) {
    // ## KORREKTUR: 'await' wurde hier hinzugefügt ##
    const supabase = await createSupabaseServerClient();
    const lang = 'de';

    const { data: kategorilerData } = await supabase.from('kategoriler').select('id, ad, ust_kategori_id');
    
    // Kategori listesini, public sitede kullanılacak formata dönüştürüyoruz.
    const kategoriListesi = kategorilerData?.map(k => ({
        id: k.id,
        ad: getLocalizedName(k.ad, lang),
        ust_kategori_id: k.ust_kategori_id
    })) || [];

    const seciliKategoriId = searchParams?.kategori;
    
    let query = supabase
        .from('urunler')
        .select('*, kategoriler(id, ad)')
        .eq('gorunurluk', 'Herkese Açık');

    if (seciliKategoriId) {
        // Seçilen kategorinin alt kategorileri olup olmadığını kontrol et
        const altKategoriler = kategoriListesi.filter(k => k.ust_kategori_id === seciliKategoriId).map(k => k.id);
        const idFilterList = [seciliKategoriId, ...altKategoriler];
        
        // Hem ana kategoriye hem de onun altındaki tüm kategorilere ait ürünleri getir
        query = query.in('kategori_id', idFilterList);
    }

    const { data: urunler, error } = await query.order('created_at', { ascending: false });

    return (
        <div className="bg-secondary">
            <div className="container mx-auto px-6 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-serif">{dictionary.productsPage.title}</h1>
                </div>
                <div className="flex flex-col md:flex-row gap-12">
                    <aside className="md:w-1/4">
                         <h2 className="font-bold font-sans tracking-wider uppercase mb-4 text-primary">
                            {dictionary.productsPage.filterTitle}
                         </h2>
                        <ProduktFilterClient kategoriler={kategoriListesi} />
                    </aside>
                    <main className="md:w-3/4">
                        {(!urunler || urunler.length === 0) ? (
                            <div className="text-center py-16">
                                <p className="font-serif text-xl">Für die ausgewählten Kriterien wurden keine Produkte gefunden.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {urunler.map((urun) => (
                                    <ProductCard 
                                        key={urun.id} 
                                        urun={urun} 
                                        lang={lang}
                                        linkHref={`/produkte/${urun.id}`}
                                    />
                                ))}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}