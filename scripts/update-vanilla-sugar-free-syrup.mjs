import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateVanillaSugarFreeSyrup() {
  const pId = "69dec99d-316d-4896-937e-779cd7c54a79";

  const ad = {
    ar: "فو شراب بنكهة الفانيليا - خالي من السكر 700 مل",
    de: "FO Sirup mit Vanillegeschmack - Zuckerfrei 700 ml",
    en: "FO Vanilla Flavored Syrup - Sugar Free 700 ml",
    tr: "FO Vanilya Aromalı Şurup - Şekersiz 700 ml"
  };

  const inhaltsstoffe = {
    de: "Wasser, Polydextrose (E 1200), Aroma (Vanille), Verdickungsmittel (E 466), Säuerungsmittel (E 334), Süßungsmittel (Sucralose (E 955), Acesulfam K (E 950)), Konservierungsstoffe (E 202, E 211). Enthält Süßungsmittel.",
    tr: "Su, Polidekstroz (E 1200), Aroma verici (Vanilya), Kıvam verici (E 466), Asitlik düzenleyici (E 334), Tatlandırıcı (Sukraloz (E 955), Asesulfam K (E 950)), Koruyucu (E 202, E 211). Tatlandırıcı içerir.",
    en: "Water, Polydextrose (E 1200), Flavouring (Vanilla), Thickener (E 466), Acidity regulator (E 334), Sweetener (Sucralose (E 955), Acesulfame K (E 950)), Preservative (E 202, E 211). Contains sweetener.",
    ar: "ماء، بوليديكستروز (E 1200)، نكهة (فانيليا)، مثخن (E 466)، منظم الحموضة (E 334)، محلي (سوكرالوز (E 955)، أسيسولفام ك (E 950))، مواد حافظة (E 202, E 211). يحتوي على محلي."
  };

  // NOTE: using pro_100g even for liquid to ensure renderer picks it up correctly
  const naehrwerte = {
    pro_100g: {
      energie_kj: 61,
      energie_kcal: 15,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 0.5,
      davon_zucker: 0.3,
      staerke: 0.0,
      ballaststoffe: 9.6,
      eiweiss: 0.0,
      salz: 0.018
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
    de: `Zuckerfreier Sirup mit authentischem Vanillegeschmack. Verleiht Getränken und Desserts ein reiches Vanillearoma, ohne zusätzliche Kalorien aus Zucker.

Anwendungsgebiete und Gebrauchsanweisung:
Es wird empfohlen, 1–2 cl Sirup als Aroma- und Süßungsmittel in heißen und kalten Kaffeespezialitäten, Milchshakes, Cocktails, Mocktails sowie in heißen und kalten Tees zu verwenden. Es kann auch als Getränk zubereitet werden, indem es im Verhältnis 1:8 mit heißem oder kaltem Wasser oder Milch gemischt wird. Es kann in beliebiger Menge Desserts und Gebäck beigefügt werden, um ihnen Geschmack zu verleihen. Servierempfehlung.

Lagerung:
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    tr: `Gerçek vanilya aromasına sahip, şekersiz profesyonel şurup. Şekerden gelen ilave kaloriler olmadan, içeceklerinize ve tatlılarınıza eşsiz bir vanilya lezzeti katar.

Kullanıldığı Yerler ve Kullanma Talimatı:
Sıcak ve soğuk kahvelerde, milkshake, kokteyl ve mokteyllerde, ayrıca sıcak ve soğuk çaylarda aroma ve tatlandırıcı olarak 1–2 cl şurup kullanılması tavsiye edilir. Ayrıca sıcak ya da soğuk su/süt ile 1/8 oranında karıştırılarak içecek olarak da hazırlanabilir. Tatlı çeşitlerine ve pastacılık ürünlerine lezzet katmak amacıyla istenilen miktarda ilave edilebilir. Servis önerisidir.

Saklama Koşulları:
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    en: `Sugar-free syrup with authentic vanilla flavor. Adds a rich vanilla taste to your beverages and desserts without the added calories from sugar.

Place of Usage and Direction for Use:
It is recommended to use 1–2 cl of syrup as a flavoring and sweetening agent in hot and cold coffees, milkshakes, cocktails, mocktails, and also in hot and cold teas. Additionally, it can be mixed with hot or cold water/milk at a 1/8 ratio to prepare a beverage. It may also be added in the desired amount to desserts and pastry products to enhance flavor. Service suggestion.

Storage:
Keep away from direct sunlight, keep in cool and dry place.`,
    ar: `شراب خالي من السكر بنكهة الفانيليا الأصلية. يضيف نكهة فانيليا غنية إلى المشروبات والحلويات بدون سعرات حرارية إضافية من السكر.

مناطق الاستخدام وتعليمات الاستخدام:
يوصى باستخدام 1-2 سنتيلتر من الشراب كعامل منكه ومحلي في القهوة الساخنة والباردة والميلك شيك والكوكتيلات والموكتيلات، وأيضاً في الشاي الساخن والبارد. بالإضافة إلى ذلك، يمكن خلطه مع الماء/الحليب الساخن أو البارد بنسبة 1/8 لتحضير مشروب. يمكن إضافته بالكمية المرغوبة إلى الحلويات ومنتجات المخابز لإضافة نكهة. اقتراح التقديم.

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
    ohne_zucker: true,
    geschmack: ["vanilya", "vanilla", "vanille", "şekersiz", "sugar free", "zuckerfrei"],
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
    console.error("Error updating Vanilla Sugar Free Syrup:", error);
  } else {
    console.log("✅ Vanilla Sugar Free Syrup (69dec99d...) successfully updated and activated!");
  }
}

updateVanillaSugarFreeSyrup();
