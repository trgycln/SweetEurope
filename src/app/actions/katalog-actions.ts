'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function getKatalogData(locale: 'de' | 'en') {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: urunler, error } = await supabase
    .from('urunler')
    .select(`
      id,
      ad,
      ana_resim_url,
      stok_kodu,
      ean_gtin,
      birim_agirlik_kg,
      koli_ici_adet,
      palet_ici_adet,
      satis_fiyati_musteri,
      satis_fiyati_toptanci,
      satis_fiyati_palet,
      satis_fiyati_alt_bayi,
      stok_miktari,
      kategoriler ( ad )
    `)
    .eq('aktif', true);

  if (error) {
    console.error('Katalog Supabase Error:', error);
    throw new Error(`Katalog verisi çekilemedi. Supabase Detayı: ${error.message || JSON.stringify(error)}`);
  }

  // Group by category
  const grouped: Record<string, any[]> = {};
  const categoryOrder: Record<string, number> = {};

  for (const urun of (urunler as any[])) {
    let catName = 'Diğer';
    let catOrder = 9999;
    
    if (urun.kategoriler) {
      if (typeof urun.kategoriler.ad === 'object' && urun.kategoriler.ad !== null) {
        catName = urun.kategoriler.ad[locale] || urun.kategoriler.ad['de'] || urun.kategoriler.ad['tr'] || 'Diğer';
      } else if (typeof urun.kategoriler.ad === 'string') {
        catName = urun.kategoriler.ad;
      }
    }

    let prodName = 'İsimsiz Ürün';
    if (urun.ad && typeof urun.ad === 'object' && urun.ad !== null) {
      prodName = urun.ad[locale] || urun.ad['de'] || urun.ad['tr'] || 'İsimsiz Ürün';
    } else if (typeof urun.ad === 'string') {
        prodName = urun.ad;
    }

    if (!grouped[catName]) {
      grouped[catName] = [];
      categoryOrder[catName] = catOrder;
    } else {
      categoryOrder[catName] = Math.min(categoryOrder[catName], catOrder);
    }

    grouped[catName].push({
      name: prodName,
      image: urun.ana_resim_url,
      artNr: urun.stok_kodu,
      ean: urun.ean_gtin,
      weight: urun.birim_agirlik_kg,
      boxQty: urun.koli_ici_adet,
      palletQty: urun.palet_ici_adet,
      price1: urun.satis_fiyati_musteri, // 1-4
      price2: urun.satis_fiyati_toptanci, // 5+
      price3: urun.satis_fiyati_alt_bayi || urun.satis_fiyati_palet, // Palette
      inStock: (urun.stok_miktari || 0) > 0,
    });
  }

  // Convert to array
  const result = Object.keys(grouped).map(catName => ({
    categoryName: catName,
    products: grouped[catName].sort((a, b) => {
      // Önce stoktaki ürünler, sonra ön sipariş (vorbestellung) ürünleri
      if (a.inStock && !b.inStock) return -1;
      if (!a.inStock && b.inStock) return 1;
      // Kendi içlerinde alfabetik
      return a.name.localeCompare(b.name);
    }),
    order: categoryOrder[catName]
  }));

  // Sort categories by sira then alphabetically
  result.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.categoryName.localeCompare(b.categoryName);
  });

  return result.map(c => ({ categoryName: c.categoryName, products: c.products }));
}
