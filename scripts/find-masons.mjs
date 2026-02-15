import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

async function findMasons() {
  console.log('🔍 "Mason" içeren firmaları ara...\n');

  const { data } = await supabase
    .from('firmalar')
    .select('id, unvan, kategori, oncelik, oncelik_puani')
    .ilike('unvan', '%mason%');

  if (!data || data.length === 0) {
    console.log('❌ "Mason" içeren firma bulunamadı');
    return;
  }

  console.log(`📊 Bulundu: ${data.length}\n`);
  
  for (const f of data) {
    console.log(`  ${f.unvan}`);
    console.log(`    K=${f.kategori}, O=${f.oncelik}, P=${f.oncelik_puani}\n`);
  }
}

findMasons();
