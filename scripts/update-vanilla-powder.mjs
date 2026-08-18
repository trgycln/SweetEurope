import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateVanillaPowder() {
  const productId = '4f60f69b-158e-48cd-8252-9bf52fc9a658'; // ID for Vanilla Flavored Beverage Powder / Milkshake - 1 Kg

  const updateData = {
    inhaltsstoffe: {
      tr: "Şeker, Modifiye mısır nişastası, Kıvam verici (E 415), Aroma verici (Vanilya), Asitlik düzenleyici (E 330), Topaklanmayı önleyici (E 551).",
      de: "Zucker, modifizierte Maisstärke, Verdickungsmittel (E415), Aroma (Vanille), Säuerungsmittel (E 330), Trennmittel (E 551).",
      en: "Sugar, Modified corn starch, Thickener (E415), Flavouring (Vanilla), Acidity regulator (E 330), Anti-caking agent (E 551)."
    },
    naehrwerte: {
      pro_100g: {
        energie_kj: 1660,
        energie_kcal: 397,
        fett: 0,
        davon_gesaettigt: 0,
        kohlenhydrate: 96.7,
        davon_zucker: 92.0,
        ballaststoffe: 1.5,
        eiweiss: 0.2,
        salz: 0.1
      }
    },
    allergene: {
      milch: true,
      allergen_free: false,
      contains_tr: "Süt, gluten, yumurta, badem, antep fıstığı ve soya içerebilir.",
      contains_de: "Kann Milch, Gluten, Eier, Mandeln, Pistazien und Soja enthalten.",
      contains_en: "May contain milk, gluten, eggs, almonds, pistachios, and soy."
    },
    aktif: true,
    ean_gtin: "8691123449504",
    produktdatenblatt_url: "https://szuhjzgyhhlrydyllrcd.supabase.co/storage/v1/object/public/urun-etiketleri/toz-1kg/FO-VANILYA-AROMALI-ICECEK-TOZU-1KG-C.pdf"
  };

  console.log('Updating Vanilla Powder...');
  
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

updateVanillaPowder();
