import fs from 'fs';
import * as cheerio from 'cheerio';

const key = 'process.env.GEMINI_API_KEY || ''';
const models = [
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest'
];
let currentModelIndex = 0;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchFostoreText(url) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    $('nav, header, footer, script, style, noscript').remove();
    return $('body').text().replace(/\s+/g, ' ').trim().substring(0, 3000);
  } catch (err) {
    console.error(`Failed to fetch Fostore URL ${url}:`, err.message);
    return "";
  }
}

async function verifyProduct(item) {
  let fostoreText = "";
  if (item.fostore_url) {
    fostoreText = await fetchFostoreText(item.fostore_url);
  }

  // Load spec file
  let specText = "";
  if (item.spec && item.spec.file) {
    const allSpecs = JSON.parse(fs.readFileSync('_archive/parsed_all_specs.json', 'utf8'));
    const specData = allSpecs.find(s => s.file === item.spec.file);
    if (specData) {
      specText = JSON.stringify({
        ingredients: specData.ingredients_text_en || specData.ingredients_text_tr,
        nutrition: specData.nutrition,
        allergens: specData.allergens,
        shelf_life: specData.shelf_life_months,
        storage_min: specData.storage_min,
        storage_max: specData.storage_max,
        usage: specData.usage,
        packing: specData.packing
      });
    }
  }

  const prompt = `Sen uzman bir gıda kimyageri ve çok dilli ürün yöneticisisin.
Ürün: ${item.proforma_name}
Barkod: ${item.barcode}
Koli İçi Adet: ${item.koli_ici_adet}
Fiyat: ${item.unit_price_eur} EUR

Teknik Spekt Verisi (En Doğru Kaynak):
${specText || 'Bulunamadı'}

Pazarlama ve Kullanım Verisi (Fostore.com):
${fostoreText ? fostoreText.substring(0, 1000) : 'Bulunamadı'}

Aşağıdaki JSON formatında çıktıyı üret. Diller: de, en, tr, ar. 
Spekt verisini ve pazarlama bilgisini birleştir.
Tüm besin değerlerini (naehrwerte) "pro_100ml" (veya pro_100g) altında topla.

{
  "stok_kodu": "SP-FP-...",
  "barkod": "${item.barcode}",
  "urun_adi": { "de": "...", "en": "...", "tr": "...", "ar": "..." },
  "aciklamalar": { "de": "...", "en": "...", "tr": "...", "ar": "..." },
  "kullanim_alanlari": { "de": "...", "en": "...", "tr": "...", "ar": "..." },
  "icindekiler": { "de": "...", "en": "...", "tr": "...", "ar": "..." },
  "saklama_kosullari": { "de": "...", "en": "...", "tr": "...", "ar": "..." },
  "alerjen_bilgisi": { "de": "...", "en": "...", "tr": "...", "ar": "..." },
  "raf_omru": "...",
  "naehrwerte": {
    "pro_100ml": { "energie_kj": 0, "energie_kcal": 0, "fett": 0, "kohlenhydrate": 0, "davon_zucker": 0, "eiweiss": 0, "salz": 0 }
  },
  "ambalaj": { "koli_ici_adet": ${item.koli_ici_adet} }
}
Sadece geçerli JSON üret. Başka hiçbir şey yazma.`;

  let attempts = 0;
  while (attempts < models.length * 2) {
    const model = models[currentModelIndex];
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json'
          }
        })
      });
      const data = await res.json();
      
      if (data.error) {
        if (data.error.code === 429 || data.error.message.includes('Quota exceeded')) {
          console.log(`[${model}] Quota reached. Switching to next model...`);
          currentModelIndex = (currentModelIndex + 1) % models.length;
          attempts++;
          await sleep(2000);
          continue;
        }
        throw new Error(data.error.message);
      }
      
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        text = text.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
        return JSON.parse(text);
      }
      throw new Error("No text generated");
    } catch (e) {
      console.log(`Error with ${model} on ${item.barcode}: ${e.message}`);
      currentModelIndex = (currentModelIndex + 1) % models.length;
      attempts++;
      await sleep(3000);
    }
  }
  return null;
}

async function run() {
  const mapped = JSON.parse(fs.readFileSync('data/canonical_triangulation_90.json', 'utf8'));
  const outDir = 'data/canonical_products';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log(`Starting batch verification for ${mapped.length} products...`);
  
  for (let i = 0; i < mapped.length; i++) {
    const item = mapped[i];
    const outFile = `${outDir}/${item.barcode}.json`;
    if (fs.existsSync(outFile)) {
      console.log(`[${i+1}/${mapped.length}] Skipping ${item.barcode} (already verified)`);
      continue;
    }

    console.log(`[${i+1}/${mapped.length}] Verifying ${item.barcode} - ${item.proforma_name} using ${models[currentModelIndex]}...`);
    const verified = await verifyProduct(item);
    
    if (verified) {
      verified.fiyat_eur = item.unit_price_eur;
      verified.gtip = item.gtip;
      verified.palet_ici_koli = item.palet_ici_koli;
      
      fs.writeFileSync(outFile, JSON.stringify(verified, null, 2), 'utf8');
      console.log(`   ✅ Saved ${item.barcode}.json`);
    } else {
      console.log(`   ❌ Failed to verify ${item.barcode}`);
    }
    
    // Smooth 3.5 second interval
    await sleep(3500);
  }
  console.log('🎉 Batch verification complete for all products!');
}

run();
