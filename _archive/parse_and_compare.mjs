import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
        
        // Regex to match "Product Name € 1,98 € 1,46" or "Product Name 6 90 € 5,70 € 4,56" or "Product Name 6 € 9,50 € 6,99"
        // Let's try a more general approach: Find the first occurrence of €
        const firstEuroIndex = line.indexOf('€');
        if (firstEuroIndex !== -1) {
          // The product name is before the numbers leading up to the first €
          // e.g., "Fo CHOCOLATE Flavored Sauce 12 € 2,42 € 1,78" -> Name is "Fo CHOCOLATE Flavored Sauce"
          // We can split by €
          const parts = line.split('€');
          if (parts.length >= 2) {
            let beforeEuro = parts[0].trim();
            // Remove trailing numbers like "12 " or "6 90 " if they exist
            beforeEuro = beforeEuro.replace(/\s*\d+(\s+\d+)*\s*$/, '').trim();
            
            const priceStr = parts[1].trim().split(' ')[0]; // get the first token after the first €
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

function normalizeName(name) {
    return name.toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, '');
}

async function main() {
  const pdfPrices = parseFiles();
  
  // Check for duplicates in PDF
  const nameToPrices = {};
  for (const item of pdfPrices) {
    const norm = normalizeName(item.name);
    if (!nameToPrices[norm]) {
        nameToPrices[norm] = { name: item.name, prices: new Set(), sources: new Set() };
    }
    nameToPrices[norm].prices.add(item.price);
    nameToPrices[norm].sources.add(item.source);
  }

  const duplicates = [];
  const validPdfPrices = [];
  
  for (const norm in nameToPrices) {
      const data = nameToPrices[norm];
      if (data.prices.size > 1) {
          duplicates.push({
              name: data.name,
              prices: Array.from(data.prices),
              sources: Array.from(data.sources)
          });
      } else {
          validPdfPrices.push({
              name: data.name,
              normName: norm,
              price: Array.from(data.prices)[0]
          });
      }
  }

  // Fetch from DB
  const { data: products, error } = await supabase.from('urunler').select('id, ad, distributor_alis_fiyati').eq('aktif', true);
  
  if (error) {
      console.error("DB Error:", error);
      return;
  }

  const dbProducts = products.map(p => {
      let adTr = '';
      if (typeof p.ad === 'string') {
         adTr = p.ad; // assuming string
      } else if (p.ad && typeof p.ad === 'object') {
         adTr = p.ad.tr || p.ad.en || Object.values(p.ad)[0] || '';
      }
      return {
          id: p.id,
          originalName: adTr,
          normName: normalizeName(adTr),
          currentPrice: p.distributor_alis_fiyati
      };
  });

  const changes = [];
  const firstTimePrices = [];
  const notFoundInPdf = [];
  const notFoundInDb = [];

  // Match
  const dbMatchedIds = new Set();

  for (const pdfItem of validPdfPrices) {
      // Find in DB
      let matched = false;
      // Exact normalized match
      let dbMatch = dbProducts.find(db => db.normName === pdfItem.normName);
      
      // Partial match if exact fails
      if (!dbMatch) {
          dbMatch = dbProducts.find(db => db.normName.includes(pdfItem.normName) || pdfItem.normName.includes(db.normName));
      }

      if (dbMatch) {
          matched = true;
          dbMatchedIds.add(dbMatch.id);
          
          if (dbMatch.currentPrice == null || dbMatch.currentPrice === 0) {
              firstTimePrices.push({
                  pdfName: pdfItem.name,
                  dbName: dbMatch.originalName,
                  newPrice: pdfItem.price,
                  dbId: dbMatch.id
              });
          } else if (dbMatch.currentPrice !== pdfItem.price) {
              changes.push({
                  pdfName: pdfItem.name,
                  dbName: dbMatch.originalName,
                  oldPrice: dbMatch.currentPrice,
                  newPrice: pdfItem.price,
                  dbId: dbMatch.id
              });
          }
      } else {
          notFoundInDb.push(pdfItem);
      }
  }

  for (const db of dbProducts) {
      if (!dbMatchedIds.has(db.id)) {
          notFoundInPdf.push(db);
      }
  }

  const report = {
      summary: {
          totalPdfItems: pdfPrices.length,
          uniquePdfItems: validPdfPrices.length,
          conflictingDuplicates: duplicates.length,
          totalActiveDbProducts: dbProducts.length,
      },
      duplicates,
      changes,
      firstTimePrices,
      notFoundInDb: notFoundInDb.map(x => ({ name: x.name, price: x.price })),
      notFoundInPdf: notFoundInPdf.map(x => ({ name: x.originalName, currentPrice: x.currentPrice }))
  };

  fs.writeFileSync('fiyat_raporu.json', JSON.stringify(report, null, 2));
  console.log("Report generated at fiyat_raporu.json");
}

main();
