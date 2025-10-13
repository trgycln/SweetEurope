// src/app/[locale]/page.tsx

import HeroSection from "@/components/HeroSection";
import PhilosophySection from "@/components/PhilosophySection";
import CategoryShowcase from "@/components/CategoryShowcase";
import TestimonialsSection from "@/components/TestimonialsSection";
import QualityPromiseSection from "@/components/QualityPromiseSection";
import CtaSection from "@/components/CtaSection";
import { getDictionary } from "@/dictionaries";

export default async function Home({ params }: { params: { locale: any } }) {
  const dictionary = await getDictionary(params.locale);
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