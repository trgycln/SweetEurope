const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const invoiceLines = fs.readFileSync('invoice.txt', 'utf-8').trim().split('\n');
  const invoiceItems = [];
  for(let line of invoiceLines) {
     const parts = line.split(' ');
     if(parts.length < 5) continue;
     const barcode = parts[0];
     if(parts[parts.length-1] === 'EUR') parts.pop();
     const totalStr = parts[parts.length-1].replace(/\./g, '').replace(',', '.');
     invoiceItems.push({ barcode, invoiceTotal: parseFloat(totalStr) });
  }
  const { data: kalemler } = await supabase.from('ithalat_parti_kalemleri').select('*, urunler(ad, ean_gtin, stok_kodu)').eq('parti_id', '6fabdb6c-bf20-457b-8685-c61b2fb515f2');
  
  let notFoundTotal = 0;
  for(let item of invoiceItems) {
     const dbItem = kalemler.find(k => k.urunler.ean_gtin === item.barcode || k.urunler.stok_kodu === item.barcode);
     if(!dbItem) {
        console.log(`Faturada olup Sistemde BULUNAMAYAN: ${item.barcode} | Tutar: ${item.invoiceTotal}`);
        notFoundTotal += item.invoiceTotal;
     }
  }
  console.log(`Bulunamayanlar Toplami: ${notFoundTotal}`);
}
check();
