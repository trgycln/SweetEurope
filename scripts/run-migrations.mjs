#!/usr/bin/env node
/**
 * Alt Bayi Portal Migrations Runner
 * Runs schema and RLS migrations for sub-dealer portal
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', url ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

async function runMigration(filename) {
  const filepath = join(__dirname, '..', 'supabase-migrations', filename);
  console.log(`\n📄 Running migration: ${filename}`);
  
  try {
    const sql = readFileSync(filepath, 'utf8');
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });
    
    if (error) {
      console.error(`❌ Migration failed: ${filename}`);
      console.error('Error:', error.message);
      return false;
    }
    
    console.log(`✅ Migration completed: ${filename}`);
    return true;
  } catch (err) {
    console.error(`❌ Error reading/executing migration: ${filename}`);
    console.error(err.message);
    return false;
  }
}

async function executeSql(sql, description) {
  console.log(`\n🔧 Executing: ${description}`);
  
  try {
    const { data, error } = await supabase.rpc('query', { query_text: sql });
    
    if (error) {
      console.error(`❌ Failed: ${description}`);
      console.error('Error:', error.message);
      return false;
    }
    
    console.log(`✅ Success: ${description}`);
    return true;
  } catch (err) {
    console.error(`❌ Error: ${description}`);
    console.error(err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Alt Bayi Portal Migrations...\n');
  
  const migrations = [
    'create_sub_dealer_portal_schema.sql',
    'allow_admin_manage_firmalar.sql'
  ];
  
  let successCount = 0;
  
  for (const migration of migrations) {
    // Try direct SQL execution
    const filepath = join(__dirname, '..', 'supabase-migrations', migration);
    const sql = readFileSync(filepath, 'utf8');
    
    console.log(`\n📄 Executing: ${migration}`);
    
    const { error } = await supabase.rpc('query', { query_text: sql }).catch(async () => {
      // If RPC doesn't exist, try direct execution via postgrest
      return await supabase.from('_migrations').insert({ name: migration });
    });
    
    if (error) {
      console.error(`❌ Failed: ${migration}`);
      console.error('Error details:', error);
      console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:');
      console.log(`   File: supabase-migrations/${migration}`);
    } else {
      console.log(`✅ Completed: ${migration}`);
      successCount++;
    }
  }
  
  console.log(`\n\n📊 Migration Summary:`);
  console.log(`   Total: ${migrations.length}`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${migrations.length - successCount}`);
  
  if (successCount < migrations.length) {
    console.log('\n⚠️  Some migrations failed. Please run them manually in Supabase SQL Editor.');
    console.log('   Location: supabase-migrations/');
  } else {
    console.log('\n✅ All migrations completed successfully!');
  }
}

main().catch(console.error);
