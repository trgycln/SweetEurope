import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function main() {
  const specsPath = path.resolve('extracted_new_specs.json');
  if (!fs.existsSync(specsPath)) {
    console.log('No extracted_new_specs.json found.');
    return;
  }

  const specs = JSON.parse(fs.readFileSync(specsPath, 'utf-8'));
  console.log(`Loaded ${specs.length} new specs.`);

  const { data: dbProducts, error: dbError } = await supabase
    .from('urunler')
    .select('id, ad');

  if (dbError) {
    console.error('Error fetching DB products:', dbError);
    return;
  }

  let updatedCount = 0;
  let insertedCount = 0;

  for (const spec of specs) {
    // 1. Clean the spec name to match DB names.
    const specName = spec.orjinal_ad.trim().toLowerCase();

    // 2. Find if this product exists in DB
    const match = dbProducts.find(p => {
      let dbNames = [];
      if (typeof p.ad === 'string') {
        dbNames.push(p.ad.toLowerCase());
      } else if (p.ad && typeof p.ad === 'object') {
        dbNames.push(p.ad.de ? p.ad.de.toLowerCase() : '');
        dbNames.push(p.ad.tr ? p.ad.tr.toLowerCase() : '');
        dbNames.push(p.ad.en ? p.ad.en.toLowerCase() : '');
      }
      return dbNames.some(dbn => dbn && dbn.includes(specName) || specName.includes(dbn));
    });

    const payload = {
      inhaltsstoffe: spec.inhaltsstoffe,
      naehrwerte: spec.naehrwerte,
      allergene: spec.allergene,
      lagertemperatur_min_celsius: spec.lagertemperatur_min_celsius,
      lagertemperatur_max_celsius: spec.lagertemperatur_max_celsius,
      haltbarkeit_monate: spec.haltbarkeit_monate,
    };

    if (match) {
      // UPDATE
      const { error } = await supabase
        .from('urunler')
        .update(payload)
        .eq('id', match.id);
        
      if (error) {
        console.error(`Failed to update ${spec.orjinal_ad}:`, error.message);
      } else {
        console.log(`[UPDATE] ${spec.orjinal_ad} -> Matched ID: ${match.id}`);
        updatedCount++;
      }
    } else {
      // INSERT
      let catId = '253195b6-4c1a-4503-86dd-dd3867dc7b91'; // Iconic default
      if (specName.includes('syrup')) catId = '71804c62-f21f-412b-b82f-749e495391bf';
      if (specName.includes('sauce')) catId = '3df0be9f-a9c0-47d7-a828-1ec2d34d5b84';

      const insertPayload = {
        ad: spec.ad,
        aciklamalar: spec.aciklama,
        aktif: false, // Inactive by default
        kategori_id: catId,
        distributor_alis_fiyati: 0,
        ...payload
      };

      const { error } = await supabase
        .from('urunler')
        .insert([insertPayload]);
        
      if (error) {
        console.error(`Failed to insert ${spec.orjinal_ad}:`, error.message);
      } else {
        console.log(`[INSERT] ${spec.orjinal_ad}`);
        insertedCount++;
      }
    }
  }

  console.log(`\nFinished! Updated: ${updatedCount}, Inserted: ${insertedCount}`);
}

main().catch(console.error);
