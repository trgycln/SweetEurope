import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateKiwiSyrup() {
  const pId = "22c82f63-fa94-4eb5-9fdf-3ddb41afaac3";

  const ad = {
    tr: "FO Kivi Aromalı Şurup 700 ml",
    de: "FO Sirup mit Kiwi-Aroma 700 ml",
    en: "FO Kiwi Flavored Syrup 700 ml",
    ar: "شراب بنكهة الكيوي فو 700 مل"
  };

  const inhaltsstoffe = {
    tr: "Şeker, Su, Asitlik düzenleyici (E 330), Aroma verici (Kivi), Koruyucu (E 202, E 211), Renklendirici (E 102, E 133).",
    de: "Zucker, Wasser, Säuerungsmittel (E 330), Aroma (Kiwi), Konservierungsstoffe (E 202, E 211), Farbstoffe (E 102, E 133).",
    en: "Sugar, Water, Acidity regulator (E 330), Flavouring (Kiwi), Preservative (E 202, E 211), Colour (E 102, E 133).",
    ar: "سكر، ماء، منظم حموضة (E 330)، نكهة (الكيوي)، مواد حافظة (E 202، E 211)، ملون (E 102، E 133)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1410,
      energie_kcal: 336,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 82.4,
      davon_zucker: 82.4,
      staerke: 0.0,
      ballaststoffe: 0.0,
      eiweiss: 0.0,
      salz: 0.01
    }
  };

  const allergene = {
    allergen_free: true,
    milch: false,
    gluten: false,
    soja: false,
    nuesse: false,
    contains_de: "Glutenfrei, Allergenfrei. Warnung: E 102 kann Aktivität und Aufmerksamkeit bei Kindern beeinträchtigen.",
    contains_tr: "Glütensiz, Alerjen içermez. Uyarı: E 102 Çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
    contains_en: "Gluten free, Allergen free. Warning: E 102 may have negative effects on the activity and attention of children.",
    contains_ar: "خالي من الغلوتين، خالٍ من مسببات الحساسية. تحذير: E 102 قد يؤثر سلبا على نشاط وانتباه الأطفال."
  };

  const aciklamalar = {
    tr: `Gerçek şeker ile üretilmiş profesyonel kivi aromalı şurup. İçeceklerinize canlı bir yeşil renk ve tatlı-ekşi taze bir kivi lezzeti katar.

**Kullanım Alanları ve Talimatı:**
- Kokteyl, mocktail, soğuk çay, smoothie, milkshake ve soda bazlı içeceklerde 1/8 oranında kullanılır.
- Sıcak veya soğuk su ile 1/8 oranında karıştırılarak doğrudan içilebilir.
- Tatlı ve pastacılık ürünlerine lezzet katmak için istenilen miktarda eklenebilir.

**Saklama Koşulları:**
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    de: `Mit echtem Zucker hergestellter, professioneller Sirup mit Kiwi-Aroma. Verleiht Ihren Getränken eine lebhafte grüne Farbe und einen süß-sauren, frischen Kiwi-Geschmack.

**Anwendung:**
- Ideal für Cocktails, Mocktails, Eistee, Smoothies, Milchshakes und Limonaden im Verhältnis 1:8.
- Kann mit heißem oder kaltem Wasser (1:8) gemischt genossen werden.
- Eignet sich hervorragend zum Verfeinern von Desserts und Gebäck.

**Lagerung:**
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    en: `Professional kiwi flavored syrup made with real sugar. Adds a vibrant green color and a sweet-tart fresh kiwi taste to your beverages.

**Directions for Use:**
- Use at a 1/8 ratio in cocktails, mocktails, iced teas, smoothies, milkshakes, and sodas.
- Can be diluted with hot or cold water (1:8 ratio) to drink directly.
- Add to desserts and pastry products as desired for extra flavor.

**Storage:**
Keep in a cool and dry place away from direct sunlight.`,
    ar: `شراب احترافي بنكهة الكيوي مصنوع من السكر الحقيقي. يضيف لونًا أخضر نابضًا بالحياة وطعم كيوي طازج حلو وحامض إلى مشروباتك.

**تعليمات الاستخدام:**
- يستخدم بنسبة 1/8 في الكوكتيلات، الموكتيلات، الشاي المثلج، السموثي، الميلك شيك والمشروبات الغازية.
- يمكن تخفيفه بالماء الساخن أو البارد (بنسبة 1/8) للشرب مباشرة.
- يمكن إضافته إلى الحلويات والمخبوزات بالكمية المرغوبة لتعزيز النكهة.

**شروط التخزين:**
يحفظ في مكان جاف وبارد بعيداً عن أشعة الشمس.`
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
    geschmack: ["kivi", "kiwi", "كيوي"],
    birim_hacim_ml: 700,
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
    console.error("Error updating Kiwi Flavored Syrup:", error);
  } else {
    console.log("✅ Kiwi Flavored Syrup successfully updated and activated!");
  }
}

updateKiwiSyrup();
