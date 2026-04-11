import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function inferFromSlug(slug) {
  if (!slug) return null;
  const frozen = ['cakes-and-tarts', 'cookies-and-muffins', 'pizza-and-fast-food'];
  if (frozen.includes(slug)) return 'cold-chain';
  const foKeywords = ['coffee', 'drink', 'syrup', 'sauce', 'ingredient', 'topping'];
  if (foKeywords.some((keyword) => slug.includes(keyword))) return 'non-cold';
  return 'cold-chain';
}

const { data: products, error: productError } = await supabase.from('urunler').select('id, kategori_id');
if (productError) { console.error(productError); process.exit(1); }
const { data: categories, error: catError } = await supabase.from('kategoriler').select('id, slug, ust_kategori_id');
if (catError) { console.error(catError); process.exit(1); }
const categoryMap = new Map((categories || []).map((c) => [c.id, c]));
const counts = { 'cold-chain': 0, 'non-cold': 0 };
for (const product of (products || [])) {
  let current = categoryMap.get(product.kategori_id);
  let guard = 0;
  let profile = 'non-cold';
  while (current && guard < 10) {
    const inferred = inferFromSlug(current.slug || '');
    if (inferred) { profile = inferred; break; }
    current = current.ust_kategori_id ? categoryMap.get(current.ust_kategori_id) : null;
    guard += 1;
  }
  counts[profile] += 1;
}
console.log('fallback-profile-counts=', counts);
