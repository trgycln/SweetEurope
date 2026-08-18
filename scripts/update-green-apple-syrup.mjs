import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateGreenAppleSyrup() {
  const pId = "66c5292e-4658-43ee-8a1b-1ceca47e496e";

  const ad = {
    tr: "FO Yeşil Elma Aromalı Şurup 700 ml",
    de: "FO Sirup mit Grünem Apfel-Aroma 700 ml",
    en: "FO Green Apple Flavored Syrup 700 ml",
    ar: "شراب بنكهة التفاح الأخضر فو 700 مل"
  };

  const inhaltsstoffe = {
    tr: "Şeker, Su, Asitlik düzenleyici (E 330), Aroma verici (Elma), Koruyucu (E 202, E 211), Renklendirici (E 102, E 133).",
    de: "Zucker, Wasser, Säuerungsmittel (E 330), Aroma (Apfel), Konservierungsstoffe (E 202, E 211), Farbstoffe (E 102, E 133).",
    en: "Sugar, Water, Acidity regulator (E 330), Flavouring (Apple), Preservative (E 202, E 211), Colour (E 102, E 133).",
    ar: "سكر، ماء، منظم الحموضة (E 330)، نكهة (التفاح)، مواد حافظة (E 202، E 211)، ملون (E 102، E 133)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1410,
      energie_kcal: 337,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 82.6,
      davon_zucker: 81.8,
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
    contains_en: "Gluten free, Allergen free. Warning: E 102 may have negative effects on the activities and attentions of the children.",
    contains_ar: "خالي من الغلوتين، خالٍ من مسببات الحساسية. تحذير: E 102 قد يؤثر سلباً على نشاط وانتباه الأطفال."
  };

  const aciklamalar = {
    tr: `Gerçek şeker ile üretilmiş profesyonel yeşil elma aromalı şurup. İçeceklerinize ve tatlılarınıza ferahlatıcı yeşil elma lezzeti katar.

**Kullanım Alanları ve Talimatı:**
- Uluslararası ve özel kokteyllerin, mokteyllerin hazırlanmasında kullanıcıların tercih ettiği aromalı şuruptur. Soda bazlı içeceklerde, aromalı soğuk çaylarda, smoothie, milkshake ve limonata gibi içeceklerde, içeceğe aroma ve tat katmak amacıyla 1/8 oranında kullanılır.
- Ayrıca, sıcak veya soğuk su ile aynı oranda sulandırılarak içime hazır hale getirilir.
- Tatlı çeşitlerine ve pastacılık ürünlerine lezzet katmak amacıyla istenilen miktarda ilave edilebilir. Servis önerisidir.

**Saklama Koşulları:**
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    de: `Mit echtem Zucker hergestellter, professioneller Sirup mit Grünem Apfel-Aroma. Verleiht Ihren Getränken und Desserts den erfrischenden Geschmack von grünem Apfel.

**Anwendung:**
- Ein aromatisierter Sirup, der von Verbrauchern bei der Zubereitung internationaler und spezieller Cocktails und Mocktails bevorzugt wird. Es wird im Verhältnis 1:8 in Limonaden, aromatisierten Eistees, Smoothies, Milchshakes und Limonaden verwendet, um dem Getränk Aroma und Geschmack zu verleihen.
- Es kann auch trinkfertig zubereitet werden, indem es im gleichen Verhältnis mit heißem oder kaltem Wasser verdünnt wird.
- Es kann in beliebiger Menge Desserts und Gebäck beigefügt werden, um ihren Geschmack zu verbessern. Serviervorschlag.

**Lagerung:**
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    en: `Professional green apple flavored syrup made with real sugar. Adds a refreshing green apple flavor to your beverages and desserts.

**Directions for Use:**
- It is a flavored syrup preferred by users in the preparation of international and specialty cocktails and mocktails. It is used at a 1/8 ratio to add flavor and taste in soda-based drinks, flavored iced teas, smoothies, milkshakes, and lemonades.
- Additionally, it can be diluted with hot or cold water in the same ratio to make it ready to drink.
- It can also be added in the desired amount to desserts and pastry products to enhance flavor. Service suggestion.

**Storage:**
Keep away from direct sunlight, keep in a cool and dry place.`,
    ar: `شراب احترافي بنكهة التفاح الأخضر مصنوع من السكر الحقيقي. يضيف نكهة التفاح الأخضر المنعشة لمشروباتك وحلوياتك.

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
    geschmack: ["yeşil elma", "green apple", "grüner apfel", "pomme verte", "تفاح أخضر"],
    birim_hacim_ml: 700,
    koli_ici_adet: 6,
    palet_ici_adet: 170
  };

  const updatePayload = {
    ad,
    ean_gtin: "8691123473837",
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
    console.error("Error updating Green Apple Flavored Syrup:", error);
  } else {
    console.log("✅ Green Apple Flavored Syrup successfully updated and activated!");
  }
}

updateGreenAppleSyrup();
