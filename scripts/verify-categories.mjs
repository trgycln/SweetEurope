// Quick verification of category status
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: cats } = await sb.from('kategoriler').select('id, ad, slug');
const { data: prods } = await sb.from('urunler').select('kategori_id');

console.log('\n📊 Final Category Status:\n');

const prodCounts = {};
prods.forEach(p => {
  prodCounts[p.kategori_id] = (prodCounts[p.kategori_id] || 0) + 1;
});

cats.sort((a,b) => (prodCounts[b.id] || 0) - (prodCounts[a.id] || 0));

cats.forEach(c => {
  const name = c.ad?.en || c.ad?.de || c.ad?.tr || 'Unknown';
  const count = prodCounts[c.id] || 0;
  console.log(`  ✓ ${name.padEnd(25)} ${String(count).padStart(3)} products  (slug: ${c.slug})`);
});

console.log(`\n📈 Total: ${cats.length} categories, ${prods.length} products\n`);
