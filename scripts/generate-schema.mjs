import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const OLD_URL = 'https://atydffkpyvxcmzxyibhj.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eWRmZmtweXZ4Y216eHlpYmhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMyMjYxMiwiZXhwIjoyMDc0ODk4NjEyfQ.LHTstP_K3qHoxD_ie_A6fPkFcnKb732qORSJkxrV3qk';

const client = createClient(OLD_URL, OLD_KEY);

async function run() {
  // Let's read all migrations from supabase-migrations and supabase/migrations
  const dirs = [
    'c:/Users/User/Projeler (Web Sayfalari)/sweetheaven-germany/supabase-migrations',
    'c:/Users/User/Projeler (Web Sayfalari)/sweetheaven-germany/supabase/migrations'
  ];

  let combinedSql = `-- ==========================================
-- ELYSON SWEETS - FULL DATABASE SETUP SCRIPT
-- ==========================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

`;

  // We can include a generic exec_sql RPC function which is super helpful for running SQL remotely
  combinedSql += `
-- Utility function for running SQL if needed
CREATE OR REPLACE FUNCTION public.exec_sql(sql_string text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_string;
END;
$$;
\n`;

  // Combine SQL files
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql'));
    for (const f of files) {
      combinedSql += `\n-- ----------------------------------------\n-- File: ${f}\n-- ----------------------------------------\n`;
      const content = fs.readFileSync(`${dir}/${f}`, 'utf-8');
      combinedSql += content + '\n';
    }
  }

  fs.writeFileSync('c:/Users/User/Projeler (Web Sayfalari)/sweetheaven-germany/FULL_DATABASE_SETUP.sql', combinedSql);
  console.log('Created FULL_DATABASE_SETUP.sql successfully!');
}

run().catch(console.error);
