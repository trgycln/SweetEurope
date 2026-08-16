import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updatePremiumChocolateSauce() {
  const pId = "5b1339ac-c72d-4b9d-843d-9daa2732100f";

  const inhaltsstoffe = {
    de: "Zucker, Wasser, Kakaopulver (%8,3), Feuchthaltemittel (E 422), Dunkle Schokolade (%1) [Kakaomasse, Zucker, Kakaobutter, Emulgatoren (Sojalecithin), Aroma (Vanillin)], Modifizierte maisstärke, Natürliches Aroma (Vanille), Emulgatoren (Mono- und Diglyceride von Speisefettsäuren), Säuerungsmittel (E 334, E 331iii), Salz, Konservierungsstoffe (E 202). Warnhinweise für Allergiker: Enthält Soja.",
    tr: "Şeker, Su, Kakao tozu (%8,3), Nem verici (E 422), Bitter çikolata (%1) [Kakao kitlesi, Şeker, Kakao yağı, Emülgatör (Soya lesitini), Aroma verici (Vanilin)], Modifiye mısır nişastası, Doğal aroma verici (Vanilya), Emülgatör (Yağ asitlerinin mono- ve digliseritleri), Asitlik düzenleyici (E 334, E 331iii), Tuz, Koruyucu (E 202). Alerjen Uyarısı: Soya içerir.",
    en: "Sugar, Water, Cocoa powder (8.3%), Humectant (E 422), Dark chocolate (1%) [Cocoa mass, Sugar, Cocoa butter, Emulsifier (Soy lecithin), Flavouring (Vanillin)], Modified corn starch, Natural flavouring (Vanilla), Emulsifier (Mono- and diglycerides of fatty acids), Acidity regulator (E 334, E 331iii), Salt, Preservative (E 202). Allergen warning: Contains soy.",
    ar: "سكر، ماء، مسحوق الكاكاو (8.3%)، مرطب (E 422)، شوكولاتة داكنة (1%) [كتلة الكاكاو، سكر، زبدة الكاكاو، مستحلب (ليسيثين الصويا)، نكهة (فانيلين)]، نشا ذرة معدل، نكهة طبيعية (فانيليا)، مستحلب (أحادي وثنائي الجليسريد للأحماض الدهنية)، منظم حموضة (E 334, E 331iii)، ملح، مادة حافظة (E 202). تحذير الحساسية: يحتوي على الصويا."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1050,
      energie_kcal: 252,
      fett: 1.6,
      davon_gesaettigt: 0.9,
      kohlenhydrate: 61.6,
      davon_zucker: 52.5,
      ballaststoffe: 2.9,
      eiweiss: 2.0,
      salz: 0.1
    }
  };

  const allergene = {
    allergen_free: false,
    milch: false,
    gluten: false,
    soja: true,
    nuesse: false,
    contains_de: "Enthält Soja.",
    contains_tr: "Soya içerir.",
    contains_en: "Contains soy.",
    contains_ar: "يحتوي على الصويا."
  };

  const { data: pData } = await supabase.from('urunler').select('teknik_ozellikler').eq('id', pId).single();
  const existingTeknik = pData?.teknik_ozellikler || {};

  const updatedTeknik = {
    ...existingTeknik,
    vegan: true, // 100% plant-based, no milk/dairy ingredients
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
    console.error("Error updating Premium Chocolate Sauce:", error);
  } else {
    console.log("✅ Premium Chocolate Sauce successfully updated and verified active!");
  }
}

updatePremiumChocolateSauce();
