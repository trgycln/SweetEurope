import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, serviceRoleKey);

const manualMappings = {
  '8691123444656': 'FO-MYS-015',
  '8691123355065': 'FO-MYS-019',
  '8691123343000': 'FO-CBS-033',
  '8691123120571': 'FO-SRP-006',
  '8691123120229': 'FO-KSR-032',
  '8691123120588': 'FO-KSR-005',
  '8691123120564': 'FO-SRP-009',
  '8691123120052': 'FO-KSR-017',
  '8691123120236': 'FO-KSR-012',
  '8691123120700': 'FO-KSR-019', // Corrected by user
  '8691123120106': 'FO-KSR-022'
};

async function updateProforma() {
  console.log('--- ADIM 1: Eksik barkodlari stok_kodu na gore guncelle ---');
  for (const [barcode, stok_kodu] of Object.entries(manualMappings)) {
    const { error } = await supabase.from('urunler').update({ ean_gtin: barcode }).eq('stok_kodu', stok_kodu);
    if (error) {
      console.error(`Error updating barcode for ${stok_kodu}:`, error.message);
    } else {
      console.log(`Updated barcode for ${stok_kodu} to ${barcode}`);
    }
  }

  console.log('\n--- ADIM 2: Proforma fatura BOX adetlerini stok_miktari na isle ---');
  const lines = fs.readFileSync('proforma_invoice.txt', 'utf-8').split('\n');
  let updatedCount = 0;
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    const match = line.match(/^(\d{13})\s+\d{12}\s+(.+?)\s+\d+(?:,\d+)?\s+\d+\s+(\d+)\s+/);
    if (match) {
      const barcode = match[1];
      const box = parseInt(match[3], 10);
      
      const { data, error } = await supabase.from('urunler').update({ stok_miktari: box }).eq('ean_gtin', barcode).select('stok_kodu, ad');
      
      if (error) {
        console.error(`Error updating stock for barcode ${barcode}:`, error.message);
      } else if (data && data.length > 0) {
        console.log(`Updated stock for ${data[0].stok_kodu} (${data[0].ad.tr || data[0].ad}) to ${box} BOX`);
        updatedCount++;
      } else {
        // We know 3 products are skipped
        console.log(`Skipped (not in DB): Barcode ${barcode} - ${match[2]}`);
      }
    }
  }
  
  console.log(`\nIslem tamamlandi. Toplam ${updatedCount} urunun stok miktari guncellendi.`);
}

updateProforma().catch(console.error);
