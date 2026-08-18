import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateBlackMulberryFruitedSauce() {
  const pId = "fe93aa42-578a-43fb-b34d-8f6525148ae7";

  const ad = {
    ar: "صلصة بيوريه التوت الأسود فو 1 كجم",
    de: "FO Schwarze Maulbeerfruchtpüreesauce 1 Kg",
    en: "FO Black Mulberry Fruited Sauce 1 Kg",
    tr: "FO Karadut Meyveli Püre Sos 1 Kg"
  };

  const inhaltsstoffe = {
    de: "Schwarze Maulbeere (%50), Zucker, Modifizierte Maisstärke, Säureregulator (E 334, E 331iii), Salz, Konservierungsstoff (E 202), Aroma (Schwarze Maulbeere), Farbstoffe (E 122, E 133). Hinweis: Farbstoff E 122 kann die Aktivität und Aufmerksamkeit bei Kindern beeinträchtigen.",
    tr: "Karadut (%50), Şeker, Modifiye mısır nişastası, Asitlik düzenleyici (E 334, E 331iii), Tuz, Koruyucu (E 202), Aroma verici (Karadut), Renklendirici (E 122, E 133). Uyarı: E 122 renklendiricisi çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
    en: "Black mulberry (50%), Sugar, Modified corn starch, Acidity regulator (E 334, E 331iii), Salt, Preservative (E 202), Flavouring (Black mulberry), Colours (E 122, E 133). Warning: Colour E 122 may have negative effects on activity and attention in children.",
    ar: "توت أسود (كرادوت) (%50)، سكر، نشا الذرة المعدل، منظم الحموضة (E 334, E 331iii)، ملح، مادة حافظة (E 202)، نكهة (توت أسود)، ملونات (E 122, E 133). تحذير: قد يكون للملون E 122 تأثير سلبي على النشاط والتركيز لدى الأطفال."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 961,
      energie_kcal: 230,
      fett: 0.1,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 54.9,
      davon_zucker: 53.2,
      staerke: 1.1,
      ballaststoffe: 1.0,
      eiweiss: 1.0,
      salz: 0.01
    }
  };

  const allergene = {
    allergen_free: true,
    milch: false,
    gluten: false,
    soja: false,
    nuesse: false,
    contains_de: "Allergenfrei / Keine Allergene enthalten. Hinweis: Farbstoff E 122 kann die Aktivität und Aufmerksamkeit bei Kindern beeinträchtigen.",
    contains_tr: "Alerjen içermez. Uyarı: E 122 renklendiricisi çocukların aktivite ve dikkatleri üzerine olumsuz etki yapabilir.",
    contains_en: "Allergen free. Note: Colour E 122 may have negative effects on activity and attention in children.",
    contains_ar: "خالٍ من مسببات الحساسية. ملاحظة: قد يكون للملون E 122 تأثير سلبي على النشاط والتركيز لدى الأطفال."
  };

  const aciklamalar = {
    de: `Hochwertiges Fruchtpüree mit 50% Schwarze Maulbeere-Anteil (Black Mulberry Puree). Verleiht Erfrischungsgetränken, Desserts, Eiskreationen und feinen Backwaren ein intensives, tiefdunkles Beerenaroma.

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
    tr: `%50 Gerçek karadut meyve oranına sahip profesyonel meyveli püre sos. Yoğun karadut lezzeti ve zengin koyu rengiyle içecek ve tatlılarınıza benzersiz bir tat katar.

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
    en: `Premium fruit puree sauce with 50% real black mulberry content. Delivers rich mulberry flavor and deep natural color to beverages and desserts.

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
    ar: `بيوريه التوت الأسود (الكرادوت) الفاخر بنسبة فاكهة %50. يمنح المشروبات والحلويات نكهة التوت الغنية ولوناً داكناً مميزاً.

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
    geschmack: ["schwarze-maulbeere", "karadut", "black-mulberry"],
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
    console.error("Error updating Black Mulberry Fruited Sauce:", error);
  } else {
    console.log("✅ Black Mulberry Fruited Sauce (fe93aa42...) successfully updated and activated!");
  }
}

updateBlackMulberryFruitedSauce();
