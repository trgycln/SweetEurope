// Migrate products from old coffee-and-drinks category to new coffee/drinks categories
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🔄 Migrating products from coffee-and-drinks...\n');

  // Get old coffee-and-drinks category
  const { data: oldCat } = await sb
    .from('kategoriler')
    .select('id')
    .eq('slug', 'coffee-and-drinks')
    .is('ust_kategori_id', null)
    .maybeSingle();

  if (!oldCat) {
    console.log('ℹ️  coffee-and-drinks category not found. Nothing to migrate.');
    return;
  }

  // Get new coffee and drinks categories
  const { data: newCats } = await sb
    .from('kategoriler')
    .select('id, slug')
    .in('slug', ['coffee', 'drinks'])
    .is('ust_kategori_id', null);

  if (!newCats || newCats.length !== 2) {
    console.error('❌ coffee and drinks categories not found!');
    return;
  }

  const coffeeId = newCats.find(c => c.slug === 'coffee')?.id;
  const drinksId = newCats.find(c => c.slug === 'drinks')?.id;

  // Get all subcategories of old coffee-and-drinks
  const { data: subCats } = await sb
    .from('kategoriler')
    .select('id, slug, ad')
    .eq('ust_kategori_id', oldCat.id);

  console.log(`Found ${subCats?.length || 0} subcategories under coffee-and-drinks\n`);

  if (!subCats || subCats.length === 0) {
    console.log('No subcategories to migrate.');
  } else {
    // Categorize subcategories
    const coffeeSubcats = ['turkish-coffee', 'filter-coffee', 'espresso'];
    const drinksSubcats = ['hot-chocolate', 'tea', 'syrups', 'salep'];

    for (const sub of subCats) {
      let newParentId = null;
      if (coffeeSubcats.includes(sub.slug)) {
        newParentId = coffeeId;
        console.log(`  → Moving ${sub.slug} to coffee`);
      } else if (drinksSubcats.includes(sub.slug)) {
        newParentId = drinksId;
        console.log(`  → Moving ${sub.slug} to drinks`);
      } else {
        console.log(`  ⚠️  Unknown subcategory: ${sub.slug}, skipping...`);
        continue;
      }

      const { error } = await sb
        .from('kategoriler')
        .update({ ust_kategori_id: newParentId })
        .eq('id', sub.id);

      if (error) {
        console.error(`  ❌ Failed to move ${sub.slug}:`, error.message);
      }
    }
  }

  // Check if coffee-and-drinks has any products directly assigned
  const { data: directProducts } = await sb
    .from('urunler')
    .select('id, ad')
    .eq('kategori_id', oldCat.id);

  if (directProducts && directProducts.length > 0) {
    console.log(`\n⚠️  ${directProducts.length} products are directly assigned to coffee-and-drinks`);
    console.log('   These need manual review to assign to coffee or drinks.');
  } else {
    console.log('\n✓ No products directly assigned to coffee-and-drinks');
  }

  // Delete old coffee-and-drinks category
  console.log('\n🗑️  Deleting coffee-and-drinks category...');
  const { error: delError } = await sb
    .from('kategoriler')
    .delete()
    .eq('id', oldCat.id);

  if (delError) {
    console.error('❌ Failed to delete coffee-and-drinks:', delError.message);
  } else {
    console.log('✅ coffee-and-drinks category deleted successfully!');
  }

  console.log('\n✅ Migration complete!');
}

main().catch((e) => {
  console.error('❌ Error:', e.message || e);
  process.exit(1);
});
