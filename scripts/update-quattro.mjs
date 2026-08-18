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

async function updateQuattro() {
  const productId = 'a46effd1-1eba-4cda-8699-5d03a2f15675'; // ID for Fo Powder Drink Base (Quatro)

  const updateData = {
    ean_gtin: '8691123453037',
    aktif: true,
    inhaltsstoffe: {
      tr: "Şeker, Süt tozu, Modifiye mısır nişastası, Kıvam verici (E 440, E 466), Emülgatör (E 471 Yağ asitlerinin mono ve digliseritleri, E 472a Yağ asitlerinin mono ve digliseritlerinin asetik asit esterleri), Topaklanmayı önleyici (E 551), Aroma verici (Süt, vanilya).",
      de: "Zucker, Vollmilchpulver, Modifizierte Maisstärke, Verdickungsmittel (E 440, E 466), Emulgatoren (E 471 Mono- und Diglyceride von Speisefettsäuren, E 472a Essigsäureester von Mono- und Diglyceriden von Speisefettsäuren), Trennmittel (E 551), Aroma (Milch, Vanille).",
      en: "Sugar, Fatty milk powder, Modified corn starch, Thickener (E 440, E 466), Emulsifier (E 471 Mono and diglycerides of fatty acids, E 472a Acetic acid esters of mono and diglycerides of fatty acids), Anti-caking agent (E 551), Flavouring (Milk, vanilla)."
    },
    naehrwerte: {
      pro_100g: {
        energie_kj: 1910,
        energie_kcal: 457,
        fett: 12.1,
        davon_gesaettigt: 11.0,
        kohlenhydrate: 91.8,
        davon_zucker: 67.2,
        ballaststoffe: 0.0,
        eiweiss: 2.2,
        salz: 0.7
      }
    },
    allergene: {
      milch: true,
      allergen_free: false,
      contains_tr: "Süt içerir. Gluten, yumurta, antep fıstığı, badem, ve soya içerebilir.",
      contains_de: "Enthält Milch. Kann Gluten, Eier, Pistazien, Mandeln und Soja enthalten.",
      contains_en: "Contains dairy. May contain gluten, eggs, pistachios, almonds, and soy."
    }
  };

  console.log('Updating Quattro Powder Drink Base...');
  
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

updateQuattro();
