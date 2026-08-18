import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateGreenAppleFruitedSauce() {
  const pId = "531facb3-06cc-453b-8367-955fcde6458e";

  const ad = {
    ar: "صلصة بيوريه التفاح الأخضر فو 1 كجم",
    de: "FO Grüner Apfelfruchtpüreesauce 1 Kg",
    en: "FO Green Apple Fruited Sauce 1 Kg",
    tr: "FO Yeşil Elma Meyveli Püre Sos 1 Kg"
  };

  const inhaltsstoffe = {
    de: "Grüner Apfel (% 50), Zucker, Modifizierte Maisstärke, Säuerungsmittel (E 334, E 331iii), Aroma (Grüner Apfel), Salz, Konservierungsstoffe (E 202), Farbstoffe (E 102, E 133).",
    tr: "Yeşil elma (% 50), Şeker, Modifiye mısır nişastası, Asitlik düzenleyici (E 334, E 331iii), Aroma verici (Yeşil elma), Tuz, Koruyucu (E 202), Renklendirici (E 102, E 133).",
    en: "Green apple (50%), Sugar, Modified corn starch, Acidity regulator (E 334, E 331iii), Flavouring (Green Apple), Salt, Preservative (E 202), Colour (E 102, E 133).",
    ar: "تفاح أخضر (%50)، سكر، نشاء الذرة المعدل، منظم الحموضة (E 334، E 331iii)، نكهة (تفاح أخضر)، ملح، مادة حافظة (E 202)، ملون (E 102، E 133)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1400,
      energie_kcal: 334,
      fett: 0.2,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 78.9,
      davon_zucker: 77.0,
      staerke: 1.5,
      ballaststoffe: 4.1,
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
    contains_de: "Allergenfrei / Keine Allergene enthalten. E 102: Kann negative Auswirkungen zu den Aktivitäten und Aufmerksamkeit der Kinder haben.",
    contains_tr: "Alerjen içermez. E 102: Çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
    contains_en: "Allergen free. E 102: May have negative effects on the activities and attentions of the children.",
    contains_ar: "خالٍ من مسببات الحساسية. E 102: قد يؤثر سلباً على نشاط وانتباه الأطفال."
  };

  const aciklamalar = {
    de: `Hochwertiges Fruchtpüree mit 50% Grüner Apfel-Anteil. Verleiht Cocktails, Kaffeespezialitäten, Desserts und Backwaren ein intensives, erfrischendes Aroma und eine lebhafte grüne Farbe.

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
    tr: `%50 Gerçek yeşil elma oranına sahip profesyonel meyveli püre sos. Ferahlatıcı meyve aromasıyla içecek ve tatlılarınıza zengin bir lezzet katar.

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
    en: `Premium fruit puree sauce with 50% real green apple content. Delivers a refreshing tart flavor and vibrant green color to desserts and beverages.

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
    ar: `بيوريه التفاح الأخضر الفاخر بنسبة %50. يمنح المشروبات والحلويات نكهة منعشة ولوناً أخضر زاهياً.

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
    geschmack: ["grüner apfel", "yesil elma", "green apple", "yeşil elma"],
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
    console.error("Error updating Green Apple Fruited Sauce:", error);
  } else {
    console.log("✅ Green Apple Fruited Sauce (531facb3...) successfully updated and activated!");
  }
}

updateGreenAppleFruitedSauce();
