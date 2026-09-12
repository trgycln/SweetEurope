import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const mapped = JSON.parse(fs.readFileSync('data/canonical_triangulation_90.json', 'utf8'));
  const { data: dbProducts } = await supabase.from('urunler').select('id, ean_gtin, stok_kodu, ad');
  
  const dbBarcodes = new Set(dbProducts.map(p => p.ean_gtin).filter(Boolean));
  let matchCount = 0;
  for (const m of mapped) {
    if (dbBarcodes.has(m.barcode)) {
      matchCount++;
    }
  }
  console.log(`Of the 90 canonical barcodes, ${matchCount} already exist in the DB.`);
}

check();
