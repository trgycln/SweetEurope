import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updatePeachFruitedSauce() {
  const pId = "11924546-d75b-43d5-9562-1976c25c0489";

  const ad = {
    ar: "صلصة بيوريه الخوخ فو 1 كجم",
    de: "FO Pfirsichfruchtpüreesauce 1 Kg",
    en: "FO Peach Fruited Sauce 1 Kg",
    tr: "FO Şeftali Meyveli Püre Sos 1 Kg"
  };

  const inhaltsstoffe = {
    de: "Pfirsich (% 50), Zucker, Modifizierte maisstärke, Säuerungsmittel (E 334, E 331iii), Aroma (Pfirsich), Salz, Konservierungsstoffe (E 202), Farbstoffe (E102, E110).",
    tr: "Şeftali (% 50), Şeker, Modifiye mısır nişastası, Asitlik düzenleyici (E 334, E 331iii), Aroma verici (Şeftali), Tuz, Koruyucu (E 202), Renklendirici (E 102,E 110 ).",
    en: "Peach (50%), Sugar, Modified corn starch, Acidity regulator (E 334, E 331iii), Flavouring (Peach), Salt, Preservative (E 202), Colour (E 102, E 110 ).",
    ar: "خوخ (%50)، سكر، نشاء الذرة المعدل، منظم الحموضة (E 334، E 331iii)، نكهة (خوخ)، ملح، مادة حافظة (E 202)، ملون (E 102، E 110)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 976,
      energie_kcal: 233,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 56.5,
      davon_zucker: 52.6,
      staerke: 3.6,
      ballaststoffe: 0.5,
      eiweiss: 0.4,
      salz: 0.015
    }
  };

  const allergene = {
    allergen_free: true,
    milch: false,
    gluten: false,
    soja: false,
    nuesse: false,
    contains_de: "Allergenfrei / Keine Allergene enthalten. E102 E110: Kann die aktivität und aufmerksamkeit von kindern beeinträchtigen.",
    contains_tr: "Alerjen içermez. E 102, E 110: Çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
    contains_en: "Allergen free. E 102, E110: May have negative effects on the activities and attentions of the children.",
    contains_ar: "خالٍ من مسببات الحساسية. E 102, E 110: قد يؤثر سلباً على نشاط وانتباه الأطفال."
  };

  const aciklamalar = {
    de: `Hochwertiges Fruchtpüree mit 50% Pfirsich-Anteil. Verleiht Cocktails, Kaffeespezialitäten, Desserts und Backwaren ein intensives, fruchtiges Aroma und eine lebhafte Farbe.

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
    tr: `%50 Gerçek şeftali oranına sahip profesyonel meyveli püre sos. Egzotik meyve aromasıyla içecek ve tatlılarınıza zengin bir lezzet katar.

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
    en: `Premium fruit puree sauce with 50% real peach content. Delivers an exotic tropical flavor and vibrant color to desserts and beverages.

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
    ar: `بيوريه الخوخ الفاخر بنسبة %50. يمنح المشروبات والحلويات نكهة استوائية غنية ولوناً زاهياً.

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
    geschmack: ["pfirsich", "şeftali", "peach", "seftali"],
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
    console.error("Error updating Peach Fruited Sauce:", error);
  } else {
    console.log("✅ Peach Fruited Sauce (11924546...) successfully updated and activated!");
  }
}

updatePeachFruitedSauce();
