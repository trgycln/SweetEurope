"use client";

import React, { useState } from 'react';
import { dictionary } from '@/dictionaries/de';
import ProductCard from '@/components/ProductCard';
import { FaChevronLeft } from 'react-icons/fa';

// --- TİP TANIMLAMALARI ---
interface Product {
  id: number;
  name: string;
  category: string;
  imageUrl: string;
  alt: string;
}

interface SubCategory {
  name: string;
  href: string;
  description?: string;
}

interface MainCategory {
  name: string;
  promoImage: string;
  subCategories: SubCategory[];
}

// Dictionary'nin genel yapısını tanımlayan ana tip
interface Dictionary {
  megaMenu: { mainCategories: MainCategory[] };
  productsPage: { sampleProducts: Product[]; allProducts: string; title: string; filterTitle: string; };
  // ... dictionary'nin diğer tüm alanları buraya eklenebilir
}
// --- TİP TANIMLAMALARI SONU ---

export default function ProductsPage() {
  // Dictionary'nin tipini en başta, tek seferde ve doğru bir şekilde belirtiyoruz
  const typedDictionary = dictionary as unknown as Dictionary;

  const { mainCategories } = typedDictionary.megaMenu;
  const { sampleProducts, allProducts } = typedDictionary.productsPage;

  const [activeMainCategory, setActiveMainCategory] = useState<MainCategory | null>(null);
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);

  const filteredProducts = (): Product[] => { 
      if (activeSubCategory) {
          return sampleProducts.filter(p => p.category === activeSubCategory);
      }
      if (activeMainCategory) {
          const subCategoryNames = activeMainCategory.subCategories.map(sc => sc.name);
          return sampleProducts.filter(p => subCategoryNames.includes(p.category));
      }
      return sampleProducts;
  };

  const handleMainCategoryClick = (category: MainCategory) => {
      setActiveMainCategory(category);
      setActiveSubCategory(null);
  };
  
  const handleBackClick = () => {
      setActiveMainCategory(null);
      setActiveSubCategory(null);
  }

  const handleSubCategoryClick = (subCategoryName: string) => {
      setActiveSubCategory(subCategoryName);
  }

  return (
      <div className="bg-secondary">
          <div className="container mx-auto px-6 py-12">
              <div className="text-center mb-12">
                  <h1 className="text-5xl font-serif">{typedDictionary.productsPage.title}</h1>
              </div>

              <div className="flex flex-col md:flex-row gap-12">
                  <aside className="md:w-1/4">
                      <h2 className="font-bold font-sans tracking-wider uppercase mb-4 text-primary">
                          {typedDictionary.productsPage.filterTitle}
                      </h2>
                      <nav className="flex flex-col space-y-3">
                          {activeMainCategory ? (
                              <>
                                  <button
                                      onClick={handleBackClick}
                                      className="flex items-center gap-2 text-left transition-colors text-text-main hover:text-accent font-bold mb-3"
                                  >
                                      <FaChevronLeft size={12} />
                                      <span>{allProducts}</span>
                                  </button>
                                  <h3 className="font-bold text-accent">{activeMainCategory.name}</h3>
                                  {activeMainCategory.subCategories.map((subCat) => ( 
                                      <button
                                          key={subCat.name}
                                          onClick={() => handleSubCategoryClick(subCat.name)}
                                          className={`text-left transition-colors text-text-main hover:text-accent pl-4 ${activeSubCategory === subCat.name ? 'font-bold text-accent' : ''}`}
                                      >
                                          {subCat.name}
                                      </button>
                                  ))}
                              </>
                          ) : (
                              mainCategories.map((category) => (
                                  <button
                                      key={category.name}
                                      onClick={() => handleMainCategoryClick(category)}
                                      className="text-left transition-colors text-text-main hover:text-accent"
                                  >
                                      {category.name}
                                  </button>
                              ))
                          )}
                      </nav>
                  </aside>

                  <main className="md:w-3/4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                          {filteredProducts().map((product) => ( 
                              <ProductCard key={product.id} product={product} dictionary={dictionary} />
                          ))}
                      </div>
                  </main>
              </div>
          </div>
      </div>
  );
}