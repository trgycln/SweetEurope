const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function check() {
  const { data } = await supabase.from('urunler').select('*').ilike('ad->>tr', '%Çilek Meyveli Sos%');
  console.log(data.map(d => ({ ad: d.ad, fiyat: d.distributor_alis_fiyati, barkod: d.barkod || d.stok_kodu })));
}
check();
