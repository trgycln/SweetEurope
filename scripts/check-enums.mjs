import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  const { data, error } = await supabase.rpc('get_enum_values', { enum_type: 'firma_status' });
  if (error) {
    // raw query through a distinct select
    const { data: statuses } = await supabase.from('firmalar').select('status');
    const unique = Array.from(new Set((statuses || []).map(s => s.status)));
    console.log('Firmalar tablosundaki mevcut status değerleri:', unique);
  } else {
    console.log('Enum değerleri:', data);
  }
}

main().catch(console.error);
