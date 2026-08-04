import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, serviceRoleKey);

// Normalize text for matching
function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordOverlap(s1, s2) {
  const w1 = new Set(s1.split(' '));
  const w2 = new Set(s2.split(' '));
  let intersection = 0;
  for (const w of w1) {
    if (w2.has(w)) intersection++;
  }
  return intersection / Math.max(w1.size, w2.size);
}

async function main() {
  const pricesData = JSON.parse(fs.readFileSync('scratch_pdf_prices.json', 'utf8'));
  const pdfProducts = Object.values(pricesData).map(p => ({
    ...p,
    normName: normalizeText(p.original_name)
  }));

  // Fetch all FO products
  const { data: dbProducts, error } = await supabase
    .from('urunler')
    .select('id, stok_kodu, ad')
    .ilike('stok_kodu', 'FO%');

  if (error) {
    console.error('Error fetching products:', error.message);
    return;
  }

  console.log(`Found ${dbProducts.length} FO products in DB. Matching against ${pdfProducts.length} PDF prices...`);

  let updatedCount = 0;

  for (const pdfItem of pdfProducts) {
    // Find best match in DB
    let bestMatch = null;
    let bestScore = 0;

    for (const dbItem of dbProducts) {
      const enName = normalizeText(dbItem.ad?.en || '');
      const trName = normalizeText(dbItem.ad?.tr || '');
      
      const scoreEn = wordOverlap(pdfItem.normName, enName);
      const scoreTr = wordOverlap(pdfItem.normName, trName);
      const score = Math.max(scoreEn, scoreTr);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = dbItem;
      }
    }

    if (bestMatch && bestScore >= 0.55) {
      // We have a match!
      const p = pdfItem.price1; // Normal Fiyat -> Distributor Alis Fiyati
      const alt = Number((p * 1.05).toFixed(2));
      const toptanci = Number((p * 1.2).toFixed(2));
      const musteri = Number((p * 1.3).toFixed(2));

      const { error: updateErr } = await supabase
        .from('urunler')
        .update({
          distributor_alis_fiyati: p,
          satis_fiyati_alt_bayi: alt,
          satis_fiyati_toptanci: toptanci,
          satis_fiyati_musteri: musteri,
          aktif: true
        })
        .eq('id', bestMatch.id);
        
      if (updateErr) {
        console.error(`Failed to update ${bestMatch.stok_kodu}:`, updateErr.message);
      } else {
        console.log(`Matched "${pdfItem.original_name}" -> [${bestMatch.stok_kodu}] ${bestMatch.ad?.en || bestMatch.ad?.tr} (Score: ${bestScore.toFixed(2)}) => Set alis: ${p}`);
        updatedCount++;
      }
    } else {
      console.log(`No good match for "${pdfItem.original_name}" (Best score: ${bestScore.toFixed(2)})`);
    }
  }

  console.log(`\nSuccessfully updated prices for ${updatedCount} products based on PDFs.`);
}

main().catch(console.error);
