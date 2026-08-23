import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const check = JSON.parse(fs.readFileSync('proforma_check.json', 'utf8'));
  const proformaBarcodes = [...check.found, ...check.missing].map(i => i.barcode);
  
  const draftKey = 'supplier_order_plan_draft_642896a8-ec56-4a58-917d-eafe2831a104';
  const { data: row } = await supabase.from('system_settings').select('*').eq('setting_key', draftKey).maybeSingle();
  let draft = JSON.parse(row.setting_value);
  
  const draftProductIds = draft.items.map(i => i.productId);
  const { data: products } = await supabase.from('urunler').select('id, stok_kodu, ean_gtin, ad, distributor_alis_fiyati, koli_ici_adet').in('id', draftProductIds);
  const productMap = new Map((products || []).map(p => [p.id, p]));
  
  let draftBarcodes = [];
  let diffList = [];
  
  const pfMap = new Map();
  for (const item of [...check.found, ...check.missing]) {
      pfMap.set(item.barcode, item);
  }

  for (const item of draft.items) {
      const p = productMap.get(item.productId);
      if (p) {
          draftBarcodes.push(p.ean_gtin);
          
          const dbPrice = p.distributor_alis_fiyati || 0;
          const dbTotal = dbPrice * (p.koli_ici_adet || 1) * item.quantity;
          const pfItem = pfMap.get(p.ean_gtin);
          
          if (pfItem) {
              const pfAmount = pfItem.amount || 0;
              const diff = dbTotal - pfAmount;
              if (Math.abs(diff) > 1) { // bigger differences
                 diffList.push({ name: p.ad.tr, diff: diff, pPrice: pfItem.unit_price, dbPrice: dbPrice });
              }
          }
      }
  }

  // Check order
  let sameOrder = true;
  for (let i = 0; i < Math.min(proformaBarcodes.length, draftBarcodes.length); i++) {
      if (proformaBarcodes[i] !== draftBarcodes[i]) {
          sameOrder = false;
          console.log(`Sıra uyuşmazlığı ilk burada: Proforma[${i+1}] = ${proformaBarcodes[i]}, Taslak[${i+1}] = ${draftBarcodes[i]}`);
          break;
      }
  }
  if (sameOrder) console.log('Sıra tamamen AYNI.');
  else console.log('Sıralamalar FARKLI.');

  diffList.sort((a,b) => Math.abs(a.diff) - Math.abs(b.diff));
  console.log('\nEn büyük farklar:');
  for (const d of diffList.slice(-10)) {
     console.log(`- ${d.name}: Sistem (${d.dbPrice}€) vs Proforma (${d.pPrice}€) -> Fark: ${d.diff.toFixed(2)}€`);
  }
}
run();
