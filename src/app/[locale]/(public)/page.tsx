// app/[locale]/(public)/page.tsx

import HeroSection from "@/components/HeroSection";
import PhilosophySection from "@/components/PhilosophySection";
import FoBrandAboutSection from "@/components/FoBrandAboutSection";
import QualityPromiseSection from "@/components/QualityPromiseSection";
import CertificationsStrip from "@/components/CertificationsStrip";
import CtaSection from "@/components/CtaSection";
import { getDictionary } from "@/dictionaries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import fs from "node:fs";
import path from "node:path";
import type { Metadata } from 'next';
import { PUBLIC_VISIBLE_MAIN_CATEGORY_ORDER } from "@/lib/public-category-visibility";

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
    
    // Sadece mevcut kolonları çek
    const { data: kategoriler, error } = await supabase
        .from('kategoriler')
        .select('id, slug, ad, ust_kategori_id')
        .is('ust_kategori_id', null) // Sadece ana kategoriler
        .order('id', { ascending: true }); // id'ye göre sırala

    // Tüm kategorileri çek (ana + alt) - parent bilgisi için
    const { data: tumKategoriler } = await supabase
        .from('kategoriler')
        .select('id, slug, ad, ust_kategori_id');

    // Sadece aktif ürünleri çek
    const { data: urunler } = await supabase
        .from('urunler')
        .select('kategori_id')
        .eq('aktif', true); // Sadece aktif ürünleri say

    // Kategori ID'lerine göre ürün sayısını hesapla (ana kategori + alt kategorilerindeki ürünler)
    const categoryProductCounts: Record<string, number> = {};
    const kategoriMap = new Map(tumKategoriler?.map(k => [k.id, k.ust_kategori_id]) || []);
    
    if (urunler) {
        urunler.forEach((urun: any) => {
            const categoryId = urun.kategori_id;
            if (!categoryId) return;
            
            const parentId = kategoriMap.get(categoryId);
            
            // Alt kategoriyse, hem kendisine hem ana kategoriye say
            if (parentId) {
                categoryProductCounts[parentId] = (categoryProductCounts[parentId] || 0) + 1;
            }
            // Her ürünü kendi kategorisine say
            categoryProductCounts[categoryId] = (categoryProductCounts[categoryId] || 0) + 1;
        });
    }
    
    // Show all real root categories, sorted by known order first then alphabetically
    const filteredKategoriler = (kategoriler || []).sort((a, b) => {
        const ai = PUBLIC_VISIBLE_MAIN_CATEGORY_ORDER.indexOf((a.slug ?? '') as any);
        const bi = PUBLIC_VISIBLE_MAIN_CATEGORY_ORDER.indexOf((b.slug ?? '') as any);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        const nameA = (a.ad as any)?.de || (a.ad as any)?.tr || '';
        const nameB = (b.ad as any)?.de || (b.ad as any)?.tr || '';
        return nameA.localeCompare(nameB);
    });

    // Determine image_url based on file existence (prefer webp, then jpg, then jpeg/JPEG)
    const kategorilerWithImages = filteredKategoriler.map((kategori) => {
        const slug = kategori.slug || '';
        const baseFilename = slug; // Expect image file names to match slug

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

    // Alt kategorileri hesapla
    const altKategorilerMap: Record<string, { id: string; slug: string | null; ad: any; productCount: number }[]> = {};
    (tumKategoriler || []).forEach(k => {
        if (k.ust_kategori_id) {
            if (!altKategorilerMap[k.ust_kategori_id]) {
                altKategorilerMap[k.ust_kategori_id] = [];
            }
            altKategorilerMap[k.ust_kategori_id].push({
                ...k,
                productCount: categoryProductCounts[k.id] || 0,
            });
        }
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
            <PhilosophySection dictionary={dictionary} />
            <FoBrandAboutSection locale={locale} dictionary={dictionary} altKategorilerMap={altKategorilerMap} />
            {/* <TestimonialsSection dictionary={dictionary} /> */}
            <QualityPromiseSection dictionary={dictionary} />
            <CertificationsStrip dictionary={dictionary} />
            <CtaSection dictionary={dictionary} locale={locale} />
        </>
    );
}