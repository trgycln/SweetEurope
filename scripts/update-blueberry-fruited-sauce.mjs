import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateBlueberryFruitedSauce() {
  const pId = "2ea65f32-3798-49ff-9f5b-997e0ec2b1da";

  const ad = {
    ar: "صلصة بيوريه التوت الأزرق فو 1 كجم",
    de: "FO Blaubeerfruchtpüreesauce 1 Kg",
    en: "FO Blueberry Fruited Sauce 1 Kg",
    tr: "FO Yaban Mersini Meyveli Püre Sos 1 Kg"
  };

  const inhaltsstoffe = {
    de: "Heidelbeere (% 50), Zucker, Modifizierte Maisstärke, Säuerungsmittel (E 334, E 331iii), Aroma (Heidelbeere), Salz, Konservierungsstoffe (E 202), Farbstoffe (E 129, E 133).",
    tr: "Yaban mersini (% 50), Şeker, Modifiye mısır nişastası, Asitlik düzenleyici (E 334, E 331iii), Aroma verici (Yaban mersini), Tuz, Koruyucu (E 202), Renklendirici (E 129, E 133).",
    en: "Blueberry (50%), Sugar, Modified corn starch, Acidity regulator (E 334, E 331iii), Flavouring (Blueberry), Salt, Preservative (E 202), Colour (E 129, E 133).",
    ar: "توت أزرق (%50)، سكر، نشاء الذرة المعدل، منظم الحموضة (E 334، E 331iii)، نكهة (توت أزرق)، ملح، مادة حافظة (E 202)، ملون (E 129، E 133)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1000,
      energie_kcal: 239,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 57.9,
      davon_zucker: 56.1,
      staerke: 1.1,
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
    contains_de: "Allergenfrei / Keine Allergene enthalten. E 129: Kann negative Auswirkungen zu den Aktivitäten und Aufmerksamkeit der Kinder haben.",
    contains_tr: "Alerjen içermez. E 129: Çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
    contains_en: "Allergen free. E 129: May have negative effects on children's activity and attention.",
    contains_ar: "خالٍ من مسببات الحساسية. E 129: قد يؤثر سلباً على نشاط وانتباه الأطفال."
  };

  const aciklamalar = {
    de: `Hochwertiges Fruchtpüree mit 50% Heidelbeer-Anteil. Verleiht Cocktails, Kaffeespezialitäten, Desserts und Backwaren ein intensives, fruchtiges Aroma und eine lebhafte Farbe.

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
    tr: `%50 Gerçek yaban mersini oranına sahip profesyonel meyveli püre sos. Egzotik meyve aromasıyla içecek ve tatlılarınıza zengin bir lezzet katar.

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
    en: `Premium fruit puree sauce with 50% real blueberry content. Delivers a rich berry flavor and vibrant color to desserts and beverages.

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
    ar: `بيوريه التوت الأزرق الفاخر بنسبة %50. يمنح المشروبات والحلويات نكهة التوت الغنية ولوناً زاهياً.

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
    geschmack: ["blaubeere", "heidelbeere", "yaban mersini", "blueberry"],
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
    console.error("Error updating Blueberry Fruited Sauce:", error);
  } else {
    console.log("✅ Blueberry Fruited Sauce (2ea65f32...) successfully updated and activated!");
  }
}

updateBlueberryFruitedSauce();
