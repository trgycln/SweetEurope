const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function updatePrices() {
  const partiId = '6fabdb6c-bf20-457b-8685-c61b2fb515f2';
  
  const updates = [
    { barcode: '8691123340764', price: 2.812 }, // Strawberry (was 4.20)
    { barcode: '8691123473189', price: 2.009 }, // Peach (was 1.59)
    { barcode: '8691123474797', price: 2.009 }, // Pineapple (was 1.59)
    { barcode: '8691123449504', price: 4.56 }   // Vanilla (was 4.20)
  ];
  
  for (let update of updates) {
    console.log(`Updating ${update.barcode} to ${update.price}...`);
    
    // 1. Update urunler table
    const { data: urun, error: urunErr } = await supabase
      .from('urunler')
      .update({ distributor_alis_fiyati: update.price })
      .eq('ean_gtin', update.barcode)
      .select('id')
      .single();
      
    if (urunErr) {
      console.error(`Error updating urunler for ${update.barcode}:`, urunErr.message);
      continue;
    }
    
    // 2. Update ithalat_parti_kalemleri
    // We need to calculate ciplak_maliyet_eur based on new price and existing miktar_adet
    const { data: kalemData, error: fetchErr } = await supabase
      .from('ithalat_parti_kalemleri')
      .select('id, miktar_adet')
      .eq('parti_id', partiId)
      .eq('urun_id', urun.id)
      .maybeSingle();
      
    if (fetchErr) {
      console.error(`Error fetching kalem for ${update.barcode}:`, fetchErr.message);
      continue;
    }
    
    if (kalemData) {
      const ciplak_maliyet = parseFloat((update.price * kalemData.miktar_adet).toFixed(2));
      const { error: updateErr } = await supabase
        .from('ithalat_parti_kalemleri')
        .update({ 
          birim_alis_fiyati_orijinal: update.price,
          indirimli_alis_fiyati: update.price,
          ciplak_maliyet_eur: ciplak_maliyet
        })
        .eq('id', kalemData.id);
        
      if (updateErr) {
        console.error(`Error updating kalem for ${update.barcode}:`, updateErr.message);
      } else {
        console.log(`Successfully updated kalem ${kalemData.id} to new total: ${ciplak_maliyet}`);
      }
    } else {
      console.log(`Kalem not found in batch for ${update.barcode}.`);
    }
  }
  console.log('Done!');
}
updatePrices();
