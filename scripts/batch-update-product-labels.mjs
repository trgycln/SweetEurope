import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const labelFiles = JSON.parse(fs.readFileSync(path.resolve('src', 'lib', 'label-files.json'), 'utf-8'));

function normalizeForMatch(str) {
  return (str || '')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/ä/g, 'a')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

function findLabelUrl(productName, stokKodu) {
  const normName = productName ? normalizeForMatch(productName) : '';
  const normSku = stokKodu ? normalizeForMatch(stokKodu) : '';

  for (const item of labelFiles) {
    const normFile = normalizeForMatch(item.originalName + ' ' + item.storageKey);

    // Direct SKU match
    if (normSku && (normFile.includes(normSku) || normSku.includes(normFile))) {
      return item.publicUrl;
    }

    // Fuzzy match product keywords
    if (normName) {
      const words = productName
        .toLowerCase()
        .replace(/[^a-z0-9ğüşıöçäöü]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !['ve', 'und', 'and', 'tozu', 'pulver', 'sos', 'sauce', 'surup', 'sirup', '1kg', 'fo'].includes(w));

      if (words.length > 0) {
        const matchedWords = words.filter(w => normFile.includes(normalizeForMatch(w)));
        if (matchedWords.length >= Math.min(2, words.length)) {
          return item.publicUrl;
        }
      }
    }
  }

  return null;
}

async function batchUpdateLabels() {
  console.log("Fetching all products from DB...");
  const { data: urunler, error } = await supabase
    .from('urunler')
    .select('id, stok_kodu, ad, produktdatenblatt_url');

  if (error) {
    console.error("Failed to fetch products:", error);
    return;
  }

  console.log(`Found ${urunler.length} products. Matching labels...`);

  let matchedCount = 0;
  let updatedCount = 0;

  for (const urun of urunler) {
    const trName = urun.ad?.tr || urun.ad?.de || urun.ad?.en || (typeof urun.ad === 'string' ? urun.ad : '');
    const matchedUrl = findLabelUrl(trName, urun.stok_kodu);

    if (matchedUrl) {
      matchedCount++;
      // Only update if different
      if (urun.produktdatenblatt_url !== matchedUrl) {
        const { error: updateError } = await supabase
          .from('urunler')
          .update({ produktdatenblatt_url: matchedUrl })
          .eq('id', urun.id);

        if (updateError) {
          console.error(`Failed to update ${trName}:`, updateError.message);
        } else {
          updatedCount++;
          console.log(`✅ [${matchedCount}] Matched & Updated: "${trName}" -> ${matchedUrl}`);
        }
      } else {
        console.log(`ℹ️ Already up-to-date: "${trName}"`);
      }
    }
  }

  console.log(`\nMatching Summary:`);
  console.log(`- Total Products: ${urunler.length}`);
  console.log(`- Matched Labels: ${matchedCount}`);
  console.log(`- DB Rows Updated: ${updatedCount}`);
}

batchUpdateLabels();
