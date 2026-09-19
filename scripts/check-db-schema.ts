import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: siparisler } = await supabase.from('siparisler').select('*').limit(1);
  console.log('Siparisler keys:', Object.keys(siparisler?.[0] || {}));
  
  const { data: firmalar } = await supabase.from('firmalar').select('*').limit(1);
  console.log('Firmalar keys:', Object.keys(firmalar?.[0] || {}));
}

run();
