import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateCoconutFruitedSauce() {
  const pId = "e0e43bc5-06cb-40bb-8bb8-7fbaf48be313";

  const ad = {
    ar: "صلصة بيوريه جوز الهند فو 1 كجم",
    de: "FO Kokosnussfruchtpüreesauce 1 Kg",
    en: "FO Coconut Fruited Sauce 1 Kg",
    tr: "FO Hindistan Cevizi Meyveli Püre Sos 1 Kg"
  };

  const inhaltsstoffe = {
    de: "Zucker, Kokosnuss (%30), Wasser, Modifizierte Maisstärke, Säureregulator (E 334, E 331iii), Aroma (Kokosnuss), Salz, Konservierungsstoff (E 202).",
    tr: "Şeker, Hindistan cevizi (%30), Su, Modifiye mısır nişastası, Asitlik düzenleyici (E 334, E 331iii), Aroma verici (Hindistan cevizi), Tuz, Koruyucu (E 202).",
    en: "Sugar, Coconut (30%), Water, Modified corn starch, Acidity regulator (E 334, E 331iii), Flavouring (Coconut), Salt, Preservative (E 202).",
    ar: "سكر، جوز الهند (%30)، ماء، نشا الذرة المعدل، منظم الحموضة (E 334, E 331iii)، نكهة (جوز الهند)، ملح، مادة حافظة (E 202)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 993,
      energie_kcal: 237,
      fett: 1.9,
      davon_gesaettigt: 1.7,
      kohlenhydrate: 53.5,
      davon_zucker: 50.5,
      staerke: 2.8,
      ballaststoffe: 0.5,
      eiweiss: 0.2,
      salz: 0.02
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
    de: `Hochwertiges Fruchtpüree mit 30% Kokosnuss-Anteil (Coconut Puree). Verleiht Cocktails, Kaffeespezialitäten, Desserts und Backwaren ein intensives, exotisch-cremiges Aroma.

Einsatzgebiete:
• Frozen, Smoothies, Chiller, Milkshakes & Ice Slush
• Cocktails (z.B. Piña Colada) & Mocktails
• Eiscreme, Fruchteis & Parfait
• Torten, Kuchen, Tartes, Muffins & Waffeln
• Cremes, Schlagsahne, Mousses, Gelees & Desserts

Zubereitung & Dosierung:
• Im Mixer / Blender (Frozen): 1 Teil Sauce mit 3 Teilen Crushed Ice im Hochleistungsmixer oder Frozen-Blender fein pürieren.
• In der Slush-/Eismaschine: 1 Teil Sauce mit 3 Teilen Wasser mischen und in der Maschine gefrieren lassen.
• Direktverwendung: Als Topping oder Füllung direkt auf Desserts, Eis und Backwaren dosierbar.

Lagerung:
Vor direkter Sonneneinstrahlung schützen. Kühl und trocken lagern.`,
    tr: `%30 Gerçek Hindistan cevizi oranına sahip profesyonel meyveli püre sos. Egzotik ve kremsi aromasıyla içecek ve tatlılarınıza zengin bir lezzet katar.

Kullanım Alanları:
• Frozen, Smoothie, Chiller, Milkshake ve Karlı İçecekler (Ice Slush)
• Piña Colada, Kokteyl ve Mocktail hazırlama
• Dondurma yapımı ve dondurma üzeri soslama
• Pasta, tart, kek, muffin ve waffle arasına / üzerine direkt kullanım
• Krema, krem şanti, jöle, parfe, meyveli yoğurt ve sütlü tatlılar

Hazırlanışı ve Kullanım Talimatı:
• Blender ile Frozen: 1 ölçü sos, 3 ölçü buz ile yüksek devirli blenderda ince buz kıvamına gelene kadar karıştırılır.
• Karlama / Slush Makinesi ile: 1 ölçü sos, 3 ölçü su ile karıştırılarak buzlanma elde edilene kadar makinede çalıştırılır.
• Direkt Sos Olarak: Tatlı, pasta ve dondurma üzerine direkt uygulanarak zaman ve işçilik tasarrufu sağlar.

Saklama Koşulları:
Güneş ışığından uzakta, serin ve kuru yerde muhafaza ediniz.`,
    en: `Premium fruit puree sauce with 30% real coconut content. Delivers an exotic creamy aroma and tropical flavour to desserts and beverages.

Applications:
• Frozen, Smoothies, Chillers, Milkshakes & Ice Slush
• Cocktails (e.g. Piña Colada) & Mocktails
• Ice creams, Gelatos & Parfaits
• Pastries, Cakes, Tarts, Muffins & Waffles
• Creams, Whipped creams, Mousses, Jellies & Desserts

Preparation & Suggested Uses:
• In Blender (Frozen): Blend 1 part sauce with 3 parts crushed ice in a high-speed blender until smooth.
• In Slush Machine: Mix 1 part sauce with 3 parts water and freeze in the slush machine.
• Direct Usage: Ready to use directly as topping or filling, saving preparation time.

Storage:
Store in a cool and dry place away from direct sunlight.`,
    ar: `بيوريه جوز الهند الفاخر بنسبة %30. يمنح المشروبات والحلويات نكهة استوائية كريمية غنية.

مجالات الاستخدام:
• الفروسن، السموثي، الشيلر، الميلك شيك ومشروبات السلاش المثلجة
• كوكتيلات بينا كولادا والموكتيلات
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
    geschmack: ["kokosnuss", "hindistan-cevizi", "coconut"],
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
    console.error("Error updating Coconut Fruited Sauce:", error);
  } else {
    console.log("✅ Coconut Fruited Sauce (e0e43bc5...) successfully updated and activated!");
  }
}

updateCoconutFruitedSauce();
