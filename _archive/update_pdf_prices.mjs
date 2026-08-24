import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, serviceRoleKey);

// Normalize text for matching
function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
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

function parseFiles() {
    const files = ['scratch_pdf_01.txt', 'scratch_pdf_02.txt', 'scratch_pdf_03.txt'];
    const extractedPrices = [];
  
    for (const file of files) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        for (let line of lines) {
          line = line.trim();
          if (!line) continue;
          
          const firstEuroIndex = line.indexOf('€');
          if (firstEuroIndex !== -1) {
            const parts = line.split('€');
            if (parts.length >= 2) {
              let beforeEuro = parts[0].trim();
              beforeEuro = beforeEuro.replace(/\s*\d+(\s+\d+)*\s*$/, '').trim();
              
              const priceStr = parts[1].trim().split(' ')[0];
              if (priceStr && priceStr.match(/^\d+,\d+$/)) {
                 const price = parseFloat(priceStr.replace(',', '.'));
                 if (beforeEuro) {
                    extractedPrices.push({
                        name: beforeEuro,
                        price: price,
                        source: file
                    });
                 }
              }
            }
          }
        }
      }
    }
    return extractedPrices;
}

async function main() {
  const pdfPrices = parseFiles();
  
  // Handle duplicates (take the lowest price to be safe, or just the first encountered if they are identical)
  const nameToPrices = {};
  for (const item of pdfPrices) {
    const norm = normalizeText(item.name);
    if (!nameToPrices[norm]) {
        nameToPrices[norm] = { name: item.name, normName: norm, price: item.price };
    } else {
        // If duplicates exist with different prices, just keep the latest for now or minimum.
        nameToPrices[norm].price = Math.min(nameToPrices[norm].price, item.price);
    }
  }

  const pdfProducts = Object.values(nameToPrices);

  // Fetch all products
  const { data: dbProducts, error } = await supabase
    .from('urunler')
    .select('id, stok_kodu, ad, distributor_alis_fiyati')
    .eq('aktif', true);

  if (error) {
    console.error('Error fetching products:', error.message);
    return;
  }

  console.log(`Found ${dbProducts.length} active products in DB. Matching against ${pdfProducts.length} PDF prices...`);

  let updatedCount = 0;
  const updateLog = [];

  for (const pdfItem of pdfProducts) {
    // Find best match in DB
    let bestMatch = null;
    let bestScore = 0;

    for (const dbItem of dbProducts) {
      let enName = '';
      let trName = '';

      if (typeof dbItem.ad === 'string') {
         trName = dbItem.ad;
      } else if (dbItem.ad && typeof dbItem.ad === 'object') {
         enName = dbItem.ad.en || '';
         trName = dbItem.ad.tr || Object.values(dbItem.ad)[0] || '';
      }

      enName = normalizeText(enName);
      trName = normalizeText(trName);
      
      const scoreEn = wordOverlap(pdfItem.normName, enName);
      const scoreTr = wordOverlap(pdfItem.normName, trName);
      const score = Math.max(scoreEn, scoreTr);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = dbItem;
      }
    }

    if (bestMatch && bestScore >= 0.50) {
      // We have a match! Update ONLY distributor_alis_fiyati
      const p = pdfItem.price;

      const { error: updateErr } = await supabase
        .from('urunler')
        .update({
          distributor_alis_fiyati: p
        })
        .eq('id', bestMatch.id);
        
      if (updateErr) {
        console.error(`Failed to update ${bestMatch.id}:`, updateErr.message);
      } else {
        const adName = typeof bestMatch.ad === 'object' ? (bestMatch.ad.tr || bestMatch.ad.en) : bestMatch.ad;
        console.log(`Matched "${pdfItem.name}" -> ${adName} (Score: ${bestScore.toFixed(2)}) => Set alis: ${p}`);
        updateLog.push({
           pdfName: pdfItem.name,
           dbName: adName,
           oldPrice: bestMatch.distributor_alis_fiyati,
           newPrice: p
        });
        updatedCount++;
      }
    } else {
      console.log(`No good match for "${pdfItem.name}" (Best score: ${bestScore.toFixed(2)})`);
    }
  }

  fs.writeFileSync('update_log.json', JSON.stringify(updateLog, null, 2));
  console.log(`\nSuccessfully updated 'distributor_alis_fiyati' for ${updatedCount} products based on PDFs.`);
}

main().catch(console.error);
