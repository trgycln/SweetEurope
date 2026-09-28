const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: kalemler, error } = await supabase
    .from('ithalat_parti_kalemleri')
    .select('*, urunler(ad)')
    .eq('parti_id', '6fabdb6c-bf20-457b-8685-c61b2fb515f2');

  if (error) {
    console.error(error);
    return;
  }

  let totalSystem = 0;
  for (const item of kalemler) {
    const productName = typeof item.urunler.ad === 'object' ? item.urunler.ad.tr || item.urunler.ad.en : item.urunler.ad;
    totalSystem += item.ciplak_maliyet_eur;
    console.log(`- ${productName.padEnd(50)} | Koli: ${item.koli_sayisi} | Miktar: ${item.miktar_adet} | Fiyat/Adet: ${item.indirimli_alis_fiyati.toFixed(4)} | Toplam: ${item.ciplak_maliyet_eur.toFixed(2)}`);
  }
  console.log('----------------------------------------------------');
  console.log(`SYSTEM TOTAL: ${totalSystem.toFixed(2)} EUR`);
}

check();
