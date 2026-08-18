import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateMatcha() {
  const productId = 'd65ba9af-cd9a-48f0-823d-781c917bd259';

  const updateData = {
    ean_gtin: '8691123470379',
    aktif: true,
    inhaltsstoffe: {
      tr: "Şeker, Matcha yeşil çay tozu, Modifiye mısır nişastası, Glikoz şurubu, Hidrojenize bitkisel yağ (Palm yağı), Emülgatör (E 471 Yağ asitlerinin mono ve digliseritleri, E 472a Yağ asitlerinin mono ve digliseritlerinin asetik asit esterleri), Süt proteini (Sodyum Kazeinat), Stabilizatör (E 340), Topaklanmayı önleyici (E 341), Kıvam verici (E 415), Aroma verici (Matcha Yeşil Çay), Topaklanmayı önleyici (E 551), Renklendirici (E 160b, E 163), Asitlik düzenleyici (E 330).",
      de: "Zucker, Matcha Grüner Tee-Pulver, Modifizierte Maisstärke, Glukosesirup, Hydriertes Pflanzenöl (Palmöl), Emulgatoren (E 471 Mono- und Diglyceride von Speisefettsäuren, E 472a Essigsäureester von Mono- und Diglyceriden von Speisefettsäuren), Milchprotein (Natriumcaseinat), Stabilisatoren (E 340), Trennmittel (E 341), Verdickungsmittel (E 415), Aroma (Grüner Matcha), Trennmittel (E 551), Farbstoffe (E 160b, E 163), Säuerungsmittel (E 330).",
      en: "Sugar, Matcha green tea powder, Modified corn starch, Glucose syrup, Hydrogenated vegetable oil (Palm oil), Emulsifier (E 471 Mono- and diglycerides of fatty acids, E 472a Acetic acid esters of mono- and diglycerides of fatty acids), Milk protein (Sodium caseinate), Stabilizer (E 340), Anti-caking agent (E 341), Thickener (E 415), Flavouring (Matcha green tea), Anti-caking agent (E 551), Colour (E 160b, E 163), Acidity regulator (E 330)."
    },
    naehrwerte: {
      pro_100g: {
        energie_kj: 1610,
        energie_kcal: 384,
        fett: 1.3,
        davon_gesaettigt: 1.1,
        kohlenhydrate: 91.0,
        davon_zucker: 87.4,
        ballaststoffe: 1.0,
        eiweiss: 0.2,
        salz: 0.13
      }
    },
    allergene: {
      milch: true,
      allergen_free: false,
      contains_tr: "Süt ürünü içerir. Gluten, antep fıstığı, yumurta, badem ve soya içerebilir.",
      contains_de: "Enthält Milchprodukte. Kann Gluten, Pistazien, Eier, Mandeln und Soja enthalten.",
      contains_en: "Contains milk products. May contain traces of gluten, pistachio, egg, almond, and soy."
    }
  };

  console.log('Updating Matcha Green Tea Powder...');
  
  const { data, error } = await supabase
    .from('urunler')
    .update(updateData)
    .eq('id', productId)
    .select();

  if (error) {
    console.error('Update failed:', error);
  } else {
    console.log('Update successful! Data:', JSON.stringify(data[0].ad, null, 2));
    console.log('Updated fields:', Object.keys(updateData).join(', '));
  }
}

updateMatcha();
