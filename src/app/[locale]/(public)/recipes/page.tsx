import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { Wand2 } from 'lucide-react';
import { recipesListingT, Locale } from '@/lib/i18n/pages';
import RecipeGrid from '@/components/recipes/RecipeGrid';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = recipesListingT[(locale as Locale)] ?? recipesListingT.de;
  const { getI18nAlternates } = await import('@/lib/seo-utils');
  return {
    title: t.metaTitle,
    description: t.metaDesc,
    alternates: getI18nAlternates('recipes'),
  };
}

export default async function RecipesHubPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { category } = await searchParams;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const t = recipesListingT[(locale as Locale)] ?? recipesListingT.de;

  let query = supabase
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false });

  // Tüm veriyi client-side'da arama/filtreleme yapabilmek için çekiyoruz.

  const { data: recipes } = await query;

  const categories = ['all', 'coffee', 'cocktail', 'mocktail', 'smoothie'];
  const initialCategory = category && categories.includes(category) ? category : 'all';

  // Randomize hero image from a curated list of high-end Pexels/Unsplash IDs
  const heroImages = [
    "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=2000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=2000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1542475027-e435e0c5f214?q=80&w=2000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=2000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=2000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2000&auto=format&fit=crop"
  ];
  const randomHeroImage = heroImages[Math.floor(Math.random() * heroImages.length)];

  return (
    <div className="min-h-screen bg-[#FBF9F5] pb-20">
      {/* Editorial Hero Section */}
      <section className="relative w-full min-h-[550px] md:min-h-[650px] mb-16 overflow-hidden">
        <Image
          src={randomHeroImage}
          alt="Premium Recipes"
          fill
          className="object-cover scale-100 hover:scale-105 transition-transform duration-[2s] ease-out"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-stone-900/60 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FBF9F5] via-transparent to-transparent" />
        
        <div className="relative z-10 container mx-auto px-4 md:px-8 h-full min-h-[550px] md:min-h-[650px] flex flex-col lg:flex-row items-center gap-12 lg:gap-20 pt-28 pb-16">
          
          {/* Sol/Üst Kısım: Başlık ve Açıklama */}
          <div className="w-full lg:w-3/5 text-center lg:text-left flex flex-col justify-center">
            <span className="text-amber-300 text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] mb-4 md:mb-6 block">
              Elysonsweets Mixology
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-black text-white mb-6 tracking-tighter uppercase leading-[0.9]">
              {t.pageTitle}
            </h1>
            <p className="text-lg md:text-xl text-stone-300 max-w-2xl mx-auto lg:mx-0 font-serif italic border-l-2 border-amber-500/50 pl-4 py-1">
              {t.pageDesc}
            </p>
          </div>

          {/* Sağ/Alt Kısım: Reçete Sihirbazı CTA */}
          <div className="w-full lg:w-2/5 flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-[#FBF9F5]/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 md:p-10 shadow-2xl flex flex-col items-center text-center transform transition-all duration-500 hover:scale-[1.02] hover:bg-[#FBF9F5]/15">
              <div className="bg-amber-500 w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <Wand2 className="text-stone-900 w-8 h-8" />
              </div>
              <span className="text-amber-400 text-[10px] font-bold tracking-[0.2em] uppercase mb-3">
                {t.ctaBadge}
              </span>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-4 leading-tight">
                {t.ctaTitle}
              </h2>
              <p className="text-stone-200/80 mb-8 text-sm md:text-base leading-relaxed">
                {t.ctaDesc}
              </p>
              <Link 
                href={`/${locale}/barista-ai`}
                className="w-full bg-white text-stone-900 font-bold py-4 px-6 rounded-xl hover:bg-amber-500 transition-colors duration-300 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
              >
                <span>{t.ctaButton}</span>
                <Wand2 className="w-4 h-4" />
              </Link>
            </div>
          </div>
          
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-8">
        <RecipeGrid 
          recipes={recipes || []} 
          locale={locale} 
          categories={categories} 
          t={t} 
          initialCategory={initialCategory} 
        />
      </div>
    </div>
  );
}
