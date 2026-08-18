import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateWildberryFruitedSauce() {
  const pId = "114d0277-2b63-4ca1-b65e-ac5cb66e64c5";

  const ad = {
    ar: "صلصة بيوريه الفواكه البرية فو 1 كجم",
    de: "FO Waldbeerenfruchtpüreesauce 1 Kg",
    en: "FO Wild Berries Fruited Sauce 1 Kg",
    tr: "FO Orman Meyveli Püre Sos 1 Kg"
  };

  const inhaltsstoffe = {
    de: "Zucker, Erdbeere (% 20), Himbeere (% 10), Heidelbeere (% 10), Brombeere (% 10), modifizierte Maisstärke, Säuerungsmittel (E 334, E331iii), Aroma (Erdbeere, Himbeere, Heidelbeere, Brombeere), Salz, Konservierungsstoffe (E 202), Farbstoffe (E 124, E 133).",
    tr: "Şeker, Çilek (% 20), Frambuaz (% 10), Yaban mersini (% 10), Böğürtlen (% 10), Modifiye mısır nişastası, Asitlik düzenleyici (E 334, E 331iii), Aroma verici (Çilek, Frambuaz, Yaban mersini, Böğürtlen), Tuz, Koruyucu (E 202), Renklendirici (E 124, E 133).",
    en: "Sugar, Strawberry (20%), Raspberry (10%), Blueberry (10%), Blackberry (10%), Modified corn starch, Acidity regulator (E 334, E 331iii), Flavouring (Strawberry, Raspberry, Blueberry, Blackberry), Salt, Preservative (E 202), Colour (E 124, E 133).",
    ar: "سكر، فراولة (20%)، توت العليق (10%)، توت أزرق (10%)، توت أسود (10%)، نشاء الذرة المعدل، منظم الحموضة (E 334، E 331iii)، نكهة (فراولة، توت العليق، توت أزرق، توت أسود)، ملح، مادة حافظة (E 202)، ملون (E 124، E 133)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 991,
      energie_kcal: 237,
      fett: 0.1,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 56.1,
      davon_zucker: 54.2,
      staerke: 1.4,
      ballaststoffe: 2.2,
      eiweiss: 0.5,
      salz: 0.0
    }
  };

  const allergene = {
    allergen_free: true,
    milch: false,
    gluten: false,
    soja: false,
    nuesse: false,
    contains_de: "Allergenfrei / Keine Allergene enthalten. E 124: Kann negative Auswirkungen zu den Aktivitäten und Aufmerksamkeit der Kinder haben.",
    contains_tr: "Alerjen içermez. E 124: Çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
    contains_en: "Allergen free. E 124: May have negative effects on children's activity and attention.",
    contains_ar: "خالٍ من مسببات الحساسية. E 124: قد يؤثر سلباً على نشاط وانتباه الأطفال."
  };

  const aciklamalar = {
    de: `Hochwertiges Fruchtpüree mit 50% Waldbeeren-Anteil (Erdbeere, Himbeere, Heidelbeere, Brombeere). Verleiht Cocktails, Kaffeespezialitäten, Desserts und Backwaren ein intensives, fruchtiges Aroma und eine lebhafte Farbe.

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
    tr: `%50 Gerçek orman meyveleri (Çilek, Frambuaz, Yaban mersini, Böğürtlen) oranına sahip profesyonel meyveli püre sos. Egzotik meyve aromasıyla içecek ve tatlılarınıza zengin bir lezzet katar.

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
    en: `Premium fruit puree sauce with 50% real wild berries content (Strawberry, Raspberry, Blueberry, Blackberry). Delivers a rich berry flavor and vibrant color to desserts and beverages.

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
    ar: `بيوريه الفواكه البرية الفاخر بنسبة %50 (فراولة، توت العليق، توت أزرق، توت أسود). يمنح المشروبات والحلويات نكهة التوت الغنية ولوناً زاهياً.

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
    geschmack: ["waldbeeren", "orman meyve", "wildberry"],
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
    console.error("Error updating Wildberry Fruited Sauce:", error);
  } else {
    console.log("✅ Wildberry Fruited Sauce (114d0277...) successfully updated and activated!");
  }
}

updateWildberryFruitedSauce();
