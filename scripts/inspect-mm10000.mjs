
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('urunler')
    .select('*')
    .ilike('stok_kodu', '%MM10000%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  data.forEach(p => {
    console.log('Product:', {
      id: p.id,
      ad: p.ad,
      stok_kodu: p.stok_kodu,
      distributor_alis_fiyati: p.distributor_alis_fiyati,
      teknik_ozellikler: p.teknik_ozellikler
    });
  });
}

main();
