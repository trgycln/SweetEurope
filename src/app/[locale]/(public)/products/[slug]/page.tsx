import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { UrunDetayGorunumu } from '@/components/urun-detay-gorunumu';
import MetaPixelViewContent from '@/components/MetaPixelViewContent';
import { Locale } from '@/lib/utils';
import { Tables } from '@/lib/supabase/database.types';
import { buildHiddenPublicCategoryIds } from '@/lib/public-category-visibility';
import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import Breadcrumbs from '@/components/seo/Breadcrumbs';
import RelatedProducts from '@/components/products/RelatedProducts';
import ProductRecipes from '@/components/products/ProductRecipes';
import Link from 'next/link';
import { FiCoffee, FiArrowRight } from 'react-icons/fi';

type Sablon = {
    alan_adi: string;
    gosterim_adi: string;
};

type UrunWithKategorie = Tables<'urunler'> & {
    kategoriler?: Pick<Tables<'kategoriler'>, 'id' | 'slug' | 'ust_kategori_id'> | null;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }): Promise<Metadata> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { locale, slug } = await params;

    const [{ data: urun }, { data: allCategories }] = await Promise.all([
        supabase
            .from('urunler')
            .select('ad, aciklamalar, seo_meta, ana_resim_url, slug, id, kategoriler (id, slug, ust_kategori_id)')
            .eq('slug', slug)
            .eq('aktif', true)
            .single(),
        supabase
            .from('kategoriler')
            .select('id, slug, ust_kategori_id')
    ]);

    const hiddenKategoriIds = buildHiddenPublicCategoryIds((allCategories || []) as any[]);
    const productKategoriId = (urun as any)?.kategoriler?.id as string | undefined;

    if (!urun || hiddenKategoriIds.has(productKategoriId || '')) {
        return { title: 'Product Not Found | Elysonsweets' };
    }

    const seoMeta = (urun as any).seo_meta as { title?: Record<string, string>; description?: Record<string, string> } | null;

    const adJson = (urun as any).ad as Record<string, string> | null;
    const urunAdi = adJson?.[locale] ?? adJson?.['de'] ?? adJson?.['tr'] ?? '';
    const aciklamaJson = (urun as any).aciklamalar as Record<string, string> | null;
    const aciklama = aciklamaJson?.[locale] ?? aciklamaJson?.['de'] ?? aciklamaJson?.['tr'] ?? '';

    const title = seoMeta?.title?.[locale] ?? seoMeta?.title?.['de'] ?? `${urunAdi} | Elysonsweets`;
    const description = seoMeta?.description?.[locale] ?? seoMeta?.description?.['de'] ?? aciklama.slice(0, 160);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elysonsweets.de';
    const productSlug = (urun as any).slug || (urun as any).id;
    const productUrl = `${baseUrl}/${locale}/products/${productSlug}`;

    const languages: Record<string, string> = {};
    ['de', 'en', 'tr', 'ar'].forEach((l) => {
        languages[l] = `${baseUrl}/${l}/products/${productSlug}`;
    });
    languages['x-default'] = `${baseUrl}/de/products/${productSlug}`;

    return {
        title,
        description,
        alternates: {
            canonical: productUrl,
            languages,
        },
        openGraph: {
            title: urunAdi,
            description: aciklama,
            url: productUrl,
            siteName: 'Elysonsweets GmbH',
            images: [
                {
                    url: (urun as any).ana_resim_url || `${baseUrl}/default-og-image.jpg`,
                    width: 1200,
                    height: 630,
                    alt: urunAdi,
                },
            ],
            locale: locale,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: urunAdi,
            description: aciklama,
            images: [(urun as any).ana_resim_url || `${baseUrl}/default-og-image.jpg`],
        },
    };
}

export default async function PublicUrunDetayPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { locale, slug } = await params;

    const [{ data: urunData }, { data: allCategories }] = await Promise.all([
        supabase
            .from('urunler')
            .select(`*, kategoriler (id, ad, slug, ust_kategori_id, urun_gami)`)
            .eq('slug', slug)
            .eq('aktif', true)
            .single(),
        supabase
            .from('kategoriler')
            .select('id, slug, ust_kategori_id, urun_gami')
    ]);

    const urun = urunData as UrunWithKategorie | null;
    const hiddenKategoriIds = buildHiddenPublicCategoryIds((allCategories || []) as any[]);

    if (!urun || hiddenKategoriIds.has(urun.kategoriler?.id || '')) {
        return notFound();
    }

    const kategoriId = urun.kategoriler?.id;
    const parentId = (urun.kategoriler as any)?.ust_kategori_id as string | undefined;
    let ozellikSablonu: Sablon[] = [];

    if (kategoriId) {
        const { data: directTemplate } = await supabase
            .from('kategori_ozellik_sablonlari' as any)
            .select('alan_adi, gosterim_adi, sira')
            .eq('kategori_id', kategoriId)
            .order('sira');

        if (directTemplate && directTemplate.length > 0) {
            ozellikSablonu = directTemplate as any;
        } else if (parentId) {
            const { data: parentTemplate } = await supabase
                .from('kategori_ozellik_sablonlari' as any)
                .select('alan_adi, gosterim_adi, sira')
                .eq('kategori_id', parentId)
                .order('sira');
            ozellikSablonu = (parentTemplate || []) as any;
        }
    }

    const adJson = (urun as any).ad as Record<string, string> | null;
    const urunAdi = adJson?.[locale] ?? adJson?.['de'] ?? adJson?.['tr'] ?? '';
    const aciklamaJson = (urun as any).aciklamalar as Record<string, string> | null;
    const aciklama = aciklamaJson?.[locale] ?? aciklamaJson?.['de'] ?? aciklamaJson?.['tr'] ?? '';

    const { getDictionary } = await import('@/dictionaries');
    const dictionary = await getDictionary(locale);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elysonsweets.de';
    const productSlug = (urun as any).slug || (urun as any).id;

    const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": urunAdi,
        "image": (urun as any).ana_resim_url ? [(urun as any).ana_resim_url] : [],
        "description": aciklama,
        "sku": (urun as any).stok_kodu || productSlug,
        ...((urun as any).ean_gtin && { "gtin13": (urun as any).ean_gtin }),
        "brand": {
            "@type": "Brand",
            "name": urunAdi.toLowerCase().includes('limpo') ? 'Limpo' : urunAdi.toLowerCase().includes('repo') ? 'Repo' : urunAdi.toLowerCase().includes('core') ? 'Core' : urunAdi.toLowerCase().includes('fümer') ? 'Fümer' : 'Fo'
        },
        "offers": {
            "@type": "Offer",
            "availability": "https://schema.org/InStock",
            "url": `${baseUrl}/${locale}/products/${productSlug}`,
            "seller": {
                "@type": "Organization",
                "name": "Elysonsweets GmbH"
            },
            "hasMerchantReturnPolicy": {
                "@type": "MerchantReturnPolicy",
                "applicableCountry": "DE",
                "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
                "merchantReturnDays": 14,
                "returnMethod": "https://schema.org/ReturnByMail",
                "returnFees": "https://schema.org/FreeReturn"
            },
            "shippingDetails": {
                "@type": "OfferShippingDetails",
                "shippingRate": {
                    "@type": "MonetaryAmount",
                    "value": "0",
                    "currency": "EUR"
                },
                "shippingDestination": {
                    "@type": "DefinedRegion",
                    "addressCountry": "DE"
                },
                "deliveryTime": {
                    "@type": "ShippingDeliveryTime",
                    "handlingTime": {
                        "@type": "QuantitativeValue",
                        "minValue": 0,
                        "maxValue": 2,
                        "unitCode": "d"
                    },
                    "transitTime": {
                        "@type": "QuantitativeValue",
                        "minValue": 1,
                        "maxValue": 3,
                        "unitCode": "d"
                    }
                }
            }
        }
    };

    const kategoriAdi = (urun as any)?.kategoriler?.ad?.[locale] ?? (urun as any)?.kategoriler?.ad?.['de'] ?? undefined;

    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', url: `${baseUrl}/${locale}` },
                    { name: 'Products', url: `${baseUrl}/${locale}/products` },
                    ...(kategoriAdi ? [{ name: kategoriAdi, url: `${baseUrl}/${locale}/products?kategori=${(urun as any).kategoriler?.slug}` }] : []),
                    { name: urunAdi, url: `${baseUrl}/${locale}/products/${productSlug}` }
                ]}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
            />
            <MetaPixelViewContent
                contentId={urun.id ?? ''}
                contentName={urunAdi}
                contentCategory={kategoriAdi}
            />
            
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <Breadcrumbs 
                    locale={locale}
                    items={[
                        { label: locale === 'tr' ? 'Ürünler' : locale === 'en' ? 'Products' : locale === 'ar' ? 'منتجات' : 'Produkte', href: '/products' },
                        ...(kategoriAdi ? [{ label: kategoriAdi, href: `/products?kategori=${(urun as any).kategoriler?.slug}` }] : []),
                        { label: urunAdi, href: `/products/${productSlug}` }
                    ]}
                />
            </div>

            <UrunDetayGorunumu
                urun={urun as any}
                ozellikSablonu={ozellikSablonu as any}
                locale={locale}
                dict={dictionary}
            />

            {/* GEO & UX: Barista AI Cross-Selling Banner */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                <div className="bg-stone-900 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-xl">
                    {/* Dekoratif Arka Plan */}
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="relative z-10 max-w-2xl">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-widest rounded-md border border-amber-500/30">
                                {locale === 'tr' ? 'Barista Seçkisi' : 'Barista Inspiration'}
                            </span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-serif font-bold text-white mb-3 leading-tight">
                            {locale === 'tr' 
                                ? `${urunAdi} ile İmza İçecekler Yaratın` 
                                : `Kreieren Sie Signature Drinks mit ${urunAdi}`}
                        </h3>
                        <p className="text-stone-400 text-sm md:text-base leading-relaxed">
                            {locale === 'tr'
                                ? 'Reçete Sihirbazımızı kullanarak bu ürüne özel, kafenizin menüsüne ekleyebileceğiniz profesyonel reçeteler oluşturun ve PDF menü olarak indirin.'
                                : 'Nutzen Sie unseren Rezept-Assistenten, um professionelle Signature-Rezepte für dieses Produkt zu erstellen und als PDF für Ihr Café-Menü herunterzuladen.'}
                        </p>
                    </div>

                    <div className="relative z-10 shrink-0 w-full md:w-auto">
                        <Link 
                            href={`/${locale}/barista-ai?ingredient=${encodeURIComponent(urunAdi)}&productId=${urun.id}`}
                            className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold py-4 px-8 rounded-xl transition-all duration-300 w-full md:w-auto shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:-translate-y-1"
                        >
                            <FiCoffee size={20} />
                            {locale === 'tr' ? 'Reçete Sihirbazını Başlat' : 'Rezept-Assistent starten'}
                            <FiArrowRight size={20} />
                        </Link>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                <ProductRecipes locale={locale} productId={urun.id || ''} />
                {kategoriId && (
                    <RelatedProducts locale={locale} categoryId={kategoriId} currentProductId={urun.id || ''} />
                )}
            </div>
        </>
    );
}