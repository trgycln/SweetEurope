import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Load specs and labels
const specs = JSON.parse(fs.readFileSync('parsed_all_specs.json', 'utf8'));
const labels = JSON.parse(fs.readFileSync('src/lib/label-files.json', 'utf8'));

console.log(`Loaded ${specs.length} parsed specs and ${labels.length} PDF labels.`);

// Term translation dictionary for ingredients
const DICT = {
  // Base
  "sugar": { tr: "Şeker", de: "Zucker", ar: "سكر", en: "Sugar" },
  "water": { tr: "Su", de: "Wasser", ar: "ماء", en: "Water" },
  "glucose syrup": { tr: "Glikoz Şurubu", de: "Glukosesirup", ar: "شراب الجلوكوز", en: "Glucose Syrup" },
  "glucose –fructose syrup": { tr: "Glikoz-Fruktoz Şurubu", de: "Glukose-Fruktose-Sirup", ar: "شراب الجلوكوز والفركتوز", en: "Glucose-Fructose Syrup" },
  "glucose-fructose syrup": { tr: "Glikoz-Fruktoz Şurubu", de: "Glukose-Fruktose-Sirup", ar: "شراب الجلوكوز والفركتوز", en: "Glucose-Fructose Syrup" },
  "skimmed milk powder": { tr: "Yağsız Süt Tozu (Süt)", de: "Magermilchpulver (Milch)", ar: "حليب مجفف خالي من الدسم", en: "Skimmed Milk Powder (Milk)" },
  "whey powder": { tr: "Peynir Altı Suyu Tozu (Süt)", de: "Süßmolkenpulver (Milch)", ar: "مسحوق مصل اللبن", en: "Whey Powder (Milk)" },
  "fatty milk powder": { tr: "Yağlı Süt Tozu (Süt)", de: "Vollmilchpulver (Milch)", ar: "حليب مجفف كامل الدسم", en: "Full Cream Milk Powder (Milk)" },
  "modified corn starch": { tr: "Modifiye Mısır Nişastası", de: "Modifizierte Maisstärke", ar: "نشا الذرة المعدل", en: "Modified Corn Starch" },
  "rice starch": { tr: "Pirinç Nişastası", de: "Reisstärke", ar: "نشا الأرز", en: "Rice Starch" },
  "maltodextrin": { tr: "Maltodekstrin", de: "Maltodextrin", ar: "مالتوديكسترين", en: "Maltodextrin" },
  "glycerine": { tr: "Gliserin", de: "Glycerin", ar: "جلسرين", en: "Glycerin" },
  "glycerin": { tr: "Gliserin", de: "Glycerin", ar: "جلسرين", en: "Glycerin" },
  "polydextrose": { tr: "Polidekstroz", de: "Polydextrose", ar: "بوليدكستروز", en: "Polydextrose" },
  "sucralose": { tr: "Sukraloz", de: "Sucralose", ar: "سكرالوز", en: "Sucralose" },
  "acesulfame k": { tr: "Asesülfam K", de: "Acesulfam K", ar: "أسيسولفام ك", en: "Acesulfame K" },
  "salt": { tr: "Tuz", de: "Salz", ar: "ملح", en: "Salt" },
  "butter": { tr: "Tereyağı (Süt)", de: "Butter (Milch)", ar: "زبدة", en: "Butter (Milk)" },
  "sunflower oil": { tr: "Ayçiçek Yağı", de: "Sonnenblumenöl", ar: "زيت عباد الشمس", en: "Sunflower Oil" },
  "pectin": { tr: "Pektin", de: "Pektin", ar: "بكتين", en: "Pectin" },
  "agar&agar": { tr: "Agar Agar", de: "Agar-Agar", ar: "أجار أجار", en: "Agar-Agar" },
  "agar-agar": { tr: "Agar Agar", de: "Agar-Agar", ar: "أجار أجار", en: "Agar-Agar" },
  "xanthan gum": { tr: "Ksantan Gam", de: "Xanthan", ar: "صمغ الزانثان", en: "Xanthan Gum" },
  "cmc": { tr: "Karboksimetil Selüloz (CMC)", de: "Carboxymethylcellulose (CMC)", ar: "كاربوكسي ميثيل سليلوز", en: "Carboxymethylcellulose (CMC)" },
  "carboxymethyl cellulose": { tr: "Karboksimetil Selüloz", de: "Carboxymethylcellulose", ar: "كاربوكسي ميثيل سليلوز", en: "Carboxymethyl Cellulose" },
  "citric acid": { tr: "Sitrik Asit", de: "Zitronensäure", ar: "حمض الستريك", en: "Citric Acid" },
  "tartaric acid": { tr: "Tartarik Asit", de: "Weinsäure", ar: "حمض الطرطريك", en: "Tartaric Acid" },
  "potassium citrate": { tr: "Potasyum Sitrat", de: "Kaliumcitrat", ar: "سترات البوتاسيوم", en: "Potassium Citrate" },
  "trisodium citrate": { tr: "Trisodyum Sitrat", de: "Trinatriumcitrat", ar: "سترات ثلاثي الصوديوم", en: "Trisodium Citrate" },
  "trisodıum citrate": { tr: "Trisodyum Sitrat", de: "Trinatriumcitrat", ar: "سترات ثلاثي الصوديوم", en: "Trisodium Citrate" },
  "tripotassium citrate": { tr: "Tripotasyum Sitrat", de: "Trikaliumcitrat", ar: "سترات ثلاثي البوتاسيوم", en: "Tripotassium Citrate" },
  "potassium sorbate": { tr: "Potasyum Sorbat", de: "Kaliumsorbat", ar: "سوربات البوتاسيوم", en: "Potassium Sorbate" },
  "sodium benzoate": { tr: "Sodyum Benzoat", de: "Natriumbenzoat", ar: "بنزوات الصوديوم", en: "Sodium Benzoate" },
  "soy lecithin": { tr: "Soya Lesitini (Soya)", de: "Sojalecithin (Soja)", ar: "ليسيثين الصويا", en: "Soy Lecithin (Soy)" },
  "allura red": { tr: "Allura Red", de: "Allurarot", ar: "أحمر ألورا", en: "Allura Red" },
  "brillant blue": { tr: "Brillant Blue", de: "Brillantblau", ar: "أزرق لامع", en: "Brilliant Blue" },
  "brilliant blue": { tr: "Brillant Blue", de: "Brillantblau", ar: "أزرق لامع", en: "Brilliant Blue" },
  "plain caramel": { tr: "Sade Karamel", de: "Einfaches Zuckerkulör", ar: "كراميل عادي", en: "Plain Caramel" },
  "anatto": { tr: "Annatto", de: "Annatto", ar: "أناتو", en: "Annatto" },
  "hibiscus extract": { tr: "Hibiskus Ekstraktı", de: "Hibiskusextrakt", ar: "مستخلص الكركديه", en: "Hibiscus Extract" },
  "matcha green tea powder": { tr: "Matcha Yeşil Çay Tozu", de: "Matcha-Grünteepulver", ar: "مسحوق شاي ماتشا الأخضر", en: "Matcha Green Tea Powder" },
  "black tea extract": { tr: "Siyah Çay Ekstraktı", de: "Schwarztee-Extrakt", ar: "مستخلص الشاي الأسود", en: "Black Tea Extract" },
  "cacao mass": { tr: "Kakao Kitlesi", de: "Kakaomasse", ar: "كتلة الكاكاو", en: "Cocoa Mass" },
  "cocoa powder": { tr: "Kakao Tozu", de: "Kakaopulver", ar: "مسحوق الكاكاو", en: "Cocoa Powder" },
  "cacao powder": { tr: "Kakao Tozu", de: "Kakaopulver", ar: "مسحوق الكاكاو", en: "Cocoa Powder" },
  "bitter chocolate": { tr: "Bitter Çikolata (Soya)", de: "Dunkle Schokolade (Soja)", ar: "شوكولاتة داكنة", en: "Dark Chocolate (Soy)" },
  "bitter chocolat": { tr: "Bitter Çikolata (Soya)", de: "Dunkle Schokolade (Soja)", ar: "شوكولاتة داكنة", en: "Dark Chocolate (Soy)" },
  "strawberry": { tr: "Çilek", de: "Erdbeere", ar: "فراولة", en: "Strawberry" },
  "raspberry": { tr: "Frambuaz", de: "Himbeere", ar: "توت العليق", en: "Raspberry" },
  "blackberry": { tr: "Böğürtlen", de: "Brombeere", ar: "بلاك بيري", en: "Blackberry" },
  "black berry": { tr: "Böğürtlen", de: "Brombeere", ar: "بلاك بيري", en: "Blackberry" },
  "black mullberry": { tr: "Karadut", de: "Schwarze Maulbeere", ar: "توت أسود", en: "Black Mulberry" },
  "black mulberry": { tr: "Karadut", de: "Schwarze Maulbeere", ar: "توت أسود", en: "Black Mulberry" },
  "blueberry": { tr: "Yaban Mersini", de: "Blaubeere", ar: "عنب بري", en: "Blueberry" },
  "mango": { tr: "Mango", de: "Mango", ar: "مانجو", en: "Mango" },
  "peach": { tr: "Şeftali", de: "Pfirsich", ar: "خوخ", en: "Peach" },
  "banana": { tr: "Muz", de: "Banane", ar: "موز", en: "Banana" },
  "kiwi": { tr: "Kivi", de: "Kiwi", ar: "كيوي", en: "Kiwi" },
  "melon": { tr: "Kavun", de: "Melone", ar: "شمام", en: "Melon" },
  "watermelon": { tr: "Karpuz", de: "Wassermelone", ar: "بطيخ", en: "Watermelon" },
  "pineapple": { tr: "Ananas", de: "Ananas", ar: "أناناس", en: "Pineapple" },
  "pine apple": { tr: "Ananas", de: "Ananas", ar: "أناناس", en: "Pineapple" },
  "lemon": { tr: "Limon", de: "Zitrone", ar: "ليمون", en: "Lemon" },
  "lime": { tr: "Misket Limon", de: "Limette", ar: "ليمون حامض", en: "Lime" },
  "passion fruit": { tr: "Çarkıfelek", de: "Passionsfrucht", ar: "فاكهة العاطفة", en: "Passion Fruit" },
  "passion": { tr: "Çarkıfelek", de: "Passionsfrucht", ar: "فاكهة العاطفة", en: "Passion Fruit" },
  "coconut": { tr: "Hindistan Cevizi", de: "Kokosnuss", ar: "جوز الهند", en: "Coconut" },
  "sorrel": { tr: "Kuzukulağı", de: "Sauerampfer", ar: "حميد", en: "Sorrel" },
  "pistachio": { tr: "Antep Fıstığı (Fıstık)", de: "Pistazien (Schalenfrüchte)", ar: "فستق", en: "Pistachio (Nuts)" },
  "hazelnut": { tr: "Fındık (Fındık)", de: "Haselnuss (Schalenfrüchte)", ar: "بندق", en: "Hazelnut (Nuts)" }
};

function translateIngItem(itemStr) {
  let cleanItem = itemStr.trim();
  
  // Extract E-codes first e.g. "E 330", "E 129, E133", "[E 202]"
  let eCodes = "";
  const eMatch = cleanItem.match(/\b(E\s*\d{3,4}[a-z]?(\s*,\s*E\s*\d{3,4}[a-z]?)*)\b/i);
  if (eMatch) {
    eCodes = eMatch[1].replace(/\s+/g, ' ');
  }

  // Extract percentage if present e.g. "62%", "%37,12", "%0,5"
  let percentage = "";
  const percMatch = cleanItem.match(/%\s*(\d+[,\.]?\d*)|(\d+[,\.]?\d*)\s*%/);
  if (percMatch) {
    percentage = (percMatch[1] || percMatch[2]).replace('.', ',');
  }

  // Strip percentages, E-codes, brackets for dictionary lookup
  let baseName = cleanItem
    .replace(/E\s*\d+[a-z]?/gi, '')
    .replace(/%\s*\d+[,\.]?\d*|\d+[,\.]?\d*\s*%/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/[\d,\.\s–-]+$/g, '')
    .trim()
    .toLowerCase();

  // Check if Flavoring / Aroma
  if (cleanItem.toLowerCase().includes('flavoring') || cleanItem.toLowerCase().includes('flavouring') || cleanItem.toLowerCase().includes('aroma')) {
    const flavMatch = cleanItem.match(/flavoring\s*\((.*?)\)|flavouring\s*\((.*?)\)|flavoring\s*:\s*(.*?)$/i);
    const flavInside = flavMatch ? (flavMatch[1] || flavMatch[2] || flavMatch[3] || '').trim() : '';
    
    let flavTr = flavInside;
    let flavDe = flavInside;
    let flavAr = flavInside;
    let flavEn = flavInside;

    for (const [k, v] of Object.entries(DICT)) {
      if (flavInside.toLowerCase().includes(k)) {
        flavTr = v.tr;
        flavDe = v.de;
        flavAr = v.ar;
        flavEn = v.en;
        break;
      }
    }

    const percText = percentage ? ` (${percentage}%)` : '';
    return {
      tr: `Aroma Verici (${flavTr || 'Doğala Özdeş'})${percText}`,
      de: `Aroma (${flavDe || 'natürlich'})${percText}`,
      en: `Flavoring (${flavEn || 'nature-identical'})${percText}`,
      ar: `نكهة (${flavAr})${percText}`
    };
  }

  // Check dictionary
  let dictEntry = null;
  for (const [k, v] of Object.entries(DICT)) {
    if (baseName === k || baseName.startsWith(k) || k === baseName.replace(/s$/, '')) {
      dictEntry = v;
      break;
    }
  }

  if (dictEntry) {
    const eCodeText = eCodes ? ` [${eCodes}]` : '';

    return {
      tr: `${dictEntry.tr}${eCodeText}`,
      de: `${dictEntry.de}${eCodeText}`,
      en: `${dictEntry.en}${eCodeText}`,
      ar: `${dictEntry.ar}${eCodeText}`
    };
  }

  // Fallback direct item (ensure percentages are stripped)
  const strippedItem = cleanItem.replace(/%\s*\d+[,\.]?\d*|\d+[,\.]?\d*\s*%/g, '').replace(/\(\s*\)/g, '').trim();
  return {
    tr: strippedItem,
    de: strippedItem,
    en: strippedItem,
    ar: strippedItem
  };
}

function buildStructuredIngredients(rawIngText) {
  if (!rawIngText) return null;
  
  // Split by comma
  const rawParts = rawIngText.split(/,(?![^\(\[]*[\)\]])/).map(p => p.trim()).filter(Boolean);
  
  const trList = [];
  const deList = [];
  const enList = [];
  const arList = [];

  for (const part of rawParts) {
    if (!part || part.length < 2) continue;
    if (['INGREDIENTS', 'CLASS', 'EC CODE', 'MAX. DOSAGE', 'PERCENTAGE', 'TOTAL'].includes(part.toUpperCase())) continue;
    
    const translated = translateIngItem(part);
    trList.push(translated.tr);
    deList.push(translated.de);
    enList.push(translated.en);
    arList.push(translated.ar);
  }

  if (deList.length === 0) return null;

  return {
    de: deList.join(', ') + '.',
    tr: trList.join(', ') + '.',
    en: enList.join(', ') + '.',
    ar: arList.join('، ') + '.'
  };
}

// FLAVOR MATCHING
const FLAVOR_SYNONYMS = {
  "strawberry": ["çilek", "erdbeer", "strawberry", "cilek"],
  "caramel": ["karamel", "caramel", "toffee"],
  "vanilla": ["vanilya", "vanille", "vanilla"],
  "hazelnut": ["fındık", "haselnuss", "hazelnut", "findik"],
  "chocolate": ["çikolata", "schokolade", "chocolate", "cikolata"],
  "dark chocolate": ["bitter çikolata", "dunkle schokolade", "dark chocolate", "bitter cikolata", "bitter"],
  "white chocolate": ["beyaz çikolata", "weiße schokolade", "white chocolate", "weisse schokolade", "blanc"],
  "banana": ["muz", "banane", "banana"],
  "kiwi": ["kivi", "kiwi"],
  "coconut": ["hindistan cevizi", "kokos", "coconut"],
  "mango": ["mango"],
  "peach": ["şeftali", "pfirsich", "peach", "seftali"],
  "raspberry": ["frambuaz", "ahududu", "himbeer", "raspberry"],
  "blackberry": ["böğürtlen", "brombeer", "blackberry", "bogurtlen"],
  "black mulberry": ["karadut", "schwarze maulbeere", "black mulberry", "black mullberry"],
  "wild berries": ["orman meyve", "waldbeere", "wild berries", "forest fruit"],
  "blueberry": ["yaban mersini", "blaubeere", "heidelbeere", "blueberry"],
  "green apple": ["yeşil elma", "grüner apfel", "green apple", "yesil elma"],
  "watermelon": ["karpuz", "wassermelone", "watermelon"],
  "melon": ["kavun", "melone", "melon"],
  "lemon": ["limon", "zitrone", "lemon", "lime"],
  "passion fruit": ["çarkıfelek", "passionsfrucht", "passion fruit", "maracuja"],
  "pineapple": ["ananas", "pineapple", "pine apple"],
  "mint": ["nane", "minze", "peppermint", "spearmint", "mint", "bahçenane"],
  "pomegranate": ["nar", "granatapfel", "pomegranate", "grenadine"],
  "hibiscus": ["hibiskus", "hibiscus"],
  "chai tea": ["chai tea", "chai"],
  "matcha": ["matcha", "yeşil çay", "grüntee"],
  "taro": ["taro"],
  "pistachio": ["antep fıstık", "pistazie", "pistachio"],
  "popping candy": ["patlayan şeker", "knisterzucker", "popping candy"],
  "sorrel": ["madame sorrel", "kuzukulak", "sauerampfer", "sorrel"],
  "apollo": ["apollo"],
  "zeus": ["zeus"],
  "helios": ["helios"],
  "dionysos": ["dionysos"],
  "herakles": ["herakles"],
  "mojito": ["mojito"],
  "blue curacao": ["blue curacao", "mavi turunç"],
  "blue raspberry": ["blue raspberry", "mavi frambuaz"],
  "cool lime": ["cool lime", "misket limon"],
  "sakura": ["sakura", "beyaz şeftali", "kirschblüte"],
  "cocktail foamer": ["köpürtücü", "foamer", "kopurtucu", "koi"],
  "quattro base": ["quattro", "base", "baz", "ouattro"]
};

function getProductCategoryType(str) {
  const s = str.toLowerCase();
  if (s.includes('decor') || s.includes('topping') || s.includes('dekor')) return 'topping';
  if (s.includes('barsos') || s.includes('bar sos') || s.includes('bar-sos')) return 'barsos';
  if (s.includes('fruited sauce') || s.includes('pure sos') || s.includes('püreesauce') || s.includes('frozen')) return 'frozen';
  if (s.includes('sauce') || s.includes('sos')) return 'sauce';
  if (s.includes('powder') || s.includes('toz') || s.includes('milkshake') || s.includes('latte') || s.includes('frappe')) return 'toz';
  if (s.includes('beverage') || s.includes('içecek') || s.includes('icecek') || s.includes('getränk')) return 'icecek';
  return 'surup';
}

function findMatchingProductForSpec(spec, dbProducts) {
  const specFile = spec.file.toLowerCase();
  const specName = spec.product_name.toLowerCase();
  const specType = getProductCategoryType(specFile + ' ' + specName);

  const isSugarFree = specFile.includes('sugar free') || specName.includes('sugar free') || specFile.includes('şekersiz') || specFile.includes('sekersiz') || specFile.includes('zuckerfrei');
  const isPremium = specFile.includes('premium') || specName.includes('premium');

  const detectedFlavors = [];
  for (const [fKey, synonyms] of Object.entries(FLAVOR_SYNONYMS)) {
    for (const syn of synonyms) {
      if (specFile.includes(syn) || specName.includes(syn)) {
        detectedFlavors.push(fKey);
        break;
      }
    }
  }

  const candidates = [];
  for (const p of dbProducts) {
    const de = (p.ad?.de || '').toLowerCase();
    const tr = (p.ad?.tr || '').toLowerCase();
    const en = (p.ad?.en || '').toLowerCase();
    const slug = (p.slug || '').toLowerCase();
    const pAll = `${de} ${tr} ${en} ${slug}`;

    const pType = getProductCategoryType(pAll);
    if (specType !== pType) {
      // Allow slight cross between sauce/barsos/frozen
      if (!(['sauce', 'barsos', 'frozen'].includes(specType) && ['sauce', 'barsos', 'frozen'].includes(pType))) {
        continue;
      }
    }

    const pSugarFree = pAll.includes('şekersiz') || pAll.includes('sekersiz') || pAll.includes('zuckerfrei') || pAll.includes('sugar free');
    if (isSugarFree !== pSugarFree) continue;

    const pPremium = pAll.includes('premium');

    let score = 0;
    for (const f of detectedFlavors) {
      for (const syn of FLAVOR_SYNONYMS[f]) {
        if (pAll.includes(syn)) {
          score += 10;
          break;
        }
      }
    }

    if (score > 0) {
      if (isPremium === pPremium) score += 5;
      if (p.aktif) score += 3;
      candidates.append ? null : candidates.push({ score, product: p });
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].product;
  }
  return null;
}

function findMatchingPdfLabel(product, labels) {
  const de = (product.ad?.de || '').toLowerCase();
  const tr = (product.ad?.tr || '').toLowerCase();
  const en = (product.ad?.en || '').toLowerCase();
  const slug = (product.slug || '').toLowerCase();
  const pAll = `${de} ${tr} ${en} ${slug}`;
  const pType = getProductCategoryType(pAll);

  let bestLabel = null;
  let bestScore = 0;

  for (const l of labels) {
    const lName = l.originalName.toLowerCase();
    const lRaw = (l.rawPath || '').toLowerCase();
    const lAll = `${lName} ${lRaw}`;
    const lType = getProductCategoryType(lAll);

    let score = 0;
    if (pType === lType) score += 5;

    for (const [fKey, synonyms] of Object.entries(FLAVOR_SYNONYMS)) {
      for (const syn of synonyms) {
        if (pAll.includes(syn) && (lName.includes(syn) || lRaw.includes(syn))) {
          score += 10;
          break;
        }
      }
    }

    if (pAll.includes('premium') && lAll.includes('premium')) score += 5;
    if ((pAll.includes('şekersiz') || pAll.includes('zuckerfrei')) && (lAll.includes('sekersiz') || lAll.includes('sugar free'))) score += 8;

    if (score > bestScore && score >= 15) {
      bestScore = score;
      bestLabel = l.publicUrl;
    }
  }

  return bestLabel;
}

async function runSync() {
  console.log("Fetching all products from DB...");
  const { data: dbProducts, error } = await supabase
    .from('urunler')
    .select('id, ad, slug, stok_kodu, ean_gtin, aktif, inhaltsstoffe, naehrwerte, allergene, produktdatenblatt_url');

  if (error) {
    console.error("DB Fetch error:", error);
    return;
  }

  console.log(`Starting synchronization for ${specs.length} specs...`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const matchedProduct = findMatchingProductForSpec(spec, dbProducts);

    if (!matchedProduct) {
      console.log(`⚠️ [${i + 1}/${specs.length}] No matching product in DB for: ${spec.file} (${spec.product_name})`);
      skippedCount++;
      continue;
    }

    const pName = matchedProduct.ad?.de || matchedProduct.ad?.tr || matchedProduct.slug;
    
    // Prepare standardized payload
    const updatePayload = {};

    // 1. Ingredients (inhaltsstoffe)
    const formattedIng = buildStructuredIngredients(spec.ingredients_text_en);
    if (formattedIng) {
      updatePayload.inhaltsstoffe = formattedIng;
    }

    // 2. Nutrition facts (naehrwerte & besin_degerleri)
    if (spec.nutrition && Object.keys(spec.nutrition).length > 0) {
      updatePayload.naehrwerte = spec.nutrition;
      updatePayload.besin_degerleri = spec.nutrition;
    }

    // 3. Allergens (allergene)
    if (spec.allergens && Object.keys(spec.allergens).length > 0) {
      updatePayload.allergene = spec.allergens;
    }

    // 4. Product data sheet PDF URL (produktdatenblatt_url)
    const matchedPdf = findMatchingPdfLabel(matchedProduct, labels);
    if (matchedPdf) {
      updatePayload.produktdatenblatt_url = matchedPdf;
    }

    // 5. Storage & shelf life
    if (spec.storage_min !== null && spec.storage_min !== undefined) {
      updatePayload.lagertemperatur_min_celsius = spec.storage_min;
    }
    if (spec.storage_max !== null && spec.storage_max !== undefined) {
      updatePayload.lagertemperatur_max_celsius = spec.storage_max;
    }
    if (spec.shelf_life_months !== null && spec.shelf_life_months !== undefined) {
      updatePayload.haltbarkeit_monate = spec.shelf_life_months;
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabase
        .from('urunler')
        .update(updatePayload)
        .eq('id', matchedProduct.id);

      if (updateError) {
        console.error(`❌ Failed to update ${pName}:`, updateError.message);
      } else {
        updatedCount++;
        console.log(`✅ [${updatedCount}] Updated: "${pName}" (${matchedProduct.slug})`);
        console.log(`   └─ Nut: ${updatePayload.naehrwerte ? '✅' : '—'} | Ing: ${updatePayload.inhaltsstoffe ? '✅' : '—'} | All: ${updatePayload.allergene ? '✅' : '—'} | PDF: ${updatePayload.produktdatenblatt_url ? '✅' : '—'}`);
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`🎉 Sync Finished! Updated: ${updatedCount} products, Skipped: ${skippedCount}`);
  console.log(`========================================\n`);
}

runSync();
