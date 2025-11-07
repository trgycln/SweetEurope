// scripts/check-uncategorized-products.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUncategorizedProducts() {
    console.log('🔍 Checking products with categories...\n');

    // Count products without category
    const { count: noCategoryCount, data: noCategory } = await supabase
        .from('urunler')
        .select('id, ad, slug, aktif, kategori_id', { count: 'exact' })
        .is('kategori_id', null)
        .eq('aktif', true);

    console.log(`⚠️  Active products without category: ${noCategoryCount}`);

    if (noCategory && noCategory.length > 0) {
        console.log('\n📋 Products without category (aktif=true):');
        noCategory.slice(0, 10).forEach(p => {
            const ad = p.ad?.de || p.ad?.tr || p.ad?.en || 'No name';
            console.log(`  - ${ad} (${p.slug})`);
        });
    }

    // Count active products WITH category
    const { count: withCategoryCount } = await supabase
        .from('urunler')
        .select('*', { count: 'exact', head: true })
        .not('kategori_id', 'is', null)
        .eq('aktif', true);

    console.log(`\n✅ Active products WITH category: ${withCategoryCount}`);

    // Check a sample active product with category
    const { data: sampleProducts } = await supabase
        .from('urunler')
        .select('id, ad, slug, kategori_id, aktif')
        .eq('aktif', true)
        .not('kategori_id', 'is', null)
        .limit(5);

    if (sampleProducts && sampleProducts.length > 0) {
        console.log('\n📦 Sample active products WITH category:');
        sampleProducts.forEach(p => {
            const ad = p.ad?.de || p.ad?.tr || p.ad?.en || 'No name';
            console.log(`  - ${ad} (kategori: ${p.kategori_id})`);
        });
    }
}

checkUncategorizedProducts().catch(console.error);
