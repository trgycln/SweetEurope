import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Creating Premium category...");
    
    // 1. Check if Premium Top Category already exists
    let { data: existingPremium } = await supabase
        .from('kategoriler')
        .select('id')
        .eq('slug', 'premium')
        .single();
        
    let premiumId;
    if (existingPremium) {
        premiumId = existingPremium.id;
        console.log("Premium top category already exists:", premiumId);
    } else {
        const { data: newCat, error: insertError } = await supabase
            .from('kategoriler')
            .insert({
                slug: 'premium',
                ad: {
                    tr: "Premium",
                    en: "Premium",
                    de: "Premium",
                    ar: "بريميوم"
                },
                urun_gami: ["barista-bakery-essentials"]
            })
            .select()
            .single();
            
        if (insertError) {
            console.error("Error creating Premium category", insertError);
            return;
        }
        premiumId = newCat.id;
        console.log("Created Premium top category:", premiumId);
    }

    // 2. Update parent IDs for Premium Subcategories
    const subCategories = [
        { id: '71804c62-f21f-412b-b82f-749e495391bf', name: 'Premium Şuruplar' },
        { id: '21f65289-fb51-4a03-a33d-7f4c6d9d9135', name: 'Premium Bar Sosları' },
        { id: '3e20c73f-89cb-4fff-a03c-e289043e2b9c', name: 'Özel Soslar' }
    ];

    for (const subCat of subCategories) {
        const { error } = await supabase
            .from('kategoriler')
            .update({ ust_kategori_id: premiumId })
            .eq('id', subCat.id);
            
        if (error) {
            console.error(`Error updating ${subCat.name}:`, error);
        } else {
            console.log(`Updated ${subCat.name} to have Premium as parent.`);
        }
    }

    // 3. Move products to correct subcategories
    const premiumSyrupsCatId = '71804c62-f21f-412b-b82f-749e495391bf';
    const premiumSaucesCatId = '21f65289-fb51-4a03-a33d-7f4c6d9d9135';
    const specialSaucesCatId = '3e20c73f-89cb-4fff-a03c-e289043e2b9c';

    const { data: products } = await supabase.from('urunler').select('id, slug, ad');
    const premiumProducts = products.filter(p => {
        const adStr = JSON.stringify(p.ad || {});
        return adStr.includes('Premium') || adStr.includes('Special') || adStr.includes('Özel') || p.slug.includes('premium') || p.slug.includes('special');
    });

    let syrupCount = 0;
    let sauceCount = 0;
    let specialCount = 0;

    for (const p of premiumProducts) {
        const slug = p.slug.toLowerCase();
        let targetCatId = null;

        if (slug.includes('surup') || slug.includes('syrup') || slug.includes('srp')) {
            targetCatId = premiumSyrupsCatId;
            syrupCount++;
        } else if (slug.includes('special')) {
            targetCatId = specialSaucesCatId;
            specialCount++;
        } else if (slug.includes('sos') || slug.includes('sauce') || slug.includes('karamel')) {
            // karamel mostly goes to sauces if it has sos
            // wait, some are 'karamel-aromali-surup', handled above
            targetCatId = premiumSaucesCatId;
            sauceCount++;
        }

        if (targetCatId) {
            await supabase.from('urunler').update({ kategori_id: targetCatId }).eq('id', p.id);
            console.log(`Moved product ${p.slug} to category ${targetCatId}`);
        } else {
            console.log(`Could not determine category for ${p.slug}`);
        }
    }

    console.log(`Moved ${syrupCount} syrups, ${sauceCount} sauces, ${specialCount} special sauces.`);
}

run();
