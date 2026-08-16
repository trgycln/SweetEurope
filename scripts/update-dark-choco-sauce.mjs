import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateDarkChocolateSauce() {
  const pId = "ebcfeded-4b94-406c-a86d-01c33c08b7cc";

  const inhaltsstoffe = {
    de: "Zucker, Wasser, Feuchthaltemittel (E 422), Kakaomasse, Kakaopulver, Modifizierte maisstärke, Bitterschokolade (1%) [Kakaomasse, Zucker, Kakaobutter, Emulgatoren (Sojalecithin), Aroma (Vanille)], Aroma (Schokolade), Säuerungsmittel (E 334, E 331iii), Salz, Emulgatoren (Sojalecithin), Konservierungsstoffe (E 202). Warnhinweise für Allergiker: Enthält Soja.",
    tr: "Şeker, Su, Nem verici (E 422), Kakao kitlesi, Kakao tozu, Modifiye mısır nişastası, Bitter çikolata (%1) [Kakao kitlesi, Şeker, Kakao yağı, Emülgatör (Soya Lesitini), Aroma verici (Vanilin)], Aroma verici (Çikolata), Asitlik düzenleyici (E 334, E 331iii), Tuz, Emülgatör (Soya Lesitini), Koruyucu (E 202). Alerjen Uyarısı: Soya içerir.",
    en: "Sugar, Water, Humectant (E 422), Cocoa mass, Cocoa powder, Modified corn starch, Dark chocolate (1%) [Cocoa mass, Sugar, Cocoa butter, Emulsifier (Soy Lecithin), Flavouring (Vanillin)], Flavouring (Chocolate), Acidity regulator (E 334, E 331iii), Salt, Emulsifier (Soy Lecithin), Preservative (E 202). Allergen Warning: Contains soy.",
    ar: "سكر، ماء، مرطب (E 422)، كتلة الكاكاو، مسحوق الكاكاو، نشا ذرة معدل، شوكولاتة داكنة (1%) [كتلة الكاكاو، سكر، زبدة الكاكاو، مستحلب (ليسيثين الصويا)، نكهة (فانيلين)]، نكهة (شوكولاتة)، منظم حموضة (E 334, E 331iii)، ملح، مستحلب (ليسيثين الصويا)، مادة حافظة (E 202). تحذير الحساسية: يحتوي على الصويا."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1150,
      energie_kcal: 281,
      fett: 2.8,
      davon_gesaettigt: 1.5,
      kohlenhydrate: 61.0,
      davon_zucker: 58.5,
      ballaststoffe: 1.9,
      eiweiss: 1.4,
      salz: 0.13
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
    vegan: true, // No milk/dairy ingredients!
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
    console.error("Error updating Dark Chocolate Sauce:", error);
  } else {
    console.log("✅ Dark Chocolate Sauce successfully updated and reactivated!");
  }
}

updateDarkChocolateSauce();
