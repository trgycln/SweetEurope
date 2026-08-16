import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateApollo() {
  const pId = "cea27501-54da-40ec-85fd-560fc06d25af";

  const inhaltsstoffe = {
    de: "Zucker, Apfelsaft (%35), Wasser, Mango (%10), Ananas (%5), Feuchthaltemittel (E 422), Säureregulator (E 330, E 331i), modifizierte Maisstärke, natürliche Aromen (Mango, Kokosnuss), Gewürzmischung (Kokosnuss, Zimt, Ingwer), Konservierungsstoffe (E 202, E 211), natürlicher Farbstoff (E 160a). Enthält mindestens 50% Fruchtanteil.",
    tr: "Şeker, Elma suyu (%35), Su, Mango (%10), Ananas (%5), Kıvam verici (E 422), Asitlik düzenleyici (E 330, E 331i), Modifiye mısır nişastası, Doğal aroma verici (Mango, Hindistan cevizi), Baharat karışımı (Hindistan cevizi, Tarçın, Zencefil), Koruyucu (E 202, E 211), Doğal renklendirici (E 160a). En az %50 oranında meyve içerir.",
    en: "Sugar, Apple juice (35%), Water, Mango (10%), Pineapple (5%), Thickener (E 422), Acidity regulator (E 330, E 331i), Modified corn starch, Natural flavoring (Mango, Coconut), Spice blend (Coconut, Cinnamon, Ginger), Preservatives (E 202, E 211), Natural color (E 160a). Contains min. 50% fruit.",
    ar: "سكر، عصير تفاح (35%)، ماء، مانجو (10%)، أناناس (5%)، مكثف (E 422)، منظم حموضة (E 330, E 331i)، نشا ذرة معدل، نكهة طبيعية (مانجو، جوز الهند)، مزيج بهارات (جوز الهند، قرفة، زنجبيل)، مواد حافظة (E 202, E 211)، لون طبيعي (E 160a). يحتوي على 50% فاكهة كحد أدنى."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1340,
      energie_kcal: 320,
      fett: 1.9,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 79.4,
      davon_zucker: 55.7,
      ballaststoffe: 2.6,
      eiweiss: 2.0,
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
    console.error("Error updating Apollo:", error);
  } else {
    console.log("✅ Apollo successfully updated and reactivated!");
  }
}

updateApollo();
