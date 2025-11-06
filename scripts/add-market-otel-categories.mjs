#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://atydffkpyvxcmzxyibhj.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eWRmZmtweXZ4Y216eHlpYmhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMyMjYxMiwiZXhwIjoyMDc0ODk4NjEyfQ.LHTstP_K3qHoxD_ie_A6fPkFcnKb732qORSJkxrV3qk'
);

async function addMarketOtelCategories() {
    console.log('🔍 Finding Cakes & Tarts main category...\n');

    // "Cakes & Tarts" ana kategorisini bul
    const { data: cakesCategory, error: findError } = await supabase
        .from('kategoriler')
        .select('id, ad, slug')
        .eq('slug', 'cakes-and-tarts')
        .single();

    if (findError || !cakesCategory) {
        console.error('❌ Could not find Cakes & Tarts category!');
        console.error('Error:', findError);
        return;
    }

    console.log('✅ Found Cakes & Tarts category:', cakesCategory.ad.de);
    console.log('   ID:', cakesCategory.id);
    console.log('   Slug:', cakesCategory.slug);

    // Yeni kategoriler
    const newCategories = [
        {
            slug: 'market-pastalari',
            ad: {
                tr: 'Market Pastaları',
                de: 'Markt-Kuchen',
                en: 'Market Cakes',
                ar: 'كعك السوق'
            },
            ust_kategori_id: cakesCategory.id
        },
        {
            slug: 'otel-pastalari',
            ad: {
                tr: 'Otel Pastaları',
                de: 'Hotel-Kuchen',
                en: 'Hotel Cakes',
                ar: 'كعك الفنادق'
            },
            ust_kategori_id: cakesCategory.id
        }
    ];

    console.log('\n📝 Creating new subcategories...\n');

    for (const category of newCategories) {
        // Check if category already exists
        const { data: existing } = await supabase
            .from('kategoriler')
            .select('id, slug')
            .eq('slug', category.slug)
            .single();

        if (existing) {
            console.log(`⚠️  Category ${category.slug} already exists, skipping...`);
            continue;
        }

        // Create category
        const { data: created, error } = await supabase
            .from('kategoriler')
            .insert(category)
            .select('id, slug, ad')
            .single();

        if (error) {
            console.error(`❌ Failed to create ${category.slug}:`, error);
        } else {
            console.log(`✅ Created ${category.slug}:`);
            console.log(`   TR: ${created.ad.tr}`);
            console.log(`   DE: ${created.ad.de}`);
            console.log(`   EN: ${created.ad.en}`);
        }
    }

    console.log('\n✨ Done! New subcategories created under Cakes & Tarts.');
    console.log('\n💡 Note: You will need to manually assign products to these categories from the admin panel.');
}

addMarketOtelCategories().catch(console.error);
