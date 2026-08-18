import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updatePassionFruitSauce() {
  const pId = "8ffa3fe9-a81f-43cc-bae7-ceabac4dbb82";

  const ad = {
    ar: "صلصة بيوريه الباشن فروت فو 1 كجم",
    de: "FO Passionsfruchtpüreesauce 1 Kg",
    en: "FO Passion Fruit Fruited Sauce 1 Kg",
    tr: "FO Çarkıfelek Meyveli Püre Sos 1 Kg"
  };

  const inhaltsstoffe = {
    de: "Zucker, Wasser, Passionsfrucht (%20), Modifizierte Maisstärke, Säureregulator (E 334, E 331iii), Aroma (Passionsfrucht), Salz, Konservierungsstoff (E 202), Farbstoffe (E 102, E 110). Hinweis: Farbstoffe E 102 und E 110 können die Aktivität und Aufmerksamkeit bei Kindern beeinträchtigen.",
    tr: "Şeker, Su, Çarkıfelek (%20), Modifiye mısır nişastası, Asitlik düzenleyici (E 334, E 331iii), Aroma verici (Çarkıfelek), Tuz, Koruyucu (E 202), Renklendirici (E 102, E 110). Uyarı: E 102 ve E 110 renklendiricileri çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
    en: "Sugar, Water, Passion Fruit (20%), Modified corn starch, Acidity regulator (E 334, E 331iii), Flavouring (Passion Fruit), Salt, Preservative (E 202), Colours (E 102, E 110). Warning: Colours E 102 and E 110 may have negative effects on activity and attention in children.",
    ar: "سكر، ماء، باشن فروت / زهرة الآلام (%20)، نشا الذرة المعدل، منظم الحموضة (E 334, E 331iii)، نكهة (باشن فروت)، ملح، مادة حافظة (E 202)، ملونات (E 102, E 110). تحذير: قد يكون للملونات E 102 و E 110 تأثير سلبي على النشاط والتركيز لدى الأطفال."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1000,
      energie_kcal: 239,
      fett: 0.1,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 56.8,
      davon_zucker: 54.2,
      staerke: 2.1,
      ballaststoffe: 2.7,
      eiweiss: 0.6,
      salz: 0.025
    }
  };

  const allergene = {
    allergen_free: true,
    milch: false,
    gluten: false,
    soja: false,
    nuesse: false,
    contains_de: "Allergenfrei / Keine Allergene enthalten. Hinweis: Farbstoffe E 102 und E 110 können die Aktivität und Aufmerksamkeit bei Kindern beeinträchtigen.",
    contains_tr: "Alerjen içermez. Uyarı: E 102 ve E 110 renklendiricileri çocukların aktivite ve dikkatleri üzerine olumsuz etki yapabilir.",
    contains_en: "Allergen free. Note: Colours E 102 and E 110 may have negative effects on activity and attention in children.",
    contains_ar: "خالٍ من مسببات الحساسية. ملاحظة: قد يكون للملونات E 102 و E 110 تأثير سلبي على النشاط والتركيز لدى الأطفال."
  };

  const aciklamalar = {
    de: `Hochwertiges Fruchtpüree mit 20% Passionsfrucht-Anteil (Maracuja / Passion Fruit). Verleiht Cocktails, Desserts und Backwaren ein intensives, exotisch-fruchtiges Aroma.

Einsatzgebiete:
• Frozen, Smoothies, Chiller, Milkshakes & Ice Slush
• Cocktails & Mocktails
• Eiscreme, Fruchteis & Parfait
• Torten, Kuchen, Tartes, Muffins & Waffeln
• Cremes, Schlagsahne, Mousses, Gelees & Desserts

Zubereitung & Dosierung:
• Im Mixer / Blender: 1 Teil Sauce mit 3 Teilen Crushed Ice im Hochleistungsmixer oder Frozen-Blender fein pürieren.
• In der Slush-/Eismaschine: 1 Teil Sauce mit 3 Teilen Wasser mischen und in der Maschine gefrieren lassen.
• Direktverwendung: Als Topping oder Füllung direkt auf Desserts, Eis und Backwaren dosierbar.

Lagerung:
Vor direkter Sonneneinstrahlung schützen. Kühl und trocken lagern.`,
    tr: `%20 Gerçek çarkıfelek (passion fruit / maracuja) meyve oranına sahip profesyonel meyveli püre sos. Canlı rengi ve egzotik lezzetiyle içecek ve tatlılarınıza eşsiz bir tat katar.

Kullanım Alanları:
• Frozen, Smoothie, Chiller, Milkshake ve Karlı İçecekler (Ice Slush)
• Dondurma yapımı ve dondurma üzeri soslama
• Pasta, tart, kek, muffin ve waffle arasına / üzerine direkt kullanım
• Krema, krem şanti, jöle, parfe, meyveli yoğurt ve sütlü tatlılar
• Kokteyl ve mocktail hazırlama

Hazırlanışı ve Kullanım Talimatı:
• Blender ile Frozen: 1 ölçü sos, 3 ölçü buz ile yüksek devirli blenderda ince buz kıvamına gelene kadar karıştırılır.
• Karlama / Slush Makinesi ile: 1 ölçü sos, 3 ölçü su ile karıştırılarak buzlanma elde edilene kadar makinede çalıştırılır.
• Direkt Sos Olarak: Tatlı, pasta ve dondurma üzerine direkt uygulanarak zaman ve işçilik tasarrufu sağlar.

Saklama Koşulları:
Güneş ışığından uzakta, serin ve kuru yerde muhafaza ediniz.`,
    en: `Premium fruit puree sauce with 20% real passion fruit content. Delivers an intense exotic aroma and vibrant tropical flavor to beverages and desserts.

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
    ar: `بيوريه فاكهة الباشن فروت (زهرة الآلام / الماراكويا) الفاخر بنسبة فاكهة %20. يمنح المشروبات والحلويات نكهة استوائية غنية ولوناً جذاباً.

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
    geschmack: ["passionsfrucht", "carkifelek", "passion-fruit", "maracuja"],
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
    console.error("Error updating Passion Fruit Sauce:", error);
  } else {
    console.log("✅ Passion Fruit Sauce (8ffa3fe9...) successfully updated and activated!");
  }
}

updatePassionFruitSauce();
