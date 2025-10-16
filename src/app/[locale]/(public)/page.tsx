// app/[locale]/(public)/page.tsx (DÜZELTİLMİŞ)

import HeroSection from "@/components/HeroSection";
import PhilosophySection from "@/components/PhilosophySection";
import CategoryShowcase from "@/components/CategoryShowcase";
import TestimonialsSection from "@/components/TestimonialsSection";
import QualityPromiseSection from "@/components/QualityPromiseSection";
import CtaSection from "@/components/CtaSection";
import { getDictionary } from "@/dictionaries";

// DEĞİŞİKLİK: Fonksiyon imzasını güncelledik.
export default async function Home({ 
  params 
}: { 
  params: { locale: string } 
}) {
    // DEĞİŞİKLİK: 'locale'i fonksiyonun gövdesi içinde alıyoruz.
    const { locale } = params;
    const dictionary = await getDictionary(locale as any);
    
    return (
        <>
            <HeroSection dictionary={dictionary} />
            <PhilosophySection dictionary={dictionary} />
            <CategoryShowcase dictionary={dictionary} />
            <TestimonialsSection dictionary={dictionary} />
            <QualityPromiseSection dictionary={dictionary} />
            <CtaSection dictionary={dictionary} />
        </>
    );
}