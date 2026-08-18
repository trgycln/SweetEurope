import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateMangoFruitedSyrup() {
  const pId = "8a644fee-e81e-4ec6-b229-55a179fbb845"; // FO Mango Meyveli Şurup / Premium (Barkod: 8691123470973)

  const ad = {
    ar: "فو شراب المانجو الفاخر 700 مل",
    de: "FO Mango-Fruchtsirup Premium – 700 ml",
    en: "FO Premium Mango Fruited Syrup – 700 ml",
    tr: "FO Mango Meyveli Premium Şurup – 700 ml"
  };

  const inhaltsstoffe = {
    de: "Zucker, Wasser, Mangopüreekonzentrat, natürliches Aroma (Mango), Natürlicher säuerungsmittel (E 334), Farbstoffe (E 150a), Konservierungsstoffe (E 202, E 211). Enthält 40% Mangosaft.",
    tr: "Şeker, Su, Mango püre konsantresi, Doğal aroma verici (Mango), Doğal asitlik düzenleyici (E 334), Renklendirici (E 150a), Koruyucu (E 202, E 211). %40 Mango suyu içerir.",
    en: "Sugar, Water, Mango juice concentrate, Natural flavouring (Mango), Natural acidity regulator (E 334), Colour (E 150a), Preservative (E 202, E 211). Contains 40% Mango juice.",
    ar: "سكر، ماء، مركز هريس المانجو، نكهة طبيعية (مانجو)، منظم حموضة طبيعي (E 334)، مادة ملونة (E 150a)، مادة حافظة (E 202، E 211). يحتوي على 40% من عصير المانجو."
  };

  const naehrwerte = {
    pro_100ml: {
      energie_kj: 1420,
      energie_kcal: 338,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 83.6,
      davon_zucker: 81.7,
      staerke: 0.0,
      ballaststoffe: 0.0,
      eiweiss: 0.0,
      salz: 0.0
    }
  };

  const allergene = {
    allergen_free: true,
    milch: false,
    gluten: false,
    soja: false,
    nuesse: false,
    contains_de: "Glutenfrei, Allergenfrei. Natürliche Farben. Natürliche Aromen. Vegan.",
    contains_tr: "Glütensiz, Alerjen içermez. Doğal Renklendiriciler. Doğal Aromalar. Vegan.",
    contains_en: "Gluten free, Allergen free. Natural Colors. Natural Flavors. Vegan.",
    contains_ar: "خالي من الغلوتين، خالٍ من مسببات الحساسية. ألوان طبيعية. نكهات طبيعية. نباتي."
  };

  const aciklamalar = {
    de: "FO Mango-Fruchtsirup Premium 700 ml\n FO Mango-Fruchtsirup Premium 700 ml ist ein von Nutzern bevorzugter Fruchtsirup bei der Zubereitung von internationalen und speziellen Cocktails sowie Mocktails. Er wird verwendet, um Getränken wie Limonaden, aromatisierten Eistees, Smoothies, Milchshakes und anderen Erfrischungsgetränken Aroma und Geschmack zu verleihen. Ideal auch zur Verfeinerung von Desserts und Gebäck.\n Einsatzgebiete\n – Zubereitung von internationalen und speziellen Cocktails sowie Mocktails\n – Limonaden und aromatisierte Eistees\n – Smoothie-, Milchshake- und Limonadenrezepte\n – Desserts und Gebäck\n Höhepunkte\n – Natürliches Mangoaroma und -geschmack\n – Hohe Ergiebigkeit durch 1:8 Mischungsverhältnis\n – Trinkfertig durch Verdünnen mit heißem oder kaltem Wasser\n – Vegane, glutenfreie und allergenfreie Struktur\n – 700 ml Verpackung",
    tr: "FO Mango Meyveli Premium Şurup 700 ml\n FO Mango Meyveli Premium Şurup 700 ml, uluslararası ve özel kokteyllerin, mokteyllerin hazırlanmasında kullanıcıların tercih ettiği meyveli şuruptur. Soda bazlı içeceklerde, aromalı soğuk çaylarda, smoothie, milkshake ve limonata gibi içeceklerde içeceğe aroma ve tat katmak amacıyla kullanılır. Tatlı çeşitlerine ve pastacılık ürünlerine lezzet katmak için idealdir.\n Kullanım Alanları\n – Uluslararası ve özel kokteyl ile mokteyl hazırlıkları\n – Soda bazlı içecekler ve aromalı soğuk çaylar\n – Smoothie, milkshake ve limonata tarifleri\n – Tatlı çeşitleri ve pastacılık ürünleri\n Öne Çıkan Özellikler\n – Doğal mango aroması ve lezzeti\n – 1/8 oranında kullanım ile yüksek verim\n – Sıcak veya soğuk su ile sulandırılarak içime hazır hâle gelme\n – Vegan, glütensiz ve alerjen içermeyen yapı\n – 700 ml ambalaj",
    en: "FO Premium Mango Fruited Syrup 700 ml\n FO Premium Mango Fruited Syrup 700 ml is a fruited syrup preferred by users in the preparation of international and specialty cocktails and mocktails. It is used to add flavor and taste to beverages such as soda-based drinks, flavored iced teas, smoothies, milkshakes, and lemonades. It is also ideal for enhancing the flavor of desserts and pastry products.\n Areas of Use\n – Preparation of international and specialty cocktails and mocktails\n – Soda-based drinks and flavored iced teas\n – Smoothie, milkshake and lemonade recipes\n – Desserts and pastry products\n Highlights\n – Natural mango flavor and aroma\n – High efficiency with 1/8 usage ratio\n – Ready to drink by diluting with hot or cold water\n – Vegan, gluten-free and allergen-free structure\n – 700 ml packaging",
    ar: "فو شراب المانجو الفاخر 700 مل\n فو شراب المانجو الفاخر 700 مل هو شراب فاكهي مفضل لدى المستخدمين في تحضير الكوكتيلات والموكتيلات الدولية والخاصة. يستخدم لإضافة نكهة وطعم إلى المشروبات مثل المشروبات الغازية، الشاي المثلج المنكه، السموثي، الميلك شيك والليموناضة. كما أنه مثالي لتعزيز نكهة الحلويات ومنتجات المخابز.\n مجالات الاستخدام\n – تحضير الكوكتيلات والموكتيلات الدولية والخاصة\n – المشروبات الغازية والشاي المثلج المنكه\n – وصفات السموثي، الميلك شيك والليموناضة\n – الحلويات ومنتجات المخابز\n أبرز\n – نكهة ورائحة المانجو الطبيعية\n – كفاءة عالية مع نسبة استخدام 1/8\n – جاهز للشرب عن طريق التخفيف بالماء الساخن أو البارد\n – تركيبة نباتية، خالية من الغلوتين ومسببات الحساسية\n – عبوة 700 مل"
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
    geschmack: ["mango"],
    birim_hacim_ml: 700,
    mischungsverhaeltnis: "1+8",
    fruchtanteil: "40%"
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
    console.error("Error updating Mango Fruited Syrup:", error);
  } else {
    console.log("✅ Mango Fruited Syrup successfully updated and activated!");
  }
}

updateMangoFruitedSyrup();
