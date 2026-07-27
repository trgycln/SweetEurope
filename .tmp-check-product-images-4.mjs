import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const eans = ['8691123461117', '8691123472984', '8691123343048'];
  const { data, error } = await supabase.from('urunler').select('ean_gtin, ad, ana_resim_url').in('ean_gtin', eans);
  if (error) {
    console.error(error);
    return;
  }
  
  console.log(data);
}
check();
