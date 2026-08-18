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

async function updateMelonPowder() {
  const productId = '8be92bb0-f908-4614-b4c2-4deac3a5b66c'; // ID for Melon Flavored Beverage Powder / Milkshake - 1 Kg

  const updateData = {
    inhaltsstoffe: {
      tr: "Şeker, Modifiye mısır nişastası, Kıvam verici (E 415), Aroma verici (Kavun), Asitlik düzenleyici (E 330), Renklendirici (E 160a, E 100), Topaklanmayı önleyici (E 551).",
      de: "Zucker, modifizierte Maisstärke, Verdickungsmittel (E 415), Aroma (Melone), Säuerungsmittel (E 330), Farbstoffe (E 160a, E 100), Trennmittel (E 551).",
      en: "Sugar, Modified corn starch, Thickener (E 415), Flavouring (Melon), Acidity regulator (E 330), Colour (E 160a, E 100), Anti-caking agent (E 551)."
    },
    naehrwerte: {
      pro_100g: {
        energie_kj: 1670,
        energie_kcal: 399,
        fett: 0,
        davon_gesaettigt: 0,
        kohlenhydrate: 98.7,
        davon_zucker: 92.8,
        ballaststoffe: 1.5,
        eiweiss: 0.1,
        salz: 0.1
      }
    },
    allergene: {
      milch: true,
      allergen_free: false,
      contains_tr: "Süt, gluten, yumurta, badem, antep fıstığı ve soya içerebilir.",
      contains_de: "Kann Milch, Gluten, Ei, Mandeln, Pistazien und Soja enthalten.",
      contains_en: "May contain milk, gluten, eggs, almonds, pistachios and soy."
    },
    aktif: true,
    ean_gtin: "8691123449566",
    produktdatenblatt_url: "https://szuhjzgyhhlrydyllrcd.supabase.co/storage/v1/object/public/urun-etiketleri/toz-1kg/FO-KAVUN-AROMALI-ICECEK-TOZU-1KG-C.pdf"
  };

  console.log('Updating Melon Powder...');
  
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

updateMelonPowder();
