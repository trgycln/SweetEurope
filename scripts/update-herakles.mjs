import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateHerakles() {
  const pId = "fd39fc06-6857-41d3-a4f7-f5fcb535119e"; // From previous query for HERAKLES 800ml

  const inhaltsstoffe = {
    de: "Zucker, Apfelsaft (%35), Wasser, Passionsfrucht (%10), Pfirsich (%5), Säureregulator (E 330, E 331ii), Verdickungsmittel (E 422), Modifizierte Maisstärke, Natürliches Aroma (Passionsfrucht, Scharfer Paprika), Gewürzmischung (Ingwer, Zimtbaum, Nelke), Konservierungsstoffe (E 202, E 211), Natürliche Farbstoff (E 150a, E 160a). Enthält mindestens 50% Fruchtanteil.",
    tr: "Şeker, Elma suyu (%35), Su, Çarkıfelek (%10), Şeftali (%5), Asitlik düzenleyici (E 330, E 331ii), Kıvam verici (E 422), Modifiye mısır nişastası, Doğal aroma verici (Çarkıfelek, Acı biber), Baharat karışımı (Zencefil, Zerdeçal, Karanfil), Koruyucu (E 202, E 211), Doğal renklendirici (E 150a, E 160a). En az %50 oranında meyve içerir.",
    en: "Sugar, Apple Juice (35%), Water, Passion Fruit (10%), Peach (5%), Acidity regulators (E 330, E 331ii), Thickener (E 422), Modified corn starch, Natural Flavoring (Passion Fruit, Hot Pepper), Spice blend (Ginger, Turmeric, Clove), Preservatives (E 202, E 211), Natural color (E 150a, E 160a). Contains minimum 50% fruit.",
    ar: "سكر، عصير تفاح (35%)، ماء، باشن فروت (10%)، خوخ (5%)، منظمات حموضة (E 330, E 331ii)، مكثف (E 422)، نشا ذرة معدل، نكهة طبيعية (باشن فروت، فلفل حار)، مزيج بهارات (زنجبيل، كركم، قرنفل)، مواد حافظة (E 202, E 211)، لون طبيعي (E 150a, E 160a). يحتوي على 50% فاكهة كحد أدنى."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1360,
      energie_kcal: 325,
      fett: 0.8,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 81.1,
      davon_zucker: 55.6,
      ballaststoffe: 1.7,
      eiweiss: 0.7,
      salz: 0.025
    }
  };

  const allergene = {
    allergen_free: true,
    milch: false,
    gluten: false,
    soja: false,
    nuesse: false,
    contains_de: "Allergenfrei / Keine Allergene enthalten.",
    contains_tr: "Alerjen içermez.",
    contains_en: "Allergen free.",
    contains_ar: "خالٍ من مسببات الحساسية."
  };

  // We also know it's vegan, glutenfrei, laktosefrei, etc. from the script logic, but we'll set it here manually just to be sure.
  const { data: pData } = await supabase.from('urunler').select('teknik_ozellikler').eq('id', pId).single();
  const existingTeknik = pData?.teknik_ozellikler || {};
  
  const updatedTeknik = {
    ...existingTeknik,
    vegan: true, // Label has "Vegan Certified"
    laktosefrei: true,
    glutenfrei: true,
    vegetarisch: true,
    ohne_zucker: false
  };

  const { error } = await supabase.from('urunler').update({
    inhaltsstoffe,
    naehrwerte,
    besin_degerleri: naehrwerte,
    allergene,
    teknik_ozellikler: updatedTeknik,
    aktif: true // Reactivate it!
  }).eq('id', pId);

  if (error) {
    console.error("Error updating Herakles:", error);
  } else {
    console.log("Herakles successfully updated and reactivated!");
  }
}

updateHerakles();
