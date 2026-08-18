import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateCubanMintBase() {
  const pId = "0bf1dfd4-4d21-4fc2-a252-7e98c59c9028";

  const ad = {
    ar: "قاعدة هيربا دي كوبا بنكهة النعناع الكوبي والليمون الأخضر 700 مل",
    de: "Hierba De Cuba Basis mit Kuba-Minze und Limettengeschmack 700 ml",
    en: "Hierba De Cuba Cuban Mint Flavored Base with Key Lime 700 ml",
    tr: "Hierba De Cuba Küba Nanesi Aromalı ve Misket Limonlu Baz 700 ml"
  };

  const inhaltsstoffe = {
    de: "Zucker, Wasser, Limettensaft (3.4%), Natürliches Aroma (Kuba-Minze), Konservierungsstoffe (E 202, E 211).",
    tr: "Şeker, Su, Misket limonu suyu (%3,4), Doğal aroma verici (Küba nanesi), Koruyucu (E 202, E 211).",
    en: "Sugar, Water, Key lime juice (3.4%), Natural Flavouring (Cuban mint), Preservative (E 202, E 211).",
    ar: "سكر، ماء، عصير الليمون الأخضر (3.4%)، نكهة طبيعية (نعناع كوبي)، مواد حافظة (E202, E211)."
  };

  // Using pro_100g to make sure the renderer picks it up
  const naehrwerte = {
    pro_100g: {
      energie_kj: 1310,
      energie_kcal: 313,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 75.7,
      davon_zucker: 75.4,
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
    de: `Aromatisierter Basis-Sirup "Hierba De Cuba" mit authentischem Kuba-Minze- und Limettengeschmack. Hergestellt mit echtem Limettensaft (3,4%), natürlichen Aromen und echtem Zucker. Verleiht Ihren Getränken eine erfrischende Mojito-Note.

Anwendungsgebiete und Gebrauchsanweisung:
Ein aromatisierter Sirup, der von Anwendern bei der Zubereitung internationaler und spezieller Cocktails und Mocktails bevorzugt wird. Zur Aromatisierung und Geschmacksverbesserung von Getränken auf Sodabasis, aromatisierten Eistees, Smoothies, Milkshakes und Limonaden. Für 450 ml Glas; 1 Maß (40 ml) Sirup wird wahlweise mit 5 Maßen (200 ml) Wasser verdünnt und mit reichlich Eis serviert. Serviervorschlag.

Lagerung:
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    tr: `Gerçek misket limonu suyu (%3,4), doğal Küba nanesi aroması ve gerçek şeker ile üretilmiş profesyonel baz. İçeceklerinize ferahlatıcı, otantik bir mojito lezzeti katar.

Kullanıldığı Yerler ve Kullanma Talimatı:
Uluslararası ve yerel kokteyllerin, mokteyllerin hazırlanmasında kullanılarak tercih ettiği aromalı şuruptur. Soda bazlı içeceklerde, aromalı soğuk çaylarda, smoothie, milkshake ve limonata gibi içeceklerde; içeceğe aroma ve tat katmak amacıyla kullanılır. 450 ml bardak için; 1 ölçü (40 ml) şurup, 5 ölçü (200 ml) su ile sulandırılıp bol buz ile servis edilir. Servis önerisidir.

Saklama Koşulları:
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    en: `Professional flavored base "Hierba De Cuba" featuring authentic Cuban mint and key lime flavors. Made with real key lime juice (3.4%), natural flavors, and real sugar. Adds a refreshing mojito taste to your beverages.

Place of Usage and Direction for Use:
This flavored syrup is preferred for the preparation of international and specialty cocktails and mocktails. It is used to add aroma and flavor to beverages such as soda-based drinks, flavored iced teas, smoothies, milkshakes, and lemonades. For a 450 ml glass; dilute 1 measure (40 ml) of syrup with 5 measures (200 ml) of water and serve with plenty of ice. Service suggestion.

Storage:
Keep away from direct sunlight, keep in cool and dry place.`,
    ar: `قاعدة احترافية بنكهة النعناع الكوبي الأصلي والليمون الأخضر (هيربا دي كوبا). مصنوع من عصير الليمون الأخضر الحقيقي (3.4%)، نكهات طبيعية، وسكر حقيقي. يضيف نكهة الموهيتو المنعشة إلى مشروباتك.

مجالات الاستخدام وطريقة التحضير:
يستخدم في تحضير الكوكتيلات والموكتيلات الدولية والخاصة. يستخدم لإضافة نكهة ورائحة للمشروبات مثل المشروبات الغازية، الشاي المثلج المنكه، السموثي، الميلك شيك، والليموناضة. لكوب سعة 450 مل؛ يخفف مقدار 1 (40 مل) من الشراب مع 5 مقادير (200 مل) من الماء ويقدم مع الكثير من الثلج. اقتراح التقديم.

شروط التخزين:
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
    geschmack: ["küba nanesi", "misket limonu", "cuban mint", "key lime", "mojito", "minze", "limette"],
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
    console.error("Error updating Cuban Mint Base:", error);
  } else {
    console.log("✅ Cuban Mint Base (0bf1dfd4...) successfully updated and activated!");
  }
}

updateCubanMintBase();
