import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('urunler').select('ad, ana_resim_url').ilike('ad->>de', '%Brombeerfruchtsirup - Premium 700 ml%').limit(5);
  if (error) {
    console.error(error);
    return;
  }
  
  console.log("Brombeer product image:", data);
}
check();
