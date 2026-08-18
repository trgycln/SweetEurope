import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function run() {
  const { data: categories } = await supabase.from('kategoriler').select('*');
  const { data: products } = await supabase.from('urunler').select('id, ad, slug, kategori_id, urun_gami').eq('slug', 'fo-cilek-premium-surup-700ml-fo1131');
  const categoriesMap = {};
  categories.forEach(c => categoriesMap[c.id] = c);

  for (const product of products) {
    const pName = JSON.stringify(product.ad || {}).toLowerCase() + " " + (product.slug || "").toLowerCase();
    let cName = "";
    let currentCat = categoriesMap[product.kategori_id];
    while (currentCat) {
        cName += " " + JSON.stringify(currentCat.ad || {}).toLowerCase() + " " + (currentCat.slug || "").toLowerCase();
        currentCat = currentCat.ust_kategori_id ? categoriesMap[currentCat.ust_kategori_id] : null;
    }
    console.log("Search string:", pName + " " + cName);
  }
}
run();
