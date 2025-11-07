// scripts/check-active-products.mjs
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

async function checkActiveProducts() {
    console.log('🔍 Checking product status...\n');

    // Count total products
    const { count: totalCount } = await supabase
        .from('urunler')
        .select('*', { count: 'exact', head: true });

    console.log(`📦 Total products: ${totalCount}`);

    // Count active products
    const { count: activeCount } = await supabase
        .from('urunler')
        .select('*', { count: 'exact', head: true })
        .eq('aktif', true);

    console.log(`✅ Active products: ${activeCount}`);

    // Count inactive products
    const { count: inactiveCount } = await supabase
        .from('urunler')
        .select('*', { count: 'exact', head: true })
        .eq('aktif', false);

    console.log(`❌ Inactive products: ${inactiveCount}`);

    // Get sample inactive products
    const { data: inactiveProducts } = await supabase
        .from('urunler')
        .select('id, ad, slug, aktif, kategori_id')
        .eq('aktif', false)
        .limit(5);

    if (inactiveProducts && inactiveProducts.length > 0) {
        console.log('\n📋 Sample inactive products:');
        inactiveProducts.forEach(p => {
            const ad = p.ad?.de || p.ad?.tr || p.ad?.en || 'No name';
            console.log(`  - ${ad} (${p.slug}) - Kategori: ${p.kategori_id ? 'Yes' : 'NO'}`);
        });
    }

    // Check products without category
    const { count: noCategoryCount } = await supabase
        .from('urunler')
        .select('*', { count: 'exact', head: true })
        .is('kategori_id', null);

    if (noCategoryCount > 0) {
        console.log(`\n⚠️  Products without category: ${noCategoryCount}`);
    }

    // Prompt to activate all
    if (inactiveCount > 0) {
        console.log('\n💡 Would you like to activate all products? Run:');
        console.log('   node scripts/activate-all-products.mjs');
    }
}

checkActiveProducts().catch(console.error);
