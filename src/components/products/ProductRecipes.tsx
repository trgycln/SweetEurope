import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { FiClock as Clock, FiStar as ChefHat, FiHeart as Heart } from 'react-icons/fi';

type ProductRecipesProps = {
  locale: string;
  productId: string;
};

export default async function ProductRecipes({ locale, productId }: ProductRecipesProps) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { count } = await supabase
    .from('recipes')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId);

  if (!count || count === 0) return null;

  // 2. En iyi 3 reçeteyi al (Önce öne çıkanlar, sonra en çok beğenilenler, sonra en yeniler)
  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, slug, title, description, prep_time_minutes, category, likes_count, is_featured')
    .eq('product_id', productId)
    .order('is_featured', { ascending: false })
    .order('likes_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(3);

  if (!recipes) return null;

  const getLocalizedText = (textObj: any): string => {
    if (!textObj) return '';
    if (typeof textObj === 'string') return textObj;
    if (typeof textObj === 'object') {
      const candidate = textObj[locale] || textObj['de'] || textObj['tr'] || textObj['en'];
      if (typeof candidate === 'string') return candidate;
      for (const val of Object.values(textObj)) {
        if (typeof val === 'string' && val.trim() !== '') return val;
      }
    }
    return '';
  };

  return (
    <section className="mt-16 border-t border-gray-100 pt-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-primary" />
            {locale === 'de' ? 'Inspirationen mit diesem Produkt' : 'Inspirations with this product'}
          </h2>
          <p className="text-gray-500 mt-1">
            {locale === 'de' 
              ? 'Entdecken Sie professionelle Rezepte für Ihre Speisekarte.' 
              : 'Discover professional recipes for your menu.'}
          </p>
        </div>
        {count > 3 && (
          <Link 
            href={`/${locale}/recipes?product=${productId}`} 
            className="hidden md:block text-primary font-medium hover:underline"
          >
            {locale === 'de' ? `Alle ${count} Rezepte ansehen` : `View all ${count} recipes`} &rarr;
          </Link>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {recipes.map((recipe) => (
          <Link 
            key={recipe.id} 
            href={`/${locale}/recipes/${recipe.slug}`}
            className="group block bg-gray-50 rounded-2xl p-6 hover:bg-primary/5 hover:shadow-md transition-all duration-300 border border-transparent hover:border-primary/20 relative overflow-hidden"
          >
            {recipe.is_featured && (
              <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                Editor's Choice
              </div>
            )}
            <div className="flex justify-between items-start mb-4 mt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary bg-white px-3 py-1 rounded-full shadow-sm">
                {recipe.category}
              </span>
              <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                {recipe.likes_count > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <Heart className="w-4 h-4 fill-current" /> {recipe.likes_count}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {recipe.prep_time_minutes} min
                </span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {getLocalizedText(recipe.title)}
            </h3>
            <p className="text-gray-600 text-sm line-clamp-2">
              {getLocalizedText(recipe.description)}
            </p>
          </Link>
        ))}
      </div>
      
      {count > 3 && (
        <div className="mt-6 text-center md:hidden">
          <Link 
            href={`/${locale}/recipes?product=${productId}`} 
            className="text-primary font-medium hover:underline"
          >
            {locale === 'de' ? `Alle ${count} Rezepte ansehen` : `View all ${count} recipes`} &rarr;
          </Link>
        </div>
      )}
    </section>
  );
}
