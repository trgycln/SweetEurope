import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const check = JSON.parse(fs.readFileSync('proforma_check.json', 'utf8'));
  const allProformaItems = [...check.found, ...check.missing];
  
  const pfMap = new Map();
  let pfTotalAmount = 0;
  for (const item of allProformaItems) {
      pfMap.set(item.barcode, item);
      pfTotalAmount += item.amount || 0;
  }
  
  const draftKey = 'supplier_order_plan_draft_642896a8-ec56-4a58-917d-eafe2831a104';
  const { data: row } = await supabase.from('system_settings').select('*').eq('setting_key', draftKey).maybeSingle();
  let draft = JSON.parse(row.setting_value);
  
  const draftProductIds = draft.items.map(i => i.productId);
  const { data: products } = await supabase.from('urunler').select('id, stok_kodu, ad, ean_gtin, distributor_alis_fiyati, koli_ici_adet').in('id', draftProductIds);
  const productMap = new Map((products || []).map(p => [p.id, p]));
  
  let md = '# Detaylı Fiyat ve Tutar Analizi\n\n';
  md += 'Sisteminizdeki güncel "Eski Alış Fiyatları" üzerinden yapılan hesaplama ile Proforma faturanızdaki "Yeni Alış Fiyatları" arasındaki tutarsızlıkları aşağıda detaylı olarak inceleyebilirsiniz. Toplam 91 satırın hepsini görebilirsiniz:\n\n';
  md += '| Stok Kodu | Ürün Adı | Sistem Hesabı (Koli x İçi x Fiyat) | Sistem Tutar (€) | Proforma QTY x Fiyat | Proforma Tutar (€) | Toplam Fark (€) |\n';
  md += '|---|---|---|---|---|---|---|\n';

  let dbGrandTotal = 0;
  let differences = [];

  for (const item of draft.items) {
      const p = productMap.get(item.productId);
      if (!p) continue;
      
      const dbPrice = p.distributor_alis_fiyati || 0;
      const dbKoliIci = p.koli_ici_adet || 1;
      const dbKoli = item.quantity;
      const itemDbTotal = dbPrice * dbKoliIci * dbKoli;
      dbGrandTotal += itemDbTotal;
      
      const pfItem = pfMap.get(p.ean_gtin);
      if (pfItem) {
          const pfAmount = pfItem.amount || 0;
          const pfPrice = pfItem.unit_price || 0;
          const diff = itemDbTotal - pfAmount;
          
          if (Math.abs(diff) > 0.01) {
              differences.push({
                  stokKodu: p.stok_kodu,
                  ad: p.ad.tr,
                  dbCalc: `${dbKoli} x ${dbKoliIci} x €${dbPrice.toFixed(2)}`,
                  dbTotal: itemDbTotal.toFixed(2),
                  pfCalc: `${pfItem.qty || (dbKoli * dbKoliIci)} x €${pfPrice.toFixed(2)}`,
                  pfTotal: pfAmount.toFixed(2),
                  diff: diff.toFixed(2)
              });
          }
      } else {
          // In draft but not in proforma
          differences.push({
              stokKodu: p.stok_kodu,
              ad: p.ad.tr + ' (SADECE SİSTEMDE)',
              dbCalc: `${dbKoli} x ${dbKoliIci} x €${dbPrice.toFixed(2)}`,
              dbTotal: itemDbTotal.toFixed(2),
              pfCalc: '-',
              pfTotal: '0.00',
              diff: itemDbTotal.toFixed(2)
          });
      }
  }

  // Sort differences: biggest differences first (absolute values)
  differences.sort((a,b) => Math.abs(parseFloat(b.diff)) - Math.abs(parseFloat(a.diff)));
  
  for (const d of differences) {
      let diffStr = d.diff;
      if (parseFloat(d.diff) < 0) {
          diffStr = `<span style="color:red">**${d.diff}**</span>`;
      } else {
          diffStr = `<span style="color:green">**+${d.diff}**</span>`;
      }
      md += `| ${d.stokKodu} | ${d.ad} | ${d.dbCalc} | €${d.dbTotal} | ${d.pfCalc} | €${d.pfTotal} | ${diffStr} |\n`;
  }
  
  md += `\n\n**Sistemdeki Genel Toplam (Eski Fiyatlar):** €${dbGrandTotal.toFixed(2)}\n`;
  md += `**Proforma Faturadaki Genel Toplam (Yeni Fiyatlar):** €${pfTotalAmount.toFixed(2)}\n`;
  md += `**Aralarındaki Toplam Fark:** €${(dbGrandTotal - pfTotalAmount).toFixed(2)}\n`;
  
  fs.writeFileSync('fiyat_farki_analizi.md', md);
  console.log('Analysis written to fiyat_farki_analizi.md');
}
run();
