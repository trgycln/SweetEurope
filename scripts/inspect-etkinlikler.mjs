
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Try to insert a dummy record to see if it works with service role
  // This helps verify if the table structure and constraints are okay
  // We need a valid firma_id and user_id (profil_id)
  
  // 1. Get a valid firma
  const { data: firma } = await supabase.from('firmalar').select('id').limit(1).single();
  if (!firma) {
      console.log('No firma found');
      return;
  }
  console.log('Found firma:', firma.id);

  // 2. Get a valid profile
  const { data: profile } = await supabase.from('profiller').select('id').limit(1).single();
  if (!profile) {
      console.log('No profile found');
      return;
  }
  console.log('Found profile:', profile.id);

  // 3. Try insert
  const { data, error } = await supabase.from('etkinlikler').insert({
      firma_id: firma.id,
      olusturan_personel_id: profile.id,
      aciklama: 'Test note from script',
      etkinlik_tipi: 'Not'
  }).select();

  if (error) {
      console.error('Insert Error:', error);
  } else {
      console.log('Insert Success:', data);
      // Clean up
      await supabase.from('etkinlikler').delete().eq('id', data[0].id);
  }
}

main();
