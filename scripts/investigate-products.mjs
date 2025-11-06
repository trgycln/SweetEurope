#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://atydffkpyvxcmzxyibhj.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eWRmZmtweXZ4Y216eHlpYmhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMyMjYxMiwiZXhwIjoyMDc0ODk4NjEyfQ.LHTstP_K3qHoxD_ie_A6fPkFcnKb732qORSJkxrV3qk'
);

async function checkProductDistribution() {
    console.log('🔍 Investigating product distribution...\n');

    // Total products
    const { count: totalCount } = await supabase
        .from('urunler')
        .select('*', { count: 'exact', head: true });
    
    console.log('📦 Total products in database:', totalCount);

    // Products with category_id
    const { count: withCategory } = await supabase
        .from('urunler')
        .select('*', { count: 'exact', head: true })
        .not('kategori_id', 'is', null);
    
    console.log('📁 Products with kategori_id:', withCategory);

    // Products without category_id
    const { count: withoutCategory } = await supabase
        .from('urunler')
        .select('*', { count: 'exact', head: true })
        .is('kategori_id', null);
    
    console.log('❓ Products without kategori_id (orphans):', withoutCategory);

    // Get all categories
    const { data: categories } = await supabase
        .from('kategoriler')
        .select('id, ad, slug, ust_kategori_id');

    console.log('\n📊 Products per category:\n');

    // Count products per category
    for (const category of categories || []) {
        const { count } = await supabase
            .from('urunler')
            .select('*', { count: 'exact', head: true })
            .eq('kategori_id', category.id);
        
        const name = category.ad?.de || category.ad?.tr || category.slug;
        const indent = category.ust_kategori_id ? '  └─ ' : '📁 ';
        console.log(`${indent}${name}: ${count} products`);
    }

    // Check for deleted categories
    const { data: allProducts } = await supabase
        .from('urunler')
        .select('kategori_id')
        .not('kategori_id', 'is', null);

    const uniqueCategoryIds = new Set(allProducts?.map(p => p.kategori_id));
    const existingCategoryIds = new Set(categories?.map(c => c.id));
    
    const orphanedCategoryIds = [...uniqueCategoryIds].filter(id => !existingCategoryIds.has(id));
    
    if (orphanedCategoryIds.length > 0) {
        console.log('\n⚠️  Found products assigned to non-existent categories:');
        for (const catId of orphanedCategoryIds) {
            const { count } = await supabase
                .from('urunler')
                .select('*', { count: 'exact', head: true })
                .eq('kategori_id', catId);
            console.log(`   Category ID ${catId}: ${count} products`);
        }
    }

    console.log('\n✨ Investigation complete!');
}

checkProductDistribution().catch(console.error);
