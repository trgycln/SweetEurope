require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function migrateProducts() {
  console.log('=== ÜRÜN MİGRASYONU BAŞLATILIYOR ===\n');

  // FO kategorilerinin ID'lerini getir
  const { data: foKats } = await supabase
    .from('kategoriler')
    .select('id, slug, ad')
    .eq('urun_gami', 'barista-bakery-essentials')
    .is('ust_kategori_id', null);

  const katMap = {};
  foKats?.forEach(k => { katMap[k.slug] = k.id; });

  console.log('FO Kategorileri hazır:', Object.keys(katMap).length, '\n');

  // Old category IDs
  const oldIds = {
    parent: '5d6f7d2b-ad48-4136-89c1-27a7714e522d',
    cafe_bar_sauces: '3df0be9f-a9c0-47d7-a828-1ec2d34d5b84',
    syrups: 'fef2c710-0104-42ce-a31d-726105495a1b',
  };

  let movedCount = 0;
  let errorCount = 0;

  // 1. Café-Bar-Sauces (2 ürün) → cafe-bar-sauces FO
  console.log('1️⃣  CAFE-BAR-SAUCES taşınıyor...');
  const { data: cbsProducts } = await supabase
    .from('urunler')
    .select('id, ad')
    .eq('kategori_id', oldIds.cafe_bar_sauces);

  if (cbsProducts?.length > 0) {
    const newKatId = katMap['cafe-bar-sauces'];
    for (const prod of cbsProducts) {
      const { error } = await supabase
        .from('urunler')
        .update({ kategori_id: newKatId })
        .eq('id', prod.id);

      if (!error) {
        console.log(`   ✓ "${prod.ad?.de || prod.ad?.tr}" → cafe-bar-sauces`);
        movedCount++;
      } else {
        console.error(`   ✗ Hata:`, error.message);
        errorCount++;
      }
    }
  }

  // 2. Syrups (142 ürün) → FO şurup kategorilerine dağıt
  console.log('\n2️⃣  SYRUPS dağıtılıyor (ada göre)...');
  const { data: syrupProducts } = await supabase
    .from('urunler')
    .select('id, ad')
    .eq('kategori_id', oldIds.syrups);

  const syrupCategoryMap = {
    'premium-syrups': [],
    'cocktail-syrups': [],
    'silvery-syrups': [],
    'iced-tea-syrup-bases': [],
  };

  syrupProducts?.forEach(prod => {
    const name = (prod.ad?.de || prod.ad?.tr || '').toLowerCase();

    if (name.includes('basis') || name.includes('base')) {
      syrupCategoryMap['iced-tea-syrup-bases'].push(prod);
    } else if (name.includes('silvery')) {
      syrupCategoryMap['silvery-syrups'].push(prod);
    } else if (name.includes('cocktail')) {
      syrupCategoryMap['cocktail-syrups'].push(prod);
    } else if (name.includes('premium')) {
      syrupCategoryMap['premium-syrups'].push(prod);
    } else {
      // Default: Premium
      syrupCategoryMap['premium-syrups'].push(prod);
    }
  });

  for (const [syrupSlug, products] of Object.entries(syrupCategoryMap)) {
    const newKatId = katMap[syrupSlug];
    for (const prod of products) {
      const { error } = await supabase
        .from('urunler')
        .update({ kategori_id: newKatId })
        .eq('id', prod.id);

      if (!error) {
        console.log(`   ✓ "${prod.ad?.de || prod.ad?.tr}" → ${syrupSlug}`);
        movedCount++;
      } else {
        console.error(`   ✗ Hata:`, error.message);
        errorCount++;
      }
    }
  }

  // 3. Sauces-and-Ingredients Parent (108 ürün) → sauces-and-ingredients FO
  console.log('\n3️⃣  SAUCES-AND-INGREDIENTS dağıtılıyor...');
  const { data: parentProducts } = await supabase
    .from('urunler')
    .select('id, ad')
    .eq('kategori_id', oldIds.parent);

  if (parentProducts?.length > 0) {
    const newKatId = katMap['sauces-and-ingredients'];
    for (const prod of parentProducts) {
      const { error } = await supabase
        .from('urunler')
        .update({ kategori_id: newKatId })
        .eq('id', prod.id);

      if (!error) {
        console.log(`   ✓ "${prod.ad?.de || prod.ad?.tr}" → sauces-and-ingredients`);
        movedCount++;
      } else {
        console.error(`   ✗ Hata:`, error.message);
        errorCount++;
      }
    }
  }

  // 4. Eski kategorileri sil
  console.log('\n4️⃣  Eski kategoriler siliniyor...');
  const oldCatIds = [oldIds.parent, oldIds.cafe_bar_sauces, oldIds.syrups,
    'fef2c710-0104-42ce-a31d-726105495a1b', // syrups
    '3df0be9f-a9c0-47d7-a828-1ec2d34d5b84', // cafe-bar-sauces
    '75b18b61-ab45-4233-893f-c7afba77f50d', // dessert-sauces
    '569a6247-8b54-460e-8c9c-85cf1351b971', // toppings
    'df729d04-320f-4aea-a43c-b553e1e35266', // ingredients
    '181138f6-fbe1-4605-9df5-c9cd3e5c0c7c', // bakery-fillings
    'd73a14f1-834c-4b93-acd8-e40862c1e6cb', // specialty-sauces
  ];

  for (const katId of oldCatIds) {
    const { error } = await supabase
      .from('kategoriler')
      .delete()
      .eq('id', katId);

    if (!error) {
      console.log(`   ✓ Kategori silindi`);
    } else {
      console.log(`   ⚠ Sil hatası (muhtemelen zaten yok):`, error.message);
    }
  }

  console.log(`\n✅ MİGRASYON TAMAMLANDI`);
  console.log(`   Taşınan ürün: ${movedCount}`);
  console.log(`   Hatalar: ${errorCount}`);
  console.log(`   Silinen kategoriler: ${oldCatIds.length}`);
}

migrateProducts().catch(console.error);
