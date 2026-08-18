import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateCoconutSyrup() {
  // FO Hindistan Cevizi Şurubu ID (or update with the exact one if needed, e.g., FO Hindistan Cevizi Normal Şurubu (Şeffaf) : 5a6b34a9-1145-49c6-b3a8-99df9726294c)
  const pId = "2f5104f0-f11f-4015-91d2-7a052bd762b2";

  const ad = {
    tr: "FO Hindistan Cevizi Aromalı Şurup 700 ml",
    de: "FO Kokosnuss Aromasirup 700 ml",
    en: "FO Coconut Flavored Syrup 700 ml",
    ar: "شراب بنكهة جوز الهند فو 700 مل"
  };

  const inhaltsstoffe = {
    tr: "Şeker, Su, Hindistan cevizi aromalı emülsiyon % 0,8 (Su, Kıvam verici (E 414, E 445), Asitlik düzenleyici (E 330), Antioksidan (E 307), Aroma verici, Koruyucu (E 211)), Aroma verici (Hindistan cevizi), Asitlik düzenleyici (E 330), Koruyucu (E 202, E 211).",
    de: "Zucker, Wasser, Emulsion mit Kokosnussaroma 0,8% (Wasser, Verdickungsmittel (E 414, E 445), Säuerungsmittel (E 330), Antioxidationsmittel (E 307), Aroma, Konservierungsstoffe (E 211)), Aroma (Kokosnuss), Säuerungsmittel (E 330), Konservierungsstoffe (E 202, E 211).",
    en: "Sugar, Water, Coconut flavored emulsion 0,8% (Water, Thickener (E 414, E 445), Acidity regulator (E 330), Antioxidant (E 307), Flavouring, Preservative (E 211)), Flavouring (Coconut), Acidity regulator (E 330), Preservative (E 202, E 211).",
    ar: "سكر، ماء، مستحلب بنكهة جوز الهند 0.8% (ماء، مثخن (E 414، E 445)، منظم حموضة (E 330)، مضاد أكسدة (E 307)، نكهة، مادة حافظة (E 211))، نكهة (جوز الهند)، منظم حموضة (E 330)، مادة حافظة (E 202، E 211)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1400,
      energie_kcal: 335,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 82.3,
      davon_zucker: 81.6,
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
    contains_de: "Glutenfrei, Allergenfrei.",
    contains_tr: "Glütensiz, Alerjen içermez.",
    contains_en: "Gluten free, Allergen free.",
    contains_ar: "خالي من الغلوتين، خالٍ من مسببات الحساسية."
  };

  const aciklamalar = {
    tr: `Gerçek şeker ile üretilmiş, otantik hindistan cevizi aromasına sahip profesyonel şurup. İçeceklerinize egzotik bir lezzet katar.

**Kullanım Alanları ve Talimatı:**
- Kokteyl, mocktail, soğuk çay, smoothie, milkshake ve soda bazlı içeceklerde 1/8 oranında kullanılır.
- Sıcak veya soğuk su ile 1/8 oranında karıştırılarak doğrudan içilebilir.
- Tatlı ve pastacılık ürünlerine lezzet katmak için istenilen miktarda eklenebilir.

**Saklama Koşulları:**
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    de: `Professioneller Sirup mit authentischem Kokosnussgeschmack. Verleiht Ihren Getränken einen exotischen Geschmack.

**Anwendung:**
- Ideal für Cocktails, Mocktails, Eistee, Smoothies, Milchshakes und Limonaden im Verhältnis 1:8.
- Kann mit heißem oder kaltem Wasser (1:8) gemischt genossen werden.
- Eignet sich hervorragend zum Verfeinern von Desserts und Gebäck.

**Lagerung:**
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    en: `Professional syrup with authentic coconut flavor. Adds an exotic taste to your beverages.

**Directions for Use:**
- Use at a 1/8 ratio in cocktails, mocktails, iced teas, smoothies, milkshakes, and sodas.
- Can be diluted with hot or cold water (1:8 ratio) to drink directly.
- Add to desserts and pastry products as desired for extra flavor.

**Storage:**
Keep in a cool and dry place away from direct sunlight.`,
    ar: `شراب احترافي بنكهة جوز الهند الأصلية. يضيف طعمًا غريبًا إلى مشروباتك.

**تعليمات الاستخدام:**
- يستخدم بنسبة 1/8 في الكوكتيلات، الموكتيلات، الشاي المثلج، السموثي، الميلك شيك والمشروبات الغازية.
- يمكن تخفيفه بالماء الساخن أو البارد (بنسبة 1/8) للشرب مباشرة.
- يمكن إضافته إلى الحلويات والمخبوزات بالكمية المرغوبة لتعزيز النكهة.

**شروط التخزين:**
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
    geschmack: ["hindistan cevizi", "kokosnuss", "coconut", "جوز الهند"],
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
    console.error("Error updating Coconut Flavored Syrup:", error);
  } else {
    console.log("✅ Coconut Flavored Syrup successfully updated and activated!");
  }
}

updateCoconutSyrup();
