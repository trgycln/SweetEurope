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

    // Ürüne Özel Dinamik Hreflang (Kopya içerik cezasını engeller)
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

    // Kusursuzlaştırılmış Tekil Product Schema (Çift schema sorunu çözüldü)
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
            // B2B fiyatı gizli olduğu için price parametresi tamamen kaldırıldı (Google "Bedava" sanmasın diye)
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
            <UrunDetayGorunumu
                urun={urun as any}
                ozellikSablonu={ozellikSablonu as any}
                locale={locale}
                dict={dictionary}
            />
        </>
    );
}