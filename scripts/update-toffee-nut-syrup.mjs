import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateToffeeNutSyrup() {
  const pId = "2eb62f63-6dee-47c6-a756-aa0e20ad58af";

  const ad = {
    ar: "شراب بنكهة البندق والكراميل مع السكر (700 مل)",
    de: "Sirup mit Toffee-Nuss-Geschmack und Zucker (700 ml)",
    en: "Toffee Nut Flavored Syrup with Sugar (700 ml)",
    tr: "Fındık-Karamel Aromalı Şekerli Şurup (700 ml)"
  };

  const inhaltsstoffe = {
    de: "Zucker, Wasser, Aroma (Nuss, Toffee), Säuerungsmittel (E 330), Konservierungsstoffe (E 202, E 211), Farbstoffe (E 150a).",
    tr: "Şeker, Su, Aroma verici (Fındık, Toffee), Asitlik düzenleyici (E 330), Koruyucu (E 202, E 211), Renklendirici (E 150a).",
    en: "Sugar, Water, Flavouring (Nut, Toffee), Acidity regulator (E 330), Preservative (E 202, E 211), Colour (E 150a).",
    ar: "سكر، ماء، نكهة (البندق، الكراميل)، منظم الحموضة (E 330)، مواد حافظة (E 202، E 211)، ملون (E 150a)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1400,
      energie_kcal: 335,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 81.2,
      davon_zucker: 80.9,
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
    de: `Aromatisierter Sirup mit authentischem Toffee-Nut-Geschmack (Haselnuss und Karamell). Hergestellt mit echtem Zucker. Verleiht Ihren Getränken und Desserts einen reichhaltigen, süßen und buttrigen nussigen Geschmack. Besonders beliebt für Toffee-Nut-Lattes.

Anwendungsgebiete und Gebrauchsanweisung:
Wird in heißen und kalten Getränken wie Latte, Cappuccino, Filterkaffee, Eis-Latte, Frappé, Milchshake, Smoothie und gefrorenen Getränken, Cocktails sowie in heißen und kalten Tees als Aroma mit 1,5–2 cl verwendet. Es kann auch als Getränk zubereitet werden, indem es im Verhältnis 1:8 mit heißem oder kaltem Wasser oder Milch gemischt wird. Es kann in beliebiger Menge allen Arten von Desserts wie Kuchen, Keksen und Torten beigefügt werden, um ihnen Geschmack zu verleihen. Servierempfehlung.

Lagerung:
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    tr: `Gerçek şeker ile üretilmiş, otantik Toffee Nut (Fındık-Karamel) aromasına sahip profesyonel şurup. İçeceklerinize ve tatlılarınıza zengin, tatlı ve tereyağlı fındık lezzeti katar. Özellikle Toffee Nut Latte yapımı için idealdir.

Kullanıldığı Yerler ve Kullanma Talimatı:
Latte, Capuccino, fitre kahve, ice latte, frappe, milkshake, smoothie, frozen gibi soğuk ve sıcak içeceklerde, kokteyllerde, sıcak ve soğuk çaylarda 1,5-2 cl olarak kullanılır. Ayrıca sıcak veya soğuk su, süt ile 1+8 oranında hazırlanarak içilebilir. Tüm tatlı çeşitlerine, pasta, kurabiye, kek gibi pastacılık ürünlerine de lezzet vermek amacıyla istenilen ölçüde ilave edilir.

Saklama Koşulları:
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    en: `Premium syrup with authentic Toffee Nut flavor. Made with real sugar. Adds a rich, sweet, and buttery nutty taste to your beverages and desserts. Highly popular for making Toffee Nut Lattes.

Place of Usage and Direction for Use:
It is used as 1.5 - 2 cl in cold and hot drinks such as latte, cappuccino, filter coffee, ice latte, frappe, milkshake, smoothie, frozen, cocktails, hot and cold teas. It can also be drunk with hot or cold water / milk, by preparing it at the rate of 1 + 8. It can be added to all kinds of desserts in the desired size in order to give flavor to pastry products such as cakes, cookies, cakes.

Storage:
Keep away from direct sunlight, keep in cool and dry place.`,
    ar: `شراب فاخر بنكهة البندق والكراميل (التوفي نات) الأصلية. مصنوع من السكر الحقيقي. يضيف طعمًا غنيًا وحلوًا وجوزيًا زبدانيًا إلى مشروباتك وحلوياتك. مثالي لتحضير توفي نات لاتيه.

مناطق الاستخدام وتعليمات الاستخدام:
يستخدم بمقدار 1.5 - 2 سنتيلتر في المشروبات الباردة والساخنة مثل اللاتيه، الكابتشينو، القهوة المفلترة، الآيس لاتيه، الفرابيه، الميلك شيك، السموثي، المشروبات المجمدة، الكوكتيلات، والشاي الساخن والبارد. يمكن أيضاً شربه مع الماء الساخن أو البارد / الحليب، عن طريق تحضيره بنسبة 1 + 8. يمكن إضافته إلى جميع أنواع الحلويات بالكمية المطلوبة لإضفاء نكهة على منتجات المعجنات مثل الكعك، البسكويت، والكيك.

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
    geschmack: ["fındık", "karamel", "toffee nut", "hazelnut caramel", "toffee"],
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
    console.error("Error updating Toffee Nut Syrup:", error);
  } else {
    console.log("✅ Toffee Nut Syrup (2eb62f63...) successfully updated and activated!");
  }
}

updateToffeeNutSyrup();
