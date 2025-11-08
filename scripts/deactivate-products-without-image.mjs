// scripts/deactivate-products-without-image.mjs
// Deactivate all active products that don't have a main image (ana_resim_url null or empty string)
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ Missing Supabase credentials (URL or SERVICE ROLE KEY).');
  process.exit(1);
}

const sb = createClient(url, key);
const DRY = process.argv.includes('--dry');

async function main() {
  console.log('🧹 Deactivating products without main image...');

  // Count candidates (null or empty string)
  const { count: nullCount, error: cntErr1 } = await sb
    .from('urunler')
    .select('id', { count: 'exact', head: true })
    .is('ana_resim_url', null)
    .eq('aktif', true);

  if (cntErr1) console.error('Count (NULL) error:', cntErr1.message);

  const { count: emptyCount, error: cntErr2 } = await sb
    .from('urunler')
    .select('id', { count: 'exact', head: true })
    .eq('ana_resim_url', '')
    .eq('aktif', true);

  if (cntErr2) console.error('Count (empty) error:', cntErr2.message);

  const total = (nullCount || 0) + (emptyCount || 0);
  console.log(`🔎 Candidates: ${total} (null: ${nullCount || 0}, empty: ${emptyCount || 0})`);

  if (DRY) {
    console.log('💡 DRY RUN: No changes applied.');
    return;
  }

  // Update NULLs
  const { data: updNull, error: updErr1 } = await sb
    .from('urunler')
    .update({ aktif: false })
    .is('ana_resim_url', null)
    .eq('aktif', true)
    .select('id');

  if (updErr1) {
    console.error('❌ Update (NULL) failed:', updErr1.message);
    console.error(updErr1);
  } else {
    console.log(`✅ Deactivated (NULL): ${updNull?.length || 0}`);
  }

  // Update empty strings
  const { data: updEmpty, error: updErr2 } = await sb
    .from('urunler')
    .update({ aktif: false })
    .eq('ana_resim_url', '')
    .eq('aktif', true)
    .select('id');

  if (updErr2) {
    console.error('❌ Update (empty) failed:', updErr2.message);
    console.error(updErr2);
  } else {
    console.log(`✅ Deactivated (empty): ${updEmpty?.length || 0}`);
  }

  console.log('🏁 Done.');
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
