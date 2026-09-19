// app/[locale]/(public)/page.tsx

import HeroSection from "@/components/HeroSection";
import StatsBar from "@/components/StatsBar";
import FeaturedProductsSection from "@/components/FeaturedProductsSection";
import PhilosophySection from "@/components/PhilosophySection";
import FoBrandAboutSection from "@/components/FoBrandAboutSection";
import QualityPromiseSection from "@/components/QualityPromiseSection";
import CtaSection from "@/components/CtaSection";
import { getDictionary } from "@/dictionaries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import fs from "node:fs";
import path from "node:path";
import type { Metadata } from 'next';
import { 
    PUBLIC_VISIBLE_MAIN_CATEGORY_ORDER, 
    isPublicCategorySlugHidden 
} from "@/lib/public-category-visibility";

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}): Promise<Metadata> {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as any);
  
  return {
    title: dictionary.seo?.home?.title || 'Elysion Sweets',
    description: dictionary.seo?.home?.description || '',
    openGraph: {
      title: dictionary.seo?.home?.title || 'Elysion Sweets',
      description: dictionary.seo?.home?.description || '',
      locale: locale,
      type: 'website',
    },
  };
}

export default async function Home({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
    const { locale } = await params;
    const dictionary = await getDictionary(locale as any);
    
    // Kategorileri database'den çek
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    
    // Sadece ana kategoriler
    const { data: kategoriler } = await supabase
        .from('kategoriler')
        .select('id, slug, ad, ust_kategori_id')
        .is('ust_kategori_id', null)
        .order('id', { ascending: true });

    // Tüm kategorileri çek (ana + alt) - parent bilgisi için
    const { data: tumKategoriler } = await supabase
        .from('kategoriler')
        .select('id, slug, ad, ust_kategori_id');

    // Sadece aktif ürünleri çek
    const { data: urunler } = await supabase
        .from('urunler')
        .select('kategori_id')
        .eq('aktif', true);

    // Kategori hiyerarşisinde yukarı doğru recursive ürün sayımı
    const kategoriParentLookup = new Map(tumKategoriler?.map(k => [k.id, k.ust_kategori_id ?? null]) || []);
    const categoryProductCounts: Record<string, number> = {};
    if (urunler) {
        urunler.forEach((urun: any) => {
            const categoryId = urun.kategori_id;
            if (!categoryId) return;
            let current: string | null = categoryId;
            let guard = 0;
            while (current && guard++ < 10) {
                categoryProductCounts[current] = (categoryProductCounts[current] || 0) + 1;
                current = kategoriParentLookup.get(current) ?? null;
            }
        });
    }
    
    // Anasayfada sergilenecek 6 ana B2B kategorisi
    const CORE_CATEGORY_SLUGS = [
        'syrups',
        'cafe-bar-sauces',
        'powdered-beverages',
        'premium',
        'cocktail-mixes',
        'foamer'
    ];

    const selectedKategoriler = CORE_CATEGORY_SLUGS
        .map(slug => tumKategoriler?.find(k => k.slug === slug))
        .filter((k): k is NonNullable<typeof k> => k != null && (categoryProductCounts[k.id] || 0) > 0);

    // Determine image_url based on file existence (prefer webp, then jpg, then jpeg/JPEG)
    const kategorilerWithImages = selectedKategoriler.map((kategori) => {
        const slug = kategori.slug || '';
        const baseFilename = slug;

        const candidates = [
            `${baseFilename}.webp`,
            `${baseFilename}.jpg`,
            `${baseFilename}.jpeg`,
            `${baseFilename}.JPEG`,
        ];

        let image_url = '/placeholder-category.jpg';
        for (const name of candidates) {
            const p = path.join(process.cwd(), 'public', 'categories', name);
            if (fs.existsSync(p)) {
                image_url = `/categories/${name}`;
                break;
            }
        }

        return {
            ...kategori,
            image_url,
            productCount: categoryProductCounts[kategori.id] || 0,
        };
    });

    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "ElysonSweets",
        "url": "https://elysonsweets.de",
        "logo": "https://elysonsweets.de/logo.png",
        "description": dictionary.seo?.home?.description || 'Premium distributor of pastry and coffee syrups.',
        "knowsAbout": ["Fo Syrups", "B2B Gastronomy", "Coffee Syrups", "Pastry Products"],
        "brand": [
            {
                "@type": "Brand",
                "name": "Fo"
            },
            {
                "@type": "Brand",
                "name": "Limpo"
            },
            {
                "@type": "Brand",
                "name": "Repo"
            }
        ]
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
            <HeroSection dictionary={dictionary} locale={locale} />
            <StatsBar dictionary={dictionary} />
            <FeaturedProductsSection dictionary={dictionary} locale={locale} />
            <FoBrandAboutSection locale={locale} dictionary={dictionary} anaKategoriler={kategorilerWithImages} />
            <PhilosophySection dictionary={dictionary} />
            {/* <TestimonialsSection dictionary={dictionary} /> */}
            <QualityPromiseSection dictionary={dictionary} />
            <CtaSection dictionary={dictionary} locale={locale} />
        </>
    );
}