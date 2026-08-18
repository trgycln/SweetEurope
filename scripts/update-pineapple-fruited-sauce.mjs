import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updatePineappleFruitedSauce() {
  const pId = "cda9db32-fc4b-4834-a12f-c21278896c09";

  const inhaltsstoffe = {
    de: "Zucker, Ananas (%30), Modifizierte Maisstärke, Säureregulator (E 334, E 331iii), Aroma (Ananas), Salz, Konservierungsstoff (E 202), Farbstoff (E 102). Hinweis: Farbstoff E 102 kann die Aktivität und Aufmerksamkeit bei Kindern beeinträchtigen.",
    tr: "Şeker, Ananas (%30), Modifiye mısır nişastası, Asitlik düzenleyici (E 334, E 331iii), Aroma verici (Ananas), Tuz, Koruyucu (E 202), Renklendirici (E 102). Uyarı: E 102 renklendiricisi çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
    en: "Sugar, Pineapple (30%), Modified corn starch, Acidity regulators (E 334, E 331iii), Flavouring (Pineapple), Salt, Preservative (E 202), Colour (E 102). Warning: Colour E 102 may have negative effects on activity and attention in children.",
    ar: "سكر، أناناس (%30)، نشا الذرة المعدل، منظم الحموضة (E 334, E 331iii)، نكهة (أناناس)، ملح، مادة حافظة (E 202)، ملون (E 102). تحذير: قد يكون للملون E 102 تأثير سلبي على النشاط والتركيز لدى الأطفال."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1030,
      energie_kcal: 247,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 60.2,
      davon_zucker: 56.6,
      staerke: 2.4,
      ballaststoffe: 0.8,
      eiweiss: 0.3,
      salz: 0.0
    }
  };

  const allergene = {
    allergen_free: true,
    milch: false,
    gluten: false,
    soja: false,
    nuesse: false,
    contains_de: "Allergenfrei / Keine Allergene enthalten. Hinweis: Farbstoff E 102 kann die Aktivität und Aufmerksamkeit bei Kindern beeinträchtigen.",
    contains_tr: "Alerjen içermez. Uyarı: E 102 renklendiricisi çocukların aktivite ve dikkatleri üzerine olumsuz etki yapabilir.",
    contains_en: "Allergen free. Note: Colour E 102 may have negative effects on activity and attention in children.",
    contains_ar: "خالٍ من مسببات الحساسية. ملاحظة: قد يكون للملون E 102 تأثير سلبي على النشاط والتركيز لدى الأطفال."
  };

  const aciklamalar = {
    de: "Hochwertiges Fruchtpüree mit 30% Ananas-Fruchtanteil. Ideal für Frozen, Smoothies, Chiller, Milkshakes, Cocktails, Desserts, Torten, Waffeln, Eiscreme und Backwaren. Zubereitung Frozen: 1 Teil Sauce mit 3 Teilen Crushed Ice im Hochleistungsmixer fein pürieren.",
    tr: "%30 Ananas meyve oranına sahip yüksek kaliteli meyveli püre sos. Frozen, smoothie, chiller, milkshake, kokteyl, dondurma, pasta, tart, kek, waffle ve sütlü tatlılarda direkt veya süsleme amaçlı kullanılır. Frozen Hazırlanışı: 1 ölçü sos, 3 ölçü buz ile yüksek devirli blenderda pürüzsüz kıvama gelene kadar karıştırılır.",
    en: "Premium fruit puree with 30% pineapple fruit content. Perfect for Frozen, Smoothies, Chillers, Milkshakes, Cocktails, Ice Creams, Pastries, Cakes, and Waffles. Frozen Preparation: Mix 1 part sauce with 3 parts crushed ice in a high-speed blender.",
    ar: "بيوريه فواكه الأناناس بنسبة فاكهة %30. مثالي للفروسن، السموثي، الميلك شيك، الكوكتيلات، الآيس كريم، الحلويات، الكيك والوافل."
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
    geschmack: ["ananas", "pineapple"],
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

  const { error } = await supabase.from('urunler').update(updatePayload).eq('id', pId);
  if (error) {
    console.error("Error updating Pineapple Fruited Sauce:", error);
  } else {
    console.log("✅ Pineapple Fruited Sauce (cda9db32...) successfully updated and activated!");
  }
}

updatePineappleFruitedSauce();
