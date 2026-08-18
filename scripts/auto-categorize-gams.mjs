import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

function determineGams(product, categoriesMap) {
  const gams = new Set();
  
  const pName = JSON.stringify(product.ad || {}).toLowerCase() + " " + (product.slug || "").toLowerCase();
  
  let cName = "";
  let currentCat = categoriesMap[product.kategori_id];
  while (currentCat) {
      cName += " " + JSON.stringify(currentCat.ad || {}).toLowerCase() + " " + (currentCat.slug || "").toLowerCase();
      currentCat = currentCat.ust_kategori_id ? categoriesMap[currentCat.ust_kategori_id] : null;
  }
  
  const searchString = pName + " " + cName;
  
  const isSyrup = pName.includes('surup') || pName.includes('syrup') || pName.includes('sirup');
  const isSauce = pName.includes('sos') || pName.includes('sauce') || pName.includes('topping') || pName.includes('pure') || pName.includes('püre');
  const isPowder = pName.includes('toz') || pName.includes('powder');
  const isFrappe = pName.includes('frappe') || pName.includes('smoothie');
  const isIceCream = pName.includes('dondurma') || pName.includes('gelato') || pName.includes('eis') || pName.includes('ice cream') || pName.includes('frozen');
  const isPastry = pName.includes('pasta') || pName.includes('cake') || pName.includes('torte') || pName.includes('tart') || pName.includes('cookie') || pName.includes('kurabiye') || pName.includes('bakery') || pName.includes('pastry') || pName.includes('konditorei');

  // 1. Barista
  if (
    searchString.includes('kahve') || searchString.includes('coffee') || searchString.includes('kaffee') ||
    searchString.includes('barista') || searchString.includes('kokteyl') || searchString.includes('cocktail') ||
    searchString.includes('cafe') || searchString.includes('bar') || searchString.includes('foamer') ||
    isSyrup || isSauce || isPowder || isFrappe
  ) {
    gams.add('barista');
  }

  // 2. Pastaci
  if (
    isPastry ||
    searchString.includes('krem') || searchString.includes('cream') || searchString.includes('cheesecake') ||
    searchString.includes('hamur') || searchString.includes('fondant') || searchString.includes('jole') || 
    searchString.includes('gida boyasi') || searchString.includes('color') || searchString.includes('renk') || searchString.includes('patiseri')
  ) {
    gams.add('pastaci');
  }

  // 3. Dondurma
  if (
    isIceCream || searchString.includes('külah') || searchString.includes('cornet')
  ) {
    gams.add('dondurma');
  }

  // 4. Icecek (Sadece gerçek içecekler ve toz içecekler)
  if (!isSauce && !isSyrup) {
    if (
      searchString.includes('icecek') || searchString.includes('drink') || searchString.includes('getränk') ||
      searchString.includes('tea') || searchString.includes('cay') || searchString.includes('smoothie') ||
      searchString.includes('meyve suyu') || searchString.includes('fruit juice') ||
      isPowder || isFrappe
    ) {
      gams.add('icecek');
    }
  }

  // Soslar (Sauces / Toppings / Purees) - Akıllı Dağıtım
  if (isSauce) {
      if (searchString.includes('dondurma') || searchString.includes('ice cream')) {
          gams.add('dondurma');
      }
      if (isPastry || searchString.includes('cikolata') || searchString.includes('chocolate') || searchString.includes('schoko')) {
          gams.add('pastaci');
      }
      // Kullanıcı talebi: Soslar (meyveli bile olsa) içecek gamında olmamalı.
  }

  // Eğer hiçbirine girmediyse, hepsine koy
  if (gams.size === 0) {
      gams.add('barista');
      gams.add('pastaci');
      gams.add('dondurma');
      gams.add('icecek');
  }

  return Array.from(gams);
}

async function run() {
  console.log("Fetching categories...");
  const { data: categories, error: catError } = await supabase
    .from('kategoriler')
    .select('*');
    
  if (catError) {
    console.error("Error fetching categories:", catError);
    process.exit(1);
  }

  const categoriesMap = {};
  categories.forEach(c => categoriesMap[c.id] = c);

  console.log("Fetching products...");
  const { data: products, error: prodError } = await supabase
    .from('urunler')
    .select('id, ad, slug, kategori_id, urun_gami');

  if (prodError) {
    console.error("Error fetching products:", prodError);
    process.exit(1);
  }

  console.log(`Found ${products.length} products. Categorizing...`);
  let updatedCount = 0;

  for (const product of products) {
    const newGams = determineGams(product, categoriesMap);
    
    // Sort array for comparison
    const currentGams = Array.isArray(product.urun_gami) ? [...product.urun_gami].sort() : [];
    const newGamsSorted = [...newGams].sort();

    // Sadece değişenleri güncellemek için kontrol
    const isDifferent = JSON.stringify(currentGams) !== JSON.stringify(newGamsSorted);
    
    if (isDifferent) {
      console.log(`Product: ${product.slug}`);
      console.log(`  Old Gams: ${JSON.stringify(currentGams)}`);
      console.log(`  New Gams: ${JSON.stringify(newGamsSorted)}`);
      
      const { error: updateError } = await supabase
        .from('urunler')
        .update({ urun_gami: newGamsSorted })
        .eq('id', product.id);
        
      if (updateError) {
        console.error(`  Error updating ${product.slug}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`\nSuccessfully updated ${updatedCount} products.`);
}

run();
