const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data } = await supabase.from('urunler').select('ad, ean_gtin, distributor_alis_fiyati').in('ean_gtin', [
    '8691123340986', // Banana Sauce (Standard 1kg sauce)
    '8691123472175', // Watermelon Syrup (Standard 70cl syrup)
    '8691123340764', // Strawberry Sauce (Wrong)
    '8691123473189', // Peach Syrup (Wrong)
    '8691123474797', // Pineapple Syrup (Wrong)
    '8691123449504'  // Vanilla Powder (Wrong)
  ]);
  console.log(data);
}
check();
