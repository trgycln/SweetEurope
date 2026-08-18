import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateGrenadineSyrup() {
  const pId = "c5465f50-9ab0-4649-9e1b-a4516280fce2";

  const ad = {
    tr: "FO Nar (Grenadine) Aromalı Şurup 700 ml",
    de: "FO Sirup mit Granatapfel-Aroma (Grenadine) 700 ml",
    en: "FO Grenadine Flavored Syrup 700 ml",
    ar: "شراب بنكهة الرمان فو 700 مل"
  };

  const inhaltsstoffe = {
    tr: "Şeker, Su, Aroma Verici (Nar), Asitlik Düzenleyici (E 330), Renklendiriciler (E 129, E 122), Koruyucu (E 202, E 211).",
    de: "Zucker, Wasser, Aroma (Granatapfel), Säureregulator (E 330), Farbstoffe (E 129, E 122), Konservierungsstoffe (E 202, E 211).",
    en: "Sugar, Water, Flavouring (Grenadine), Acidity Regulator (E 330), Colours (E 129, E 122), Preservatives (E 202, E 211).",
    ar: "سكر، ماء، نكهة (رمان)، منظم الحموضة (E 330)، ملونات (E 129، E 122)، مواد حافظة (E 202، E 211)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1410,
      energie_kcal: 336,
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
    contains_de: "Glutenfrei, Allergenfrei. Warnung: E 129, E 122 können Aktivität und Aufmerksamkeit bei Kindern beeinträchtigen.",
    contains_tr: "Glütensiz, Alerjen içermez. Uyarı: E 129, E 122 Çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
    contains_en: "Gluten free, Allergen free. Warning: E 129, E 122 may have negative effects on activity and attention in children.",
    contains_ar: "خالي من الغلوتين، خالٍ من مسببات الحساسية. تحذير: E 129, E 122 قد يؤثر سلباً على نشاط وانتباه الأطفال."
  };

  const aciklamalar = {
    tr: `Gerçek şeker ile üretilmiş profesyonel nar (grenadine) aromalı şurup. İçeceklerinize ve tatlılarınıza yoğun bir meyve lezzeti ve canlı bir kırmızı renk katar.

**Kullanım Alanları ve Talimatı:**
- Uluslararası ve özel kokteyllerin, mokteyllerin hazırlanmasında kullanıcıların tercih ettiği aromalı şuruptur. Soda bazlı içeceklerde, aromalı soğuk çaylarda, smoothie, milkshake ve limonata gibi içeceklerde, içeceğe aroma ve tat katmak amacıyla 1/8 oranında kullanılır.
- Ayrıca, sıcak veya soğuk su ile aynı oranda sulandırılarak içime hazır hale getirilir.
- Tatlı çeşitlerine ve pastacılık ürünlerine lezzet katmak amacıyla istenilen miktarda ilave edilebilir. Servis önerisidir.

**Saklama Koşulları:**
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    de: `Mit echtem Zucker hergestellter, professioneller Sirup mit Granatapfel-Aroma (Grenadine). Verleiht Ihren Getränken und Desserts einen intensiven Fruchtgeschmack und eine leuchtend rote Farbe.

**Anwendung:**
- Ideal für Cocktails, Mocktails, Eistee, Smoothies, Milchshakes und Limonaden im Verhältnis 1:8.
- Kann mit heißem oder kaltem Wasser (1:8) gemischt genossen werden.
- Eignet sich hervorragend zum Verfeinern von Desserts und Gebäck.

**Lagerung:**
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    en: `Professional grenadine flavored syrup made with real sugar. Adds an intense fruity flavor and a vibrant red color to your beverages and desserts.

**Directions for Use:**
- It is a flavored syrup preferred by users in the preparation of international and specialty cocktails and mocktails. It is used at a 1/8 ratio to add flavor and taste in soda-based drinks, flavored iced teas, smoothies, milkshakes, and lemonades.
- Additionally, it can be diluted with hot or cold water in the same ratio to make it ready to drink.
- Add to desserts and pastry products as desired for extra flavor. Service suggestion.

**Storage:**
Keep away from direct sunlight, keep in a cool and dry place.`,
    ar: `شراب احترافي بنكهة الرمان (جرينادين) مصنوع من السكر الحقيقي. يضيف نكهة فواكه مكثفة ولوناً أحمر زاهياً لمشروباتك وحلوياتك.

**تعليمات الاستخدام:**
- يستخدم بنسبة 1/8 في الكوكتيلات، الموكتيلات، الشاي المثلج، السموثي، الميلك شيك والليموناضة.
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
    geschmack: ["nar", "grenadine", "granatapfel", "pomegranate", "رمان"],
    birim_hacim_ml: 700,
    koli_ici_adet: 6,
    palet_ici_adet: 170
  };

  const updatePayload = {
    ad,
    ean_gtin: "8691123472960",
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
    console.error("Error updating Grenadine Flavored Syrup:", error);
  } else {
    console.log("✅ Grenadine Flavored Syrup successfully updated and activated!");
  }
}

updateGrenadineSyrup();
