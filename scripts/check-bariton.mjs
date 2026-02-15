import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Checking environment variables...');
console.log('URL:', url ? 'loaded' : 'NOT FOUND');
console.log('Service Role Key:', serviceRoleKey ? 'loaded' : 'NOT FOUND');

if (!url || !serviceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

const { data, error } = await supabase
  .from('firmalar')
  .select('*')
  .ilike('unvan', '%Bariton%');

if (error) {
  console.error('Error:', error);
} else {
  console.log('\nBariton Lounge Records:');
  console.log(JSON.stringify(data, null, 2));
  
  if (data && data.length > 0) {
    const record = data[0];
    console.log(`\nCurrent state:`);
    console.log(`  Firma: ${record.firma_adi}`);
    console.log(`  Kategori: ${record.kategori}`);
    console.log(`  Oncelik Puani: ${record.oncelik_puani}`);
  }
}
