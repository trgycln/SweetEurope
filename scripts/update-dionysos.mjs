import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateDionysos() {
  const pId = "cedb0279-cd0a-4cfa-8a9f-9dc745457549";

  const inhaltsstoffe = {
    de: "Zucker, Apfelsaft (%35), Wasser, Heidelbeere (%10), Brombeere (%5), Feuchthaltemittel (E 422), Säureregulator (E 330, E 331i), modifizierte Maisstärke, natürliche Aromen (Heidelbeere, Mangostan), Gewürzmischung (Ingwer, Nelke), Konservierungsstoffe (E 202, E 211), natürlicher Farbstoff (Schwarze Karotte Extrakt). Enthält mindestens 50% Fruchtanteil.",
    tr: "Şeker, Elma Suyu (%35), Su, Yaban mersini (%10), Böğürtlen (%5), Kıvam verici (E 422), Asitlik düzenleyici (E 330, E 331i), Modifiye mısır nişastası, Doğal aroma verici (Yaban mersini, Mangostan), Baharat karışımı (Zencefil, Karanfil), Koruyucu (E 202, E 211), Doğal renklendirici (Siyah havuç ekstraktı). En az %50 oranında meyve içerir.",
    en: "Sugar, Apple Juice (35%), Water, Blueberry (10%), Blackberry (5%), Thickener (E 422), Acidity regulator (E 330, E 331i), Modified corn starch, Natural flavoring (Blueberry, Mangosteen), Spice blend (Ginger, Clove), Preservatives (E 202, E 211), Natural color (Black carrot extract). Contains min. 50% fruit.",
    ar: "سكر، عصير تفاح (35%)، ماء، توت بري (10%)، توت أسود (5%)، مكثف (E 422)، منظم حموضة (E 330, E 331i)، نشا ذرة معدل، نكهة طبيعية (توت بري، مانغوستين)، مزيج بهارات (زنجبيل، قرنفل)، مواد حافظة (E 202, E 211)، لون طبيعي (مستخلص الجزر الأسود). يحتوي على 50% فاكهة كحد أدنى."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1279,
      energie_kcal: 304,
      fett: 0.8,
      davon_gesaettigt: 0.1,
      kohlenhydrate: 78.8,
      davon_zucker: 55.0,
      ballaststoffe: 3.2,
      eiweiss: 0.9,
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
    console.error("Error updating Dionysos:", error);
  } else {
    console.log("✅ Dionysos successfully updated and reactivated!");
  }
}

updateDionysos();
