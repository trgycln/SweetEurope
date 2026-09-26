"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { FiSearch, FiZap, FiArrowRight } from 'react-icons/fi';
import RecipeCard from './RecipeCard';

interface RecipeGridProps {
  recipes: any[];
  locale: string;
  categories: string[];
  t: any;
  initialCategory?: string;
}

export default function RecipeGrid({ recipes, locale, categories, t, initialCategory = 'all' }: RecipeGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, Record<string, string>> = {
      de: { all: 'Alle', coffee: 'Kaffee', cocktail: 'Cocktail', mocktail: 'Mocktail', smoothie: 'Smoothie' },
      en: { all: 'All', coffee: 'Coffee', cocktail: 'Cocktail', mocktail: 'Mocktail', smoothie: 'Smoothie' },
      tr: { all: 'Tümü', coffee: 'Kahve', cocktail: 'Kokteyl', mocktail: 'Mokteyl', smoothie: 'Smoothie' },
      ar: { all: 'الكل', coffee: 'قهوة', cocktail: 'كوكتيل', mocktail: 'موكتيل', smoothie: 'سموذي' },
    };
    return labels[locale]?.[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1);
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

  const getAllTextFromObj = (obj: any): string => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'object') {
      if (Array.isArray(obj)) {
        return obj.map(item => getAllTextFromObj(item)).join(' ');
      }
      return Object.values(obj).map(val => getAllTextFromObj(val)).join(' ');
    }
    return '';
  };

  // Helper function to normalize text for search (handles Turkish characters and accents)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .replace(/i̇/g, 'i') // Fix for Turkish uppercase I with dot
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // Remove remaining diacritics
  };

  const filteredRecipes = useMemo(() => {
    let result = [...(recipes || [])];

    if (selectedCategory !== 'all') {
      result = result.filter(r => r.category === selectedCategory);
    }

    if (searchTerm.trim()) {
      const normalizedSearchTerm = normalizeText(searchTerm);
      // Split search term into individual words for broader matching
      const searchWords = normalizedSearchTerm.split(/\s+/).filter(w => w.length > 0);
      
      result = result.filter(r => {
        // Extract absolutely every piece of text from the recipe in all languages
        const fullTextRaw = `
          ${getAllTextFromObj(r.title)}
          ${getAllTextFromObj(r.description)}
          ${getAllTextFromObj(r.ingredients)}
          ${getAllTextFromObj(r.category)}
        `;
        const normalizedFullText = normalizeText(fullTextRaw);
        
        // Every typed word must exist *somewhere* in the recipe's text
        return searchWords.every(word => normalizedFullText.includes(word));
      });
    }

    if (sortBy === 'popular') {
      result.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    }

    return result;
  }, [recipes, selectedCategory, searchTerm, sortBy]);

  return (
    <div className="w-full">
      {/* Sticky Filter Bar */}
      <div className="sticky top-20 z-40 bg-white/90 backdrop-blur-md shadow-sm border border-gray-200 py-3 px-4 mb-10 mx-auto rounded-2xl max-w-5xl">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative w-full md:w-1/3">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder={t.searchPlaceholder || "Search..."} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm bg-stone-50"
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap justify-center gap-2 w-full md:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-stone-900 shadow-md'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-stone-100'
                }`}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="w-full md:w-auto flex justify-end">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'popular')}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-gray-700 cursor-pointer"
            >
              <option value="newest">{t.sortNewest || "Newest"}</option>
              <option value="popular">{t.sortPopular || "Popular"}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recipe Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredRecipes.map((recipe, index) => {
          const isBannerPosition = index === 5; // Banner after 5 items so it looks nice in grid
          
          return (
            <div key={recipe.id} className={isBannerPosition ? "col-span-full md:col-span-2 lg:col-span-3" : ""}>
              {isBannerPosition && (
                <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-3xl p-8 my-4 shadow-xl border border-stone-800 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
                  <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4 group-hover:rotate-12 transition-transform duration-700">
                    <FiZap size={180} />
                  </div>
                  <div className="relative z-10">
                    <span className="inline-block text-amber-400 text-xs font-bold uppercase tracking-widest mb-2 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                      {t.ctaBadge || "REZEPT-ASSISTENT"}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2">
                      {t.ctaTitle || "Kendi İmza Reçetenizi Yaratın"}
                    </h2>
                    <p className="text-stone-300 text-sm md:text-base max-w-xl">
                      {t.ctaDesc || "Menünüze değer katacak, yüksek kâr marjlı ve hazırlaması pratik reçeteler oluşturun."}
                    </p>
                  </div>
                  <Link
                    href={`/${locale}/barista-ai`}
                    className="relative z-10 shrink-0 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold py-4 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:-translate-y-1"
                  >
                    <span>{t.ctaButton || "Hemen Tasarla"}</span>
                    <FiArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              )}
              
              <RecipeCard 
                recipe={recipe} 
                locale={locale} 
                categoryLabel={getCategoryLabel(recipe.category)} 
                minLabel={t.minLabel || "dk"} 
                usedProductLabel={t.usedProduct || "Used Product:"}
              />
            </div>
          );
        })}
        
        {(!filteredRecipes || filteredRecipes.length === 0) && (
          <div className="col-span-full text-center py-24 bg-white rounded-3xl border border-dashed border-stone-300">
            <p className="text-stone-800 text-xl font-bold mb-2">{t.noRecipesTitle || "Reçete Bulunamadı"}</p>
            <p className="text-stone-500 text-base">{t.noRecipesDesc || "Farklı bir arama yapmayı deneyin veya AI ile kendi reçetenizi oluşturun."}</p>
          </div>
        )}
      </div>

      {/* Fallback Banner at the bottom if less than 6 items */}
      {filteredRecipes.length > 0 && filteredRecipes.length <= 5 && (
        <div className="mt-16 bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-3xl p-8 shadow-xl border border-stone-800 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4 group-hover:rotate-12 transition-transform duration-700">
            <FiZap size={180} />
          </div>
          <div className="relative z-10">
            <span className="inline-block text-amber-400 text-xs font-bold uppercase tracking-widest mb-2 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              {t.ctaBadge || "REZEPT-ASSISTENT"}
            </span>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2">
              {t.ctaTitle || "Kendi İmza Reçetenizi Yaratın"}
            </h2>
            <p className="text-stone-300 text-sm md:text-base max-w-xl">
              {t.ctaDesc || "Menünüze değer katacak, yüksek kâr marjlı ve hazırlaması pratik reçeteler oluşturun."}
            </p>
          </div>
          <Link
            href={`/${locale}/barista-ai`}
            className="relative z-10 shrink-0 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold py-4 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:-translate-y-1"
          >
            <span>{t.ctaButton || "Hemen Tasarla"}</span>
            <FiArrowRight className="w-5 h-5" />
          </Link>
        </div>
      )}
    </div>
  );
}
