import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateWhiteChocolateSauce() {
  const pId = "381703aa-92f3-486e-ab39-b37b041b49e8";

  const inhaltsstoffe = {
    de: "Glukosesirup, Zucker, Wasser, Magermilchpulver (Milch), Feuchthaltemittel (E 422), Butter, Modifizierte maisstärke, Weiße schokolade (1%) [Zucker, Kakaobutter, Magermilchpulver (Milch), Emulgatoren (Sojalecithin), Aroma (Vanille)], Aroma (weiße Schokolade, Schokolade), Salz, Säuerungsmittel (E 330, E 331iii), Emulgatoren (Sojalecithin), Konservierungsstoffe (E 202). Warnhinweise für Allergiker: Enthält Milch, Milchprodukte und Soja.",
    tr: "Glukoz şurubu, Şeker, Su, Yağsız süttozu (Süt), Nem verici (E 422), Tereyağ, Modifiye mısır nişastası, Beyaz çikolata (%1) [Şeker, Kakao yağı, Yağsız süttozu (Süt), Emülgatör (Soya Lesitini), Aroma verici (Vanilin)], Aroma verici (Beyaz çikolata, Çikolata), Tuz, Asitlik düzenleyici (E 330, E 331iii), Emülgatör (Soya Lesitini), Koruyucu (E 202). Alerjen Uyarısı: Süt, süt ürünü ve soya içerir.",
    en: "Glucose syrup, Sugar, Water, Skimmed milk powder (Milk), Humectant (E 422), Butter, Modified corn starch, White chocolate (1%) [Sugar, Cocoa butter, Skimmed milk powder (Milk), Emulsifier (Soy Lecithin), Flavouring (Vanillin)], Flavouring (White Chocolate, Chocolate), Salt, Acidity regulator (E 330, E 331iii), Emulsifier (Soy Lecithin), Preservative (E 202). Allergen Warning: Contains milk, dairy product and soy.",
    ar: "شراب الجلوكوز، سكر، ماء، حليب مجفف خالي الدسم (حليب)، مرطب (E 422)، زبدة، نشا ذرة معدل، شوكولاتة بيضاء (1%) [سكر، زبدة كاكاو، حليب مجفف خالي الدسم (حليب)، مستحلب (ليسيثين الصويا)، نكهة (فانيلين)]، نكهة (شوكولاتة بيضاء، شوكولاتة)، ملح، منظم حموضة (E 330, E 331iii)، مستحلب (ليسيثين الصويا)، مادة حافظة (E 202). تحذير الحساسية: يحتوي على الحليب ومنتجات الألبان والصويا."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1330,
      energie_kcal: 318,
      fett: 5.7,
      davon_gesaettigt: 3.6,
      kohlenhydrate: 62.2,
      davon_zucker: 48.0,
      ballaststoffe: 0.0,
      eiweiss: 3.6,
      salz: 0.75
    }
  };

  const allergene = {
    allergen_free: false,
    milch: true,
    gluten: false,
    soja: true,
    nuesse: false,
    contains_de: "Enthält Milch, Milchprodukte und Soja.",
    contains_tr: "Süt, süt ürünü ve soya içerir.",
    contains_en: "Contains milk, dairy product and soy.",
    contains_ar: "يحتوي على الحليب ومنتجات الألبان والصويا."
  };

  const { data: pData } = await supabase.from('urunler').select('teknik_ozellikler').eq('id', pId).single();
  const existingTeknik = pData?.teknik_ozellikler || {};

  const updatedTeknik = {
    ...existingTeknik,
    vegan: false,
    laktosefrei: false,
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
    console.error("Error updating White Chocolate Sauce:", error);
  } else {
    console.log("✅ White Chocolate Sauce successfully updated and verified active!");
  }
}

updateWhiteChocolateSauce();
