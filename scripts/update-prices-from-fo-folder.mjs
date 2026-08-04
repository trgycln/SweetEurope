import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Missing Supabase env.');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

async function main() {
  const filePath = 'dokuments/Fo Fiyat Listeleri/fo-urun-import-sablonu (2).xlsx';
  console.log(`Reading Excel file: ${filePath}`);
  
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const row of rows) {
    const code = row['Stok Kodu *']?.toString().trim();
    const purchasePrice = row['Alış Fiyatı (€/adet)'];
    
    if (code && typeof purchasePrice === 'number') {
      const { data, error } = await supabase
        .from('urunler')
        .update({ distributor_alis_fiyati: purchasePrice })
        .eq('stok_kodu', code)
        .select('id, stok_kodu');
        
      if (error) {
        console.error(`Error updating ${code}:`, error.message);
      } else if (data && data.length > 0) {
        updatedCount++;
      } else {
        notFoundCount++;
      }
    }
  }
  
  console.log('--- Summary ---');
  console.log(`Successfully updated distributor_alis_fiyati for ${updatedCount} products.`);
  console.log(`Could not find ${notFoundCount} products in the database.`);
}

main().catch(console.error);
