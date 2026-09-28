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
     const invoiceTotal = parseFloat(totalStr);
     
     invoiceItems.push({ barcode, invoiceTotal });
  }
  
  const { data: kalemler } = await supabase.from('ithalat_parti_kalemleri').select('*, urunler(ad, ean_gtin, stok_kodu)').eq('parti_id', '6fabdb6c-bf20-457b-8685-c61b2fb515f2');
  
  let totalSystem = 0;
  let totalInvoiceMatch = 0;
  
  for(let item of invoiceItems) {
     const dbItem = kalemler.find(k => k.urunler.ean_gtin === item.barcode || k.urunler.stok_kodu === item.barcode);
     if(dbItem) {
        const diff = dbItem.ciplak_maliyet_eur - item.invoiceTotal;
        if(Math.abs(diff) > 1.0) { 
           const name = typeof dbItem.urunler.ad === 'object' ? dbItem.urunler.ad.tr || dbItem.urunler.ad.en : dbItem.urunler.ad;
           console.log(`FARK: ${name}`);
           console.log(`  Sistem : ${dbItem.ciplak_maliyet_eur.toFixed(2)} EUR`);
           console.log(`  Fatura : ${item.invoiceTotal.toFixed(2)} EUR`);
           console.log(`  Fark   : ${diff.toFixed(2)} EUR`);
           console.log('---');
        }
        totalSystem += dbItem.ciplak_maliyet_eur;
        totalInvoiceMatch += item.invoiceTotal;
     }
  }
  
  console.log(`Toplam Sistem: ${totalSystem.toFixed(2)}`);
  console.log(`Toplam Fatura: ${totalInvoiceMatch.toFixed(2)}`);
  console.log(`FARK: ${(totalSystem - totalInvoiceMatch).toFixed(2)} EUR`);
}
check();
