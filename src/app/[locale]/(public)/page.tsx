// app/[locale]/(public)/page.tsx (DÜZELTİLMİŞ)

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

// DEĞİŞİKLİK: Fonksiyon imzasını güncelledik.
export default async function Home({ 
  params 
}: { 
  params: { locale: string } 
}) {
    // DEĞİŞİKLİK: 'locale'i fonksiyonun gövdesi içinde alıyoruz.
    const { locale } = params;
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
    
    // Debug: Server-side log
    console.log('Homepage - Kategoriler count:', kategoriler?.length);
    console.log('Homepage - Kategoriler:', JSON.stringify(kategoriler, null, 2));
    if (error) {
        console.error('Homepage - Supabase error:', JSON.stringify(error, null, 2));
    }
    // Public klasöründe gerçek dosyayı kontrol ederek image_url oluştur
    const kategorilerWithImages = (kategoriler || []).map((k: any) => {
        const base = k.slug as string;
        const jpegFsPath = path.join(process.cwd(), 'public', 'categories', `${base}.JPEG`);
        const jpgFsPath = path.join(process.cwd(), 'public', 'categories', `${base}.jpg`);

        let image_url = '/placeholder-category.jpg';
        if (fs.existsSync(jpegFsPath)) {
            image_url = `/categories/${base}.JPEG`;
        } else if (fs.existsSync(jpgFsPath)) {
            image_url = `/categories/${base}.jpg`;
        }

        return { ...k, image_url };
    });

    return (
        <>
            <HeroSection dictionary={dictionary} />
            <PhilosophySection dictionary={dictionary} />
            <CategoryShowcase 
                dictionary={dictionary} 
                locale={locale}
                categories={kategorilerWithImages as any} 
            />
            <TestimonialsSection dictionary={dictionary} />
            <QualityPromiseSection dictionary={dictionary} />
            <CertificationsStrip dictionary={dictionary} />
            <CtaSection dictionary={dictionary} />
        </>
    );
}