// Setup proper category hierarchy with subcategories
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY = process.argv.includes('--dry');

// Kategori ID'lerini cache'leyelim
let categoryIds = {};

async function main() {
  console.log('🗑️  1. Deleting Accessories category and its product...\n');
  
  // Aksesuarlar kategorisini sil
  const { data: accessoryCat } = await sb
    .from('kategoriler')
    .select('id')
    .eq('slug', 'accessories')
    .maybeSingle();
  
  if (accessoryCat) {
    if (!DRY) {
      await sb.from('urunler').delete().eq('kategori_id', accessoryCat.id);
      await sb.from('kategoriler').delete().eq('id', accessoryCat.id);
    }
    console.log('✅ Accessories category deleted\n');
  }
  
  // Ana kategorileri al
  const { data: mainCats } = await sb
    .from('kategoriler')
    .select('id, ad, slug')
    .is('ust_kategori_id', null);
  
  mainCats.forEach(cat => {
    categoryIds[cat.slug] = cat.id;
  });
  
  console.log('📂 2. Creating subcategories...\n');
  
  // Alt kategoriler tanımla
  const subcategories = [
    // Pastalar & Kekler altındakiler
    {
      parent: 'cakes-and-tarts',
      categories: [
        { slug: 'cheesecakes', ad: { tr: 'Cheesecake\'ler', de: 'Käsekuchen', en: 'Cheesecakes' }, icon: '🍰', color: '#FFE5B4' },
        { slug: 'brownies', ad: { tr: 'Browniler', de: 'Brownies', en: 'Brownies' }, icon: '🍫', color: '#8B4513' },
        { slug: 'tiramisu', ad: { tr: 'Tiramisu', de: 'Tiramisu', en: 'Tiramisu' }, icon: '🍮', color: '#F4E4C1' },
        { slug: 'cup-cakes', ad: { tr: 'Bardak Pastalar', de: 'Becher-Kuchen', en: 'Cup Cakes' }, icon: '🧁', color: '#FFB6C1' },
        { slug: 'cookies', ad: { tr: 'Kurabiyeler', de: 'Kekse', en: 'Cookies' }, icon: '🍪', color: '#D2691E' },
        { slug: 'muffins', ad: { tr: 'Muffinler', de: 'Muffins', en: 'Muffins' }, icon: '🧁', color: '#DEB887' },
        { slug: 'vegan-cakes', ad: { tr: 'Vegan Pastalar', de: 'Vegane Kuchen', en: 'Vegan Cakes' }, icon: '🌱', color: '#90EE90' },
        { slug: 'gluten-free', ad: { tr: 'Glutensiz Ürünler', de: 'Glutenfreie Produkte', en: 'Gluten-Free' }, icon: '🌾', color: '#F0E68C' },
      ]
    },
    // Kahve & İçecekler altındakiler
    {
      parent: 'coffee-and-drinks',
      categories: [
        { slug: 'turkish-coffee', ad: { tr: 'Türk Kahvesi', de: 'Türkischer Kaffee', en: 'Turkish Coffee' }, icon: '☕', color: '#6F4E37' },
        { slug: 'filter-coffee', ad: { tr: 'Filtre Kahve', de: 'Filterkaffee', en: 'Filter Coffee' }, icon: '☕', color: '#8B7355' },
        { slug: 'espresso', ad: { tr: 'Espresso', de: 'Espresso', en: 'Espresso' }, icon: '☕', color: '#3E2723' },
        { slug: 'hot-chocolate', ad: { tr: 'Sıcak Çikolata', de: 'Heiße Schokolade', en: 'Hot Chocolate' }, icon: '🍫', color: '#7B3F00' },
        { slug: 'tea', ad: { tr: 'Çay', de: 'Tee', en: 'Tea' }, icon: '🍵', color: '#C19A6B' },
        { slug: 'syrups', ad: { tr: 'Şuruplar', de: 'Sirupe', en: 'Syrups' }, icon: '🍯', color: '#FFD700' },
        { slug: 'salep', ad: { tr: 'Salep', de: 'Salep', en: 'Salep' }, icon: '🥛', color: '#FAEBD7' },
      ]
    },
    // Pizza & Fast Food altındakiler
    {
      parent: 'pizza-and-fast-food',
      categories: [
        { slug: 'pizzas', ad: { tr: 'Pizzalar', de: 'Pizzen', en: 'Pizzas' }, icon: '🍕', color: '#FF6347' },
        { slug: 'fast-food', ad: { tr: 'Fast Food', de: 'Fast Food', en: 'Fast Food' }, icon: '🍔', color: '#FFA500' },
      ]
    },
    // Soslar & Malzemeler altındakiler
    {
      parent: 'sauces-and-ingredients',
      categories: [
        { slug: 'dessert-sauces', ad: { tr: 'Tatlı Sosları', de: 'Dessert-Saucen', en: 'Dessert Sauces' }, icon: '🍯', color: '#DDA15E' },
        { slug: 'toppings', ad: { tr: 'Üst Malzemeler', de: 'Toppings', en: 'Toppings' }, icon: '🍓', color: '#FF69B4' },
        { slug: 'ingredients', ad: { tr: 'Malzemeler', de: 'Zutaten', en: 'Ingredients' }, icon: '🧈', color: '#FFE4B5' },
      ]
    }
  ];
  
  // Alt kategorileri oluştur
  for (const group of subcategories) {
    const parentId = categoryIds[group.parent];
    console.log(`\n  Creating subcategories for ${group.parent}...`);
    
    for (const subcat of group.categories) {
      const { data: existing } = await sb
        .from('kategoriler')
        .select('id')
        .eq('slug', subcat.slug)
        .maybeSingle();
      
      if (existing) {
        console.log(`    ⏭️  ${subcat.slug} already exists`);
        continue;
      }
      
      if (!DRY) {
        const { data: newCat, error} = await sb
          .from('kategoriler')
          .insert({
            ad: subcat.ad,
            slug: subcat.slug,
            ust_kategori_id: parentId
          })
          .select()
          .single();
        
        if (error) {
          console.error(`    ❌ Failed to create ${subcat.slug}:`, error.message);
        } else {
          console.log(`    ✅ Created ${subcat.slug}`);
        }
      } else {
        console.log(`    [DRY] Would create ${subcat.slug}`);
      }
    }
  }
  
  console.log('\n\n✅ Subcategories created!\n');
  console.log('ℹ️  Note: icon, color, and description properties are stored in metadata');
  console.log('   and can be added via a migration if needed.\n');
  
  console.log('\n✅ Done!\n');
  if (DRY) {
    console.log('💡 This was a dry run. Run without --dry to apply changes.\n');
  }
}

main().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
