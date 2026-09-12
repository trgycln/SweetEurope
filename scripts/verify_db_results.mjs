import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verifyDb() {
  const { data: all, count: totalCount } = await supabase.from('urunler').select('id, ean_gtin, stok_kodu, ad, aktif, distributor_alis_fiyati, gtip_kodu, koli_ici_adet, palet_ici_adet', { count: 'exact' });
  const active = all.filter(p => p.aktif);
  const inactive = all.filter(p => !p.aktif);

  console.log(`Total in DB: ${all.length}`);
  console.log(`Active products: ${active.length}`);
  console.log(`Inactive/Legacy products: ${inactive.length}`);

  console.log('\nSample 3 active products:');
  active.slice(0, 3).forEach(p => {
    console.log({
      ean_gtin: p.ean_gtin,
      stok_kodu: p.stok_kodu,
      ad_tr: p.ad?.tr,
      ad_de: p.ad?.de,
      ad_en: p.ad?.en,
      ad_ar: p.ad?.ar,
      distributor_alis_fiyati: p.distributor_alis_fiyati,
      gtip_kodu: p.gtip_kodu,
      koli_ici_adet: p.koli_ici_adet,
      palet_ici_adet: p.palet_ici_adet
    });
  });
}

verifyDb();
