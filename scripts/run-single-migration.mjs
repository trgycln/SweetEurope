import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Please provide a migration filename');
  process.exit(1);
}

async function run() {
  const filepath = join(__dirname, '..', 'supabase-migrations', migrationFile);
  console.log(`\n📄 Reading migration: ${migrationFile}`);
  
  try {
    const sql = readFileSync(filepath, 'utf8');
    console.log('🚀 Executing SQL...');
    
    let { error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error && error.code === 'PGRST202') {
        console.log('⚠️ Retrying with "sql" parameter...');
        const res = await supabase.rpc('exec_sql', { sql: sql });
        error = res.error;
    }

    if (error && error.code === 'PGRST202') {
        console.log('⚠️ Retrying with "sql_query" parameter...');
        const res = await supabase.rpc('exec_sql', { sql_query: sql });
        error = res.error;
    }
    
    if (error) {
        // If exec_sql doesn't exist, we might need another way.
        // But usually, we need an RPC function to execute raw SQL.
        console.error('❌ RPC Error:', error);
        
        // Fallback: try 'query' RPC as seen in the other script
        console.log('⚠️ Retrying with "query" RPC...');
        const { error: error2 } = await supabase.rpc('query', { query_text: sql });
        
        if (error2) {
             console.error('❌ Migration failed:', error2);
             process.exit(1);
        }
    }
    
    console.log(`✅ Migration completed: ${migrationFile}`);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

run();
