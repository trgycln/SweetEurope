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
  return {
    title: t.metaTitle,
    description: t.metaDesc,
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

  return (
    <main className="min-h-screen bg-stone-50 pb-20">
      {/* Hero Section */}
      <section className="relative w-full min-h-[500px] mb-12">
        <Image
          src="https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=2000&auto=format&fit=crop"
          alt="Premium Recipes"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-stone-900/80" />
        <div className="relative z-10 container mx-auto px-4 md:px-8 h-full min-h-[500px] flex flex-col lg:flex-row items-center gap-8 lg:gap-16 pt-24 pb-16">
          
          {/* Sol/Üst Kısım: Başlık ve Açıklama */}
          <div className="w-full lg:w-1/2 text-center lg:text-left flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6 tracking-tight leading-tight">
              {t.pageTitle}
            </h1>
            <p className="text-lg md:text-xl text-stone-300 max-w-2xl mx-auto lg:mx-0">
              {t.pageDesc}
            </p>
          </div>

          {/* Sağ/Alt Kısım: Reçete Sihirbazı CTA */}
          <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-primary border border-accent rounded-xl p-8 shadow-2xl flex flex-col items-center text-center transform transition-all hover:scale-[1.02]">
              <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mb-6 border border-accent/30">
                <Wand2 className="text-accent w-8 h-8" />
              </div>
              <span className="text-accent text-xs font-bold tracking-widest uppercase mb-3">
                {t.ctaBadge}
              </span>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-4">
                {t.ctaTitle}
              </h2>
              <p className="text-secondary/80 mb-8 text-sm md:text-base">
                {t.ctaDesc}
              </p>
              <Link 
                href={`/${locale}/barista-ai`}
                className="w-full bg-accent text-primary font-bold py-4 px-6 rounded-lg hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 text-lg"
              >
                <Wand2 className="w-5 h-5" />
                <span>{t.ctaButton}</span>
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
    </main>
  );
}
