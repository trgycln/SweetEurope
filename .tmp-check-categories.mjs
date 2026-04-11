import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: products, error } = await supabase
  .from('urunler')
  .select('id, stok_kodu, ad, kategori_id')
  .limit(20);
if (error) { console.error(error); process.exit(1); }

const ids = [...new Set((products || []).map((p) => p.kategori_id).filter(Boolean))];
const { data: cats, error: catError } = await supabase
  .from('kategoriler')
  .select('id, ad, slug, ust_kategori_id')
  .in('id', ids);
if (catError) { console.error(catError); process.exit(1); }

console.log('product_count_sample=', (products || []).length);
console.log('categories=', JSON.stringify(cats, null, 2));
