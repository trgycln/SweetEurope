import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const slugsToDelete = [
    'sutlu-kakaolu-waffle-ve-krep-icin-krema-sosu---yeni',
    'sos-pompasi-50-ml',
    'tatli-eksi-sos-700-ml',
    'fo-aromatik-bitter-sos-panacea-250ml'
];

async function run() {
    console.log('Finding products to delete...');
    const { data: products, error: findError } = await supabase
        .from('urunler')
        .select('id, slug, ad')
        .in('slug', slugsToDelete);

    if (findError) {
        console.error('Error finding products:', findError);
        return;
    }

    console.log(`Found ${products.length} products to delete:`);
    products.forEach(p => console.log(`- ${p.id}: ${p.slug} (${JSON.stringify(p.ad?.tr || p.ad)})`));

    const idsToDelete = products.map(p => p.id);

    if (idsToDelete.length === 0) {
        console.log('No matching products found to delete.');
        return;
    }

    // Delete from urunler
    const { error: deleteError } = await supabase
        .from('urunler')
        .delete()
        .in('id', idsToDelete);

    if (deleteError) {
        console.error('Error deleting products:', deleteError);
    } else {
        console.log(`Successfully deleted ${idsToDelete.length} products.`);
    }
}

run();
