import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, serviceRoleKey);

async function checkProforma() {
  const lines = fs.readFileSync('proforma_invoice.txt', 'utf-8').split('\n');
  const items = [];
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    // Regex to match Barcode at start, and BOX quantity (it's the 6th element)
    // 8691123340764 200799390019 FO STRAWBERRY FRUITED SAUCE 1 KG 1 6 90 540 ...
    const match = line.match(/^(\d{13})\s+\d{12}\s+(.+?)\s+\d+(?:,\d+)?\s+\d+\s+(\d+)\s+/);
    if (match) {
      items.push({
        barcode: match[1],
        name: match[2].trim(),
        box: parseInt(match[3], 10)
      });
    } else {
      console.log('Failed to parse line:', line);
    }
  }

  const { data: dbProducts, error } = await supabase.from('urunler').select('id, ad, ean_gtin, stok_kodu, stok_miktari');
  
  const found = [];
  const missing = [];
  
  for (const item of items) {
    const dbMatch = dbProducts.find(p => p.ean_gtin === item.barcode);
    if (dbMatch) {
      found.push({ ...item, dbName: typeof dbMatch.ad === 'object' ? dbMatch.ad.tr : dbMatch.ad, oldStock: dbMatch.stok_miktari });
    } else {
      missing.push(item);
    }
  }
  
  console.log(`Total items in Proforma: ${items.length}`);
  console.log(`Found in DB: ${found.length}`);
  console.log(`Missing in DB: ${missing.length}`);
  if (missing.length > 0) {
    console.log('Missing items:');
    console.log(missing);
  }
  
  fs.writeFileSync('proforma_check.json', JSON.stringify({ found, missing }, null, 2));
}

checkProforma().catch(console.error);
