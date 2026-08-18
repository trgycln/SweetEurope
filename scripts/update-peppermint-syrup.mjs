import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updatePeppermintSyrup() {
  const pId = "0c2f58b8-86fe-48a8-8264-8dd64627092b";

  const ad = {
    tr: "FO Nane Aromalı Şurup 700 ml",
    de: "FO Sirup mit Minzaroma 700 ml",
    en: "FO Peppermint Flavored Syrup 700 ml",
    ar: "شراب بنكهة النعناع فو 700 مل"
  };

  const inhaltsstoffe = {
    tr: "Şeker, Su, Asitlik düzenleyici (E 330), Aroma verici (Nane, mentol), Koruyucu (E 202, E 211), Renklendirici (E 102, E 133).",
    de: "Zucker, Wasser, Säuerungsmittel (E 330), Aroma (Minze, Menthol), Konservierungsstoffe (E 202, E 211), Farbstoffe (E 102, E 133).",
    en: "Sugar, Water, Acidity regulator (E 330), Flavouring (Peppermint, Menthol), Preservative (E 202, E 211), Colour (E 102, E 133).",
    ar: "سكر، ماء، منظم حموضة (E 330)، نكهة (نعناع، منثول)، مواد حافظة (E 202، E 211)، ملون (E 102، E 133)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1480,
      energie_kcal: 353,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 85.9,
      davon_zucker: 85.9,
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
    tr: `Gerçek şeker ile üretilmiş, ferahlatıcı nane ve mentol aromalı profesyonel şurup. İçeceklerinize, kokteyllerinize ve tatlılarınıza canlı yeşil bir renk ve serinletici yoğun bir nane lezzeti katar.

**Kullanım Alanları ve Talimatı:**
- Uluslararası ve özel kokteyllerin hazırlanmasında barmenlerin tercih ettiği aromalı şuruptur.
- Kokteyllerde, pasta, kek, puding, özel tatlılarda ve çay, kahve gibi benzeri sıcak içeceklerde aroma ve şurup olarak 1/5 veya isteğe bağlı 1/8 oranında kullanılır.
- Ayrıca sıcak veya soğuk su ile 1/5 veya isteğe bağlı 1/8 oranında sulandırılarak içilir. Servis önerisidir.

**Saklama Koşulları:**
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    de: `Mit echtem Zucker hergestellter, professioneller Sirup mit erfrischendem Pfefferminz- und Mentholaroma. Verleiht Ihren Cocktails, Heißgetränken und Desserts eine leuchtend grüne Farbe und eine angenehme Frische.

**Anwendung:**
- Von Barkeepern bevorzugter aromatisierter Sirup für die Zubereitung internationaler und spezieller Cocktails.
- Wird in Cocktails, Kuchen, Pudding, speziellen Desserts sowie Heißgetränken wie Tee und Kaffee im Verhältnis 1/5 oder wahlweise 1/8 verwendet.
- Kann auch mit heißem oder kaltem Wasser im Verhältnis 1/5 oder 1/8 verdünnt getrunken werden. Servierempfehlung.

**Lagerung:**
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    en: `Professional peppermint and menthol flavored syrup made with real sugar. Adds a refreshing cool mint flavor and a vibrant green color to your cocktails, hot beverages, and desserts.

**Directions for Use:**
- It is the flavored syrup preferred by bartenders in the preparation of international and special cocktails.
- Used as aroma and syrup in cocktails, cakes, puddings, special desserts, and similar hot drinks such as tea and coffee at a ratio of 1/5 or optionally 1/8.
- Also consumed by diluting with hot or cold water at a ratio of 1/5 or optionally 1/8. Service recommendation.

**Storage:**
Keep away from direct sunlight, keep in a cool and dry place.`,
    ar: `شراب احترافي بنكهة النعناع والمنثول المنعش مصنوع من السكر الحقيقي. يضيف نكهة النعناع الباردة ولوناً أخضر جذاباً للكوكتيلات والمشروبات الساخنة والحلويات.

**تعليمات الاستخدام:**
- هو الشراب المنكه المفضل لدى خبراء المشروبات لتحضير الكوكتيلات العالمية والخاصة.
- يستخدم كنكهة وشراب في الكوكتيلات، الكيك، البودينغ، الحلويات الخاصة والمشروبات الساخنة مثل الشاي والقهوة بنسبة 1/5 أو اختيارياً 1/8.
- يمكن أيضاً شربه مخففاً بالماء الساخن أو البارد بنسبة 1/5 أو اختيارياً 1/8. اقتراح التقديم.

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
    geschmack: ["nane", "mint", "peppermint", "minze", "menthol", "نعناع"],
    birim_hacim_ml: 700,
    koli_ici_adet: 6,
    palet_ici_adet: 170
  };

  const updatePayload = {
    ad,
    ean_gtin: "8691123120090",
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
    console.error("Error updating Peppermint Syrup:", error);
  } else {
    console.log("✅ Peppermint Syrup (0c2f58b8...) successfully updated and activated!");
  }
}

updatePeppermintSyrup();
