import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    // 1. 8691123473905 (Vanilya sos) -> 6.50
    await supabase.from('urunler').update({ distributor_alis_fiyati: 6.50 }).eq('ean_gtin', '8691123473905');
    console.log('Fixed 8691123473905 (Vanilya sos) price to 6.50');

    // 2. 8691123462916 (Cool Lime) -> koli_ici = 6
    await supabase.from('urunler').update({ koli_ici_adet: 6 }).eq('ean_gtin', '8691123462916');
    console.log('Fixed 8691123462916 (Cool Lime) koli_ici_adet to 6');

    // 3. 8691123120014 (Nar) -> Remove premium, price 2.73
    const { data: nar } = await supabase.from('urunler').select('*').eq('ean_gtin', '8691123120014').single();
    if (nar) {
        let nTr = nar.ad.tr.replace('Premium', '').replace('  ', ' ').trim();
        let nEn = nar.ad.en ? nar.ad.en.replace('PREMIUM', '').replace('Premium', '').replace('  ', ' ').trim() : '';
        await supabase.from('urunler').update({ distributor_alis_fiyati: 2.73, ad: { ...nar.ad, tr: nTr, en: nEn } }).eq('ean_gtin', '8691123120014');
        console.log('Fixed 8691123120014 (Nar) name and price 2.73');
    }

    // 4. 8691123120229 (Mango) -> price 2.73
    await supabase.from('urunler').update({ distributor_alis_fiyati: 2.73 }).eq('ean_gtin', '8691123120229');
    console.log('Fixed 8691123120229 (Mango) price to 2.73');

    // 5. 8691123120137 (Peach normal) -> it currently says Premium in DB, but it's the normal one.
    const { data: peach } = await supabase.from('urunler').select('*').eq('ean_gtin', '8691123120137').single();
    if (peach) {
        await supabase.from('urunler').update({
            distributor_alis_fiyati: 2.83,
            ad: { tr: 'FO Şeftali Aromalı Şurup 700 ml', en: 'FO PEACH FLAVORED SYRUP 70 CL.', de: 'FO Pfirsich Sirup 700 ml' }
        }).eq('ean_gtin', '8691123120137');
        console.log('Fixed 8691123120137 (Peach) name and price 2.83');
    }

    // Now let's check the draft to see if we need to swap out any premium ones for normal ones, or if they are both there.
    const draftKey = 'supplier_order_plan_draft_642896a8-ec56-4a58-917d-eafe2831a104';
    const { data: row } = await supabase.from('system_settings').select('*').eq('setting_key', draftKey).single();
    let draft = JSON.parse(row.setting_value);
    const productIds = draft.items.map(i => i.productId);
    const { data: prods } = await supabase.from('urunler').select('id, ean_gtin, ad').in('id', productIds);
    
    let hasNormalPeach = false;
    let hasPremiumPeach = false;
    for (const p of prods) {
        if (p.ean_gtin === '8691123120137') hasNormalPeach = true; // The one we just fixed
        if (p.ean_gtin === '8691123470966') hasPremiumPeach = true; // The real Premium peach
    }
    console.log(`Draft has normal peach (8691123120137): ${hasNormalPeach}`);
    console.log(`Draft has premium peach (8691123470966): ${hasPremiumPeach}`);
    
    // If the user meant "add the normal one and remove the premium one", we need to check if 8691123470966 is in the draft.
    // If we need to remove premium and the user wants to remove 8691123470966... wait, let's just log this first to be sure.
}
run();
