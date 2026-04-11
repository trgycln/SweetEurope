import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: products, error } = await supabase
  .from('urunler')
  .select('id, stok_kodu, ad, kategori_id, urun_gami')
  .limit(20);
if (error) { console.error(error); process.exit(1); }

const productSamples = (products || []).map((p) => ({
  id: p.id,
  kod: p.stok_kodu,
  kategori_id: p.kategori_id,
  urun_gami: p.urun_gami,
  ad: typeof p.ad === 'object' ? (p.ad.tr || p.ad.de || p.ad.en || '') : p.ad,
}));
console.log('sample products:', JSON.stringify(productSamples, null, 2));

const ids = [...new Set((products || []).map((p) => p.kategori_id).filter(Boolean))];
const { data: cats, error: catError } = await supabase
  .from('kategoriler')
  .select('id, ad, slug, ust_kategori_id, urun_gami')
  .in('id', ids);
if (catError) { console.error(catError); process.exit(1); }
console.log('sample categories:', JSON.stringify(cats, null, 2));

const { data: stats, error: statsError } = await supabase.from('urunler').select('urun_gami');
if (statsError) { console.error(statsError); process.exit(1); }
const counts = {};
for (const row of (stats || [])) {
  const key = row.urun_gami || 'null';
  counts[key] = (counts[key] || 0) + 1;
}
console.log('urun_gami counts:', JSON.stringify(counts, null, 2));
