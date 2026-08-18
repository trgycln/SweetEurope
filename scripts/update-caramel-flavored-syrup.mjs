import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateCaramelFlavoredSyrup() {
  const pId = "5de34925-b25a-463f-ae71-b093693c38bf";

  const ad = {
    ar: "شراب بنكهة الكراميل (700 مل)",
    de: "Sirup mit Karamellgeschmack (700 ml)",
    en: "Caramel Flavored Syrup (700 ml)",
    tr: "Karamel Aromalı Şurup (700 ml)"
  };

  const inhaltsstoffe = {
    de: "Zucker, Wasser, Aroma (Karamell), Farbstoffe (E 150a), Säuerungsmittel (E 330), Konservierungsstoffe (E 202, E 211).",
    tr: "Şeker, Su, Aroma verici (Karamel), Renklendirici (E 150a), Asitlik düzenleyici (E 330), Koruyucu (E 202, E 211).",
    en: "Sugar, Water, Flavouring (Caramel), Colour (E 150a), Acidity regulator (E 330), Preservative (E 202, E 211).",
    ar: "سكر، ماء، نكهة (كراميل)، ملون (E 150a)، منظم الحموضة (E 330)، مواد حافظة (E 202، E 211)."
  };

  const naehrwerte = {
    pro_100ml: {
      energie_kj: 1410,
      energie_kcal: 336,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 81.8,
      davon_zucker: 81.7,
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
    de: `Hochwertiger Sirup mit authentischem Karamellgeschmack. Hergestellt mit echtem Zucker. Verleiht Getränken und Desserts eine angenehme Süße und ein feines Karamellaroma.

Anwendungsgebiete und Gebrauchsanweisung:
Es wird empfohlen, 1–2 cl Sirup als Aroma- und Süßungsmittel in heißen und kalten Kaffeespezialitäten, Milchshakes, Cocktails, Mocktails sowie in heißen und kalten Tees zu verwenden. Es kann auch als Getränk zubereitet werden, indem es im Verhältnis 1:8 mit heißem oder kaltem Wasser oder Milch gemischt wird. Es kann in beliebiger Menge Desserts und Gebäck beigefügt werden, um ihnen Geschmack zu verleihen. Servierempfehlung.

Lagerung:
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    tr: `Gerçek şeker ile üretilmiş, otantik karamel aromasına sahip profesyonel şurup. İçeceklerinize ve tatlılarınıza eşsiz bir karamel lezzeti katar.

Kullanıldığı Yerler ve Kullanma Talimatı:
Sıcak ve soğuk kahvelerde, milkshake, kokteyl ve mokteyllerde, ayrıca sıcak ve soğuk çaylarda aroma ve tatlandırıcı olarak 1–2 cl şurup kullanılması tavsiye edilir. Ayrıca sıcak ya da soğuk su/süt ile 1/8 oranında karıştırılarak içecek olarak da hazırlanabilir. Tatlı çeşitlerine ve pastacılık ürünlerine lezzet katmak amacıyla istenilen miktarda ilave edilebilir. Servis önerisidir.

Saklama Koşulları:
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    en: `Premium syrup with authentic caramel flavor. Made with real sugar. Adds a delightful sweetness and rich caramel taste to your beverages and desserts.

Place of Usage and Direction for Use:
It is recommended to use 1–2 cl of syrup as a flavoring and sweetening agent in hot and cold coffees, milkshakes, cocktails, mocktails, and also in hot and cold teas. Additionally, it can be mixed with hot or cold water/milk at a 1/8 ratio to prepare a beverage. It may also be added in the desired amount to desserts and pastry products to enhance flavor. Service suggestion.

Storage:
Keep away from direct sunlight, keep in cool and dry place.`,
    ar: `شراب فاخر بنكهة الكراميل الأصلية. مصنوع من السكر الحقيقي. يضيف حلاوة لذيذة ونكهة كراميل غنية إلى المشروبات والحلويات.

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
    ohne_zucker: false,
    geschmack: ["karamel", "caramel", "karamell"],
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
    console.error("Error updating Caramel Flavored Syrup:", error);
  } else {
    console.log("✅ Caramel Flavored Syrup (5de34925...) successfully updated and activated!");
  }
}

updateCaramelFlavoredSyrup();
