"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { dictionary } from '@/dictionaries/de';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Tables } from '@/lib/supabase/database.types';
import ProductCard from '@/components/ProductCard'; // Merkezi ProductCard'ı import et

type Product = Tables<'urunler'>;
interface Category { name: string; subCategories: { name: string }[]; }
const PRODUCTS_PER_PAGE = 9;

export default function ProductsPage() {
  const supabase = createSupabaseBrowserClient();
  const content = dictionary.productsPage;
  const { mainCategories } = dictionary.megaMenu;
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ... (Filtreleme state'leri aynı)

  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('urunler').select('*'); // Veritabanından canlı veri
      if (error) {
        console.error("Ürünler çekilirken hata:", error);
        setAllProducts([]);
      } else {
        setAllProducts(data || []);
      }
      setLoading(false);
    };
    fetchAllProducts();
  }, [supabase]);

  // ... (filteredProducts, pagination, event handler'lar aynı)

  return (
    <div className="bg-secondary">
      <div className="container mx-auto px-6 py-12">
        {/* ... (Başlık ve filtreleme menüsü aynı) ... */}
        <main className="md:w-3/4">
          {loading ? <p>Yükleniyor...</p> : (
            <>
              {paginatedProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {paginatedProducts.map((product) => (
                    <ProductCard 
                        key={product.id}
                        urun={product}
                        dictionary={dictionary}
                        linkHref={`/produkte/${product.id}`} // Doğru detay sayfasına link
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
  );
}