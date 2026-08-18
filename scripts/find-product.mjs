import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findProduct() {
  const { data, error } = await supabase
    .from('urunler')
    .select('id, ad')
    .ilike('ad->>tr', '%çiko%');
    
  if (error) console.error("Error1:", error);
  console.log("By name:", data);
}

findProduct();
