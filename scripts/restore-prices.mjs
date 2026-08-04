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
  if (!s1 || !s2) return 0;
  const w1 = new Set(s1.split(' '));
  const w2 = new Set(s2.split(' '));
  let intersection = 0;
  for (const w of w1) {
    if (w2.has(w)) intersection++;
  }
  return intersection / Math.max(w1.size, w2.size);
}

async function main() {
  console.log('Loading backup data...');
  const backupData = JSON.parse(fs.readFileSync('scripts/fo_urunler_final.json', 'utf8'));
  const backupProducts = backupData.map(p => {
    // Generate normalized name variants for matching
    const names = [];
    if (p.ad?.en) names.push(normalizeText(p.ad.en));
    if (p.ad?.tr) names.push(normalizeText(p.ad.tr));
    if (p.ad?.de) names.push(normalizeText(p.ad.de));
    return { ...p, normNames: names };
  });

  console.log('Fetching zero-priced FO products from DB...');
  const { data: dbProducts, error } = await supabase
    .from('urunler')
    .select('id, stok_kodu, ad')
    .ilike('stok_kodu', 'FO%')
    .or('satis_fiyati_musteri.eq.0,satis_fiyati_musteri.is.null');

  if (error) {
    console.error('Error fetching products:', error.message);
    return;
  }

  console.log(`Found ${dbProducts.length} zero-priced FO products. Matching against backup...`);

  let updatedCount = 0;

  for (const dbItem of dbProducts) {
    const enName = normalizeText(dbItem.ad?.en || '');
    const trName = normalizeText(dbItem.ad?.tr || '');
    const deName = normalizeText(dbItem.ad?.de || '');

    let bestMatch = null;
    let bestScore = 0;

    for (const backupItem of backupProducts) {
      let maxScore = 0;
      for (const bName of backupItem.normNames) {
        if (!bName) continue;
        const scoreEn = wordOverlap(bName, enName);
        const scoreTr = wordOverlap(bName, trName);
        const scoreDe = wordOverlap(bName, deName);
        maxScore = Math.max(maxScore, scoreEn, scoreTr, scoreDe);
      }

      if (maxScore > bestScore) {
        bestScore = maxScore;
        bestMatch = backupItem;
      }
    }

    if (bestMatch && bestScore > 0.6) {
      // Update with backup prices
      const { error: updateErr } = await supabase
        .from('urunler')
        .update({
          distributor_alis_fiyati: bestMatch.distributor_alis_fiyati,
          satis_fiyati_alt_bayi: bestMatch.satis_fiyati_alt_bayi,
          satis_fiyati_toptanci: bestMatch.satis_fiyati_toptanci,
          satis_fiyati_musteri: bestMatch.satis_fiyati_musteri
        })
        .eq('id', dbItem.id);
        
      if (updateErr) {
        console.error(`Failed to update ${dbItem.stok_kodu}:`, updateErr.message);
      } else {
        console.log(`Restored [${dbItem.stok_kodu}] (Score: ${bestScore.toFixed(2)}) using backup [${bestMatch.stok_kodu}] -> Alis: ${bestMatch.distributor_alis_fiyati}, Musteri: ${bestMatch.satis_fiyati_musteri}`);
        updatedCount++;
      }
    } else {
      console.log(`No good backup match found for [${dbItem.stok_kodu}] ${dbItem.ad?.tr || dbItem.ad?.en} (Best score: ${bestScore.toFixed(2)})`);
    }
  }

  console.log(`\nSuccessfully restored prices for ${updatedCount} products.`);
}

main().catch(console.error);
