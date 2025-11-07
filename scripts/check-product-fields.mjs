import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://atydffkpyvxcmzxyibhj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eWRmZmtweXZ4Y216eHlpYmhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMyMjYxMiwiZXhwIjoyMDc0ODk4NjEyfQ.LHTstP_K3qHoxD_ie_A6fPkFcnKb732qORSJkxrV3qk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProductFields() {
    console.log('🔍 Checking product table structure...\n');

    // Get categories first
    const { data: categories } = await supabase
        .from('kategoriler')
        .select('id, slug, ad')
        .eq('slug', 'cakes-and-tarts');

    const cakesCategory = categories?.[0];

    // Get sample products from cakes category
    const { data: products, error } = await supabase
        .from('urunler')
        .select('*')
        .eq('kategori_id', cakesCategory?.id)
        .limit(5);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (products && products.length > 0) {
        console.log('📋 Available fields in urunler table:\n');
        const sampleProduct = products[0];
        Object.keys(sampleProduct).forEach(key => {
            const value = sampleProduct[key];
            const type = Array.isArray(value) ? 'array' : typeof value;
            console.log(`  ✓ ${key}: ${type}`);
        });

        console.log('\n📊 Sample product data:\n');
        products.forEach((p, i) => {
            console.log(`Product ${i + 1}:`);
            console.log(`  SKU: ${p.stok_kodu}`);
            console.log(`  Name: ${JSON.stringify(p.ad)}`);
            console.log(`  Kategori: ${p.kategori_id}`);
            console.log(`  Teknik Özellikler: ${p.teknik_ozellikler ? JSON.stringify(p.teknik_ozellikler, null, 2) : 'N/A'}`);
            console.log('---');
        });
    }
}

checkProductFields();
