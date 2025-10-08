"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { dictionary } from '@/dictionaries/de';
import ProductCard from '@/components/ProductCard';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { FaChevronLeft } from 'react-icons/fa';
// DÜZELTME: Veritabanından gelen tipleri import ediyoruz
import { Tables } from '@/lib/supabase/database.types';

// DÜZELTME: Manuel 'Product' arayüzü kaldırıldı.
// Yerine, Supabase'in 'urunler' tablosu için otomatik oluşturduğu 'Row' tipi kullanıldı.
type Product = Tables<'urunler'>;

interface Category {
    name: string;
    subCategories: { name: string }[];
}

const PRODUCTS_PER_PAGE = 9;

export default function ProductsPage() {
  const supabase = createSupabaseBrowserClient();
  const content = dictionary.productsPage;
  const { mainCategories } = dictionary.megaMenu;

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeMainCategory, setActiveMainCategory] = useState<Category | null>(null);
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoading(true);
      // DÜZELTME: Sorgu, doğru tablo adı olan 'urunler' tablosuna yapıldı.
      const { data, error } = await supabase.from('urunler').select('*');
      
      if (error) {
        console.error("Tüm ürünler çekilirken hata:", error);
        setAllProducts([]);
      } else {
        setAllProducts(data || []);
      }
      setLoading(false);
    };

    fetchAllProducts();
  }, [supabase]);

  const filteredProducts = useMemo(() => {
    if (activeSubCategory) {
      // DÜZELTME: Kolon adı 'category_de' yerine 'kategori' olarak güncellendi.
      return allProducts.filter(p => p.kategori === activeSubCategory);
    }
    if (activeMainCategory) {
      const subCategoryNames = activeMainCategory.subCategories.map(sc => sc.name);
      // DÜZELTME: Kolon adı 'category_de' yerine 'kategori' olarak güncellendi.
      return allProducts.filter(p => p.kategori ? subCategoryNames.includes(p.kategori) : false);
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
  
  const handleClearFilters = () => {
    setActiveMainCategory(null);
    setActiveSubCategory(null);
  };

  const handleMainCategoryClick = (category: Category) => {
    if (activeMainCategory?.name === category.name) {
        handleClearFilters();
    } else {
        setActiveMainCategory(category);
        setActiveSubCategory(null);
    }
  };

  const handleSubCategoryClick = (subCategoryName: string) => {
    if (activeSubCategory === subCategoryName) {
        setActiveSubCategory(null);
    } else {
        setActiveSubCategory(subCategoryName);
    }
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
              <button
                onClick={handleClearFilters}
                className={`text-left transition-colors font-bold ${!activeMainCategory ? 'text-accent' : 'text-text-main hover:text-accent'}`}
              >
                {content.allProducts}
              </button>
              <hr className="border-bg-subtle"/>
              {mainCategories.map((category: Category) => (
                <div key={category.name}>
                  <button
                    onClick={() => handleMainCategoryClick(category)}
                    className={`text-left w-full transition-colors font-bold ${activeMainCategory?.name === category.name ? 'text-accent' : 'text-text-main hover:text-accent'}`}
                  >
                    {category.name}
                  </button>
                  {activeMainCategory?.name === category.name && (
                    <div className="flex flex-col space-y-2 pl-4 pt-2 mt-2 border-l border-bg-subtle">
                      {category.subCategories.map((subCat: {name: string}) => (
                        <button
                          key={subCat.name}
                          onClick={() => handleSubCategoryClick(subCat.name)}
                          className={`text-left transition-colors text-text-main hover:text-accent text-sm ${activeSubCategory === subCat.name ? 'font-bold text-accent' : ''}`}
                        >
                          {subCat.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </aside>

          <main className="md:w-3/4">
            {loading ? <p>Yükleniyor...</p> : (
              <>
                {paginatedProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {paginatedProducts.map((product) => (
                        // DÜZELTME: 'ProductCard' bileşenine gönderilen proplar,
                        // 'urunler' tablosundaki doğru kolon adlarıyla eşleştirildi.
                        <ProductCard 
                            key={product.id} 
                            product={{
                                id: product.id,
                                name: product.urun_adi,
                                // fotograf_url_listesi bir dizi olduğu için ilk elemanı alıyoruz.
                                imageUrl: product.fotograf_url_listesi?.[0] || '', 
                                category: product.kategori || 'Kategorisiz',
                                price: product.temel_satis_fiyati,
                                alt: product.urun_adi
                            }} 
                            dictionary={dictionary} 
                        />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <p className="font-serif text-xl">Seçili Kriterlere Uygun Ürün Bulunamadı.</p>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}