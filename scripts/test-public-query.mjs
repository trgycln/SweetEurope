// scripts/test-public-query.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Use public anon key like the public page

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPublicQuery() {
    console.log('🔍 Testing public products query...\n');

    // Simulate the exact query from public page
    const { data, error, count } = await supabase
        .from('urunler')
        .select(`id, ad, slug, ana_resim_url, kategori_id, ortalama_puan, degerlendirme_sayisi, teknik_ozellikler, aciklamalar`, { count: 'exact' })
        .eq('aktif', true)
        .range(0, 23); // First page

    if (error) {
        console.error('❌ Query error:', error);
        return;
    }

    console.log(`✅ Query successful!`);
    console.log(`📊 Total count: ${count}`);
    console.log(`📦 Returned products: ${data?.length || 0}\n`);

    if (data && data.length > 0) {
        console.log('📋 First 3 products:');
        data.slice(0, 3).forEach(p => {
            const ad = p.ad?.de || p.ad?.tr || p.ad?.en || 'No name';
            console.log(`  - ${ad}`);
            console.log(`    Kategori: ${p.kategori_id ? 'Yes' : 'NO'}`);
            console.log(`    Image: ${p.ana_resim_url ? 'Yes' : 'NO'}`);
        });
    } else {
        console.log('⚠️ No products returned!');
    }
}

testPublicQuery().catch(console.error);
