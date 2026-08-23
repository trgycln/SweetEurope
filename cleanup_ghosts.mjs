import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, serviceRoleKey);

async function cleanup() {
  console.log("Fetching ghost records...");
  
  // Get records where stok_kodu is null or empty string
  const { data: nullStock, error: err1 } = await supabase
    .from('urunler')
    .select('*')
    .filter('stok_kodu', 'is', 'null');
    
  const { data: emptyStock, error: err2 } = await supabase
    .from('urunler')
    .select('*')
    .eq('stok_kodu', '');

  if (err1) throw err1;
  if (err2) throw err2;

  const ghosts = [...(nullStock || []), ...(emptyStock || [])];
  
  // Deduplicate just in case
  const uniqueGhosts = Array.from(new Map(ghosts.map(item => [item.id, item])).values());
  
  if (uniqueGhosts.length === 0) {
    console.log("No ghost records found.");
    return;
  }

  console.log(`Found ${uniqueGhosts.length} ghost records.`);

  // Save backup
  fs.writeFileSync('ghost_products_backup.json', JSON.stringify(uniqueGhosts, null, 2), 'utf-8');
  console.log("Backup saved to ghost_products_backup.json");

  // Delete records
  const idsToDelete = uniqueGhosts.map(g => g.id);
  
  // Due to foreign key constraints or just large arrays, it's safer to delete in batches or use IN
  // Let's delete using IN clause
  const { error: deleteErr } = await supabase
    .from('urunler')
    .delete()
    .in('id', idsToDelete);

  if (deleteErr) {
    console.error("Failed to delete ghost records:", deleteErr.message);
  } else {
    console.log(`Successfully deleted ${idsToDelete.length} ghost records from the database.`);
  }
}

cleanup().catch(console.error);
