// Add "Gurme Pastalar" as subcategory under "Pastalar & Kekler"
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
  console.log('🍰 Adding "Gurme Pastalar" subcategory...\n');
  
  // "Pastalar & Kekler" (cakes-and-tarts) kategorisini bul
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
  
  console.log(`✅ Found parent category: ${parentCat.ad.de} (ID: ${parentCat.id})\n`);
  
  // "Gurme Pastalar" zaten var mı kontrol et
  const { data: existing } = await sb
    .from('kategoriler')
    .select('id, ad')
    .eq('slug', 'gourmet-cakes')
    .maybeSingle();
  
  if (existing) {
    console.log(`⏭️  "Gurme Pastalar" already exists (ID: ${existing.id})`);
    console.log(`   Names: ${JSON.stringify(existing.ad)}\n`);
    return;
  }
  
  // Yeni kategori oluştur
  const newCategory = {
    ad: {
      tr: 'Gurme Pastalar',
      de: 'Gourmet-Kuchen',
      en: 'Gourmet Cakes',
      ar: 'كعك ذواقة'
    },
    slug: 'gourmet-cakes',
    ust_kategori_id: parentCat.id
  };
  
  if (DRY) {
    console.log('[DRY RUN] Would create category:');
    console.log(JSON.stringify(newCategory, null, 2));
    console.log('\n💡 Run without --dry to apply changes.\n');
    return;
  }
  
  const { data: newCat, error } = await sb
    .from('kategoriler')
    .insert(newCategory)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Failed to create category:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
  
  console.log('✅ Successfully created "Gurme Pastalar"!');
  console.log(`   ID: ${newCat.id}`);
  console.log(`   Names: ${JSON.stringify(newCat.ad)}`);
  console.log(`   Parent: ${parentCat.ad.de}\n`);
}

main().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
