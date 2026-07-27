import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Basic phrase translations
const translations = {
  storage: {
    "güneş ışığından uzakta, serin ve kuru yerde saklayınız": {
      tr: "Güneş ışığından uzakta, serin ve kuru yerde saklayınız.",
      en: "Keep away from direct sunlight, store in a cool and dry place.",
      de: "Vor Sonneneinstrahlung schützen, kühl und trocken lagern.",
      ar: "يحفظ بعيدا عن أشعة الشمس المباشرة، في مكان بارد وجاف."
    },
    "serin ve kuru yerde saklayınız": {
      tr: "Serin ve kuru yerde saklayınız.",
      en: "Store in a cool and dry place.",
      de: "Kühl und trocken lagern.",
      ar: "يحفظ في مكان بارد وجاف."
    },
    "serin, kuru ve kokusuz ortamda muhafaza ediniz": {
      tr: "Serin, kuru ve kokusuz ortamda muhafaza ediniz.",
      en: "Store in a cool, dry and odorless environment.",
      de: "An einem kühlen, trockenen und geruchlosen Ort aufbewahren.",
      ar: "يحفظ في بيئة باردة وجافة وخالية من الروائح."
    }
  },
  usage_keywords: {
    "sıcak ve soğuk kahvelerde": {
      en: "in hot and cold coffees",
      de: "in heißen und kalten Kaffeespezialitäten",
      ar: "في القهوة الساخنة والباردة"
    },
    "milkshake, kokteyl ve mokteyllerde": {
      en: "milkshakes, cocktails and mocktails",
      de: "Milchshakes, Cocktails und Mocktails",
      ar: "ميلك شيك، كوكتيل وموكتيل"
    },
    "aroma ve tatlandırıcı olarak": {
      en: "as a flavoring and sweetening agent",
      de: "als Aroma- und Süßungsmittel",
      ar: "كنكهة ومحلي"
    },
    "1–2 cl şurup kullanılması tavsiye edilir": {
      en: "it is recommended to use 1-2 cl of syrup",
      de: "Es wird empfohlen, 1-2 cl Sirup zu verwenden",
      ar: "يوصى باستخدام 1-2 سنتيلتر من الشراب"
    },
    "su/süt ile 1/8 oranında karıştırılarak": {
      en: "by mixing with water/milk at a 1/8 ratio",
      de: "durch Mischen mit Wasser/Milch im Verhältnis 1:8",
      ar: "عن طريق الخلط مع الماء / الحليب بنسبة 1/8"
    },
    "tatlı çeşitlerine ve pastacılık ürünlerine": {
      en: "to dessert varieties and pastry products",
      de: "zu Dessertsorten und Gebäckprodukten",
      ar: "إلى أنواع الحلويات ومنتجات المعجنات"
    },
    "lezzet katmak amacıyla": {
      en: "to add flavor",
      de: "um Geschmack zu verleihen",
      ar: "لإضافة نكهة"
    },
    "istenilen miktarda ilave edilebilir": {
      en: "can be added in desired amount",
      de: "kann in gewünschter Menge hinzugefügt werden",
      ar: "يمكن إضافته بالكمية المطلوبة"
    },
    "1 ölçü granita 5 ölçü su": {
      en: "1 measure granita to 5 measures water",
      de: "1 Teil Granita auf 5 Teile Wasser",
      ar: "مقياس واحد جرانيتا إلى 5 مقاييس ماء"
    },
    "1 ölçü meyveli içecek 5 ölçü su": {
        en: "1 measure fruit drink to 5 measures water",
        de: "1 Teil Fruchtgetränk auf 5 Teile Wasser",
        ar: "مقياس واحد مشروب فواكه إلى 5 مقاييس ماء"
    }
  }
};

function translateStorage(trText) {
  if (!trText) return null;
  const lower = trText.toLowerCase().replace(/[\.\,]/g, '').trim();
  
  for (const [key, trans] of Object.entries(translations.storage)) {
    if (lower.includes(key.toLowerCase().replace(/[\.\,]/g, '').trim())) {
      return trans;
    }
  }
  
  return { tr: trText, en: trText, de: trText, ar: trText };
}

function translateUsage(trText) {
  if (!trText) return null;
  let en = trText;
  let de = trText;
  let ar = trText;

  for (const [key, trans] of Object.entries(translations.usage_keywords)) {
    const regex = new RegExp(key, 'gi');
    en = en.replace(regex, trans.en);
    de = de.replace(regex, trans.de);
    ar = ar.replace(regex, trans.ar);
  }

  // Basic fallback to replace typical structure if mostly replaced
  return { tr: trText, en, de, ar };
}

function formatNutrition(nutritionData) {
    if (!nutritionData || Object.keys(nutritionData).length === 0) return null;
    
    // Convert to a neat structure
    // Example keys extracted: enerji, yag, doymus_yag, karbonhidrat, seker, protein, tuz
    return {
        tr: nutritionData,
        en: nutritionData,
        de: nutritionData,
        ar: nutritionData
    }
}

async function main() {
  const labelsPath = path.resolve('parsed_labels.json');
  if (!fs.existsSync(labelsPath)) {
    console.log('No parsed_labels.json found.');
    return;
  }

  const labels = JSON.parse(fs.readFileSync(labelsPath, 'utf-8'));
  console.log(`Loaded ${labels.length} parsed labels.`);

  const { data: dbProducts, error: dbError } = await supabase
    .from('urunler')
    .select('id, ad, inhaltsstoffe, aciklamalar');

  if (dbError) {
    console.error('Error fetching DB products:', dbError);
    return;
  }

  let updatedCount = 0;

  for (const label of labels) {
    // Basic fuzzy matching: Use filename to match product names
    let filenameParts = label.filename
        .toLowerCase()
        .replace('.pdf', '')
        .replace(/_folder|-c|yy|sekerli|-n/g, '')
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .split(' ')
        .filter(p => p.length > 2 && p !== 'aromal' && p !== 'surup' && p !== 'meyveli' && p !== 'sos' && p !== 'fo' && p !== 'premium');

    if (filenameParts.length === 0) continue;

    const match = dbProducts.find(p => {
      let trName = (p.ad && typeof p.ad === 'object' && p.ad.tr) ? p.ad.tr.toLowerCase() : '';
      if (!trName) return false;
      
      // Match if at least 1-2 strong keywords match
      const matchedParts = filenameParts.filter(part => trName.includes(part));
      return matchedParts.length >= Math.min(2, filenameParts.length);
    });

    if (match) {
        // Construct the update payload
        const updatePayload = {};
        
        // 1. Ingredients
        if (label.ingredients && Object.keys(label.ingredients).length > 0) {
            let currentInhaltsstoffe = match.inhaltsstoffe || {};
            // Keep previous structure if exists, just update strings
            updatePayload.inhaltsstoffe = {
                tr: label.ingredients.tr || currentInhaltsstoffe.tr,
                en: label.ingredients.en || currentInhaltsstoffe.en,
                de: label.ingredients.de || currentInhaltsstoffe.de,
                ar: currentInhaltsstoffe.ar || label.ingredients.en || currentInhaltsstoffe.en // Fallback to EN if no AR
            };
        }

        // 2 & 3. Usage and Storage (aciklamalar)
        const aciklamalarPayload = match.aciklamalar || {};
        
        if (label.usage) {
            const translatedUsage = translateUsage(label.usage);
            if (translatedUsage) {
                aciklamalarPayload.tr = translatedUsage.tr;
                aciklamalarPayload.en = translatedUsage.en;
                aciklamalarPayload.de = translatedUsage.de;
                aciklamalarPayload.ar = translatedUsage.ar;
            }
        }
        
        if (label.storage) {
            const translatedStorage = translateStorage(label.storage);
            if (translatedStorage) {
                // Append storage info
                aciklamalarPayload.tr = ((aciklamalarPayload.tr || '') + "\n\n" + translatedStorage.tr).trim();
                aciklamalarPayload.en = ((aciklamalarPayload.en || '') + "\n\n" + translatedStorage.en).trim();
                aciklamalarPayload.de = ((aciklamalarPayload.de || '') + "\n\n" + translatedStorage.de).trim();
                aciklamalarPayload.ar = ((aciklamalarPayload.ar || '') + "\n\n" + translatedStorage.ar).trim();
            }
        }
        
        if (Object.keys(aciklamalarPayload).length > 0) {
            updatePayload.aciklamalar = aciklamalarPayload;
        }

        // 4. Nutrition -> naehrwerte
        if (label.nutrition && Object.keys(label.nutrition).length > 0) {
            updatePayload.naehrwerte = formatNutrition(label.nutrition);
        }

        if (Object.keys(updatePayload).length > 0) {
            const { error } = await supabase
                .from('urunler')
                .update(updatePayload)
                .eq('id', match.id);
            
            if (error) {
                console.error(`Failed to update ${label.filename}:`, error.message);
            } else {
                console.log(`[UPDATED] ${match.ad.tr || match.ad}`);
                updatedCount++;
            }
        }
    } else {
        console.log(`[NO MATCH] ${label.filename} -> Tried keywords: ${filenameParts.join(',')}`);
    }
  }

  console.log(`\nFinished! Updated: ${updatedCount} products from labels.`);
}

main().catch(console.error);
