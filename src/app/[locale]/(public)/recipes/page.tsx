import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { FiArrowRight, FiZap } from 'react-icons/fi';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return {
    title: 'Elysonsweets Recipe Library | Professional Beverage Inspiration',
    description: 'Discover professional cocktail, mocktail, and coffee recipes crafted with premium supplies from Elysonsweets.',
  };
}

export default async function RecipesHubPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { category } = await searchParams;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  let query = supabase
    .from('recipes')
    .select('id, slug, title, description, category, prep_time_minutes')
    .eq('locale', locale)
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data: recipes } = await query;

  const categories = ['all', 'coffee', 'cocktail', 'mocktail', 'smoothie'];

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Elysonsweets Recipe Library</h1>
        <p className="text-lg text-gray-600">
          Professional beverage inspiration and expert recipes for your cafe, bar, or restaurant.
        </p>
      </div>

      {/* Barista AI CTA Banner */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-3xl p-8 mb-12 shadow-xl border border-stone-800 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <FiZap size={150} />
        </div>
        <div className="relative z-10">
          <span className="inline-block text-amber-400 text-xs font-bold uppercase tracking-widest mb-2">
            {locale === 'tr' ? 'ÖZEL KONSEPT' : 'CUSTOM CONCEPT'}
          </span>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2">
            {locale === 'tr' ? 'Kendi İmza Reçetenizi Yaratın' : 'Create Your Signature Recipe'}
          </h2>
          <p className="text-stone-300 text-sm md:text-base max-w-xl">
            {locale === 'tr' ? 'Yapay zeka asistanımızla elinizdeki malzemeleri girin, kafenize özel tarifler ve hazır PDF menüler oluşturalım.' : 'Enter your ingredients and let our AI assistant create custom recipes and PDF menus specifically for your cafe.'}
          </p>
        </div>
        <Link
          href={`/${locale}/barista-ai`}
          className="relative z-10 shrink-0 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold py-3.5 px-7 rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:-translate-y-0.5"
        >
          <span>{locale === 'tr' ? 'Reçete Sihirbazını Başlat' : 'Launch Recipe Wizard'}</span>
          <FiArrowRight className="w-5 h-5" />
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap justify-center gap-4 mb-12">
        {categories.map((cat) => (
          <Link
            key={cat}
            href={cat === 'all' ? `/${locale}/recipes` : `/${locale}/recipes?category=${cat}`}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              (category === cat) || (!category && cat === 'all')
                ? 'bg-primary text-white shadow-md'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </Link>
        ))}
      </div>

      {/* Recipe Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes?.map((recipe) => (
          <Link key={recipe.id} href={`/${locale}/recipes/${recipe.slug}`} className="group block bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
                {recipe.category}
              </span>
              <span className="text-sm text-gray-500 font-medium">{recipe.prep_time_minutes} min</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
              {recipe.title}
            </h2>
            <p className="text-gray-600 text-sm line-clamp-2">
              {recipe.description}
            </p>
          </Link>
        ))}
        
        {(!recipes || recipes.length === 0) && (
          <div className="col-span-full text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
            <p className="text-gray-500 text-lg">No recipes found for this category yet.</p>
            <p className="text-gray-400 text-sm mt-2">Check back soon or try another category.</p>
          </div>
        )}
      </div>
    </main>
  );
}
