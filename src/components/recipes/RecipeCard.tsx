import Link from 'next/link';
import Image from 'next/image';
import { FiClock, FiCheckCircle } from 'react-icons/fi';

interface RecipeCardProps {
  recipe: any;
  locale: string;
  categoryLabel: string;
  minLabel: string;
  usedProductLabel: string;
}

export default function RecipeCard({ recipe, locale, categoryLabel, minLabel, usedProductLabel }: RecipeCardProps) {
  // Unsplash category mapping (deterministik yaklaşım)
  const hashString = (str: string) => {
    let hash = 0;
    if (!str) return hash;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const getImageUrl = (recipe: any) => {
    if (recipe.image_url) {
      return recipe.image_url;
    }

    const cat = recipe.category;
    const id = String(recipe.id);

    const unsplashPools: Record<string, string[]> = {
      coffee: [
        '1556740767-414a9c4860c1', '1509042239860-f550ce710b93', '1447933601403-0c6688de566e',
        '1541167760496-1628856ab772', '1511920170033-f8396924c348', '1556742526-795a8eac090e',
        '1495474472287-4d71bcdd2085', '1610632380989-680fe40816c6', '1553292218-4892c2e7e1ae',
        '1611162458324-aae1eb4129a4', '1502462041640-b3d7e50d0662'
      ],
      cocktail: [
        '1609951651556-5334e2706168', '1657313666513-70770d329ef4', '1514362545857-3bc16c4c7d1b',
        '1551024709-8f23befc6f87', '1570598912132-0ba1dc952b7d', '1500217052183-bc01eee1a74e'
      ],
      mocktail: [
        '1615887023516-9b6bcd559e87', '1586338211598-e2d64cf97e28', '1568644396922-5c3bfae12521'
      ],
      smoothie: [
        '1505252585461-04db1eb84625', '1570598912132-0ba1dc952b7d', '1500217052183-bc01eee1a74e'
      ]
    };

    const defaultPool = [...unsplashPools.coffee, ...unsplashPools.cocktail, ...unsplashPools.mocktail];
    const uPool = unsplashPools[cat] || defaultPool;
    const index = hashString(id || 'default') % uPool.length;
    return `https://images.unsplash.com/photo-${uPool[index]}?auto=format&fit=crop&w=800&q=80`;
  };

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

  const getUsedProduct = () => {
    if (recipe.product_name) return recipe.product_name;
    
    if (recipe.ingredients) {
      let allIngredients: string[] = [];
      if (Array.isArray(recipe.ingredients)) {
        allIngredients = recipe.ingredients;
      } else if (typeof recipe.ingredients === 'object') {
        const localeIngs = recipe.ingredients[locale] || recipe.ingredients['de'] || recipe.ingredients['en'] || recipe.ingredients['tr'];
        if (Array.isArray(localeIngs)) {
          allIngredients = localeIngs;
        } else {
          allIngredients = Object.values(recipe.ingredients).flat() as string[];
        }
      }
      
      if (allIngredients && Array.isArray(allIngredients)) {
        const foIngredient = allIngredients.find(ing => typeof ing === 'string' && ing.toUpperCase().includes('FO '));
        if (foIngredient) {
          // Remove measurement quantities like "20ml", "2 cl", "30 ml", "2", etc. from the start
          let cleaned = foIngredient.replace(/^([0-9.,\s/-]+(ml|cl|g|oz|pump|shot|pumps|shots|gr|gram|stk|stück)\b\s*)/i, '').trim();
          // Also remove just leading numbers like "2 "
          cleaned = cleaned.replace(/^[0-9.,/-]+\s+/, '').trim();
          // Ensure FO is uppercase
          cleaned = cleaned.replace(/fo /i, 'FO ');
          
          if (cleaned.length > 3) return cleaned;
        }
      }
    }
    return "FO Premium";
  };

  return (
    <Link 
      href={`/${locale}/recipes/${recipe.slug}`} 
      className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:border-amber-500/30 transition-all duration-300 transform hover:-translate-y-1"
    >
      <div className="relative h-48 w-full overflow-hidden bg-stone-100 shrink-0">
        <Image 
          src={getImageUrl(recipe)}
          alt={getLocalizedText(recipe.title)}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
        <div className="absolute top-4 left-4">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-900 bg-amber-400 px-3 py-1.5 rounded-full shadow-md">
            {categoryLabel}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 flex items-center text-white text-sm font-medium">
          <FiClock className="mr-1.5" />
          {recipe.prep_time_minutes} {minLabel}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors line-clamp-1">
          {getLocalizedText(recipe.title)}
        </h2>
        <p className="text-gray-600 text-sm line-clamp-2 mb-4 flex-grow">
          {getLocalizedText(recipe.description)}
        </p>

        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-100 group-hover:bg-amber-50 group-hover:border-amber-100 transition-colors">
            <FiCheckCircle className="text-emerald-500 shrink-0" />
            <span className="text-xs font-semibold text-stone-600 group-hover:text-amber-900 transition-colors line-clamp-1">
              {usedProductLabel} {getUsedProduct()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
