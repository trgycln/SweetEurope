import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const check = JSON.parse(fs.readFileSync('proforma_check.json', 'utf8'));
  const allItems = [...check.found, ...check.missing];
  
  // We need to map EAN/GTIN to productId
  const { data: products } = await supabase.from('urunler').select('id, ean_gtin');
  const eanToId = new Map();
  for (const p of products) {
    if (p.ean_gtin) eanToId.set(p.ean_gtin, p.id);
  }

  // Find all drafts
  const { data: rows } = await supabase.from('system_settings').select('*').like('setting_key', 'supplier_order_plan_draft_%');
  
  for (const row of rows) {
    let draft = JSON.parse(row.setting_value);
    let updatedCount = 0;
    
    // Create a map for fast lookup of desired boxes by productId
    const desiredBoxes = new Map();
    for (const item of allItems) {
      const pid = eanToId.get(item.barcode);
      if (pid) desiredBoxes.set(pid, item.box);
    }
    
    // Iterate over draft items and update them
    if (draft.items) {
      for (const item of draft.items) {
        if (desiredBoxes.has(item.productId)) {
          const desired = desiredBoxes.get(item.productId);
          if (item.quantity !== desired) {
            item.quantity = desired;
            item.unitType = 'koli'; // make sure unit is koli as requested
            updatedCount++;
          }
        }
      }
    }
    
    if (updatedCount > 0) {
      console.log(`Updating ${updatedCount} items in draft ${row.setting_key} (${draft.draftName})`);
      const { error } = await supabase.from('system_settings').update({
        setting_value: JSON.stringify(draft)
      }).eq('setting_key', row.setting_key);
      if (error) console.error('Error updating:', error);
      else console.log('Successfully updated draft!');
    } else {
      console.log(`No items to update in draft ${row.setting_key} (${draft.draftName})`);
    }
  }
}

run();
