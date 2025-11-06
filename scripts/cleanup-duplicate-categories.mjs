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
  { name: { tr: 'Pastalar & Kekler', de: 'Torten & Kuchen', en: 'Cakes & Tarts' }, slug: 'cakes-and-tarts', patterns: ['cake', 'tart', 'cheesecake', 'vegan'] },
  { name: { tr: 'Kahve & İçecekler', de: 'Kaffee & Getränke', en: 'Coffee & Drinks' }, slug: 'coffee-and-drinks', patterns: ['coffee', 'drink', 'beverage'] },
  { name: { tr: 'Pizza & Fast Food', de: 'Pizza & Fast Food', en: 'Pizza & Fast Food' }, slug: 'pizza-and-fast-food', patterns: ['pizza', 'fast food'] },
  { name: { tr: 'Soslar & Malzemeler', de: 'Saucen & Zutaten', en: 'Sauces & Ingredients' }, slug: 'sauces-and-ingredients', patterns: ['sauce', 'ingredient'] },
  { name: { tr: 'Aksesuarlar', de: 'Zubehör', en: 'Accessories' }, slug: 'accessories', patterns: ['accessor'] },
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
  
  // Also group by pattern matching for edge cases
  const patternGroups = new Map();
  for (const canonical of CANONICAL_CATEGORIES) {
    patternGroups.set(canonical.slug, []);
    for (const cat of allCats) {
      const enName = (cat.ad?.en || cat.ad?.de || cat.ad?.tr || '').toLowerCase();
      const slug = (cat.slug || '').toLowerCase();
      for (const pattern of canonical.patterns) {
        if (enName.includes(pattern) || slug.includes(pattern)) {
          patternGroups.get(canonical.slug).push(cat);
          break;
        }
      }
    }
  }
  
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
    const exactMatches = groups[enName] || [];
    const patternMatches = patternGroups.get(canonical.slug) || [];
    
    // Combine exact and pattern matches, deduplicate
    const allMatches = [...new Map([...exactMatches, ...patternMatches].map(c => [c.id, c])).values()];
    
    if (allMatches.length === 0) {
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
    
    // Find the best master (prefer one with correct slug, or most products)
    let masterId = null;
    const withSlug = allMatches.find(c => c.slug === canonical.slug);
    
    if (withSlug) {
      masterId = withSlug.id;
    } else {
      // Pick one with most products or first
      const counts = await Promise.all(
        allMatches.map(async c => {
          const { count } = await supabase
            .from('urunler')
            .select('id', { count: 'exact', head: true })
            .eq('kategori_id', c.id);
          return { id: c.id, count: count || 0 };
        })
      );
      counts.sort((a, b) => b.count - a.count);
      masterId = counts[0].id;
      
      if (!DRY) {
        // Update master with correct slug and name
        await supabase
          .from('kategoriler')
          .update({ slug: canonical.slug, ad: canonical.name })
          .eq('id', masterId);
      }
    }
    
    const duplicateIds = allMatches.filter(c => c.id !== masterId).map(c => c.id);
    
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
    const patternMatches = patternGroups.get(canonical.slug) || [];
    const allMatches = [...new Map([...matches, ...patternMatches].map(c => [c.id, c])).values()];
    if (allMatches.length > 0) canonicalIds.add(allMatches[0].id);
  }
  
  const orphans = allCats.filter(c => !canonicalIds.has(c.id));
  if (orphans.length > 0) {
    console.log(`   Found ${orphans.length} potential orphans`);
    for (const orphan of orphans) {
      const { count } = await supabase
        .from('urunler')
        .select('id', { count: 'exact', head: true })
        .eq('kategori_id', orphan.id);
      
      const name = orphan.ad?.en || orphan.ad?.de || orphan.ad?.tr || orphan.id;
      if (count === 0) {
        console.log(`   🗑️  Deleting empty orphan: "${name}"`);
        if (!DRY) {
          await supabase.from('kategoriler').delete().eq('id', orphan.id);
        }
      } else {
        // Move products from non-empty orphans to best-fit canonical category
        console.log(`   📦 Orphan "${name}" has ${count} products - moving to best-fit canonical category`);
        const catName = name.toLowerCase();
        let bestFit = CANONICAL_CATEGORIES[0]; // Default to Cakes
        for (const canonical of CANONICAL_CATEGORIES) {
          for (const pattern of canonical.patterns) {
            if (catName.includes(pattern)) {
              bestFit = canonical;
              break;
            }
          }
        }
        
        // Find the master ID for best-fit
        const enName = bestFit.name.en.toLowerCase();
        const matches = groups[enName] || [];
        const patternMatches = patternGroups.get(bestFit.slug) || [];
        const allMatches = [...new Map([...matches, ...patternMatches].map(c => [c.id, c])).values()];
        const masterId = allMatches.find(c => c.slug === bestFit.slug)?.id || allMatches[0]?.id;
        
        if (masterId && !DRY) {
          await supabase.from('urunler').update({ kategori_id: masterId }).eq('kategori_id', orphan.id);
          await supabase.from('kategoriler').delete().eq('id', orphan.id);
          console.log(`   ✅ Moved to "${bestFit.name.en}" and deleted orphan`);
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
