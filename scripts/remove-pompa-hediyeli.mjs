import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function cleanText(text) {
  if (typeof text !== 'string') return text;
  
  let cleaned = text;

  // TR patterns
  cleaned = cleaned.replace(/\s*\(\s*Pompa\s*Hediyeli\s*\)/gi, '');
  cleaned = cleaned.replace(/\s*Pompa\s*Hediyeli/gi, '');
  cleaned = cleaned.replace(/\s*\(\s*Pompa\s*Hediye\s*\)/gi, '');

  // DE patterns
  cleaned = cleaned.replace(/\s*\(\s*mit\s*Pump[- ]?Geschenk\s*\)/gi, '');
  cleaned = cleaned.replace(/\s*\(\s*mit\s*Pumpgeschenk\s*\)/gi, '');
  cleaned = cleaned.replace(/\s*\(\s*mit\s*Pumpe\s*\)/gi, '');
  cleaned = cleaned.replace(/\s*mit\s*Pumpgeschenk/gi, '');

  // EN patterns
  cleaned = cleaned.replace(/\s*\(\s*With\s*Pump\s*Gift\s*\)/gi, '');
  cleaned = cleaned.replace(/\s*\(\s*with\s*pump\s*gift\s*\)/gi, '');
  cleaned = cleaned.replace(/\s*\(\s*with\s*pump\s*\)/gi, '');
  cleaned = cleaned.replace(/\s*\(\s*With\s*Pump\s*\)/gi, '');
  cleaned = cleaned.replace(/\s*with\s*pump\s*gift/gi, '');

  // AR patterns
  cleaned = cleaned.replace(/\s*\(\s*مع\s*مضخة\s*هدية\s*\)/g, '');
  cleaned = cleaned.replace(/\s*\(\s*مع\s*مضخة\s*هديه\s*\)/g, '');
  cleaned = cleaned.replace(/\s*\(\s*مع\s*مضخة\s*\)/g, '');

  // Clean double spaces and trailing spaces
  cleaned = cleaned.replace(/  +/g, ' ').trim();

  return cleaned;
}

function cleanObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanObject);
  
  const res = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      res[key] = cleanText(val);
    } else if (typeof val === 'object' && val !== null) {
      res[key] = cleanObject(val);
    } else {
      res[key] = val;
    }
  }
  return res;
}

async function removePumpMentions() {
  console.log('--- Scanning and removing "Pompa Hediyeli" from all products ---');
  
  const { data: prods, error } = await supabase.from('urunler').select('*');
  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  let updatedCount = 0;

  for (const p of prods) {
    let changed = false;

    // Check AD
    const newAd = cleanObject(p.ad);
    if (JSON.stringify(newAd) !== JSON.stringify(p.ad)) {
      changed = true;
    }

    // Check Aciklamalar
    const newAciklamalar = cleanObject(p.aciklamalar);
    if (JSON.stringify(newAciklamalar) !== JSON.stringify(p.aciklamalar)) {
      changed = true;
    }

    // Check seo_meta
    const newSeoMeta = cleanObject(p.seo_meta);
    if (JSON.stringify(newSeoMeta) !== JSON.stringify(p.seo_meta)) {
      changed = true;
    }

    if (changed) {
      console.log(`Updating product: ${p.slug}`);
      console.log('  OLD AD TR:', p.ad?.tr);
      console.log('  NEW AD TR:', newAd?.tr);

      const { error: updateErr } = await supabase
        .from('urunler')
        .update({
          ad: newAd,
          aciklamalar: newAciklamalar,
          seo_meta: newSeoMeta
        })
        .eq('id', p.id);

      if (updateErr) {
        console.error(`Error updating product ${p.slug}:`, updateErr);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`\n--- Completed! Successfully updated ${updatedCount} products. ---`);
}

removePumpMentions().catch(console.error);
