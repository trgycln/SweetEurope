import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching categories...');
  
  const { data: categories, error: catError } = await supabase
    .from('kategoriler')
    .select('*');
    
  if (catError) {
    console.error('Error fetching categories:', catError);
    return;
  }
  
  let powderDrinkCatIds: string[] = [];
  for (const cat of categories) {
    const adStr = JSON.stringify(cat.ad).toLowerCase();
    if (adStr.includes('powder') || adStr.includes('toz') || adStr.includes('drink')) {
      powderDrinkCatIds.push(cat.id);
    }
  }
  
  const { data: products, error: prodError } = await supabase
    .from('urunler')
    .select('id, ad, kategori_id, koli_ici_adet, palet_ici_adet');
    
  if (prodError) {
    console.error('Error fetching products:', prodError);
    return;
  }
  
  const powderProducts = products.filter(p => {
    const adStr = JSON.stringify(p.ad).toLowerCase();
    return powderDrinkCatIds.includes(p.kategori_id) || adStr.includes('powder') || adStr.includes('toz icecek');
  });
  
  console.log(`\nFound ${powderProducts.length} powder products. Updating...`);
  let successCount = 0;
  for (const p of powderProducts) {
    const { error: updateError } = await supabase
      .from('urunler')
      .update({
        koli_ici_adet: 6,
        palet_ici_adet: 540,
        palet_ici_kutu_adet: 90 // In some contexts kutu refers to koli in palettes
      })
      .eq('id', p.id);
      
    if (updateError) {
       // if palet_ici_kutu_adet fails, try without it
       const { error: updateError2 } = await supabase
        .from('urunler')
        .update({
          koli_ici_adet: 6,
          palet_ici_adet: 540
        })
        .eq('id', p.id);
        if (updateError2) {
            console.error(`Error updating product ${p.id}:`, updateError2);
        } else {
            successCount++;
        }
    } else {
       successCount++;
    }
  }
  console.log(`Successfully updated ${successCount} powder products.`);
}

main();
