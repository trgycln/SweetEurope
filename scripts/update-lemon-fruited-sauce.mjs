import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateLemonFruitedSauce() {
  const pId = "e87a76a4-103f-410c-9e39-a6be21b7f433";

  const ad = {
    ar: "صلصة بيوريه الليمون فو 1 كجم",
    de: "FO Zitronenfruchtpüreesauce 1 Kg",
    en: "FO Lemon Fruited Sauce 1 Kg",
    tr: "FO Limon Meyveli Püre Sos 1 Kg"
  };

  const inhaltsstoffe = {
    de: "Zucker, Zitrone (%40), Wasser, Modifizierte Maisstärke, Säuerungsmittel (E 330, E 332ii), Limonensaftkonzentrat (%1), Aroma (Zitrone), Säuerungsmittel (E 330), Antioxidationsmittel (E 307), Konservierungsstoffe (E 202, E 211), Farbstoffe (E 104, E 110).",
    tr: "Şeker, Limon (%40), Su, Modifiye mısır nişastası, Asitlik düzenleyici (E 330, E 332ii), Limon aromalı emülsiyon (%1) [Su, Limon aroması, Kıvam artırıcı (E 414, E 445), Doğala özdeş limon aroması, Asitlik düzenleyici (E 330), Antioksidan (E 307), Koruyucu (E 211), Renklendiriciler (E 104, E 110)], Aroma verici (Limon), Koruyucu (E 202), Renklendirici (E 104).",
    en: "Sugar, Lemon (40%), Water, Modified corn starch, Acidity regulator (E 330, E 332ii), Lemon flavored emulsion (1%) [Water, Thickener (E 414, E 445), Natural flavouring, Acidity regulator (E 330), Antioxidant (E 307), Preservative (E 211), Colour (E 104, E 110)], Flavouring (Lemon), Preservative (E 202), Colour (E 104).",
    ar: "سكر، ليمون (%40)، ماء، نشاء الذرة المعدل، منظم الحموضة (E 330، E 332ii)، مستحلب بنكهة الليمون (%1) [ماء، نكهة الليمون، مثخن (E 414، E 445)، نكهة الليمون الطبيعية، منظم الحموضة (E 330)، مضاد للأكسدة (E 307)، مادة حافظة (E 211)، ملونات (E 104، E 110)]، نكهة (ليمون)، مادة حافظة (E 202)، ملون (E 104)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1030,
      energie_kcal: 246,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 58.0,
      davon_zucker: 54.9,
      staerke: 3.2,
      ballaststoffe: 0.2,
      eiweiss: 0.1,
      salz: 0.018
    }
  };

  const allergene = {
    allergen_free: true,
    milch: false,
    gluten: false,
    soja: false,
    nuesse: false,
    contains_de: "Allergenfrei / Keine Allergene enthalten. E 104, E 110: Kann die Aktivität und Aufmerksamkeit von Kindern beeinträchtigen.",
    contains_tr: "Alerjen içermez. E 104, E 110: Çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
    contains_en: "Allergen free. E 104, E 110: May have negative effects on the activities and attentions of the children.",
    contains_ar: "خالٍ من مسببات الحساسية. E 104, E 110: قد يؤثر سلباً على نشاط وانتباه الأطفال."
  };

  const aciklamalar = {
    de: `Hochwertiges Fruchtpüree mit 40% Zitronen-Anteil. Verleiht Cocktails, Kaffeespezialitäten, Desserts und Backwaren ein intensives, erfrischendes Zitrusaroma und eine lebhafte Farbe.

Einsatzgebiete:
• Frozen, Smoothies, Chiller, Milkshakes & Ice Slush
• Cocktails & Mocktails
• Eiscreme, Fruchteis & Parfait
• Torten, Kuchen, Tartes, Muffins & Waffeln
• Cremes, Schlagsahne, Mousses, Gelees & Desserts

Zubereitung & Dosierung:
• Im Mixer / Blender (Frozen): 1 Teil Sauce mit 3 Teilen Crushed Ice im Hochleistungsmixer oder Frozen-Blender fein pürieren.
• In der Slush-/Eismaschine: 1 Teil Sauce mit 3 Teilen Wasser mischen und in der Maschine gefrieren lassen.
• Direktverwendung: Als Topping oder Füllung direkt auf Desserts, Eis und Backwaren dosierbar.

Lagerung:
Vor direkter Sonneneinstrahlung schützen. Kühl und trocken lagern.`,
    tr: `%40 Gerçek limon oranına sahip profesyonel meyveli püre sos. Ferahlatıcı narenciye aromasıyla içecek ve tatlılarınıza zengin bir lezzet katar.

Kullanım Alanları:
• Frozen, Smoothie, Chiller, Milkshake ve Karlı İçecekler (Ice Slush)
• Kokteyl ve Mocktail hazırlama
• Dondurma yapımı ve dondurma üzeri soslama
• Pasta, tart, kek, muffin ve waffle arasına / üzerine direkt kullanım
• Krema, krem şanti, jöle, parfe, meyveli yoğurt ve sütlü tatlılar

Hazırlanışı ve Kullanım Talimatı:
• Blender ile Frozen: 1 ölçü sos, 3 ölçü buz ile yüksek devirli blenderda ince buz kıvamına gelene kadar karıştırılır.
• Karlama / Slush Makinesi ile: 1 ölçü sos, 3 ölçü su ile karıştırılarak buzlanma elde edilene kadar makinede çalıştırılır.
• Direkt Sos Olarak: Tatlı, pasta ve dondurma üzerine direkt uygulanarak zaman ve işçilik tasarrufu sağlar.

Saklama Koşulları:
Güneş ışığından uzakta, serin ve kuru yerde muhafaza ediniz.`,
    en: `Premium fruit puree sauce with 40% real lemon content. Delivers a refreshing citrus flavor and vibrant color to desserts and beverages.

Applications:
• Frozen, Smoothies, Chillers, Milkshakes & Ice Slush
• Cocktails & Mocktails
• Ice creams, Gelatos & Parfaits
• Pastries, Cakes, Tarts, Muffins & Waffles
• Creams, Whipped creams, Mousses, Jellies & Desserts

Preparation & Suggested Uses:
• In Blender (Frozen): Blend 1 part sauce with 3 parts crushed ice in a high-speed blender until smooth.
• In Slush Machine: Mix 1 part sauce with 3 parts water and freeze in the slush machine.
• Direct Usage: Ready to use directly as topping or filling, saving preparation time.

Storage:
Store in a cool and dry place away from direct sunlight.`,
    ar: `بيوريه الليمون الفاخر بنسبة %40. يمنح المشروبات والحلويات نكهة حمضيات منعشة ولوناً زاهياً.

مجالات الاستخدام:
• الفروسن، السموثي، الشيلر، الميلك شيك ومشروبات السلاش المثلجة
• الكوكتيلات والموكتيلات
• الآيس كريم والبارفيه
• الكيك، التارت، المافن، الوافل والحلويات الحليبية
• الكريمة، الجيلي، الموس وتزيين الحلويات

طريقة التحضير:
• بالخلاط (فروسن): يُخلط مقدار 1 من الصلصة مع 3 مقادير من الثلج المجروش في خلاط عالي السرعة.
• بماكينة السلاش: يُخلط مقدار 1 من الصلصة مع 3 مقادير من الماء وتُشغل الماكينة حتى الوصول للقوام المطلوب.

شروط التخزين:
يحفظ في مكان بارد وجاف بعيداً عن أشعة الشمس المباشرة.`
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
    geschmack: ["zitrone", "limon", "lemon"],
    birim_agirlik_kg: 1,
    koli_ici_adet: 6,
    palet_ici_adet: 170
  };

  const updatePayload = {
    ad,
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
    console.error("Error updating Lemon Fruited Sauce:", error);
  } else {
    console.log("✅ Lemon Fruited Sauce (e87a76a4...) successfully updated and activated!");
  }
}

updateLemonFruitedSauce();
