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

async function runMigration() {
  console.log('🔧 Oncelik constraint güncelleniyor (D ekle)...\n');

  try {
    // DDL sorgusu çalıştır (rpc kullanarak)
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        ALTER TABLE firmalar
        DROP CONSTRAINT IF EXISTS firmalar_oncelik_check;

        ALTER TABLE firmalar
        ADD CONSTRAINT firmalar_oncelik_check CHECK (oncelik IN ('A', 'B', 'C', 'D'));
      `
    });

    if (error) {
      console.error('❌ Hata:', error);
      return;
    }

    console.log('✅ Constraint başarıyla güncellendi!');
  } catch (error) {
    console.error('❌ RPC yok. Supabase Console dan manuel çalıştır:');
    console.log('');
    console.log('ALTER TABLE firmalar');
    console.log('DROP CONSTRAINT IF EXISTS firmalar_oncelik_check;');
    console.log('');
    console.log('ALTER TABLE firmalar');
    console.log('ADD CONSTRAINT firmalar_oncelik_check CHECK (oncelik IN (\'A\', \'B\', \'C\', \'D\'));');
  }
}

runMigration();
