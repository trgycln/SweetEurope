// src/app/[locale]/products/[slug]/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/dictionaries';
import { notFound } from 'next/navigation';
import Image from 'next/image';

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
        return notFound();
    }

    // @ts-ignore
    const kategoriId = urun.kategoriler?.id;

    // GÜNCELLEME: Artık "gosterim_adi" sütununun tamamını (JSONB objesi) çekiyoruz.
    const { data: gosterilecekOzellikler } = await supabase
        .from('kategori_ozellik_sablonlari')
        .select('alan_adi, gosterim_adi')
        .eq('kategori_id', kategoriId)
        .eq('public_gorunur', true)
        .order('sira');

    const pageContent = dictionary.productDetailPage;

    return (
        <div className="bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                    
                    {/* Ürün Resim Galerisi (Değişiklik yok) */}
                    <div className="sticky top-24">
                        {/* ... galeri kodları aynı ... */}
                    </div>

                    {/* Ürün Bilgileri */}
                    <div>
                        <h1 className="text-4xl lg:text-5xl font-serif font-bold text-primary">
                            {urun.ad?.[locale] || urun.ad?.['de']}
                        </h1>
                        
                        <div className="mt-4 text-3xl font-light text-gray-800">
                            {urun.satis_fiyati_musteri?.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </div>

                        {urun.aciklamalar?.[locale] && (
                            <div className="mt-6 prose max-w-none text-gray-600">
                                <p>{urun.aciklamalar[locale]}</p>
                            </div>
                        )}
                        
                        {/* DİNAMİK TEKNİK ÖZELLİKLER (GÜNCELLENDİ) */}
                        {gosterilecekOzellikler && gosterilecekOzellikler.length > 0 && (
                            <div className="mt-8 pt-6 border-t">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">{pageContent.tabDetails}</h3>
                                <dl className="space-y-2">
                                    {gosterilecekOzellikler.map(ozellik => {
                                        const deger = urun.teknik_ozellikler?.[ozellik.alan_adi];
                                        if (!deger) return null;

                                        return (
                                            <div key={ozellik.alan_adi} className="grid grid-cols-2 gap-4 text-sm">
                                                {/* GÜNCELLEME: Artık 'gosterim_adi' objesinden aktif dile göre metni çekiyoruz. */}
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
                    </div>
                </div>
            </div>
        </div>
    );
}