import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updatePremiumCaramelSauce() {
  const pId = "cbc22277-3a1e-4151-a47a-ca7575ebe0a5";

  const inhaltsstoffe = {
    de: "Zucker, Wasser, Feuchthaltemittel (E 422), Modifizierte maisstärke, Karamell (1%) [Zucker, Maltodextrin, Sonnenblumenlecithin, Salz], Natürliches Aroma (Karamell), Farbstoffe (E 150a), Säuerungsmittel (E 332ii, E 330), Salz, Emulgatoren (Sonnenblumenlecithin), Konservierungsstoffe (E 202). Warnhinweise für Allergiker: Enthält Milch, Milchprodukte und Soja.",
    tr: "Şeker, Su, Nem verici (E 422), Modifiye mısır nişastası, Karamel (%1) [Şeker, Maltodekstrin, Ayçiçek lesitini, Tuz], Doğal aroma verici (Karamel), Renklendirici (E 150a), Asitlik düzenleyici (E 332ii, E 330), Tuz, Emülgatör (Ayçiçek lesitini), Koruyucu (E 202). Alerjen Uyarısı: Süt, süt ürünü ve soya içerir.",
    en: "Sugar, Water, Humectant (E 422), Modified corn starch, Caramel (1%) [Sugar, Maltodextrin, Sunflower lecithin, Salt], Natural flavouring (Caramel), Colour (E 150a), Acidity regulator (E 332ii, E 330), Salt, Emulsifier (Sunflower lecithin), Preservative (E 202). Allergen Warning: Contains milk, dairy products and soy.",
    ar: "سكر، ماء، مرطب (E 422)، نشا ذرة معدل، كراميل (1%) [سكر، مالتوديكسترين، ليسيثين عباد الشمس، ملح]، نكهة طبيعية (كراميل)، لون (E 150a)، منظم حموضة (E 332ii, E 330)، ملح، مستحلب (ليسيثين عباد الشمس)، مادة حافظة (E 202). تحذير الحساسية: يحتوي على الحليب ومنتجات الألبان والصويا."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1040,
      energie_kcal: 247,
      fett: 0.4,
      davon_gesaettigt: 0.1,
      kohlenhydrate: 68.3,
      davon_zucker: 54.9,
      ballaststoffe: 0.0,
      eiweiss: 2.0,
      salz: 0.4
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
    contains_en: "Contains milk, dairy products and soy.",
    contains_ar: "يحتوي على الحليب ومنتجات الألبان والصويا."
  };

  const { data: pData } = await supabase.from('urunler').select('teknik_ozellikler').eq('id', pId).single();
  const existingTeknik = pData?.teknik_ozellikler || {};

  const updatedTeknik = {
    ...existingTeknik,
    vegan: false, // label contains dairy/milk warning
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
    console.error("Error updating Premium Caramel Sauce:", error);
  } else {
    console.log("✅ Premium Caramel Sauce successfully updated and verified active!");
  }
}

updatePremiumCaramelSauce();
