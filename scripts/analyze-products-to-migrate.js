require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function analyzeProducts() {
  // Old kategorilerin IDs
  const oldCategoryIds = {
    parent: '5d6f7d2b-ad48-4136-89c1-27a7714e522d', // sauces-and-ingredients
    cafe_bar_sauces: '3df0be9f-a9c0-47d7-a828-1ec2d34d5b84',
    syrups: 'fef2c710-0104-42ce-a31d-726105495a1b',
  };

  // FO kategorilerini getir
  const { data: foKats } = await supabase
    .from('kategoriler')
    .select('id, slug, ad')
    .eq('urun_gami', 'barista-bakery-essentials')
    .is('ust_kategori_id', null);

  console.log('=== OLD KATEGORİDEKİ ÜRÜNLER ANALİZİ ===\n');

  // 1. cafe-bar-sauces (2 ürün) - direkt eşleş var
  const { data: cbs } = await supabase
    .from('urunler')
    .select('id, ad, slug')
    .eq('kategori_id', oldCategoryIds.cafe_bar_sauces);

  console.log('📌 CAFE-BAR-SAUCES (2 ürün):');
  cbs?.forEach(u => console.log(`   "${u.ad?.de || u.ad?.tr}" → cafe-bar-sauces (FO)`));

  // 2. syrups (142 ürün) - FO şurup kategorilerine dağıt
  const { data: syrup_products } = await supabase
    .from('urunler')
    .select('id, ad, slug, teknik_ozellikler')
    .eq('kategori_id', oldCategoryIds.syrups);

  console.log(`\n📌 SYRUPS (${syrup_products?.length || 0} ürün):`);
  console.log('   FO kategorilerine dağıtılacak:');
  console.log('   - premium-syrups');
  console.log('   - cocktail-syrups');
  console.log('   - silvery-syrups');
  console.log('   - iced-tea-syrup-bases');

  // Örnek ürünler
  if (syrup_products?.slice(0, 5)) {
    console.log('\n   Örnek ürünler:');
    syrup_products?.slice(0, 5).forEach(u => {
      console.log(`   - "${u.ad?.de || u.ad?.tr}"`);
    });
  }

  // 3. sauces-and-ingredients parent (108 ürün)
  const { data: parent_products } = await supabase
    .from('urunler')
    .select('id, ad, slug, teknik_ozellikler')
    .eq('kategori_id', oldCategoryIds.parent);

  console.log(`\n📌 SAUCES-AND-INGREDIENTS PARENT (${parent_products?.length || 0} ürün):`);
  console.log('   FO kategorilerine dağıtılacak veya genel kategori kullanılacak');

  if (parent_products?.slice(0, 5)) {
    console.log('\n   Örnek ürünler:');
    parent_products?.slice(0, 5).forEach(u => {
      console.log(`   - "${u.ad?.de || u.ad?.tr}"`);
    });
  }

  // İstatistikler
  const totalProducts = (cbs?.length || 0) + (syrup_products?.length || 0) + (parent_products?.length || 0);
  console.log(`\n\n=== TOPLAM ÜRÜN: ${totalProducts} ===`);
  console.log(`Kategorileme stratejisi:`);
  console.log(`✓ cafe-bar-sauces (2) → cafe-bar-sauces FO`);
  console.log(`✓ syrups (${syrup_products?.length || 0}) → FO şurup kategorilerine eşit dağıt`);
  console.log(`✓ sauces-and-ingredients (${parent_products?.length || 0}) → sauces-and-ingredients FO`);

  // Şimdi execute scripti yazabiliriz
  console.log('\n✅ Devam etmek için migrate-products.js çalıştırılacak');
}

analyzeProducts().catch(console.error);
