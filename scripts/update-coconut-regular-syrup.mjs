import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateCoconutRegularSyrup() {
  const pId = "5a6b34a9-1145-49c6-b3a8-99df9726294c";

  const ad = {
    tr: "FO Hindistan Cevizi Normal Şurubu (Şeffaf) 700 ml",
    de: "FO Kokosnuss Regular Sirup (Transparent) 700 ml",
    en: "FO Regular Coconut Flavored Syrup (Transparent) 700 ml",
    ar: "شراب جوز الهند العادي فو (شفاف) 700 مل"
  };

  const inhaltsstoffe = {
    tr: "Glukoz - Fruktoz şurubu, Su, Aroma verici (Hindistancevizi), Asitlik düzenleyici (E 330), Koruyucu (E 202, E 211).",
    de: "Glukose - Fruktose - Sirup, Wasser, Aroma (Kokosnuss), Säuerungsmittel (E 330), Konservierungsstoffe (E 202, E 211).",
    en: "Glucose-Fructose syrup, Water, Flavouring (Coconut), Acidity regulator (E 330), Preservative (E 202, E 211).",
    ar: "شراب الجلوكوز - الفركتوز، ماء، نكهة جوز الهند، منظم حموضة (E 330)، مادة حافظة (E 202، E 211)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1120,
      energie_kcal: 268,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 65.4,
      davon_zucker: 32.4,
      staerke: 21.5,
      ballaststoffe: 0.0,
      eiweiss: 0.0,
      salz: 0.3
    }
  };

  const allergene = {
    allergen_free: true,
    milch: false,
    gluten: false,
    soja: false,
    nuesse: false,
    contains_de: "Glutenfrei, Allergenfrei, Ohne Farbstoffe.",
    contains_tr: "Glütensiz, Alerjen içermez, Renklendirici içermez.",
    contains_en: "Gluten free, Allergen free, Colorant free.",
    contains_ar: "خالي من الغلوتين، خالٍ من مسببات الحساسية، خالي من الملونات."
  };

  const aciklamalar = {
    tr: `Renklendirici içermeyen, özel formülüyle hazırlanmış profesyonel hindistan cevizi aromalı şurup. İçeceklerinize berrak bir görünüm ve otantik hindistan cevizi lezzeti katar.

**Kullanım Alanları ve Talimatı:**
- Kokteyl, mocktail, soğuk çay, smoothie, milkshake ve soda bazlı içeceklerde 1/8 oranında kullanılır.
- Sıcak veya soğuk su ile 1/8 oranında karıştırılarak doğrudan içilebilir.
- Tatlı ve pastacılık ürünlerine lezzet katmak için istenilen miktarda eklenebilir.

**Saklama Koşulları:**
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    de: `Farbstofffreier, professioneller Sirup mit Kokosnussgeschmack. Verleiht Ihren Getränken ein klares Aussehen und authentischen Kokosnussgeschmack.

**Anwendung:**
- Ideal für Cocktails, Mocktails, Eistee, Smoothies, Milchshakes und Limonaden im Verhältnis 1:8.
- Kann mit heißem oder kaltem Wasser (1:8) gemischt genossen werden.
- Eignet sich hervorragend zum Verfeinern von Desserts und Gebäck.

**Lagerung:**
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    en: `Colorant-free, professional coconut flavored syrup. Adds a clear appearance and authentic coconut taste to your beverages.

**Directions for Use:**
- Use at a 1/8 ratio in cocktails, mocktails, iced teas, smoothies, milkshakes, and sodas.
- Can be diluted with hot or cold water (1:8 ratio) to drink directly.
- Add to desserts and pastry products as desired for extra flavor.

**Storage:**
Keep in a cool and dry place away from direct sunlight.`,
    ar: `شراب احترافي بنكهة جوز الهند خالي من الملونات. يضفي مظهرًا صافيًا وطعمًا أصيلًا لجوز الهند على مشروباتك.

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
    geschmack: ["hindistan cevizi", "kokosnuss", "coconut", "جوز الهند", "şeffaf", "transparent"],
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
    console.error("Error updating Regular Coconut Flavored Syrup:", error);
  } else {
    console.log("✅ Regular Coconut Flavored Syrup (Transparent) successfully updated and activated!");
  }
}

updateCoconutRegularSyrup();
