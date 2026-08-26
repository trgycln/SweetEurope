import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPremium() {
    // 1. Get Categories
    const { data: categories, error: catError } = await supabase
        .from('kategoriler')
        .select('*');
    
    if (catError) {
        console.error("Error fetching categories", catError);
        return;
    }
    fs.writeFileSync('categories.json', JSON.stringify(categories, null, 2));

    // 2. Get Premium/Special products
    const { data: products, error: prodError } = await supabase
        .from('urunler')
        .select('id, slug, ad, kategori_id');

    if (prodError) {
        console.error("Error fetching products", prodError);
        return;
    }
    
    const premiumProducts = products.filter(p => {
        const adStr = JSON.stringify(p.ad || {});
        return adStr.includes('Premium') || adStr.includes('Special') || adStr.includes('Özel');
    });

    fs.writeFileSync('premium_products.json', JSON.stringify(premiumProducts, null, 2));
    console.log(`Saved ${categories.length} categories to categories.json`);
    console.log(`Saved ${premiumProducts.length} premium products to premium_products.json`);
}

checkPremium();
