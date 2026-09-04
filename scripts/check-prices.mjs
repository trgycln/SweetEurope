import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: tedarikci } = await supabase.from('tedarikciler').select('id, unvan').ilike('unvan', '%Fo%').single();
  
  if (!tedarikci) {
    console.log('Fo tedarikcisi bulunamadi');
    return;
  }

  const { data: urunler } = await supabase.from('urunler')
    .select('id, ad, stok_kodu, ean_gtin, distributor_alis_fiyati')
    .eq('tedarikci_id', tedarikci.id);

  console.log(`Toplam FO urunleri: ${urunler.length}`);
  
  fs.writeFileSync('C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\c70ac83a-90fd-4a72-96d1-fdde80f3eab1\\scratch\\fo_products.json', JSON.stringify(urunler, null, 2));
  console.log('fo_products.json written');
}

run();
