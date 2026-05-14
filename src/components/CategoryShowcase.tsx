import React from 'react';
import Link from 'next/link';

interface Category {
  id: string;
  slug: string;
  ad: {
    de?: string;
    en?: string;
    tr?: string;
    ar?: string;
  };
  image_url?: string;
  productCount?: number;
}

interface CategoryShowcaseProps {
  dictionary: any;
  locale: string;
  categories: Category[];
}

// Color palette per FO category slug
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'powder-drinks':            { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500' },
  'fruit-pastes':             { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500' },
  'topping-decor-sauces':     { bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200',    dot: 'bg-pink-400' },
  'topping-ice-cream-sauces': { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200',     dot: 'bg-sky-500' },
  'special-sauces-940g':      { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  dot: 'bg-purple-600' },
  'fruited-sauces':           { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500' },
  'premium-syrups':           { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-600' },
  'cocktail-syrups':          { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  dot: 'bg-indigo-500' },
  'silvery-syrups':           { bg: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-200',   dot: 'bg-slate-500' },
  'iced-tea-syrup-bases':     { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    dot: 'bg-teal-500' },
  'cafe-bar-sauces':          { bg: 'bg-orange-50',  text: 'text-orange-800',  border: 'border-orange-200',  dot: 'bg-orange-700' },
  'cocktail-mixes':           { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200', dot: 'bg-fuchsia-500' },
  'foamer':                   { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    dot: 'bg-cyan-400' },
  'special-pistachio-sauce':  { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',   dot: 'bg-green-600' },
  // Legacy FO categories
  'sauces-and-ingredients':   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500' },
  'coffee':                   { bg: 'bg-orange-50',  text: 'text-orange-800',  border: 'border-orange-200',  dot: 'bg-orange-700' },
  'drinks':                   { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    dot: 'bg-teal-500' },
  // Real DB categories (Turkish/German slugs)
  'ho-re-ca-icecekler-soslar': { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',   dot: 'bg-teal-500' },
  'pastalar-kekler':           { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',   dot: 'bg-rose-500' },
  'kurabiyeler-muffinler':     { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500' },
  'dondurmacılık':             { bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200',    dot: 'bg-sky-500' },
  'pastacılık':                { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  'icecek-bazlari':            { bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',dot: 'bg-emerald-600' },
  'premium-suruplar':          { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
};

const DEFAULT_COLOR = { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-400' };

const CategoryShowcase: React.FC<CategoryShowcaseProps> = ({ dictionary, locale, categories }) => {
  // Show all categories (no slice limit for FO's 14 categories)
  const visibleCategories = categories.filter(
    (cat) => !cat.slug.includes('/') && (cat.productCount ?? 0) > 0
  );

  if (!categories || categories.length === 0) {
    return (
      <section className="bg-bg-subtle py-24 px-6">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-serif mb-4">
            {dictionary.categories?.title || 'Unsere Produktkategorien'}
          </h2>
          <p className="text-gray-500 mt-8">Kategorien werden geladen…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-slate-50 py-20 px-6">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.22em] text-slate-400 mb-3">
            FO Barista, Sirupe &amp; Backzutaten
          </span>
          <h2 className="text-4xl md:text-5xl font-serif text-slate-900 mb-3">
            {dictionary.categories?.title || 'Unsere Produktkategorien'}
          </h2>
          <p className="text-base text-slate-500 max-w-2xl mx-auto">
            {dictionary.categories?.subtitle || 'Premium-Sortiment für Cafés, Hotels, Patisserien und Eisdielen'}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {visibleCategories.map((category) => {
            const categoryName = category.ad?.[locale as keyof typeof category.ad] || category.ad?.de || '';
            const productCount = category.productCount || 0;
            const color = CATEGORY_COLORS[category.slug] || DEFAULT_COLOR;

            const countLabel =
              locale === 'de'
                ? `${productCount} ${productCount === 1 ? 'Produkt' : 'Produkte'}`
                : locale === 'tr'
                ? `${productCount} Ürün`
                : `${productCount} ${productCount === 1 ? 'Product' : 'Products'}`;

            return (
              <Link
                key={category.id}
                href={`/${locale}/products?kategori=${category.slug}`}
                className={`group relative flex flex-col rounded-2xl border ${color.border} ${color.bg} p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}
              >
                {/* Color dot accent */}
                <div className={`w-3 h-3 rounded-full ${color.dot} mb-3`} />

                {/* Category name */}
                <h3 className={`text-sm font-bold ${color.text} leading-snug mb-1 line-clamp-2`}>
                  {categoryName}
                </h3>

                {/* Product count */}
                <p className="text-xs text-slate-500 mt-auto pt-3">
                  {countLabel}
                </p>

                {/* Hover arrow */}
                <div className={`absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${color.text}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>

        {/* View all CTA */}
        <div className="text-center mt-10">
          <Link
            href={`/${locale}/products`}
            className="inline-flex items-center gap-2 bg-slate-900 text-white font-semibold px-6 py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-sm text-sm"
          >
            {locale === 'de'
              ? 'Gesamtes FO-Sortiment ansehen'
              : locale === 'tr'
              ? 'Tüm FO Ürünlerini Gör'
              : 'View Full FO Assortment'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CategoryShowcase;
