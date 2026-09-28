const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function check() {
  const { data: kalemler } = await supabase.from('ithalat_parti_kalemleri').select('*, urunler(ad, distributor_alis_fiyati)').eq('parti_id', '6fabdb6c-bf20-457b-8685-c61b2fb515f2');
  console.log(JSON.stringify(kalemler, null, 2));
}
check();
