import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateHazelnutSugarFreeSyrup() {
  const pId = "16f4e873-0ef4-415c-9576-9a4410a01f24";

  const ad = {
    ar: "فو شراب بنكهة البندق - خالي من السكر 700 مل",
    de: "FO Sirup mit Haselnussgeschmack - Zuckerfrei 700 ml",
    en: "FO Hazelnut Flavored Syrup - Sugar Free 700 ml",
    tr: "FO Fındık Aromalı Şurup - Şekersiz 700 ml"
  };

  const inhaltsstoffe = {
    de: "Wasser, Polydextrose (E 1200), Aroma (Haselnuss), Verdickungsmittel (E 466), Säuerungsmittel (E 334), Süßungsmittel (Sucralose (E 955), Acesulfam K (E 950)), Konservierungsstoffe (E 202, E 211).",
    tr: "Su, Polidekstroz (E 1200), Aroma verici (Fındık), Kıvam verici (E 466), Asitlik düzenleyici (E 334), Tatlandırıcı (Sukraloz (E 955), Asesülfam K (E 950)), Koruyucu (E 202, E 211). Tatlandırıcı içerir.",
    en: "Water, Polydextrose (E 1200), Flavouring (Hazelnut), Thickener (E 466), Acidity regulator (E 334), Sweetener (Sucralose (E 955), Acesulfame K (E 950)), Preservative (E 202, E 211).",
    ar: "ماء، بوليديكستروز (E 1200)، نكهة (البندق)، مثخن (E 466)، منظم الحموضة (E 334)، محلي (سوكرالوز (E 955)، أسيسولفام ك (E 950))، مواد حافظة (E 202، E 211). يحتوي على محلي."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 56,
      energie_kcal: 13,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 1.3,
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
    de: `Zuckerfreier Sirup mit authentischem Haselnussgeschmack. Verleiht Getränken und Desserts ein reiches, geröstetes Haselnussaroma, ohne zusätzliche Kalorien aus Zucker.

Anwendungsgebiete und Gebrauchsanweisung:
Es wird empfohlen, 1–2 cl Sirup als Aroma- und Süßungsmittel in heißen und kalten Kaffeespezialitäten, Milchshakes, Cocktails, Mocktails sowie in heißen und kalten Tees zu verwenden. Es kann auch als Getränk zubereitet werden, indem es im Verhältnis 1:8 mit heißem oder kaltem Wasser oder Milch gemischt wird. Es kann in beliebiger Menge Desserts und Gebäck beigefügt werden, um ihnen Geschmack zu verleihen. Servierempfehlung.

Lagerung:
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    tr: `Gerçek fındık aromasına sahip, şekersiz profesyonel şurup. Şekerden gelen ilave kaloriler olmadan, içeceklerinize ve tatlılarınıza zengin, kavrulmuş fındık lezzeti katar.

Kullanıldığı Yerler ve Kullanma Talimatı:
Sıcak ve soğuk kahvelerde, milkshake, kokteyl ve mokteyllerde, ayrıca sıcak ve soğuk çaylarda aroma ve tatlandırıcı olarak 1–2 cl şurup kullanılması tavsiye edilir. Ayrıca sıcak ya da soğuk su/süt ile 1/8 oranında karıştırılarak içecek olarak da hazırlanabilir. Tatlı çeşitlerine ve pastacılık ürünlerine lezzet katmak amacıyla istenilen miktarda ilave edilebilir. Servis önerisidir.

Saklama Koşulları:
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    en: `Sugar-free syrup with authentic hazelnut flavor. Adds a rich, roasted hazelnut taste to your beverages and desserts without the added calories from sugar.

Place of Usage and Direction for Use:
It is recommended to use 1–2 cl of syrup as a flavoring and sweetening agent in hot and cold coffees, milkshakes, cocktails, mocktails, and also in hot and cold teas. Additionally, it can be mixed with hot or cold water/milk at a 1/8 ratio to prepare a beverage. It may also be added in the desired amount to desserts and pastry products to enhance flavor. Service suggestion.

Storage:
Keep away from direct sunlight, keep in cool and dry place.`,
    ar: `شراب خالي من السكر بنكهة البندق الأصلية. يضيف طعم البندق المحمص الغني إلى المشروبات والحلويات بدون سعرات حرارية إضافية من السكر.

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
    geschmack: ["fındık", "hazelnut", "haselnuss", "noisette", "şekersiz", "sugar free", "zuckerfrei"],
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
    console.error("Error updating Hazelnut Sugar Free Syrup:", error);
  } else {
    console.log("✅ Hazelnut Sugar Free Syrup (16f4e873...) successfully updated and activated!");
  }
}

updateHazelnutSugarFreeSyrup();
