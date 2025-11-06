import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

const { data, error } = await supabase
  .from('profiller')
  .select('id, tercih_edilen_dil')
  .limit(10);

console.log('Error:', error);
console.log('Data:', data);
