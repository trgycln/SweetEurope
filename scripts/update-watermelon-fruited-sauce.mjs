import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateWatermelonFruitedSauce() {
  const pId = "024aecdc-953c-4f7e-8a6f-28427a757e9b";

  const ad = {
    ar: "صلصة بيوريه البطيخ الأحمر فو 1 كجم",
    de: "FO Wassermelonenfruchtpüreesauce 1 Kg",
    en: "FO Watermelon Fruited Sauce 1 Kg",
    tr: "FO Karpuz Meyveli Püre Sos 1 Kg"
  };

  const inhaltsstoffe = {
    de: "Wassermelone (%50), Zucker, Modifizierte Maisstärke, Säureregulator (E 334, E 331iii), Salz, Konservierungsstoff (E 202), Aroma (Wassermelone), Farbstoffe (E 129, E 122).",
    tr: "Karpuz (%50), Şeker, Modifiye mısır nişastası, Asitlik düzenleyici (E 334, E 331iii), Tuz, Koruyucu (E 202), Aroma verici (Karpuz), Renklendiriciler (E 129, E 122).",
    en: "Watermelon (50%), Sugar, Modified corn starch, Acidity regulator (E 334, E 331iii), Salt, Preservative (E 202), Flavouring (Watermelon), Colours (E 129, E 122).",
    ar: "بطيخ أحمر (%50)، سكر، نشا الذرة المعدل، منظم الحموضة (E 334, E 331iii)، ملح، مادة حافظة (E 202)، نكهة (بطيخ أحمر)، ملونات (E 129, E 122)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 963,
      energie_kcal: 230,
      fett: 0.1,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 56.2,
      davon_zucker: 51.8,
      staerke: 4.0,
      ballaststoffe: 0.3,
      eiweiss: 0.1,
      salz: 0.02
    }
  };

  const allergene = {
    allergen_free: true,
    milch: false,
    gluten: false,
    soja: false,
    nuesse: false,
    contains_de: "Allergenfrei / Keine Allergene enthalten. E 122, E 129: Kann die Aktivität und Aufmerksamkeit von Kindern beeinträchtigen.",
    contains_tr: "Alerjen içermez. E 122, E 129: Çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
    contains_en: "Allergen free. E 122, E 129: May have negative effects on the activities and attentions of the children.",
    contains_ar: "خالٍ من مسببات الحساسية. E 122, E 129: قد يؤثر سلباً على نشاط وانتباه الأطفال."
  };

  const aciklamalar = {
    de: `Hochwertiges Fruchtpüree mit 50% Wassermelonen-Anteil. Verleiht Cocktails, Kaffeespezialitäten, Desserts und Backwaren ein intensives, fruchtiges Aroma und eine lebhafte Farbe.

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
    tr: `%50 Gerçek karpuz oranına sahip profesyonel meyveli püre sos. Canlı rengi ve taze aromasıyla içecek ve tatlılarınıza zengin bir lezzet katar.

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
    en: `Premium fruit puree sauce with 50% real watermelon content. Delivers a vibrant color and fresh tropical flavor to desserts and beverages.

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
    ar: `بيوريه البطيخ الأحمر الفاخر بنسبة %50. يمنح المشروبات والحلويات لوناً زاهياً ونكهة منعشة غنية.

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
    geschmack: ["wassermelone", "karpuz", "watermelon"],
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
    console.error("Error updating Watermelon Fruited Sauce:", error);
  } else {
    console.log("✅ Watermelon Fruited Sauce (024aecdc...) successfully updated and activated!");
  }
}

updateWatermelonFruitedSauce();
