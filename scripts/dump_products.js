const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
env.split('\n').forEach(line => {
  const clean = line.trim();
  if (clean.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = clean.split('=')[1].replace(/["']/g, '').trim();
  if (clean.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = clean.split('=')[1].replace(/["']/g, '').trim();
});

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
