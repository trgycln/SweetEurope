import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updatePremiumWhiteChocoSauce() {
  const pId = "b6aa45a8-d61a-4fa3-8eb3-c0375890cadc";

  const inhaltsstoffe = {
    de: "Zucker, Wasser, Feuchthaltemittel (E 422), Weiße Schokolade (%5,3) [Zucker, Kakaobutter, Emulgatoren (Sojalecithin), Aroma (Vanillin)], Modifizierte maisstärke, Natürliches Aroma (Weiße Schokolade), Emulgatoren (Mono- und Diglyceride von Speisefettsäuren, Mono- und Diacetylweinsäureester von Mono- und Diglyceriden von Speisefettsäuren E 472e), Salz, Säuerungsmittel (E 331iii), Konservierungsstoffe (E 202). Warnhinweise für Allergiker: Enthält Milch und Soja.",
    tr: "Şeker, Su, Nem verici (E 422), Beyaz çikolata (%5,3) [Şeker, Kakao yağı, Emülgatör (Soya lesitini), Aroma verici (Vanilin)], Modifiye mısır nişastası, Doğal aroma verici (Beyaz çikolata), Emülgatör (Yağ asitlerinin mono- ve digliseritleri, Yağ asitlerinin mono- ve digliseritlerinin mono- ve diasetil tartarik asit esterleri E 472e), Tuz, Asitlik düzenleyici (E 331iii), Koruyucu (E 202). Alerjen Uyarısı: Süt ve soya içerir.",
    en: "Sugar, Water, Humectant (E 422), White chocolate (5.3%) [Sugar, Cocoa butter, Emulsifier (Soy lecithin), Flavouring (Vanillin)], Modified corn starch, Natural flavouring (White chocolate), Emulsifier (Mono- and diglycerides of fatty acids, Mono- and diacetyl tartaric acid esters of mono- and diglycerides of fatty acids E 472e), Salt, Acidity regulator (E 331iii), Preservative (E 202). Allergen warning: Contains milk and soy.",
    ar: "سكر، ماء، مرطب (E 422)، شوكولاتة بيضاء (5.3%) [سكر، زبدة الكاكاو، مستحلب (ليسيثين الصويا)، نكهة (فانيلين)]، نشا ذرة معدل، نكهة طبيعية (شوكولاتة بيضاء)، مستحلب (أحادي وثنائي الجليسريد للأحماض الدهنية، استرات حمض الطرطريك ثنائي الأسيتيل للأحادي وثنائي الجليسريد E 472e)، ملح، منظم حموضة (E 331iii)، مادة حافظة (E 202). تحذير الحساسية: يحتوي على الحليب والصويا."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1110,
      energie_kcal: 266,
      fett: 2.3,
      davon_gesaettigt: 1.1,
      kohlenhydrate: 64.3,
      davon_zucker: 53.0,
      ballaststoffe: 0.0,
      eiweiss: 2.4,
      salz: 0.6
    }
  };

  const allergene = {
    allergen_free: false,
    milch: true,
    gluten: false,
    soja: true,
    nuesse: false,
    contains_de: "Enthält Milch und Soja.",
    contains_tr: "Süt ve soya içerir.",
    contains_en: "Contains milk and soy.",
    contains_ar: "يحتوي على الحليب والصويا."
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
    console.error("Error updating Premium White Chocolate Sauce:", error);
  } else {
    console.log("✅ Premium White Chocolate Sauce successfully updated and verified active!");
  }
}

updatePremiumWhiteChocoSauce();
