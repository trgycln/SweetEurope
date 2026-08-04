import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9ğüşöçi]/g, ' ')
    .replace(/\b(fo|1 kg|700 ml|2.5 kg|2,5 kg|1.5 kg|ve|ile|icin|için)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function jaccardSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  const w1 = new Set(s1.split(' '));
  const w2 = new Set(s2.split(' '));
  let intersection = 0;
  for (const w of w1) {
    if (w2.has(w)) intersection++;
  }
  const union = w1.size + w2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

async function main() {
  const backupData = JSON.parse(fs.readFileSync('scripts/fo_urunler_final.json', 'utf8'));
  const backupProducts = backupData.map(p => {
    const names = [];
    if (p.ad?.en) names.push(normalizeText(p.ad.en));
    if (p.ad?.tr) names.push(normalizeText(p.ad.tr));
    if (p.ad?.de) names.push(normalizeText(p.ad.de));
    return { ...p, normNames: names };
  });

  const { data: dbProducts } = await supabase
    .from('urunler')
    .select('id, stok_kodu, ad')
    .ilike('stok_kodu', 'FO%')
    .or('satis_fiyati_musteri.eq.0,satis_fiyati_musteri.is.null');

  let updatedCount = 0;

  for (const dbItem of dbProducts) {
    const names = [];
    if (dbItem.ad?.en) names.push(normalizeText(dbItem.ad.en));
    if (dbItem.ad?.tr) names.push(normalizeText(dbItem.ad.tr));
    if (dbItem.ad?.de) names.push(normalizeText(dbItem.ad.de));

    let bestMatch = null;
    let bestScore = 0;

    for (const backupItem of backupProducts) {
      let maxScore = 0;
      for (const bName of backupItem.normNames) {
        if (!bName) continue;
        for (const dbName of names) {
          if (!dbName) continue;
          maxScore = Math.max(maxScore, jaccardSimilarity(bName, dbName));
        }
      }
      if (maxScore > bestScore) {
        bestScore = maxScore;
        bestMatch = backupItem;
      }
    }

    if (bestMatch && bestScore >= 0.4) {
      const { error } = await supabase
        .from('urunler')
        .update({
          distributor_alis_fiyati: bestMatch.distributor_alis_fiyati,
          satis_fiyati_alt_bayi: bestMatch.satis_fiyati_alt_bayi,
          satis_fiyati_toptanci: bestMatch.satis_fiyati_toptanci,
          satis_fiyati_musteri: bestMatch.satis_fiyati_musteri
        })
        .eq('id', dbItem.id);
        
      if (!error) {
        console.log(`Loosely matched [${dbItem.stok_kodu}] (Score: ${bestScore.toFixed(2)}) using [${bestMatch.stok_kodu}] -> Alis: ${bestMatch.distributor_alis_fiyati}`);
        updatedCount++;
      }
    }
  }

  console.log(`\nSuccessfully restored additional ${updatedCount} products.`);
}
main().catch(console.error);
