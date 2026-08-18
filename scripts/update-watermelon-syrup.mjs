import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateWatermelonSyrup() {
  const pId = "2066bf6d-5223-47db-ad55-d60143620d0a";

  const ad = {
    tr: "FO Karpuz Aromalı Şurup 700 ml",
    de: "FO Sirup mit Wassermelonen Aroma 700 ml",
    en: "FO Watermelon Flavored Syrup 700 ml",
    ar: "شراب بنكهة البطيخ فو 700 مل"
  };

  const inhaltsstoffe = {
    tr: "Şeker, Su, Asitlik düzenleyici (E 330), Aroma verici (Karpuz), Renklendirici (E 129), Koruyucu (E 202, E 211).",
    de: "Zucker, Wasser, Säuerungsmittel (E 330), Aroma (Wassermelone), Farbstoffe (E 129), Konservierungsstoffe (E 202, E 211).",
    en: "Sugar, Water, Acidity regulator (E 330), Flavouring (Watermelon), Colour (E 129), Preservative (E 202, E 211).",
    ar: "سكر، ماء، منظم حموضة (E 330)، نكهة (البطيخ)، ملون (E 129)، مواد حافظة (E 202، E 211)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1410,
      energie_kcal: 336,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 82.1,
      davon_zucker: 82.1,
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
    contains_de: "Glutenfrei, Allergenfrei. Warnung: E 129 kann negative Auswirkungen auf die Aktivität und Aufmerksamkeit von Kindern haben.",
    contains_tr: "Glütensiz, Alerjen içermez. Uyarı: E 129 Çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
    contains_en: "Gluten free, Allergen free. Warning: E 129 may have negative effects on children's activity and attention.",
    contains_ar: "خالي من الغلوتين، خالٍ من مسببات الحساسية. تحذير: E 129 قد يؤثر سلبا على نشاط وانتباه الأطفال."
  };

  const aciklamalar = {
    tr: `Gerçek şeker ile üretilmiş profesyonel karpuz aromalı şurup. İçeceklerinize ferahlatıcı yaz esintisi ve canlı bir kırmızı renk katar.

**Kullanım Alanları ve Talimatı:**
- Kokteyl, mocktail, soğuk çay, smoothie, milkshake ve soda bazlı içeceklerde 1/8 oranında kullanılır.
- Sıcak veya soğuk su ile 1/8 oranında karıştırılarak doğrudan içilebilir.
- Tatlı ve pastacılık ürünlerine lezzet katmak için istenilen miktarda eklenebilir.

**Saklama Koşulları:**
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    de: `Mit echtem Zucker hergestellter, professioneller Sirup mit Wassermelonen-Aroma. Verleiht Ihren Getränken eine erfrischende Sommerbrise und eine lebendige rote Farbe.

**Anwendung:**
- Ideal für Cocktails, Mocktails, Eistee, Smoothies, Milchshakes und Limonaden im Verhältnis 1:8.
- Kann mit heißem oder kaltem Wasser (1:8) gemischt genossen werden.
- Eignet sich hervorragend zum Verfeinern von Desserts und Gebäck.

**Lagerung:**
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    en: `Professional watermelon flavored syrup made with real sugar. Adds a refreshing summer breeze and a vibrant red color to your beverages.

**Directions for Use:**
- Use at a 1/8 ratio in cocktails, mocktails, iced teas, smoothies, milkshakes, and sodas.
- Can be diluted with hot or cold water (1:8 ratio) to drink directly.
- Add to desserts and pastry products as desired for extra flavor.

**Storage:**
Keep in a cool and dry place away from direct sunlight.`,
    ar: `شراب احترافي بنكهة البطيخ مصنوع من السكر الحقيقي. يضيف نسيم الصيف المنعش ولونًا أحمر نابضًا بالحياة إلى مشروباتك.

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
    geschmack: ["karpuz", "wassermelone", "watermelon", "بطيخ"],
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
    console.error("Error updating Watermelon Flavored Syrup:", error);
  } else {
    console.log("✅ Watermelon Flavored Syrup successfully updated and activated!");
  }
}

updateWatermelonSyrup();
