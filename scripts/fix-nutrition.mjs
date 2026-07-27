import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fix() {
  const { data, error } = await supabase
    .from('urunler')
    .select('id, ad, naehrwerte')
    .not('naehrwerte', 'is', null);
  
  if (error) {
      console.error(error);
      return;
  }
    
  let cnt = 0;
  for (const d of data) {
    if (d.naehrwerte && d.naehrwerte.tr && d.naehrwerte.tr.enerji) {
      const nut = d.naehrwerte.tr;
      const enerjiStr = nut.enerji || '';
      
      let kj = '';
      let kcal = '';
      if (enerjiStr.includes('/')) {
          kj = enerjiStr.split('/')[0].trim().replace(/[^\d.,]/g, '');
          kcal = enerjiStr.split('/')[1].trim().replace(/[^\d.,]/g, '');
      } else {
          kj = enerjiStr;
      }
      
      const n100 = {
        energie_kj: kj,
        energie_kcal: kcal,
        fett: nut.yag ? nut.yag.replace(/[^\d.,]/g, '') : '',
        davon_gesaettigt: nut.doymus_yag ? nut.doymus_yag.replace(/[^\d.,]/g, '') : '',
        kohlenhydrate: nut.karbonhidrat ? nut.karbonhidrat.replace(/[^\d.,]/g, '') : '',
        davon_zucker: nut.seker ? nut.seker.replace(/[^\d.,]/g, '') : '',
        eiweiss: nut.protein ? nut.protein.replace(/[^\d.,]/g, '') : '',
        salz: nut.tuz ? nut.tuz.replace(/[^\d.,]/g, '') : ''
      };

      await supabase.from('urunler').update({ naehrwerte: { pro_100g: n100 } }).eq('id', d.id);
      cnt++;
    }
  }
  console.log('Fixed', cnt, 'products nutrition data to standard frontend format');
}

fix();
