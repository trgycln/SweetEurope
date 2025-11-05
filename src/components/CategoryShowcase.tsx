import React from 'react';
import Image from 'next/image';
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
}

interface CategoryShowcaseProps {
  dictionary: any;
  locale: string;
  categories: Category[];
}

const CategoryShowcase: React.FC<CategoryShowcaseProps> = ({ dictionary, locale, categories }) => {
  // Ana kategorileri filtrele ve ilk 6'sını al
  const featuredCategories = categories
    .filter(cat => !cat.slug.includes('/')) // Alt kategorileri hariç tut (slash içermeyenler ana kategori)
    .slice(0, 6);

  return (
    <section className="bg-bg-subtle py-24 px-6">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif mb-4">
            {dictionary.categories.title}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {dictionary.categories.subtitle || 'Entdecken Sie unsere exquisite Auswahl'}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredCategories.map((category) => {
            const categoryName = category.ad?.[locale as keyof typeof category.ad] || category.ad?.de || '';
            const imageUrl = category.image_url || '/placeholder-category.jpg';
            
            return (
              <Link 
                key={category.id} 
                href={`/${locale}/products?kategori=${category.slug}`} 
                className="group relative block overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500"
              >
                <div className="relative aspect-[3/4]">
                  <Image
                    src={imageUrl}
                    alt={categoryName}
                    fill
                    className="object-cover transform group-hover:scale-110 transition-transform duration-700 ease-in-out"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent group-hover:from-black/90 transition-all duration-500"></div>
                  
                  {/* Category Name */}
                  <div className="absolute inset-0 flex items-end justify-center p-8">
                    <h3 className="text-white text-2xl md:text-3xl font-serif font-bold text-center drop-shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                      {categoryName}
                    </h3>
                  </div>

                  {/* Hover Arrow */}
                  <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full p-3 transform translate-x-16 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryShowcase;

