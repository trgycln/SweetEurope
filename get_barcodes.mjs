import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const diffNames = [
    'FO Çilek Meyveli Püre Sos 1 Kg',
    'Fo Çikolata Sosu 2.5 kg',
    'FO Orman Meyveli Püre Sos 1 Kg',
    'FO Mango Meyveli Püre Sos 1 Kg',
    'FO Toffee Karamelli Profesyonel Sos 2,5 kg (Pompa Hediyeli)',
    'FO Çarkıfelek Meyveli Püre Sos 1 Kg',
    'Patlayan Şekerli Sos',
    'FO Beyaz Çikolatalı Premium Şurup 700 ml',
    'Karamelli Premium Sos 2,5 kg (Pompa Hediyeli)',
    'Çikolatalı Premium Sos 2,5 kg (Pompa Hediyeli)'
  ];

  const { data: products } = await supabase.from('urunler').select('ad, ean_gtin');
  
  const map = {};
  if(products) products.forEach(p => {
      if(p.ad && p.ad.tr) {
          map[p.ad.tr.trim()] = p.ean_gtin;
      }
  });

  for (const name of diffNames) {
      console.log(`- ${name}: Barkod: ${map[name.trim()] || 'Bulunamadı'}`);
  }
}
run();
