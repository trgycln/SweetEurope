// Cleanup duplicate categories and consolidate products
// Usage: node scripts/cleanup-duplicate-categories.mjs [--dry]

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY = process.argv.includes('--dry');

if (!url || !serviceRoleKey) {
  console.error('Missing Supabase env');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

// Define canonical categories (the ones we want to keep)
const CANONICAL_CATEGORIES = [
  { name: { tr: 'Pastalar & Kekler', de: 'Torten & Kuchen', en: 'Cakes & Tarts' }, slug: 'cakes-and-tarts' },
  { name: { tr: 'Kahve & İçecekler', de: 'Kaffee & Getränke', en: 'Coffee & Drinks' }, slug: 'coffee-and-drinks' },
  { name: { tr: 'Pizza & Fast Food', de: 'Pizza & Fast Food', en: 'Pizza & Fast Food' }, slug: 'pizza-and-fast-food' },
  { name: { tr: 'Soslar & Malzemeler', de: 'Saucen & Zutaten', en: 'Sauces & Ingredients' }, slug: 'sauces-and-ingredients' },
  { name: { tr: 'Aksesuarlar', de: 'Zubehör', en: 'Accessories' }, slug: 'accessories' },
];

async function main() {
  console.log('🔍 Fetching all categories...');
  const { data: allCats, error } = await supabase
    .from('kategoriler')
    .select('id, ad, slug, ust_kategori_id');
  
  if (error) throw error;
  
  console.log(`📊 Found ${allCats.length} categories total\n`);
  
  // Group categories by their EN name (normalized)
  const groups = {};
  allCats.forEach(cat => {
    const enName = (cat.ad?.en || cat.ad?.de || cat.ad?.tr || 'Unknown').toLowerCase().trim();
    if (!groups[enName]) groups[enName] = [];
    groups[enName].push(cat);
  });
  
  // Show duplicates
  console.log('📋 Categories with duplicates:');
  Object.entries(groups)
    .filter(([_, cats]) => cats.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([name, cats]) => {
      console.log(`  "${name}": ${cats.length} entries`);
    });
  
  console.log('\n🔧 Processing consolidation...\n');
  
  // For each canonical category, find or create the master, then merge duplicates
  for (const canonical of CANONICAL_CATEGORIES) {
    const enName = canonical.name.en.toLowerCase();
    const matchingCats = groups[enName] || [];
    
    if (matchingCats.length === 0) {
      console.log(`⚠️  No categories found for "${canonical.name.en}", will create one`);
      if (!DRY) {
        const { data: newCat, error: createErr } = await supabase
          .from('kategoriler')
          .insert({ ad: canonical.name, slug: canonical.slug })
          .select('id')
          .single();
        if (createErr) {
          console.error(`❌ Failed to create "${canonical.name.en}":`, createErr.message);
        } else {
          console.log(`✅ Created master category: ${canonical.name.en} (${newCat.id})`);
        }
      }
      continue;
    }
    
    // Find the best master (prefer one with products, or first with correct slug)
    let masterId = null;
    const withSlug = matchingCats.find(c => c.slug === canonical.slug);
    
    if (withSlug) {
      masterId = withSlug.id;
    } else {
      // Pick first one, update its slug
      masterId = matchingCats[0].id;
      if (!DRY) {
        await supabase
          .from('kategoriler')
          .update({ slug: canonical.slug, ad: canonical.name })
          .eq('id', masterId);
      }
    }
    
    const duplicateIds = matchingCats.filter(c => c.id !== masterId).map(c => c.id);
    
    if (duplicateIds.length === 0) {
      console.log(`✓ "${canonical.name.en}": already clean (1 category)`);
      continue;
    }
    
    console.log(`🔄 "${canonical.name.en}": consolidating ${duplicateIds.length + 1} → 1 master (${masterId})`);
    
    // Count products in duplicates
    const { count: prodCount } = await supabase
      .from('urunler')
      .select('id', { count: 'exact', head: true })
      .in('kategori_id', duplicateIds);
    
    console.log(`   Moving ${prodCount || 0} products from duplicates to master...`);
    
    if (!DRY && duplicateIds.length > 0) {
      // Move products to master category
      const { error: moveErr } = await supabase
        .from('urunler')
        .update({ kategori_id: masterId })
        .in('kategori_id', duplicateIds);
      
      if (moveErr) {
        console.error(`   ❌ Failed to move products:`, moveErr.message);
      } else {
        console.log(`   ✅ Moved products successfully`);
        
        // Delete duplicate categories
        const { error: delErr } = await supabase
          .from('kategoriler')
          .delete()
          .in('id', duplicateIds);
        
        if (delErr) {
          console.error(`   ❌ Failed to delete duplicates:`, delErr.message);
        } else {
          console.log(`   ✅ Deleted ${duplicateIds.length} duplicate categories`);
        }
      }
    }
  }
  
  // Delete any remaining orphan categories (no products and not in canonical list)
  console.log('\n🗑️  Checking for orphan categories...');
  const canonicalIds = new Set();
  for (const canonical of CANONICAL_CATEGORIES) {
    const enName = canonical.name.en.toLowerCase();
    const matches = groups[enName] || [];
    if (matches.length > 0) canonicalIds.add(matches[0].id);
  }
  
  const orphans = allCats.filter(c => !canonicalIds.has(c.id));
  if (orphans.length > 0) {
    console.log(`   Found ${orphans.length} potential orphans`);
    for (const orphan of orphans) {
      const { count } = await supabase
        .from('urunler')
        .select('id', { count: 'exact', head: true })
        .eq('kategori_id', orphan.id);
      
      if (count === 0) {
        const name = orphan.ad?.en || orphan.ad?.de || orphan.ad?.tr || orphan.id;
        console.log(`   🗑️  Deleting empty orphan: "${name}"`);
        if (!DRY) {
          await supabase.from('kategoriler').delete().eq('id', orphan.id);
        }
      }
    }
  }
  
  console.log('\n✅ Done!');
  if (DRY) {
    console.log('\n💡 This was a dry run. Run without --dry to apply changes.');
  }
}

main().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
