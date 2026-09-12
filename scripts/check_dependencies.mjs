import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkForeignKeys() {
  // Check siparis_ogeleri or siparisler
  const { count: siparisCount } = await supabase.from('siparis_ogeleri').select('*', { count: 'exact', head: true });
  console.log('siparis_ogeleri count:', siparisCount);

  // Check sepet_ogeleri
  const { count: sepetCount } = await supabase.from('sepet_ogeleri').select('*', { count: 'exact', head: true });
  console.log('sepet_ogeleri count:', sepetCount);

  // Check gorevler / calendar
  const { count: gorevCount } = await supabase.from('admin_gorevler').select('*', { count: 'exact', head: true });
  console.log('admin_gorevler count:', gorevCount);
}

checkForeignKeys();
