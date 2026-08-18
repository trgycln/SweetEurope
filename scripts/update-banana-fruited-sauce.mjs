import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateBananaFruitedSauce() {
  const pId = "669a23c7-7f23-4fe6-8c3a-e78f75f28373";

  const ad = {
    ar: "صلصة بيوريه الموز فو 1 كجم",
    de: "FO Bananenfruchtpüreesauce 1 Kg",
    en: "FO Banana Fruited Sauce 1 Kg",
    tr: "FO Muz Meyveli Püre Sos 1 Kg"
  };

  const inhaltsstoffe = {
    de: "Zucker, Wasser, Banane (% 20), modifizierte Maisstärke, Säuerungsmittel (E 334, E331iii), Salz, Aroma (Banane), Konservierungsstoffe (E 202), Farbstoffe (E 101).",
    tr: "Şeker, Su, Muz (% 20), Modifiye mısır nişastası, Asitlik düzenleyici (E334, E331iii), Tuz, Aroma verici (Muz), Koruyucu (E 202), Renklendirici (E 101).",
    en: "Sugar, Water, Banana (20%), Modified corn starch, Acidity regulator (E 334, E 331iii), Salt, Flavouring (Banana), Preservative (E 202), Colour (E 101).",
    ar: "سكر، ماء، موز (20%)، نشاء الذرة المعدل، منظم الحموضة (E 334، E 331iii)، ملح، نكهة (موز)، مادة حافظة (E 202)، ملون (E 101)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1130,
      energie_kcal: 270,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 66.1,
      davon_zucker: 49.4,
      staerke: 12.1,
      ballaststoffe: 0.3,
      eiweiss: 0.2,
      salz: 0.125
    }
  };

  const allergene = {
    allergen_free: true,
    milch: false,
    gluten: false,
    soja: false,
    nuesse: false,
    contains_de: "Allergenfrei / Keine Allergene enthalten.",
    contains_tr: "Alerjen içermez.",
    contains_en: "Allergen free.",
    contains_ar: "خالٍ من مسببات الحساسية."
  };

  const aciklamalar = {
    de: `Hochwertiges Fruchtpüree mit 20% Bananen-Anteil. Verleiht Cocktails, Kaffeespezialitäten, Desserts und Backwaren ein intensives, süßes Aroma und eine lebhafte Farbe.

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
    tr: `%20 Gerçek muz oranına sahip profesyonel meyveli püre sos. Egzotik meyve aromasıyla içecek ve tatlılarınıza zengin bir lezzet katar.

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
    en: `Premium fruit puree sauce with 20% real banana content. Delivers an exotic tropical flavor and vibrant color to desserts and beverages.

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
    ar: `بيوريه الموز الفاخر بنسبة %20. يمنح المشروبات والحلويات نكهة استوائية غنية ولوناً زاهياً.

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
    geschmack: ["banane", "muz", "banana"],
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
    console.error("Error updating Banana Fruited Sauce:", error);
  } else {
    console.log("✅ Banana Fruited Sauce (669a23c7...) successfully updated and activated!");
  }
}

updateBananaFruitedSauce();
