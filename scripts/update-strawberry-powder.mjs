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

async function updateStrawberryPowder() {
  const productId = 'eb5baae4-761d-4c1f-88f8-e913e03cb5f9'; // Çilek Aromalı İçecek Tozu Milkshake- 1 Kg

  const updateData = {
    inhaltsstoffe: {
      tr: "Şeker, Modifiye mısır nişastası, Aroma verici (Çilek), Kıvam verici (E 415), Asitlik düzenleyici (E 330), Topaklanmayı önleyici (E 551), Renklendirici (E 150a, E 129). E 129: Çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
      de: "Zucker, Modifizierte Maisstärke, Aroma (Erdbeere), Verdickungsmittel (E 415), Säuerungsmittel (E 330), Trennmittel (E 551), Farbstoffe (E 150a, E 129). E 129: Es kann negative Auswirkungen auf die Aktivität und Aufmerksamkeit von Kindern haben.",
      en: "Sugar, Modified corn starch, Flavouring (Strawberry), Thickener (E 415), Acidity regulator (E 330), Anti-caking agent (E 551), Colour (E 150a, E 129). E 129: It may cause negative effects on children's activity and attention."
    },
    naehrwerte: {
      pro_100g: {
        energie_kj: 1670,
        energie_kcal: 399,
        fett: 0.0,
        davon_gesaettigt: 0.0,
        kohlenhydrate: 98.7,
        davon_zucker: 92.1,
        ballaststoffe: 1.5,
        eiweiss: 0.1,
        salz: 0.1,
        natrium: 0.04
      }
    },
    allergene: {
      milch: true,
      gluten: true,
      ei: true,
      soja: true,
      schalenfruechte: true,
      allergen_free: false,
      contains_tr: "Süt, gluten, yumurta, antep fıstığı, badem ve soya içerebilir.",
      contains_de: "Kann Milch, Gluten, Ei, Pistazien, Mandeln und Soja enthalten.",
      contains_en: "May contain milk, gluten, egg, pistachio, almond and soy."
    },
    ean_gtin: "8691123449511",
    aktif: true
  };

  console.log('Updating Strawberry Flavored Powder Drink...');
  
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

updateStrawberryPowder();
