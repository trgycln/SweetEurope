"use client";

import React, { useState } from 'react';
import { dictionary } from '@/dictionaries/de';
import ProductCard from '@/components/ProductCard';
import { FaChevronLeft } from 'react-icons/fa';

export default function ProductsPage() {
  const { mainCategories } = dictionary.megaMenu;
  const { sampleProducts, allProducts } = dictionary.productsPage;

  // Hangi ana kategorinin seçili olduğunu takip etmek için state
  const [activeMainCategory, setActiveMainCategory] = useState<any | null>(null);
  // Hangi alt kategorinin seçili olduğunu takip etmek için state
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);

  // Gösterilecek ürünleri filtreleyen mantık
  const filteredProducts = () => {
    // Eğer bir alt kategori seçiliyse, sadece o kategoriye ait ürünleri göster
    if (activeSubCategory) {
      return sampleProducts.filter(p => p.category === activeSubCategory);
    }
    // Eğer bir ana kategori seçiliyse, o ana kategoriye ait TÜM ürünleri göster
    if (activeMainCategory) {
      const subCategoryNames = activeMainCategory.subCategories.map((sc: any) => sc.name);
      return sampleProducts.filter(p => subCategoryNames.includes(p.category));
    }
    // Hiçbir şey seçili değilse, tüm ürünleri göster
    return sampleProducts;
  };

  const handleMainCategoryClick = (category: any) => {
    setActiveMainCategory(category);
    setActiveSubCategory(null); // Alt kategori seçimini sıfırla
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
          <h1 className="text-5xl font-serif">{dictionary.productsPage.title}</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-12">
          {/* Sol Sütun: Çok Katmanlı Filtreleme */}
          <aside className="md:w-1/4">
            <h2 className="font-bold font-sans tracking-wider uppercase mb-4 text-primary">
              {dictionary.productsPage.filterTitle}
            </h2>
            <nav className="flex flex-col space-y-3">
              {/* Eğer bir ana kategori seçiliyse, "Geri" butonu ve alt kategorileri göster */}
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
                  {activeMainCategory.subCategories.map((subCat: any) => (
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
                /* Varsayılan olarak ana kategorileri göster */
                mainCategories.map((category: any) => (
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

          {/* Sağ Sütun: Ürün Grid'i */}
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

