import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: categories, error: catError } = await supabase
    .from('kategoriler')
    .select('id, ad');
    
  if (catError) {
    console.error('Error fetching categories:', catError);
    return;
  }
  
  let toppingCatIds: string[] = [];
  for (const cat of categories) {
    const adStr = JSON.stringify(cat.ad).toLowerCase();
    if (adStr.includes('toping') || adStr.includes('topping')) {
      console.log('Found category:', cat.id, cat.ad);
      toppingCatIds.push(cat.id);
    }
  }
  
  const { data: products, error: prodError } = await supabase
    .from('urunler')
    .select('id, ad, kategori_id, koli_ici_adet, palet_ici_adet');
    
  if (prodError) {
    console.error('Error fetching products:', prodError);
    return;
  }
  
  const toppingProducts = products.filter(p => {
    const adStr = JSON.stringify(p.ad).toLowerCase();
    // find topping products, especially 1kg ones
    return toppingCatIds.includes(p.kategori_id) || (adStr.includes('topping') && adStr.includes('1 kg'));
  });
  
  console.log(`\nFound ${toppingProducts.length} topping products:`);
  let hasExistingData = false;
  for (const p of toppingProducts) {
    console.log(`- ${JSON.stringify(p.ad)}`);
    console.log(`  koli_ici_adet: ${p.koli_ici_adet}, palet_ici_adet: ${p.palet_ici_adet}`);
    if (p.koli_ici_adet !== null || p.palet_ici_adet !== null) {
        hasExistingData = true;
    }
  }
  
  console.log(`\nHas existing data: ${hasExistingData}`);
}

main();
