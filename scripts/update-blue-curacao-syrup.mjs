import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateBlueCuracaoSyrup() {
  const pId = "ab16a0ee-c05a-4fdb-9389-622ea16010ec";

  const ad = {
    tr: "FO Turunç (Blue Curacao) Aromalı Şurup 700 ml",
    de: "FO Sirup mit Bitterorangenaroma (Blue Curacao) 700 ml",
    en: "FO Blue Curacao Flavored Syrup 700 ml",
    ar: "شراب بنكهة الترنج (بلو كوراكاو) فو 700 مل"
  };

  const inhaltsstoffe = {
    tr: "Şeker, Su, Aroma Verici (Turunç, Portakal), Renklendirici (E 133), Koruyucu (E 202, E 211), Asitlik Düzenleyici (E 330).",
    de: "Zucker, Wasser, Aroma (Bitterorange, Orange), Farbstoffe (E 133), Konservierungsstoffe (E 202, E 211), Säuerungsmittel (E 330).",
    en: "Sugar, Water, Flavouring (Bitter orange, Orange), Colour (E 133), Preservative (E 202, E 211), Acidity regulator (E 330).",
    ar: "سكر، ماء، نكهة (الترنج، برتقال)، ملون (E 133)، مواد حافظة (E 202، E 211)، منظم الحموضة (E 330)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1410,
      energie_kcal: 336,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 82.7,
      davon_zucker: 82.7,
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
    tr: `Gerçek şeker ile üretilmiş profesyonel turunç aromalı şurup. İçeceklerinize ve tatlılarınıza eşsiz bir aroma ve canlı mavi bir renk katar.

**Kullanım Alanları ve Talimatı:**
- Uluslararası ve özel kokteyllerin, mokteyllerin hazırlanmasında kullanıcıların tercih ettiği aromalı şuruptur. Soda bazlı içeceklerde, aromalı soğuk çaylarda, smoothie, milkshake ve limonata gibi içeceklerde, içeceğe aroma ve tat katmak amacıyla 1/8 oranında kullanılır.
- Ayrıca, sıcak veya soğuk su ile aynı oranda sulandırılarak içime hazır hale getirilir.
- Tatlı çeşitlerine ve pastacılık ürünlerine lezzet katmak amacıyla istenilen miktarda ilave edilebilir. Servis önerisidir.

**Saklama Koşulları:**
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    de: `Mit echtem Zucker hergestellter, professioneller Sirup mit Bitterorangenaroma. Verleiht Ihren Getränken und Desserts ein einzigartiges Aroma und eine leuchtend blaue Farbe.

**Anwendung:**
- Ein aromatisierter Sirup, der von Verbrauchern bei der Zubereitung internationaler und spezieller Cocktails und Mocktails bevorzugt wird. Es wird im Verhältnis 1:8 in Limonaden, aromatisierten Eistees, Smoothies, Milchshakes und Limonaden verwendet, um dem Getränk Aroma und Geschmack zu verleihen.
- Es kann auch trinkfertig zubereitet werden, indem es im gleichen Verhältnis mit heißem oder kaltem Wasser verdünnt wird.
- Es kann in beliebiger Menge Desserts und Gebäck beigefügt werden, um ihren Geschmack zu verbessern. Serviervorschlag.

**Lagerung:**
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    en: `Professional blue curacao flavored syrup made with real sugar. Adds a unique flavor and a vibrant blue color to your beverages and desserts.

**Directions for Use:**
- It is a flavored syrup preferred by users in the preparation of international and specialty cocktails and mocktails. It is used at a 1/8 ratio to add flavor and taste in soda-based drinks, flavored iced teas, smoothies, milkshakes, and lemonades.
- Additionally, it can be diluted with hot or cold water in the same ratio to make it ready to drink.
- It can also be added in the desired amount to desserts and pastry products to enhance flavor. Service suggestion.

**Storage:**
Keep away from direct sunlight, keep in a cool and dry place.`,
    ar: `شراب احترافي بنكهة الترنج (بلو كوراكاو) مصنوع من السكر الحقيقي. يضيف نكهة فريدة ولوناً أزرق زاهياً لمشروباتك وحلوياتك.

**تعليمات الاستخدام:**
- يستخدم بنسبة 1/8 في الكوكتيلات، الموكتيلات، الشاي المثلج، السموثي، الميلك شيك والليموناضة لإضافة النكهة والطعم.
- يمكن تخفيفه بالماء الساخن أو البارد (بنسبة 1/8) للشرب مباشرة.
- يمكن إضافته إلى الحلويات والمخبوزات بالكمية المرغوبة لتعزيز النكهة. اقتراح التقديم.

**شروط التخزين:**
يحفظ في مكان جاف وبارد بعيداً عن أشعة الشمس المباشرة.`
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
    geschmack: ["turunç", "blue curacao", "bitterorange", "orange", "ترنج"],
    birim_hacim_ml: 700,
    koli_ici_adet: 6,
    palet_ici_adet: 170
  };

  const updatePayload = {
    ad,
    ean_gtin: "8691123472908",
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
    console.error("Error updating Blue Curacao Flavored Syrup:", error);
  } else {
    console.log("✅ Blue Curacao Flavored Syrup successfully updated and activated!");
  }
}

updateBlueCuracaoSyrup();
