import HeroSection from "@/components/HeroSection";
import PhilosophySection from "@/components/PhilosophySection";
import CategoryShowcase from "@/components/CategoryShowcase";
import TestimonialsSection from "@/components/TestimonialsSection";
import QualityPromiseSection from "@/components/QualityPromiseSection"; // Yeni bileşeni import ettik
import CtaSection from "@/components/CtaSection";
import { dictionary } from "@/dictionaries/de";

export default function Home() {
  return (
    <>
      <HeroSection dictionary={dictionary} />
      <PhilosophySection dictionary={dictionary} />
      <CategoryShowcase dictionary={dictionary} />
      <TestimonialsSection dictionary={dictionary} />
      <QualityPromiseSection dictionary={dictionary} /> {/* Yeni bölümü ekledik */}
      <CtaSection dictionary={dictionary} />
    </>
  );
}

