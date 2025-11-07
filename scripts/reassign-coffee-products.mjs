// Reassign products from coffee-and-drinks to coffee category
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🔄 Reassigning products from coffee-and-drinks to coffee...\n');

  // Get old coffee-and-drinks category
  const { data: oldCat } = await sb
    .from('kategoriler')
    .select('id')
    .eq('slug', 'coffee-and-drinks')
    .is('ust_kategori_id', null)
    .maybeSingle();

  if (!oldCat) {
    console.log('ℹ️  coffee-and-drinks category not found.');
    return;
  }

  // Get new coffee category
  const { data: coffeeCat } = await sb
    .from('kategoriler')
    .select('id')
    .eq('slug', 'coffee')
    .is('ust_kategori_id', null)
    .maybeSingle();

  if (!coffeeCat) {
    console.error('❌ coffee category not found!');
    return;
  }

  // Get products
  const { data: products } = await sb
    .from('urunler')
    .select('id, ad')
    .eq('kategori_id', oldCat.id);

  console.log(`Found ${products?.length || 0} products to reassign\n`);

  if (!products || products.length === 0) {
    console.log('No products to reassign.');
    return;
  }

  // Reassign all products to coffee
  const { error } = await sb
    .from('urunler')
    .update({ kategori_id: coffeeCat.id })
    .eq('kategori_id', oldCat.id);

  if (error) {
    console.error('❌ Failed to reassign products:', error.message);
    return;
  }

  console.log(`✅ Reassigned ${products.length} products to coffee category`);

  // Now delete old category
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

  console.log('\n✅ Done!');
}

main().catch((e) => {
  console.error('❌ Error:', e.message || e);
  process.exit(1);
});
