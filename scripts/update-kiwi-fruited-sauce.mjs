import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateKiwiFruitedSauce() {
  const pId = "5bcfaac8-3211-429b-abb2-e12ef66da2cc";

  const ad = {
    ar: "صلصة بيوريه الكيوي فو 1 كجم",
    de: "FO Kiwifruchtpüreesauce 1 Kg",
    en: "FO Kiwi Fruited Sauce 1 Kg",
    tr: "FO Kivi Meyveli Püre Sos 1 Kg"
  };

  const inhaltsstoffe = {
    de: "Kiwi (%50), Zucker, Modifizierte Maisstärke, Säureregulator (E 334, E 331iii), Aroma (Kiwi), Salz, Konservierungsstoff (E 202), Farbstoffe (E 102, E 133).",
    tr: "Kivi (%50), Şeker, Modifiye mısır nişastası, Asitlik düzenleyici (E 334, E 331iii), Aroma verici (Kivi), Tuz, Koruyucu (E 202), Renklendiriciler (E 102, E 133).",
    en: "Kiwi (50%), Sugar, Modified corn starch, Acidity regulator (E 334, E 331iii), Flavouring (Kiwi), Salt, Preservative (E 202), Colours (E 102, E 133).",
    ar: "كيوي (%50)، سكر، نشا الذرة المعدل، منظم الحموضة (E 334, E 331iii)، نكهة (كيوي)، ملح، مادة حافظة (E 202)، ملونات (E 102, E 133)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 999,
      energie_kcal: 239,
      fett: 0.1,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 57.2,
      davon_zucker: 56.2,
      staerke: 0.6,
      ballaststoffe: 1.6,
      eiweiss: 0.7,
      salz: 0.01
    }
  };

  const allergene = {
    allergen_free: true,
    milch: false,
    gluten: false,
    soja: false,
    nuesse: false,
    contains_de: "Allergenfrei / Keine Allergene enthalten. E 102: Kann die Aktivität und Aufmerksamkeit von Kindern beeinträchtigen.",
    contains_tr: "Alerjen içermez. E 102: Çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
    contains_en: "Allergen free. E 102: May have negative effects on the activities and attentions of the children.",
    contains_ar: "خالٍ من مسببات الحساسية. E 102: قد يؤثر سلباً على نشاط وانتباه الأطفال."
  };

  const aciklamalar = {
    de: `Hochwertiges Fruchtpüree mit 50% Kiwi-Anteil. Verleiht Cocktails, Kaffeespezialitäten, Desserts und Backwaren ein intensives, fruchtiges Aroma und eine lebhafte grüne Farbe.

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
    tr: `%50 Gerçek kivi oranına sahip profesyonel meyveli püre sos. Canlı yeşil rengi ve taze aromasıyla içecek ve tatlılarınıza zengin bir lezzet katar.

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
    en: `Premium fruit puree sauce with 50% real kiwi content. Delivers a vibrant green color and fresh tropical flavor to desserts and beverages.

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
    ar: `بيوريه الكيوي الفاخر بنسبة %50. يمنح المشروبات والحلويات لوناً أخضر زاهياً ونكهة منعشة غنية.

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
    geschmack: ["kiwi", "kivi"],
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
    console.error("Error updating Kiwi Fruited Sauce:", error);
  } else {
    console.log("✅ Kiwi Fruited Sauce (5bcfaac8...) successfully updated and activated!");
  }
}

updateKiwiFruitedSauce();
