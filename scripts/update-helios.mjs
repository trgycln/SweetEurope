import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateHelios() {
  const pId = "2bb2317e-ba80-461f-9a24-7fd4d702565b";

  const inhaltsstoffe = {
    de: "Zucker, Apfelsaft (%35), Wasser, Mandarine (%10), Grüner Apfel (%5), Säureregulator (E 330, E 331i), Feuchthaltemittel (E 422), modifizierte Maisstärke, natürliche Aromen (Mandarine, Guave), Gewürzmischung (Ingwer, Kurkuma, Nelke), Konservierungsstoffe (E 202, E 211), natürlicher Farbstoff (E 160a). Enthält mindestens 50% Fruchtanteil.",
    tr: "Şeker, Elma suyu (%35), Su, Mandalina (%10), Yeşil elma (%5), Asitlik düzenleyici (E 330, E 331i), Kıvam verici (E 422), Modifiye mısır nişastası, Doğal aroma verici (Mandalina, Guava), Baharat karışımı (Zencefil, Zerdeçal, Karanfil), Koruyucu (E 202, E 211), Doğal renklendirici (E 160a). En az %50 oranında meyve içerir.",
    en: "Sugar, Apple juice (35%), Water, Mandarin (10%), Green apple (5%), Acidity regulators (E 330, E 331i), Thickener (E 422), Modified corn starch, Natural flavoring (Mandarin, Guava), Spice blend (Ginger, Turmeric, Clove), Preservatives (E 202, E 211), Natural color (E 160a). Contains min. 50% fruit.",
    ar: "سكر، عصير تفاح (35%)، ماء، يوسفي (10%)، تفاح أخضر (5%)، منظمات حموضة (E 330, E 331i)، مكثف (E 422)، نشا ذرة معدل، نكهة طبيعية (يوسفي، جوافة)، مزيج بهارات (زنجبيل، كركم، قرنفل)، مواد حافظة (E 202, E 211)، لون طبيعي (E 160a). يحتوي على 50% فاكهة كحد أدنى."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1290,
      energie_kcal: 309,
      fett: 1.2,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 78.6,
      davon_zucker: 54.2,
      ballaststoffe: 1.9,
      eiweiss: 1.6,
      salz: 0.045
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

  const { data: pData } = await supabase.from('urunler').select('teknik_ozellikler').eq('id', pId).single();
  const existingTeknik = pData?.teknik_ozellikler || {};

  const updatedTeknik = {
    ...existingTeknik,
    vegan: true,
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
    aktif: true
  }).eq('id', pId);

  if (error) {
    console.error("Error updating Helios:", error);
  } else {
    console.log("✅ Helios successfully updated and reactivated!");
  }
}

updateHelios();
