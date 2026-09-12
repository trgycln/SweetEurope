import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkKategorilerSchema() {
  const { data, error } = await supabase.from('kategoriler').select('*').limit(2);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Kategoriler columns:', Object.keys(data[0]));
    console.log('Sample category 1:', data[0]);
    console.log('Sample category 2:', data[1]);
  }
}

checkKategorilerSchema();
