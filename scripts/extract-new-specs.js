const WordExtractor = require('word-extractor');
const fs = require('fs');
const path = require('path');

const extractor = new WordExtractor();

function cleanText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

async function extractFromDoc(filepath) {
  try {
    const doc = await extractor.extract(filepath);
    const textContent = doc.getBody();

    const data = {
      orjinal_ad: "",
      ad: { en: "", de: "", tr: "", ar: "" },
      aciklama: { en: "", de: "", tr: "", ar: "" },
      inhaltsstoffe: { en: "", de: "", tr: "", ar: "" },
      naehrwerte: {},
      allergene: {},
      lagertemperatur_min_celsius: null,
      lagertemperatur_max_celsius: null,
      haltbarkeit_monate: null,
      dosya_adi: path.basename(filepath)
    };

    // Product Name
    const nameMatch = textContent.match(/Product name\s*:\s*([^\n]+)/i) || textContent.match(/Product Name\s*:\s*([^\n]+)/i);
    if (nameMatch) {
      data.orjinal_ad = cleanText(nameMatch[1]);
      data.ad.en = data.orjinal_ad;
    }

    // Usage
    const usageMatch = textContent.match(/Type of Usage\s*:\s*([^\n]+)/i);
    if (usageMatch) {
      data.aciklama.en = cleanText(usageMatch[1]);
    }

    // Storage
    const storageMatch = textContent.match(/Storing Conditions\s*:\s*([^\n]+)/i);
    if (storageMatch) {
      const storageText = storageMatch[1];
      const tempMatch = storageText.match(/(\d+)\s*-\s*(\d+)\s*?\s*C/);
      if (tempMatch) {
        data.lagertemperatur_min_celsius = parseInt(tempMatch[1], 10);
        data.lagertemperatur_max_celsius = parseInt(tempMatch[2], 10);
      }
    }

    // Shelf life
    const shelfMatch = textContent.match(/shelf life.*?(\d+)\s*years?/i);
    if (shelfMatch) {
      data.haltbarkeit_monate = parseInt(shelfMatch[1], 10) * 12;
    }

    // Allergens
    const allergenMatch = textContent.match(/ALLERGEN ALERT:([\s\S]*?)(?=9\.|GMO DECLARATION)/i);
    if (allergenMatch) {
      const allergensText = allergenMatch[1].toLowerCase();
      if (allergensText.includes("milk") || allergensText.includes("dairy")) data.allergene.milch = true;
      if (allergensText.includes("soy")) data.allergene.soja = true;
      if (allergensText.includes("nut") || allergensText.includes("hazelnut")) data.allergene.nuesse = true;
      if (allergensText.includes("gluten") || allergensText.includes("wheat")) data.allergene.gluten = true;
    }

    // Ingredients (very basic heuristic from text)
    const ingMatch = textContent.match(/PRODUCT INGREDIENTS\s*:([\s\S]*?)(?=3\.NUTRITIONAL|3\. NUTRITIONAL)/i);
    if (ingMatch) {
      const lines = ingMatch[1].split('\n').map(l => l.trim()).filter(Boolean);
      const ingredients = [];
      for (const line of lines) {
        if (line.match(/INGREDIENTS|CLASS/i) || line.match(/^[\d,%]+$/) || line.toLowerCase() === 'total' || line.toLowerCase() === 'toplam') continue;
        if (line.match(/^[0-9]+(\.[0-9]+)?%$/)) continue; // just percentage
        // skip common e-codes and small things
        if (line.length > 2 && !line.match(/^QS|E \d+|0,\d+ gr/i) && !line.match(/^\d+$/)) {
            // remove percentage and weird stuff
            const cleaned = line.replace(/(\t|%).*/, '').trim();
            if (cleaned) ingredients.push(cleaned);
        }
      }
      if (ingredients.length) {
        data.inhaltsstoffe.en = ingredients.join(', ');
      }
    }

    // Nutritional
    const nutriMap = [
      { pattern: /Energy.*?(\d+)\s*kj\s*\/\s*(\d+)\s*kcal/i, keys: ["energie_kj", "energie_kcal"] },
      { pattern: /Fat.*?(\d+[.,]?\d*)\s*g/i, keys: ["fett"] },
      { pattern: /saturates.*?(\d+[.,]?\d*)\s*g/i, keys: ["davon_gesaettigt"] },
      { pattern: /Carbohydrate.*?(\d+[.,]?\d*)\s*g/i, keys: ["kohlenhydrate"] },
      { pattern: /Sugar.*?(\d+[.,]?\d*)\s*g/i, keys: ["davon_zucker"] },
      { pattern: /fibre.*?(\d+[.,]?\d*)\s*g/i, keys: ["ballaststoffe"] },
      { pattern: /Protein.*?(\d+[.,]?\d*)\s*g/i, keys: ["eiweiss"] },
      { pattern: /Sodium\/salt.*?(\d+[.,]?\d*)\s*g\s*\/\s*(\d+[.,]?\d*)\s*g/i, keys: ["sodium", "salz"] }
    ];

    const nutritional = {
      energie_kj: 0, energie_kcal: 0, fett: 0, davon_gesaettigt: 0,
      kohlenhydrate: 0, davon_zucker: 0, ballaststoffe: 0, eiweiss: 0, salz: 0
    };

    for (const { pattern, keys } of nutriMap) {
      const match = textContent.match(pattern);
      if (match) {
        for (let i = 0; i < keys.length; i++) {
          const valStr = match[i + 1].replace(',', '.');
          const num = parseFloat(valStr);
          if (!isNaN(num) && keys[i] !== "sodium") {
            nutritional[keys[i]] = num;
          }
        }
      }
    }

    data.naehrwerte = { pro_100g: nutritional };

    return data;
  } catch (err) {
    console.error(`Error processing ${filepath}:`, err);
    return null;
  }
}

async function main() {
  const baseDir = path.resolve('dokuments', 'FO Ürün Spektleri', '88_Kalem_Ilk_Parti_Siparis_Spektleri');
  const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.doc') || f.endsWith('.docx')).filter(f => !f.startsWith('~$'));
  
  console.log(`Found ${files.length} files.`);
  
  const results = [];
  for (let i = 0; i < files.length; i++) {
    console.log(`Processing ${i + 1}/${files.length}: ${files[i]}`);
    const filepath = path.join(baseDir, files[i]);
    const data = await extractFromDoc(filepath);
    if (data && data.orjinal_ad) {
      results.push(data);
    }
  }

  fs.writeFileSync('new_specs_en.json', JSON.stringify(results, null, 2));
  console.log('Saved to new_specs_en.json');
}

main().catch(console.error);
