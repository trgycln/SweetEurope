import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateBlackberryFruitedSauce() {
  const pId = "24dc99d5-dee1-4160-8047-43d28e07aa35";
  const duplicateId = "1ce3370c-f82c-4143-a6d9-d456e40cbd94";

  const inhaltsstoffe = {
    de: "Brombeere (%50), Zucker, Modifizierte Maisstärke, Säureregulator (E 334, E 331iii), Aroma (Brombeere), Salz, Konservierungsstoff (E 202), Farbstoffe (E 122, E 133). Hinweis: Farbstoff E 122 kann die Aktivität und Aufmerksamkeit bei Kindern beeinträchtigen.",
    tr: "Böğürtlen (%50), Şeker, Modifiye mısır nişastası, Asitlik düzenleyici (E 334, E 331iii), Aroma verici (Böğürtlen), Tuz, Koruyucu (E 202), Renklendirici (E 122, E 133). Uyarı: E 122 renklendiricisi çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
    en: "Blackberry (50%), Sugar, Modified corn starch, Acidity regulators (E 334, E 331iii), Flavouring (Blackberry), Salt, Preservative (E 202), Colours (E 122, E 133). Warning: Colour E 122 may have negative effects on activity and attention in children.",
    ar: "بلاك بيري / توت العليق الأسود (%50)، سكر، نشا الذرة المعدل، منظم الحموضة (E 334, E 331iii)، نكهة (بلاك بيري)، ملح، مادة حافظة (E 202)، ملونات (E 122, E 133). تحذير: قد يكون للملون E 122 تأثير سلبي على النشاط والتركيز لدى الأطفال."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 994,
      energie_kcal: 238,
      fett: 0.1,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 56.2,
      davon_zucker: 54.9,
      staerke: 0.9,
      ballaststoffe: 2.9,
      eiweiss: 0.7,
      salz: 0.003
    }
  };

  const allergene = {
    allergen_free: true,
    milch: false,
    gluten: false,
    soja: false,
    nuesse: false,
    contains_de: "Allergenfrei / Keine Allergene enthalten. Hinweis: Farbstoff E 122 kann die Aktivität und Aufmerksamkeit bei Kindern beeinträchtigen.",
    contains_tr: "Alerjen içermez. Uyarı: E 122 renklendiricisi çocukların aktivite ve dikkatleri üzerine olumsuz etki yapabilir.",
    contains_en: "Allergen free. Note: Colour E 122 may have negative effects on activity and attention in children.",
    contains_ar: "خالٍ من مسببات الحساسية. ملاحظة: قد يكون للملون E 122 تأثير سلبي على النشاط والتركيز لدى الأطفال."
  };

  const aciklamalar = {
    de: "Hochwertiges Fruchtpüree mit 50% Brombeer-Fruchtanteil. Ideal für Frozen, Smoothies, Chiller, Milkshakes, Cocktails, Desserts, Torten, Waffeln, Eiscreme und Backwaren. Zubereitung Frozen: 1 Teil Sauce mit 3 Teilen Crushed Ice im Hochleistungsmixer fein pürieren.",
    tr: "%50 Böğürtlen meyve oranına sahip yüksek kaliteli meyveli püre sos. Frozen, smoothie, chiller, milkshake, kokteyl, dondurma, pasta, tart, kek, waffle ve sütlü tatlılarda direkt veya süsleme amaçlı kullanılır. Frozen Hazırlanışı: 1 ölçü sos, 3 ölçü buz ile yüksek devirli blenderda pürüzsüz kıvama gelene kadar karıştırılır.",
    en: "Premium fruit puree with 50% blackberry fruit content. Perfect for Frozen, Smoothies, Chillers, Milkshakes, Cocktails, Ice Creams, Pastries, Cakes, and Waffles. Frozen Preparation: Mix 1 part sauce with 3 parts crushed ice in a high-speed blender.",
    ar: "بيوريه فواكه البلاك بيري (توت العليق الأسود) بنسبة فاكهة %50. مثالي للفروسن، السموثي، الميلك شيك، الكوكتيلات، الآيس كريم، الحلويات، الكيك والوافل."
  };

  const { data: pData } = await supabase.from('urunler').select('teknik_ozellikler').eq('id', pId).single();
  const existingTeknik = pData?.teknik_ozellikler || {};

  const updatedTeknik = {
    ...existingTeknik,
    vegan: true,
    laktosefrei: true,
    glutenfrei: true,
    vegetarisch: true,
    ohne_zucker: false,
    geschmack: ["brombeere", "bogurtlen", "blackberry"],
    birim_agirlik_kg: 1,
    koli_ici_adet: 6,
    palet_ici_adet: 170
  };

  const updatePayload = {
    inhaltsstoffe,
    naehrwerte,
    besin_degerleri: JSON.stringify(naehrwerte),
    allergene,
    aciklamalar,
    teknik_ozellikler: updatedTeknik,
    aktif: true
  };

  const { error: err1 } = await supabase.from('urunler').update(updatePayload).eq('id', pId);
  if (err1) {
    console.error("Error updating Blackberry Fruited Sauce:", err1);
  } else {
    console.log("✅ Main Product (24dc99d5...) successfully updated and activated!");
  }

  const { error: err2 } = await supabase.from('urunler').update({
    ...updatePayload,
    aktif: false
  }).eq('id', duplicateId);
  if (err2) {
    console.error("Error updating duplicate product:", err2);
  } else {
    console.log("✅ Duplicate Product updated as well.");
  }
}

updateBlackberryFruitedSauce();
