import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const toppingCatId = '193a8c4c-802f-493d-a9ee-5ca95dd13152'; // Topping Soslar (1 kg)
    const eclipseSlug = 'madagaskar-vanilya-aromali-sos-1-kg---eclipse';

    // 1. Move Eclipse to Topping Soslar
    const { error: updateError } = await supabase
        .from('urunler')
        .update({ kategori_id: toppingCatId })
        .eq('slug', eclipseSlug);

    if (updateError) {
        console.error('Error updating Eclipse:', updateError);
    } else {
        console.log(`Successfully moved ${eclipseSlug} to Topping Soslar (${toppingCatId}).`);
    }

    // 2. Check if any other products are still assigned to parent "Soslar" (3df0be9f-a9c0-47d7-a828-1ec2d34d5b84)
    const parentSosId = '3df0be9f-a9c0-47d7-a828-1ec2d34d5b84';
    const { data: remainingSosProds } = await supabase
        .from('urunler')
        .select('id, slug, ad')
        .eq('kategori_id', parentSosId);

    if (remainingSosProds && remainingSosProds.length > 0) {
        console.log('\nRemaining products in parent Soslar:');
        remainingSosProds.forEach(p => console.log(`- ${p.slug} (${JSON.stringify(p.ad?.tr || p.ad)})`));
    } else {
        console.log('\nNo products left in parent Soslar category.');
    }
}

run();
