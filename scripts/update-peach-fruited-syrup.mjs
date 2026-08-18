import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updatePeachFruitedSyrup() {
  const pId = "20d8c1cd-897d-4e10-b952-14f11cc95dda"; // FO Şeftali Premium Şurup 700 ml (Barkod: 8691123470966)

  const ad = {
    ar: "فو شراب الخوخ الفاخر 700 مل",
    de: "FO Pfirsich-Fruchtsirup Premium – 700 ml",
    en: "FO Premium Peach Fruited Syrup – 700 ml",
    tr: "FO Şeftali Meyveli Premium Şurup – 700 ml"
  };

  const inhaltsstoffe = {
    de: "Zucker, Wasser, Pfirsichsaftkonzentrat, Natürliches aroma (Pfirsich), Natürlicher säuerungsmittel (E 334), Konservierungsstoffe (E 202, E 211). Enthält 40% Pfirsichsaft.",
    tr: "Şeker, Su, Şeftali suyu konsantresi, Doğal aroma verici (Şeftali), Doğal asitlik düzenleyici (E 334), Koruyucu (E 202, E 211). %40 Şeftali suyu içerir.",
    en: "Sugar, Water, Peach juice concentrate, Natural flavouring (Peach), Natural acidity regulator (E 334), Preservative (E 202, E 211). Contains 40% Peach juice.",
    ar: "سكر، ماء، مركز عصير الخوخ، نكهة طبيعية (خوخ)، منظم حموضة طبيعي (E 334)، مادة حافظة (E 202, E 211). يحتوي على 40% من عصير الخوخ."
  };

  const naehrwerte = {
    pro_100ml: {
      energie_kj: 1440,
      energie_kcal: 345,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 84.7,
      davon_zucker: 79.5,
      staerke: 0.0,
      ballaststoffe: 0.0,
      eiweiss: 0.3,
      salz: 0.01
    }
  };

  const allergene = {
    allergen_free: true,
    milch: false,
    gluten: false,
    soja: false,
    nuesse: false,
    contains_de: "Glutenfrei, Allergenfrei. Farbstofffrei. Natürliche Aromen. Vegan.",
    contains_tr: "Glütensiz, Alerjen içermez. Renklendirici İçermez. Doğal Aromalar. Vegan.",
    contains_en: "Gluten free, Allergen free. Colorant Free. Natural Flavors. Vegan.",
    contains_ar: "خالي من الغلوتين، خالٍ من مسببات الحساسية. بدون ملونات. نكهات طبيعية. نباتي."
  };

  const aciklamalar = {
    de: "FO Pfirsich-Fruchtsirup Premium 700 ml\n FO Pfirsich-Fruchtsirup Premium 700 ml ist ein von Nutzern bevorzugter Fruchtsirup bei der Zubereitung von internationalen und speziellen Cocktails sowie Mocktails. Er wird verwendet, um Getränken wie Limonaden, aromatisierten Eistees, Smoothies, Milchshakes und anderen Erfrischungsgetränken Aroma und Geschmack zu verleihen. Ideal auch zur Verfeinerung von Desserts und Gebäck.\n Einsatzgebiete\n – Zubereitung von internationalen und speziellen Cocktails sowie Mocktails\n – Limonaden und aromatisierte Eistees\n – Smoothie-, Milchshake- und Limonadenrezepte\n – Desserts und Gebäck\n Höhepunkte\n – Natürliches Pfirsicharoma und -geschmack\n – Hohe Ergiebigkeit durch 1:8 Mischungsverhältnis\n – Trinkfertig durch Verdünnen mit heißem oder kaltem Wasser\n – Vegane, glutenfreie, farbstofffreie und allergenfreie Struktur\n – 700 ml Verpackung",
    tr: "FO Şeftali Meyveli Premium Şurup 700 ml\n FO Şeftali Meyveli Premium Şurup 700 ml, uluslararası ve özel kokteyllerin, mokteyllerin hazırlanmasında kullanıcıların tercih ettiği meyveli şuruptur. Soda bazlı içeceklerde, aromalı soğuk çaylarda, smoothie, milkshake ve limonata gibi içeceklerde içeceğe aroma ve tat katmak amacıyla kullanılır. Tatlı çeşitlerine ve pastacılık ürünlerine lezzet katmak için idealdir.\n Kullanım Alanları\n – Uluslararası ve özel kokteyl ile mokteyl hazırlıkları\n – Soda bazlı içecekler ve aromalı soğuk çaylar\n – Smoothie, milkshake ve limonata tarifleri\n – Tatlı çeşitleri ve pastacılık ürünleri\n Öne Çıkan Özellikler\n – Doğal şeftali aroması ve lezzeti\n – 1/8 oranında kullanım ile yüksek verim\n – Sıcak veya soğuk su ile sulandırılarak içime hazır hâle gelme\n – Vegan, glütensiz, renklendiricisiz ve alerjen içermeyen yapı\n – 700 ml ambalaj",
    en: "FO Premium Peach Fruited Syrup 700 ml\n FO Premium Peach Fruited Syrup 700 ml is a fruited syrup preferred by users in the preparation of international and specialty cocktails and mocktails. It is used to add flavor and taste to beverages such as soda-based drinks, flavored iced teas, smoothies, milkshakes, and lemonades. It is also ideal for enhancing the flavor of desserts and pastry products.\n Areas of Use\n – Preparation of international and specialty cocktails and mocktails\n – Soda-based drinks and flavored iced teas\n – Smoothie, milkshake and lemonade recipes\n – Desserts and pastry products\n Highlights\n – Natural peach flavor and aroma\n – High efficiency with 1/8 usage ratio\n – Ready to drink by diluting with hot or cold water\n – Vegan, gluten-free, colorant-free and allergen-free structure\n – 700 ml packaging",
    ar: "فو شراب الخوخ الفاخر 700 مل\n فو شراب الخوخ الفاخر 700 مل هو شراب فاكهي مفضل لدى المستخدمين في تحضير الكوكتيلات والموكتيلات الدولية والخاصة. يستخدم لإضافة نكهة وطعم إلى المشروبات مثل المشروبات الغازية، الشاي المثلج المنكه، السموثي، الميلك شيك والليموناضة. كما أنه مثالي لتعزيز نكهة الحلويات ومنتجات المخابز.\n مجالات الاستخدام\n – تحضير الكوكتيلات والموكتيلات الدولية والخاصة\n – المشروبات الغازية والشاي المثلج المنكه\n – وصفات السموثي، الميلك شيك والليموناضة\n – الحلويات ومنتجات المخابز\n أبرز\n – نكهة ورائحة الخوخ الطبيعية\n – كفاءة عالية مع نسبة استخدام 1/8\n – جاهز للشرب عن طريق التخفيف بالماء الساخن أو البارد\n – تركيبة نباتية، خالية من الغلوتين ومسببات الحساسية وبدون ملونات\n – عبوة 700 مل"
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
    geschmack: ["şeftali", "peach", "pfirsich", "خوخ"],
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
    console.error("Error updating Peach Fruited Syrup:", error);
  } else {
    console.log("✅ Peach Fruited Syrup successfully updated and activated!");
  }
}

updatePeachFruitedSyrup();
