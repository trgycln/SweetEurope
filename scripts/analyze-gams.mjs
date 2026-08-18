import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function run() {
  const { data: categories } = await supabase.from('kategoriler').select('*');
  const { data: products } = await supabase.from('urunler').select('id, ad, slug, kategori_id, urun_gami');
  const categoriesMap = {};
  categories.forEach(c => categoriesMap[c.id] = c);

  let fallbackProducts = [];
  
  for (const product of products) {
    const pName = JSON.stringify(product.ad || {}).toLowerCase() + " " + (product.slug || "").toLowerCase();
    let cName = "";
    let currentCat = categoriesMap[product.kategori_id];
    while (currentCat) {
        cName += " " + JSON.stringify(currentCat.ad || {}).toLowerCase() + " " + (currentCat.slug || "").toLowerCase();
        currentCat = currentCat.ust_kategori_id ? categoriesMap[currentCat.ust_kategori_id] : null;
    }
    const searchString = pName + " " + cName;
    
    let isBarista = false, isPastaci = false, isDondurma = false, isIcecek = false;
    
    if (searchString.includes('kahve') || searchString.includes('coffee') || searchString.includes('kaffee') ||
        searchString.includes('surup') || searchString.includes('syrup') || searchString.includes('sirup') ||
        searchString.includes('barista') || searchString.includes('kokteyl') || searchString.includes('cocktail') ||
        searchString.includes('cafe') || searchString.includes('bar') || searchString.includes('foamer')) {
      isBarista = true;
    }
    
    if (searchString.includes('pasta') || searchString.includes('cake') || searchString.includes('torte') ||
        searchString.includes('tart') || searchString.includes('cookie') || searchString.includes('kurabiye') ||
        searchString.includes('bakery') || searchString.includes('pastry') || searchString.includes('konditorei') ||
        searchString.includes('krem') || searchString.includes('cream') || searchString.includes('cheesecake')) {
      isPastaci = true;
    }
    
    if (searchString.includes('dondurma') || searchString.includes('gelato') || searchString.includes('eis') ||
        searchString.includes('ice cream') || searchString.includes('frozen')) {
      isDondurma = true;
    }
    
    if (searchString.includes('icecek') || searchString.includes('drink') || searchString.includes('getränk') ||
        searchString.includes('tea') || searchString.includes('cay') || searchString.includes('smoothie') ||
        searchString.includes('meyve') || searchString.includes('fruit') || searchString.includes('frucht')) {
      isIcecek = true;
    }
    
    let isToz = searchString.includes('toz') || searchString.includes('powder');
    let isSos = searchString.includes('sos') || searchString.includes('sauce') || searchString.includes('topping');
    
    if (!isBarista && !isPastaci && !isDondurma && !isIcecek && !isToz && !isSos) {
        fallbackProducts.push({slug: product.slug, string: searchString});
    }
  }
  
  console.log('--- FALLBACK PRODUCTS ---');
  fallbackProducts.forEach(p => console.log(p.slug, '=>', p.string));
}
run();
