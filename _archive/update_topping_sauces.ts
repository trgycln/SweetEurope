import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: products, error: prodError } = await supabase
    .from('urunler')
    .select('id, ad, koli_ici_adet, palet_ici_adet');
    
  if (prodError) {
    console.error('Error fetching products:', prodError);
    return;
  }
  
  const topping1kgProducts = products.filter(p => {
    const adStr = JSON.stringify(p.ad).toLowerCase();
    // find topping products that are 1kg
    return adStr.includes('topping') && adStr.includes('1 kg');
  });
  
  console.log(`\nFound ${topping1kgProducts.length} 'Topping 1 KG' products. Updating...`);
  let successCount = 0;
  for (const p of topping1kgProducts) {
    console.log(`Updating ${JSON.stringify(p.ad)}...`);
    const { error: updateError } = await supabase
      .from('urunler')
      .update({
        koli_ici_adet: 6,
        palet_ici_adet: 1020
      })
      .eq('id', p.id);
      
    if (updateError) {
        console.error(`Error updating product ${p.id}:`, updateError);
    } else {
        successCount++;
    }
  }
  console.log(`Successfully updated ${successCount} products.`);
}

main();
