// Add multiple subcategories under "Pastalar & Kekler": Kuplar, Düğün Pastaları, Otel Pastaları, Market Pastaları
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY = process.argv.includes('--dry');

async function main() {
  console.log('🍰 Adding subcategories under "Pastalar & Kekler" (cakes-and-tarts)...\n');

  // Find parent category
  const { data: parentCat, error: parentError } = await sb
    .from('kategoriler')
    .select('id, ad')
    .eq('slug', 'cakes-and-tarts')
    .maybeSingle();

  if (!parentCat) {
    console.error('❌ Parent category "cakes-and-tarts" not found!');
    if (parentError) console.error('Error:', parentError);
    process.exit(1);
  }

  console.log(`✅ Found parent category: ${parentCat.ad?.de || parentCat.ad?.tr || 'Cakes & Tarts'} (ID: ${parentCat.id})\n`);

  // Define desired subcategories (slug + localized names)
  const desired = [
    {
      slug: 'kuplar',
      ad: {
        tr: 'Kuplar',
        de: 'Becher-Desserts',
        en: 'Cup Desserts',
        ar: 'حلويات بالكوب'
      }
    },
    {
      slug: 'wedding-cakes',
      ad: {
        tr: 'Düğün Pastaları',
        de: 'Hochzeitstorten',
        en: 'Wedding Cakes',
        ar: 'كعكات الزفاف'
      }
    },
    {
      slug: 'otel-pastalari',
      ad: {
        tr: 'Otel Pastaları',
        de: 'Hotel-Kuchen',
        en: 'Hotel Cakes',
        ar: 'كعك الفنادق'
      }
    },
    {
      slug: 'market-pastalari',
      ad: {
        tr: 'Market Pastaları',
        de: 'Markt-Kuchen',
        en: 'Market Cakes',
        ar: 'كعك السوق'
      }
    }
  ];

  for (const cat of desired) {
    const { data: existing, error: existsErr } = await sb
      .from('kategoriler')
      .select('id, ad, ust_kategori_id')
      .eq('slug', cat.slug)
      .maybeSingle();

    if (existsErr) {
      console.warn(`⚠️  Check failed for ${cat.slug}:`, existsErr.message);
      continue;
    }

    if (existing) {
      console.log(`⏭️  ${cat.slug} already exists (ID: ${existing.id}) — skipping.`);
      continue;
    }

    const payload = {
      ad: cat.ad,
      slug: cat.slug,
      ust_kategori_id: parentCat.id,
    };

    if (DRY) {
      console.log(`[DRY RUN] Would create: ${cat.slug}`);
      console.log(JSON.stringify(payload, null, 2));
      continue;
    }

    const { data: created, error: createErr } = await sb
      .from('kategoriler')
      .insert(payload)
      .select()
      .single();

    if (createErr) {
      console.error(`❌ Failed to create ${cat.slug}:`, createErr.message);
      console.error('Details:', createErr);
    } else {
      console.log(`✅ Created ${cat.slug} (ID: ${created.id})`);
      console.log(`   Names: ${JSON.stringify(created.ad)}`);
    }
  }

  console.log('\n✨ Done.');
}

main().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
