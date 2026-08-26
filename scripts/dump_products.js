const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

require('dotenv').config({ path: '.env.local' });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function run() {
  const { data: urunler, error: uErr } = await supabase
    .from('urunler')
    .select('*')
    .eq('aktif', true);

  const { data: kategoriler, error: kErr } = await supabase
    .from('kategoriler')
    .select('id, ad, slug, ust_kategori_id');

  if (uErr) console.error('Urunler error:', uErr);
  if (kErr) console.error('Kategoriler error:', kErr);

  console.log('Total Active Products:', urunler ? urunler.length : 0);
  console.log('Total Categories:', kategoriler ? kategoriler.length : 0);

  fs.writeFileSync('scripts/products_dump.json', JSON.stringify({ urunler, kategoriler }, null, 2));
}

run();
