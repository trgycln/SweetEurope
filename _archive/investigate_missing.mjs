import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const draftKey = 'supplier_order_plan_draft_642896a8-ec56-4a58-917d-eafe2831a104';
  const { data: row } = await supabase.from('system_settings').select('*').eq('setting_key', draftKey).maybeSingle();
  let draft = JSON.parse(row.setting_value);
  
  console.log(`Taslaktaki toplam öğe sayısı: ${draft.items.length}`);
  
  const draftProductIds = draft.items.map(i => i.productId);
  const { data: products } = await supabase.from('urunler').select('id, stok_kodu, ad, ean_gtin, distributor_alis_fiyati, koli_ici_adet').in('id', draftProductIds);
  const foundMap = new Map((products || []).map(p => [p.id, p]));

  const missingFromDb = draft.items.filter(i => !foundMap.has(i.productId));
  console.log(`Taslakta olup DB'de bulunamayan Product ID sayısı: ${missingFromDb.length}`);
  for (const m of missingFromDb) {
      console.log(`- Eksik ID: ${m.productId} (Adet/Koli: ${m.quantity})`);
  }

  // Check the 6 missing proforma items in urunler by searching their names
  const missingSearches = [
    { barcode: '8691123344656', name: 'Çarkıfelek / Passion Fruit' },
    { barcode: '8691123471024', name: 'Nar / Pomegranate' },
    { barcode: '8691123470966', name: 'Şeftali / Peach' },
    { barcode: '8691123120571', name: 'Beyaz Çikolata / White Chocolate' },
    { barcode: '8691123120236', name: 'Karamel / Caramel' },
    { barcode: '8691123120564', name: 'Nane / Spearmint / Mint' },
  ];

  console.log('\n--- VERİTABANINDA ADIYLA ARAMA SONUÇLARI ---');
  for (const s of missingSearches) {
      const { data: searchRes } = await supabase.from('urunler').select('id, stok_kodu, ad, ean_gtin, distributor_alis_fiyati').ilike('ad->>tr', `%${s.name.split(' / ')[0]}%`);
      console.log(`\nArama: "${s.name}" (Proforma Barkod: ${s.barcode}):`);
      for (const r of (searchRes || [])) {
          console.log(`  -> ID: ${r.id} | Barkod: ${r.ean_gtin} | Fiyat: ${r.distributor_alis_fiyati} | Ad: ${r.ad.tr}`);
      }
  }
}
run();
