// app/[locale]/(public)/page.tsx

import HeroSection from "@/components/HeroSection";
import PhilosophySection from "@/components/PhilosophySection";
import CategoryShowcase from "@/components/CategoryShowcase";
import TestimonialsSection from "@/components/TestimonialsSection";
import QualityPromiseSection from "@/components/QualityPromiseSection";
import CertificationsStrip from "@/components/CertificationsStrip";
import CtaSection from "@/components/CtaSection";
import { getDictionary } from "@/dictionaries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import fs from "node:fs";
import path from "node:path";

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
        .select('id, ust_kategori_id');

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
    
    // Show only the curated 6 main categories (order fixed)
    const desiredSlugs = [
        'cakes-and-tarts',
        'cookies-and-muffins',
        'pizza-and-fast-food',
        'sauces-and-ingredients',
        'coffee',
        'drinks',
    ];

    const filteredKategoriler = (kategoriler || [])
        .filter(k => desiredSlugs.includes((k.slug ?? '')))
        .sort((a, b) => desiredSlugs.indexOf(a.slug ?? '') - desiredSlugs.indexOf(b.slug ?? ''));

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

    return (
        <>
            <HeroSection dictionary={dictionary} locale={locale} />
            <PhilosophySection dictionary={dictionary} />
            <CategoryShowcase 
                dictionary={dictionary} 
                locale={locale}
                categories={kategorilerWithImages as any} 
            />
            <TestimonialsSection dictionary={dictionary} />
            <QualityPromiseSection dictionary={dictionary} />
            <CertificationsStrip dictionary={dictionary} />
            <CtaSection dictionary={dictionary} locale={locale} />
        </>
    );
}