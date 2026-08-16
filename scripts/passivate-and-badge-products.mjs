import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log('Fetching all products from DB...');
  const { data: products, error } = await supabase.from('urunler').select('*');
  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  console.log(`Total products fetched: ${products.length}`);

  let passivatedCount = 0;
  let activeCount = 0;
  let badgedCount = 0;

  for (const p of products) {
    const naehrwerteRaw = p.naehrwerte || {};
    const inhaltsstoffeRaw = p.inhaltsstoffe || {};

    const hasNut = naehrwerteRaw.pro_100g && Object.keys(naehrwerteRaw.pro_100g).length > 0;
    const hasIng = inhaltsstoffeRaw.de && inhaltsstoffeRaw.de.trim().length > 0;
    const hasImage = !!p.ana_resim_url;

    // Check if product is legally complete and has image
    const isComplete = hasNut && hasIng && hasImage;

    if (!isComplete) {
      // Passivate product if currently active
      if (p.aktif) {
        // Also clear any mismatched PDF URLs on incomplete products if it was mistakenly attached
        const updatePayload = { aktif: false };
        if (p.slug && p.slug.includes('aperitivo') && p.produktdatenblatt_url && p.produktdatenblatt_url.includes('RAZZY')) {
          updatePayload.produktdatenblatt_url = null;
        }

        const { error: upErr } = await supabase
          .from('urunler')
          .update(updatePayload)
          .eq('id', p.id);

        if (upErr) {
          console.error(`Failed to passivate product ${p.slug}:`, upErr);
        } else {
          passivatedCount++;
        }
      }
    } else {
      activeCount++;

      // Compute accurate dietary badges
      const allergene = p.allergene || {};
      const slug = (p.slug || '').toLowerCase();
      const nameDe = (p.ad?.de || '').toLowerCase();
      const nameTr = (p.ad?.tr || '').toLowerCase();
      const allText = `${slug} ${nameDe} ${nameTr}`;

      const hasMilk = allergene.milch === true;
      const hasGluten = allergene.gluten === true;
      const isSugarFree = allText.includes('zuckerfrei') || allText.includes('sekersiz') || allText.includes('şekersiz') || allText.includes('sugar free') || allText.includes('sugar-free');

      const isVegan = !hasMilk && !hasGluten && !allText.includes('cikolata') && !allText.includes('schokolade') && !allText.includes('chai');
      const isLaktosefrei = !hasMilk;
      const isGlutenfrei = !hasGluten;
      const isVegetarisch = true; // All FO syrups, toppings, purees and drink powders are vegetarian

      const existingTeknik = p.teknik_ozellikler || {};
      const updatedTeknik = {
        ...existingTeknik,
        vegan: isVegan,
        laktosefrei: isLaktosefrei,
        glutenfrei: isGlutenfrei,
        ohne_zucker: isSugarFree,
        vegetarisch: isVegetarisch,
      };

      const { error: badgeErr } = await supabase
        .from('urunler')
        .update({
          aktif: true,
          teknik_ozellikler: updatedTeknik
        })
        .eq('id', p.id);

      if (badgeErr) {
        console.error(`Failed to badge product ${p.slug}:`, badgeErr);
      } else {
        badgedCount++;
      }
    }
  }

  console.log('==============================================');
  console.log(`✅ Finished processing!`);
  console.log(`- Active and fully badged products: ${badgedCount}`);
  console.log(`- Passivated incomplete products: ${passivatedCount}`);
  console.log('==============================================');
}

run();
