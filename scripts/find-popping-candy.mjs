import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findProduct() {
  const { data, error } = await supabase
    .from('urunler')
    .select('id, slug, ad')
    .ilike('ad->>en', '%Popping%');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Result:', JSON.stringify(data, null, 2));
  }
}

findProduct();
