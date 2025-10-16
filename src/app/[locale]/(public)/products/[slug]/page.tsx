// src/app/[locale]/products/[slug]/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/dictionaries';
import { notFound } from 'next/navigation';
import { UrunGalerisi } from './urun-galerisi'; // İnteraktif galeri bileşenini import et

export default async function PublicUrunDetayPage({ params }: { params: { locale: string; slug: string } }) {
    const supabase = createSupabaseServerClient();
    const { locale, slug } = params;

    const [dictionary, { data: urun }] = await Promise.all([
        getDictionary(locale as any),
        supabase
            .from('urunler')
            .select(`*, kategoriler (id)`)
            .eq('slug', slug)
            .eq('aktif', true)
            .single()
    ]);

    if (!urun) {
        return notFound(); // Ürün bulunamazsa veya aktif değilse 404
    }

    // @ts-ignore
    const kategoriId = urun.kategoriler?.id;

    // Ürünün kategorisine ait ve "public_gorunur" olarak işaretlenmiş özellikleri çek
    const { data: gosterilecekOzellikler } = await supabase
        .from('kategori_ozellik_sablonlari')
        .select('alan_adi, gosterim_adi')
        .eq('kategori_id', kategoriId)
        .eq('public_gorunur', true)
        .order('sira');

    const pageContent = dictionary.productDetailPage;

    return (
        <div className="bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
                    
                    {/* Sol Taraf: Ürün Resim Galerisi */}
                    <UrunGalerisi 
                        anaResim={urun.ana_resim_url} 
                        galeri={urun.galeri_resim_urls} 
                        urunAdi={urun.ad?.[locale] || 'Ürün Resmi'} 
                    />

                    {/* Sağ Taraf: Ürün Bilgileri */}
                    <div className="space-y-6">
                        <h1 className="text-4xl lg:text-5xl font-serif font-bold text-primary leading-tight">
                            {urun.ad?.[locale] || urun.ad?.['de']}
                        </h1>
                        
                        <div className="text-3xl font-light text-gray-800">
                            {urun.satis_fiyati_musteri?.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </div>

                        {/* Açıklama */}
                        {urun.aciklamalar?.[locale] && (
                            <div className="prose max-w-none text-gray-600">
                                <p>{urun.aciklamalar[locale]}</p>
                            </div>
                        )}
                        
                        {/* Dinamik Teknik Özellikler */}
                        {gosterilecekOzellikler && gosterilecekOzellikler.length > 0 && (
                            <div className="mt-8 pt-6 border-t">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">{pageContent.tabDetails}</h3>
                                <dl className="space-y-3">
                                    {gosterilecekOzellikler.map(ozellik => {
                                        // Ürünün teknik_ozellikler JSON'ından ilgili değeri bul
                                        const deger = urun.teknik_ozellikler?.[ozellik.alan_adi];
                                        if (!deger) return null; // Değeri olmayan özellikleri gösterme

                                        return (
                                            <div key={ozellik.alan_adi} className="grid grid-cols-2 gap-4 text-sm">
                                                <dt className="text-gray-500">
                                                    {ozellik.gosterim_adi?.[locale] || ozellik.gosterim_adi?.['tr']}:
                                                </dt>
                                                <dd className="font-semibold text-gray-800">{deger}</dd>
                                            </div>
                                        );
                                    })}
                                </dl>
                            </div>
                        )}

                        {/* Müşteri Portalı için "Sepete Ekle" Butonu (şimdilik gizli) */}
                        {/* <div className="mt-8">
                            <button className="w-full px-8 py-3 bg-accent text-white rounded-lg font-bold text-lg hover:bg-opacity-90 transition-all">
                                {pageContent.addToCart}
                            </button>
                        </div> 
                        */}
                    </div>
                </div>
            </div>
        </div>
    );
}
