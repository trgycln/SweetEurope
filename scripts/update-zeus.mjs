import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateZeus() {
  const pId = "65ec97da-0aba-4a23-ac1e-c2e34317d7fe";

  const inhaltsstoffe = {
    de: "Zucker, Apfelsaft (%35), Wasser, Erdbeere (%10), Banane (%5), Feuchthaltemittel (E 422), Säureregulator (E 330, E 331i), modifizierte Maisstärke, natürliche Aromen (Bitterorange, Erdbeere), Gewürzmischung (Ingwer, Nelke, Kardamom), Konservierungsstoffe (E 202, E 211), natürlicher Farbstoff (Schwarze Karotte Extrakt). Enthält mindestens 50% Fruchtanteil.",
    tr: "Şeker, Elma suyu (%35), Su, Çilek (%10), Muz (%5), Kıvam verici (E 422), Asitlik düzenleyici (E 330, E 331i), Modifiye mısır nişastası, Doğal aroma verici (Acı portakal, Çilek), Baharat karışımı (Zencefil, Karanfil, Kakule), Koruyucu (E 202, E 211), Doğal renklendirici (Siyah havuç ekstraktı). En az %50 oranında meyve içerir.",
    en: "Sugar, Apple Juice (35%), Water, Strawberry (10%), Banana (5%), Thickener (E 422), Acidity regulator (E 330, E 331i), Modified corn starch, Natural Flavoring (Bitter Orange, Strawberry), Spice blend (Ginger, Clove, Cardamom), Preservatives (E 202, E 211), Natural color (Black carrot extract). Contains min. 50% fruit.",
    ar: "سكر، عصير تفاح (35%)، ماء، فراولة (10%)، موز (5%)، مكثف (E 422)، منظم حموضة (E 330, E 331i)، نشا ذرة معدل، نكهة طبيعية (برتقال مر، فراولة)، مزيج بهارات (زنجبيل، قرنفل، هيل)، مواد حافظة (E 202, E 211)، لون طبيعي (مستخلص الجزر الأسود). يحتوي على 50% فاكهة كحد أدنى."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1230,
      energie_kcal: 293,
      fett: 0.6,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 74.4,
      davon_zucker: 45.8,
      ballaststoffe: 2.0,
      eiweiss: 2.5,
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
    console.error("Error updating Zeus:", error);
  } else {
    console.log("✅ Zeus successfully updated and reactivated!");
  }
}

updateZeus();
