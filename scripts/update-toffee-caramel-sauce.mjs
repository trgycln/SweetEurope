import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateToffeeCaramelSauce() {
  const pId = "2d438bd2-d047-4b8f-b163-c4d6bcd57ea5";

  const inhaltsstoffe = {
    de: "Zucker, Toffee-Karamell-Soße (%25) [Wasser, Zucker, Magermilchpulver (Milch), Butter], Wasser, Glukosesirup, Feuchthaltemittel (E 422), Modifizierte maisstärke, Säuerungsmittel (E 330, E 331iii), Emulgatoren (Sojalecithin), Konservierungsstoffe (E 202), Salz, Aroma (Vanille). Warnhinweise für Allergiker: Enthält Milch, Milchprodukte und Soja.",
    tr: "Şeker, Toffee karamel sos (%25) [Su, Şeker, Yağsız süttozu (Süt), Tereyağ], Su, Glukoz şurubu, Nem verici (E 422), Modifiye mısır nişastası, Asitlik düzenleyici (E 330, E 331iii), Emülgatör (Soya Lesitini), Koruyucu (E 202), Tuz, Aroma verici (Vanilya). Alerjen Uyarısı: Süt, süt ürünü ve soya içerir.",
    en: "Sugar, Toffee caramel sauce (25%) [Water, Sugar, Skimmed milk powder (Milk), Butter], Water, Glucose syrup, Humectant (E 422), Modified corn starch, Acidity regulator (E 330, E 331iii), Emulsifier (Soy Lecithin), Preservative (E 202), Salt, Flavouring (Vanilla). Allergen Warning: Contains milk, dairy product and soy.",
    ar: "سكر، صلصة توفي كراميل (25%) [ماء، سكر، حليب مجفف خالي الدسم (حليب)، زبدة]، ماء، شراب الجلوكوز، مرطب (E 422)، نشا ذرة معدل، منظم حموضة (E 330, E 331iii)، مستحلب (ليسيثين الصويا)، مادة حافظة (E 202)، ملح، نكهة (فانيليا). تحذير الحساسية: يحتوي على الحليب ومنتجات الألبان والصويا."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1180,
      energie_kcal: 283,
      fett: 4.1,
      davon_gesaettigt: 2.6,
      kohlenhydrate: 58.3,
      davon_zucker: 52.3,
      ballaststoffe: 0.0,
      eiweiss: 2.6,
      salz: 0.5
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
    vegan: false, // contains milk & butter
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
    ean_gtin: "8691123565065", // update EAN to label value
    aktif: true
  }).eq('id', pId);

  if (error) {
    console.error("Error updating Toffee Caramel Sauce:", error);
  } else {
    console.log("✅ Toffee Caramel Sauce successfully updated and reactivated!");
  }
}

updateToffeeCaramelSauce();
