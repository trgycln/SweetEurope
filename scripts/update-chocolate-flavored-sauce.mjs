import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateChocolateFlavoredSauce() {
  const productId = 'c3029bf8-5bc5-4566-8d50-0e2ba3ab0ffb'; // ID for Çikolata Aromalı Dekor Sos 750 gr

  const updateData = {
    ad: {
      ar: "صلصة تزيين بنكهة الشوكولاتة 750 جرام",
      de: "Dekorationssauce mit Schokoladengeschmack 750 gr",
      en: "Chocolate Flavored Decoration Sauce 750 gr",
      tr: "Çikolata Aromalı Dekor Sos 750 gr"
    },
    inhaltsstoffe: {
      tr: "Glikoz şurubu, Su, Renklendirici (E 150d, E 153, E 129, E 155), Kıvam artırıcı (E 440, E 406), Kakao tozu, Koruyucu (E 202, E 211), Aroma verici (Çikolata), Asitlik düzenleyici (E 330). E 129: Çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
      de: "Glukosesirup, Wasser, Farbstoff (E 150d, E 153, E 129, E 155), Verdickungsmittel (E 440, E 406), Kakaopulver, Konservierungsstoff (E 202, E 211), Aroma (Schokolade), Säureregulator (E 330). E 129: Kann negative Auswirkungen auf die Aktivität und Aufmerksamkeit von Kindern haben.",
      en: "Glucose syrup, Water, Colour (E 150d, E 153, E 129, E 155), Thickener (E 440, E 406), Cacao powder, Preservatives (E 202, E 211), Flavouring (Chocolate), Acidity regulator (E 330). E 129: May have negative effects on the activities and attentions of the children."
    },
    naehrwerte: {
      pro_100g: {
        energie_kj: 1050,
        energie_kcal: 250,
        fett: 0.0,
        davon_gesaettigt: 0.0,
        kohlenhydrate: 61.0,
        davon_zucker: 30.0,
        ballaststoffe: 0.7,
        eiweiss: 0.5,
        salz: 0.3
      }
    },
    allergene: {
      allergen_free: true,
      milch: false,
      gluten: false,
      soja: false,
      nuesse: false,
      contains_tr: "Alerjen içermez.",
      contains_de: "Allergenfrei.",
      contains_en: "Allergen free.",
      contains_ar: "خالٍ من مسببات الحساسية."
    },
    aciklamalar: {
      tr: "KULLANIM YERLERİ VE KULLANIM TALİMATI: Pasta, kek, tart, turta, waffle, kurabiye, cheesecake, muffin, şerbet, pasta, sütlü tatlılar ve dondurma süslemesinde dekorasyon amaçlı kullanılır. Direkt olarak mamul veya tabağın dışına sıkılarak uygulanır. Kapağının pratik ucu sayesinde ince olması nedeniyle kullanıma pratiktir. Tavsiye edilen uygulama sıcaklığı 20-22°C arasındadır.",
      en: "PLACE OF USAGE AND DIRECTION FOR USE: May be used as a topping sauce for decorating pastries, cakes, tarts, waffles, cookies, cheesecakes, muffins, ice creams, milk desserts and ice creams. It's applied directly to the product or on a cake plate. It is practical applied due to the extreme side of the cover is thin. The application temperature is recommended between 20-22°C.",
      de: "ANWENDUNGSBEREICHE UND PRAXIS: Es wird als Dekorationssauce für die Dekoration von Kuchen, Kuchen, Torten, Waffeln, Keksen, Käsekuchen, Muffin, Eiscreme, Pudding und Eis verwendet. Es ist direkt auf das Produkt oder die Kuchenplatte angewendet. Die Spitze des Deckels ist dünn, so dass es praktisch zu bedienen ist. Die Anwendungstemperatur des Produktes beträgt zwischen 20-22°C."
    },
    ean_gtin: "8691123462244",
    aktif: true
  };

  updateData.besin_degerleri = JSON.stringify(updateData.naehrwerte);

  const { data: pData } = await supabase.from('urunler').select('teknik_ozellikler').eq('id', productId).single();
  const existingTeknik = pData?.teknik_ozellikler || {};

  updateData.teknik_ozellikler = {
    ...existingTeknik,
    vegan: true,
    laktosefrei: true,
    glutenfrei: true,
    vegetarisch: true,
    geschmack: ["çikolata", "chocolate", "schokolade"],
    birim_agirlik_g: 750
  };

  console.log('Updating Chocolate Flavored Sauce 750g...');
  
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

updateChocolateFlavoredSauce();
