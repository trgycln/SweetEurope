// scripts/inspect-mono-product.mjs
// Checks a specific product and the mono-cakes category, counts active products in that category.
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PRODUCT_ID = '072cdfbe-2ad6-4e30-9957-0cca08ee2566';
const MONO_SLUG = 'mono-cakes';

async function run() {
  console.log('🔎 Inspecting mono product and category...');

  // Fetch mono-cakes category
  const { data: monoCat, error: catErr } = await sb
    .from('kategoriler')
    .select('id, ad, slug, ust_kategori_id')
    .eq('slug', MONO_SLUG)
    .maybeSingle();

  if (catErr) {
    console.error('❌ Category fetch error:', catErr.message);
    console.error(catErr);
  }
  if (!monoCat) {
    console.error('❌ mono-cakes category not found.');
    process.exit(1);
  }

  console.log(`✅ mono-cakes category id: ${monoCat.id}`);
  console.log('   Names:', monoCat.ad);

  // Fetch the specific product
  const { data: product, error: prodErr } = await sb
    .from('urunler')
    .select('id, ad, aktif, kategori_id, teknik_ozellikler')
    .eq('id', PRODUCT_ID)
    .maybeSingle();

  if (prodErr) {
    console.error('❌ Product fetch error:', prodErr.message);
    console.error(prodErr);
  }
  if (!product) {
    console.error('❌ Product not found with given ID.');
  } else {
    console.log('📦 Product:');
    console.log('   id:', product.id);
    console.log('   aktif:', product.aktif);
    console.log('   kategori_id:', product.kategori_id);
    console.log('   ad:', product.ad);
    console.log('   geschmack:', product.teknik_ozellikler?.geschmack);
  }

  // Count active products in mono-cakes
  const { data: monoProducts, error: monoErr } = await sb
    .from('urunler')
    .select('id, ad, aktif')
    .eq('kategori_id', monoCat.id)
    .eq('aktif', true);

  if (monoErr) {
    console.error('❌ Error fetching mono-cakes products:', monoErr.message);
    console.error(monoErr);
  } else {
    console.log(`📊 Active products in mono-cakes: ${monoProducts?.length || 0}`);
    (monoProducts || []).slice(0, 5).forEach(p => {
      const name = p.ad?.tr || p.ad?.de || p.ad?.en || 'No name';
      console.log(`   - ${p.id} :: ${name}`);
    });
  }

  // If product's kategori_id differs, suggest fix
  if (product && product.kategori_id !== monoCat.id) {
    console.warn('⚠️ Product kategori_id does NOT match mono-cakes category id.');
    console.warn('   You likely need to update the product to point to mono-cakes category.');
    console.log('\n👉 Suggested SQL (adjust if needed):');
    console.log(`UPDATE urunler SET kategori_id='${monoCat.id}' WHERE id='${PRODUCT_ID}';`);
  } else if (product) {
    console.log('✅ Product kategori_id matches mono-cakes category.');
    console.log('   If grid still empty, check other filters (porsiyon, aktif flag, etc.).');
  }
}

run().catch(e => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
