// app/[locale]/(public)/page.tsx (DÜZELTİLMİŞ)

import HeroSection from "@/components/HeroSection";
import PhilosophySection from "@/components/PhilosophySection";
import CategoryShowcase from "@/components/CategoryShowcase";
import TestimonialsSection from "@/components/TestimonialsSection";
import QualityPromiseSection from "@/components/QualityPromiseSection";
import CtaSection from "@/components/CtaSection";
import { getDictionary } from "@/dictionaries";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { cookies } from "next/headers";

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
    
    const { data: kategoriler } = await supabase
        .from('kategoriler')
        .select('id, slug, ad, image_url, sira')
        .eq('ust_kategori_id', null) // Sadece ana kategoriler
        .order('sira', { ascending: true });
    
    return (
        <>
            <HeroSection dictionary={dictionary} />
            <PhilosophySection dictionary={dictionary} />
            <CategoryShowcase 
                dictionary={dictionary} 
                locale={locale}
                categories={kategoriler || []} 
            />
            <TestimonialsSection dictionary={dictionary} />
            <QualityPromiseSection dictionary={dictionary} />
            <CtaSection dictionary={dictionary} />
        </>
    );
}