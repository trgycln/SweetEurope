// scripts/add-cold-drinks-category.mjs
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

async function addColdDrinksCategory() {
    console.log('🔍 Looking for Getränke (Drinks) category...\n');

    // Find parent category "Getränke" / "drinks"
    const { data: parentCategory, error: findError } = await supabase
        .from('kategoriler')
        .select('id, ad, slug')
        .eq('slug', 'drinks')
        .single();

    if (findError || !parentCategory) {
        console.error('❌ Could not find Getränke category with slug "drinks"');
        console.error('Error:', findError);
        return;
    }

    console.log(`✅ Found parent category: ${parentCategory.ad?.de || 'Getränke'} (ID: ${parentCategory.id})`);

    // Check if "Kalte Getränke" already exists
    const { data: existingSubcat } = await supabase
        .from('kategoriler')
        .select('id, ad, slug')
        .eq('slug', 'cold-drinks')
        .single();

    if (existingSubcat) {
        console.log(`\n⚠️  "Kalte Getränke" (cold-drinks) already exists with ID: ${existingSubcat.id}`);
        console.log('No action needed.');
        return;
    }

    // Create new subcategory
    console.log('\n📝 Creating "Kalte Getränke" subcategory...');

    const newCategory = {
        ad: {
            de: 'Kalte Getränke',
            tr: 'Soğuk İçecekler',
            en: 'Cold Drinks',
            ar: 'مشروبات باردة'
        },
        slug: 'cold-drinks',
        ust_kategori_id: parentCategory.id
    };

    const { data: createdCategory, error: createError } = await supabase
        .from('kategoriler')
        .insert([newCategory])
        .select()
        .single();

    if (createError) {
        console.error('❌ Error creating subcategory:', createError);
        return;
    }

    console.log(`✅ Successfully created "Kalte Getränke" (Cold Drinks) subcategory!`);
    console.log(`   ID: ${createdCategory.id}`);
    console.log(`   Slug: ${createdCategory.slug}`);
    console.log(`   Parent: ${parentCategory.ad?.de || 'Getränke'}`);
    
    console.log('\n✅ Done! You can now assign cold drink products to this subcategory.');
}

addColdDrinksCategory().catch(console.error);
