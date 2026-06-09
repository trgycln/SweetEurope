import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { UrunDetayGorunumu } from '@/components/urun-detay-gorunumu';
import { Locale } from '@/lib/utils';
import { Tables } from '@/lib/supabase/database.types';
import { buildHiddenPublicCategoryIds } from '@/lib/public-category-visibility';
import type { Metadata } from 'next';

// Typ für die Sablon-Daten
type Sablon = {
    alan_adi: string;
    gosterim_adi: string;
};

// Typ für Urun mit Kategorie
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
            .select('ad, aciklamalar, seo_meta, ana_resim_url, kategoriler (id, slug, ust_kategori_id)')
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
        return { title: 'Product Not Found | Sweet Heaven' };
    }

    const seoMeta = (urun as any).seo_meta as { title?: Record<string, string>; description?: Record<string, string> } | null;

    const adJson = (urun as any).ad as Record<string, string> | null;
    const urunAdi = adJson?.[locale] ?? adJson?.['de'] ?? adJson?.['tr'] ?? '';
    const aciklamaJson = (urun as any).aciklamalar as Record<string, string> | null;
    const aciklama = aciklamaJson?.[locale] ?? aciklamaJson?.['de'] ?? aciklamaJson?.['tr'] ?? '';

    const title = seoMeta?.title?.[locale] ?? seoMeta?.title?.['de'] ?? `${urunAdi} | ElysonSweets`;
    const description = seoMeta?.description?.[locale] ?? seoMeta?.description?.['de'] ?? aciklama.slice(0, 160);

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: (urun as any).ana_resim_url ? [(urun as any).ana_resim_url] : [],
            locale,
            type: 'website',
        },
    };
}

export default async function PublicUrunDetayPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { locale, slug } = await params;

    // Produkt parallel abrufen
    const [{ data: urunData }, { data: allCategories }] = await Promise.all([
        supabase
            .from('urunler')
            // Kategorie-Daten (ust_kategori_id dahil)
            .select(`*, kategoriler (id, ad, slug, ust_kategori_id, urun_gami)`)
            .eq('slug', slug)
            .eq('aktif', true) // Only show active products
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

    // Calculate actual review statistics from urun_degerlendirmeleri table - kept for potential future use
    // Review section removed for B2B focus

    const kategoriId = urun.kategoriler?.id;
    const parentId = (urun.kategoriler as any)?.ust_kategori_id as string | undefined;
    let ozellikSablonu: Sablon[] = [];

    if (kategoriId) {
        // 1) Önce alt kategorinin şablonunu dene
        const { data: directTemplate } = await supabase
            .from('kategori_ozellik_sablonlari' as any)
            .select('alan_adi, gosterim_adi, sira')
            .eq('kategori_id', kategoriId)
            .order('sira');

        if (directTemplate && directTemplate.length > 0) {
            ozellikSablonu = directTemplate as any;
        } else if (parentId) {
            // 2) Alt kategoride yoksa ebeveyn şablonuna düş
            const { data: parentTemplate } = await supabase
                .from('kategori_ozellik_sablonlari' as any)
                .select('alan_adi, gosterim_adi, sira')
                .eq('kategori_id', parentId)
                .order('sira');
            ozellikSablonu = (parentTemplate || []) as any;
        }
    }

    // Google Rich Snippets (Schema.org / JSON-LD)
    const adJson = (urun as any).ad as Record<string, string> | null;
    const urunAdi = adJson?.[locale] ?? adJson?.['de'] ?? adJson?.['tr'] ?? '';
    const aciklamaJson = (urun as any).aciklamalar as Record<string, string> | null;
    const aciklama = aciklamaJson?.[locale] ?? aciklamaJson?.['de'] ?? aciklamaJson?.['tr'] ?? '';

    const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": urunAdi,
        "image": (urun as any).ana_resim_url ? [(urun as any).ana_resim_url] : [],
        "description": aciklama,
        "brand": {
            "@type": "Brand",
            "name": "ElysonSweets"
        },
        "offers": {
            "@type": "Offer",
            "availability": "https://schema.org/InStock",
            "priceCurrency": "EUR",
            "price": "0", // Gizli B2B fiyati
            "url": `https://sweetheaven.de/${locale}/products/${slug}`,
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
    if ((urun as any).stok_kodu) {
        (productSchema as any).sku = (urun as any).stok_kodu;
    }
    if ((urun as any).ean_gtin) {
        (productSchema as any).gtin13 = (urun as any).ean_gtin;
    }

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
            />
            <UrunDetayGorunumu
                urun={urun as any}
                ozellikSablonu={ozellikSablonu as any}
                locale={locale}
            />
        </>
    );
}