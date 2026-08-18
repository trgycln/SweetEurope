import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function run() {
  const { data: products } = await supabase.from('urunler').select('slug, urun_gami').ilike('slug', '%surup%');
  for (let i = 0; i < 10; i++) {
    console.log(products[i].slug, products[i].urun_gami);
  }
}
run();
