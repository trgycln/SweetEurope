// Backfill missing slugs for kategoriler
// Usage: node scripts/backfill-category-slugs.mjs [--dry]
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY = process.argv.includes('--dry');

if (!url || !serviceRoleKey) {
  console.error('Missing Supabase env');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

function slugify(text) {
  const map = { 'ç':'c','ğ':'g','ı':'i','ö':'o','ş':'s','ü':'u','Ç':'c','Ğ':'g','İ':'i','Ö':'o','Ş':'s','Ü':'u' };
  return String(text || '')
    .split('')
    .map((ch) => map[ch] || ch)
    .join('')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

async function main() {
  const { data, error } = await supabase
    .from('kategoriler')
    .select('id, ad, slug');
  if (error) throw error;

  let updated = 0, skipped = 0;
  const usedSlugs = new Set(
    (data || [])
      .map((k) => (k.slug || '').trim())
      .filter(Boolean)
  );
  for (const k of data || []) {
    if (k.slug && k.slug.trim()) { skipped++; continue; }
    const name = k.ad?.en || k.ad?.de || k.ad?.tr || null;
    if (!name) { skipped++; continue; }
    let base = slugify(name) || 'category';
    let candidate = base;
    let i = 2;
    while (usedSlugs.has(candidate)) {
      candidate = `${base}-${i++}`;
    }
    const slug = candidate;
    // mark as used to avoid duplicates in this run
    usedSlugs.add(slug);
    if (DRY) {
      console.log('Would set slug:', k.id, '->', slug);
      continue;
    }
    const { error: upErr } = await supabase
      .from('kategoriler')
      .update({ slug })
      .eq('id', k.id);
    if (upErr) {
      console.error('Update failed for', k.id, upErr.message);
    } else {
      updated++;
    }
  }
  console.log(`Done. Updated: ${updated}, Skipped: ${skipped}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
