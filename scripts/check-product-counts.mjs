#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://yzvndudyqcgzdkypxbxf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6dm5kdWR5cWNnemRreXB4YnhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAwNTM1MzcsImV4cCI6MjA0NTYyOTUzN30.MZCp7EE-kAaQx8xYw8j_cKJgvnCHgEVHsUZoT4TaDkY'
);

async function checkProductCounts() {
    console.log('🔍 Checking product counts...\n');

    // Toplam ürün sayısı
    const { count: allCount } = await supabase
        .from('urunler')
        .select('*', { count: 'exact', head: true });
    console.log('📦 Toplam ürün sayısı:', allCount);

    // Stokta olan ürünler
    const { count: inStockCount } = await supabase
        .from('urunler')
        .select('*', { count: 'exact', head: true })
        .gt('stok_sayisi', 0);
    console.log('✅ Stokta olan ürünler (stok_sayisi > 0):', inStockCount);

    // Stokta olmayan ürünler
    const { count: zeroStockCount } = await supabase
        .from('urunler')
        .select('*', { count: 'exact', head: true })
        .eq('stok_sayisi', 0);
    console.log('❌ Stokta olmayan ürünler (stok_sayisi = 0):', zeroStockCount);

    // NULL stok sayısı olan ürünler
    const { count: nullStockCount } = await supabase
        .from('urunler')
        .select('*', { count: 'exact', head: true })
        .is('stok_sayisi', null);
    console.log('⚠️  NULL stok sayısı olan ürünler:', nullStockCount);

    console.log('\n🔍 Checking category product query...\n');

    // Kategori ürün sayısı sorgusu (homepage'de kullanılan)
    const { data: productCounts, error } = await supabase
        .from('urunler')
        .select('kategori_id, kategoriler!inner(id, ust_kategori_id)')
        .neq('stok_sayisi', 0);

    if (error) {
        console.error('❌ Query error:', error);
    } else {
        console.log('📊 Query result count:', productCounts?.length);
        console.log('🔍 Sample result:', productCounts?.[0]);
    }

    // Kategoriler
    const { data: categories } = await supabase
        .from('kategoriler')
        .select('id, ad, slug, ust_kategori_id');

    console.log('\n📁 Kategori bilgileri:');
    console.log('Toplam kategori sayısı:', categories?.length);
    console.log('Ana kategoriler:', categories?.filter(c => !c.ust_kategori_id).length);
    console.log('Alt kategoriler:', categories?.filter(c => c.ust_kategori_id).length);

    // Her kategoride kaç ürün var
    console.log('\n📊 Kategori bazında ürün sayıları:');
    const categoryProductMap = {};
    
    if (productCounts) {
        productCounts.forEach((product) => {
            const categoryId = product.kategori_id;
            const parentId = product.kategoriler?.ust_kategori_id;
            
            // Alt kategoriyse, hem kendisine hem ana kategoriye say
            if (parentId) {
                categoryProductMap[parentId] = (categoryProductMap[parentId] || 0) + 1;
            }
            // Her ürünü kendi kategorisine say
            categoryProductMap[categoryId] = (categoryProductMap[categoryId] || 0) + 1;
        });
    }

    categories?.forEach(cat => {
        const count = categoryProductMap[cat.id] || 0;
        const name = cat.ad?.de || cat.ad?.tr || cat.slug;
        const type = cat.ust_kategori_id ? '  └─ ' : '📁 ';
        console.log(`${type}${name}: ${count} ürün`);
    });
}

checkProductCounts().catch(console.error);
