// Apply görüldü column migration
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🔧 Adding görüldü column to firmalar...\n');

  const sql = fs.readFileSync('supabase-migrations/add_goruldu_to_firmalar.sql', 'utf8');

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ Migration failed:', error);
    return;
  }

  console.log('✅ Migration successful!');
  
  // Verify
  const { count } = await supabase
    .from('firmalar')
    .select('id', { count: 'exact', head: true })
    .eq('goruldu', false);

  console.log(`\n📊 Unseen applications: ${count || 0}`);
}

main().catch(console.error);
