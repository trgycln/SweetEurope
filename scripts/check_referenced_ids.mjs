import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkIds() {
  const { data: siparis } = await supabase.from('siparis_detay').select('id, urun_id');
  console.log('siparis_detay urun_ids:', siparis);

  const { data: favoriler } = await supabase.from('favori_urunler').select('id, urun_id');
  console.log('favori_urunler urun_ids:', favoriler);
}

checkIds();
