// bu sayfadaki hatayi bul ve cöz
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { dictionary } from '@/dictionaries/de';
import ProductCard from '@/components/ProductCard';
import { createClient } from '@/lib/supabase/client';
import { FaChevronLeft } from 'react-icons/fa';

interface Product {
  id: number;
  name_de: string;
  category_de: string;
  image_url: string;
  price: number;
}

const PRODUCTS_PER_PAGE = 9;

export default function ProductsPage() {
  const supabase = createClient();
  const content = dictionary.productsPage;
  const { mainCategories } = dictionary.megaMenu;

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeMainCategory, setActiveMainCategory] = useState<any | null>(null);
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllProducts = async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) {
        console.error("Tüm ürünler çekilirken hata:", error);
      } else {
        setAllProducts(data as Product[]);
      }
      setLoading(false);
    };
    fetchAllProducts();
  }, [supabase]);

  const filteredProducts = useMemo(() => {
    if (activeSubCategory) {
      return allProducts.filter(p => p.category_de === activeSubCategory);
    }
    if (activeMainCategory) {
      const subCategoryNames = activeMainCategory.subCategories.map((sc: any) => sc.name);
      return allProducts.filter(p => subCategoryNames.includes(p.category_de));
    }
    return allProducts;
  }, [activeSubCategory, activeMainCategory, allProducts]);

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeMainCategory, activeSubCategory]);

  const handleMainCategoryClick = (category: any) => {
    setActiveMainCategory(category);
    setActiveSubCategory(null);
  };
  
  const handleBackClick = () => {
    setActiveMainCategory(null);
    setActiveSubCategory(null);
  };

  const handleSubCategoryClick = (subCategoryName: string) => {
    setActiveSubCategory(subCategoryName);
  };

  return (
    <div className="bg-secondary">
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-serif">{content.title}</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-12">
          <aside className="md:w-1/4">
            <h2 className="font-bold font-sans tracking-wider uppercase mb-4 text-primary">
              {content.filterTitle}
            </h2>
            <nav className="flex flex-col space-y-3">
              {activeMainCategory ? (
                <>
                  <button onClick={handleBackClick} className="flex items-center gap-2 text-left transition-colors text-text-main hover:text-accent font-bold mb-3">
                    <FaChevronLeft size={12} />
                    <span>{content.allProducts}</span>
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
                <>
                  <button onClick={() => { setActiveMainCategory(null); setActiveSubCategory(null); }} className={`text-left transition-colors text-text-main hover:text-accent font-bold text-accent`}>
                    {content.allProducts}
                  </button>
                  {mainCategories.map((category: any) => (
                    <button key={category.name} onClick={() => handleMainCategoryClick(category)} className="text-left transition-colors text-text-main hover:text-accent">
                      {category.name}
                    </button>
                  ))}
                </>
              )}
            </nav>
          </aside>

          <main className="md:w-3/4">
            {loading ? <p>Yükleniyor...</p> : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {paginatedProducts.map((product) => ( 
                      <ProductCard key={product.id} product={{...product, name: product.name_de, imageUrl: product.image_url, category: product.category_de, alt: product.name_de }} dictionary={dictionary} />
                  ))}
                </div>
             
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}