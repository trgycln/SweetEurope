import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateRaspberryFruitedSauce() {
  const pId = "0eb33808-ed37-43da-9b85-33144cdb4653";
  const duplicateId = "d40f9ed9-9fef-4a34-bf03-7eff2aa789d1";

  const inhaltsstoffe = {
    de: "Himbeere (%50), Zucker, Modifizierte Maisstärke, Säureregulator (E 334, E 331iii), Aroma (Himbeere), Salz, Konservierungsstoff (E 202), Farbstoffe (E 129, E 122). Hinweis: Farbstoffe E 129 und E 122 können die Aktivität und Aufmerksamkeit bei Kindern beeinträchtigen.",
    tr: "Frambuaz (%50), Şeker, Modifiye mısır nişastası, Asitlik düzenleyici (E 334, E 331iii), Aroma verici (Frambuaz), Tuz, Koruyucu (E 202), Renklendirici (E 129, E 122). Uyarı: E 129 ve E 122 renklendiricileri çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
    en: "Raspberry (50%), Sugar, Modified corn starch, Acidity regulators (E 334, E 331iii), Flavouring (Raspberry), Salt, Preservative (E 202), Colours (E 129, E 122). Warning: Colours E 129 and E 122 may have negative effects on activity and attention in children.",
    ar: "توت العليق (%50)، سكر، نشا الذرة المعدل، منظم الحموضة (E 334, E 331iii)، نكهة (توت العليق)، ملح، مادة حافظة (E 202)، ملونات (E 129, E 122). تحذير: قد يكون للملونات E 129 و E 122 تأثير سلبي على النشاط والتركيز لدى الأطفال."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 980,
      energie_kcal: 234,
      fett: 0.2,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 55.4,
      davon_zucker: 54.0,
      staerke: 1.0,
      ballaststoffe: 2.5,
      eiweiss: 0.6,
      salz: 0.0
    }
  };

  const allergene = {
    allergen_free: true,
    milch: false,
    gluten: false,
    soja: false,
    nuesse: false,
    contains_de: "Allergenfrei / Keine Allergene enthalten. Hinweis: Farbstoffe E 129 und E 122 können die Aktivität und Aufmerksamkeit bei Kindern beeinträchtigen.",
    contains_tr: "Alerjen içermez. Uyarı: E 129 ve E 122 renklendiricileri çocukların aktivite ve dikkatleri üzerine olumsuz etki yapabilir.",
    contains_en: "Allergen free. Note: Colours E 129 and E 122 may have negative effects on activity and attention in children.",
    contains_ar: "خالٍ من مسببات الحساسية. ملاحظة: قد يكون للملونات E 129 و E 122 تأثير سلبي على النشاط والتركيز لدى الأطفال."
  };

  const aciklamalar = {
    de: "Hochwertiges Fruchtpüree mit 50% Fruchtanteil. Ideal für Frozen, Smoothies, Chiller, Milkshakes, Cocktails, Desserts, Torten, Waffeln, Eiscreme und Backwaren. Zubereitung Frozen: 1 Teil Sauce mit 3 Teilen Crushed Ice im Hochleistungsmixer fein pürieren.",
    tr: "50% meyve oranına sahip yüksek kaliteli meyveli püre sos. Frozen, smoothie, chiller, milkshake, kokteyl, dondurma, pasta, tart, kek, waffle ve sütlü tatlılarda direkt veya süsleme amaçlı kullanılır. Frozen Hazırlanışı: 1 ölçü sos, 3 ölçü buz ile yüksek devirli blenderda pürüzsüz kıvama gelene kadar karıştırılır.",
    en: "Premium fruit puree with 50% fruit content. Perfect for Frozen, Smoothies, Chillers, Milkshakes, Cocktails, Ice Creams, Pastries, Cakes, and Waffles. Frozen Preparation: Mix 1 part sauce with 3 parts crushed ice in a high-speed blender.",
    ar: "بيوريه فواكه فاخر بنسبة فواكه %50. مثالي للفروسن، السموثي، الميلك شيك، الكوكتيلات، الآيس كريم، الحلويات، الكيك والوافل."
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
    geschmack: ["himbeere", "frambuaz"],
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
    console.error("Error updating main product:", err1);
  } else {
    console.log("✅ Main Product (0eb33808...) successfully updated and activated!");
  }

  const { error: err2 } = await supabase.from('urunler').update({
    ...updatePayload,
    aktif: false // keep duplicate inactive
  }).eq('id', duplicateId);
  if (err2) {
    console.error("Error updating duplicate product:", err2);
  } else {
    console.log("✅ Duplicate Product updated as well.");
  }
}

updateRaspberryFruitedSauce();
