import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateMangoSyrup() {
  const pId = "74e456d4-691f-49f7-bf54-3e83cbec8c9c";

  const ad = {
    tr: "FO Mango Aromalı Şurup 700 ml",
    de: "FO Sirup mit Mango-Aroma 700 ml",
    en: "FO Mango Flavored Syrup 700 ml",
    ar: "شراب بنكهة المانجو فو 700 مل"
  };

  const inhaltsstoffe = {
    tr: "Şeker, Su, Aroma Verici (Mango), Asitlik düzenleyici (E 330), Koruyucu (E 202, E 211), Renklendirici (E 155, E 102, E 133).",
    de: "Zucker, Wasser, Aroma (Mango), Säuerungsmittel (E 330), Konservierungsstoffe (E 202, E 211), Farbstoffe (E 155, E 102, E 133).",
    en: "Sugar, Water, Flavouring (Mango), Acidity regulator (E 330), Preservative (E 202, E 211), Colour (E 155, E 102, E 133).",
    ar: "سكر، ماء، نكهة (مانجو)، منظم حموضة (E 330)، مواد حافظة (E 202، E 211)، ملون (E 155، E 102، E 133)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1410,
      energie_kcal: 337,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 82.0,
      davon_zucker: 82.0,
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
    contains_ar: "خالي من الغلوتين، خالٍ من مسببات الحساسية. تحذير: E 102 قد يؤثر سلباً على نشاط وانتباه الأطفال."
  };

  const aciklamalar = {
    tr: `Gerçek şeker ile üretilmiş profesyonel mango aromalı şurup. İçeceklerinize ve tatlılarınıza tropikal, taze ve egzotik bir mango lezzeti ile canlı bir renk katar.

**Kullanım Alanları ve Talimatı:**
- Kokteyl, mocktail, soğuk çay, smoothie, milkshake ve soda bazlı içeceklerde aroma ve tat katmak amacıyla 1/8 oranında kullanılır.
- Sıcak veya soğuk su ile 1/8 oranında karıştırılarak doğrudan içilebilir.
- Tatlı çeşitlerine ve pastacılık ürünlerine lezzet katmak amacıyla istenilen miktarda ilave edilebilir. Servis önerisidir.

**Saklama Koşulları:**
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    de: `Mit echtem Zucker hergestellter, professioneller Sirup mit Mango-Aroma. Verleiht Ihren Getränken und Desserts ein tropisch-fruchtiges Mango-Aroma und eine ansprechende Farbe.

**Anwendung:**
- Ideal für Cocktails, Mocktails, Eistee, Smoothies, Milchshakes und Limonaden im Verhältnis 1:8.
- Kann mit heißem oder kaltem Wasser (1:8) gemischt genossen werden.
- Eignet sich hervorragend zum Verfeinern von Desserts und Gebäck.

**Lagerung:**
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    en: `Professional mango flavored syrup made with real sugar. Adds a delightful tropical sweetness and a refreshing mango flavor to your beverages and desserts.

**Directions for Use:**
- Use at a 1/8 ratio in cocktails, mocktails, iced teas, smoothies, milkshakes, and sodas.
- Can be diluted with hot or cold water (1:8 ratio) to drink directly.
- Add to desserts and pastry products as desired for extra flavor.

**Storage:**
Keep in a cool and dry place away from direct sunlight.`,
    ar: `شراب احترافي بنكهة المانجو مصنوع من السكر الحقيقي. يضيف حلاوة استوائية ونكهة المانجو المنعشة لمشروباتك وحلوياتك.

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
    geschmack: ["mango", "مانجو"],
    birim_hacim_ml: 700,
    koli_ici_adet: 6,
    palet_ici_adet: 170
  };

  const updatePayload = {
    ad,
    ean_gtin: "8691123473026",
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
    console.error("Error updating Mango Flavored Syrup:", error);
  } else {
    console.log("✅ Mango Flavored Syrup (74e456d4...) successfully updated and activated!");
  }
}

updateMangoSyrup();
