const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data } = await supabase.from('ithalat_parti_kalemleri').select('id, urun_id, urunler(ad, ean_gtin), birim_alis_fiyati_orijinal, indirimli_alis_fiyati, indirim1_iptal, indirim2_iptal').eq('parti_id', '6fabdb6c-bf20-457b-8685-c61b2fb515f2');
  const filtered = data.filter(d => d.urunler && ['8691123340764','8691123473189','8691123474797','8691123449504'].includes(d.urunler.ean_gtin));
  console.log(JSON.stringify(filtered, null, 2));
}
check();
