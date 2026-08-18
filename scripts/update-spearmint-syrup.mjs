import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateSpearmintSyrup() {
  const pId = "0c2f58b8-86fe-48a8-8264-8dd64627092b";

  const ad = {
    ar: "شراب النعناع الأخضر فو 700 مل",
    de: "FO Krauseminzsirup 700 ml",
    en: "FO Spearmint Flavored Syrup 700 ml",
    tr: "FO Bahçe Nanesi Aromalı Şurup 700 ml"
  };

  const inhaltsstoffe = {
    de: "Zucker, Wasser, Aroma (Spearmint), Säuerungsmittel (E 330), Konservierungsstoffe (E 202, E 211).",
    tr: "Şeker, Su, Aroma verici (Bahçe nanesi), Asitlik düzenleyici (E 330), Koruyucu (E 202, E 211).",
    en: "Sugar, Water, Flavouring (Spearmint), Acidity regulator (E 330), Preservative (E 202, E 211).",
    ar: "سكر، ماء، نكهة (النعناع الأخضر)، منظم الحموضة (E 330)، مواد حافظة (E 202، E 211)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1410,
      energie_kcal: 338,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 82.4,
      davon_zucker: 82.4,
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
    de: `Aromatisierter Sirup mit authentischem Krauseminzgeschmack (Spearmint). Hergestellt mit echtem Zucker. Verleiht Getränken und Desserts eine angenehme Süße und ein erfrischendes Minzaroma.

Anwendungsgebiete und Gebrauchsanweisung:
Es wird empfohlen, 1–2 cl Sirup als Aroma- und Süßungsmittel in heißen und kalten Kaffeespezialitäten, Milchshakes, Cocktails, Mocktails sowie in heißen und kalten Tees zu verwenden. Es kann auch als Getränk zubereitet werden, indem es im Verhältnis 1:8 mit heißem oder kaltem Wasser oder Milch gemischt wird. Es kann in beliebiger Menge Desserts und Gebäck beigefügt werden, um ihnen Geschmack zu verleihen. Servierempfehlung.

Lagerung:
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    tr: `Gerçek şeker ile üretilmiş, otantik bahçe nanesi (spearmint) aromasına sahip profesyonel şurup. İçeceklerinize ve tatlılarınıza ferahlatıcı bir nane lezzeti katar.

Kullanıldığı Yerler ve Kullanma Talimatı:
Uluslararası ve özel kokteyllerin, mokteyllerin hazırlanmasında kullanıcıların tercih ettiği aromalı şuruptur. Soda bazlı içeceklerde, aromalı soğuk çaylarda, smoothie, milkshake ve limonata gibi içeceklerde, içeceğe aroma ve tat katmak amacıyla 1/8 oranında kullanılır. Ayrıca, sıcak veya soğuk su ile aynı oranda sulandırılarak içime hazır hâle getirilir. Tatlı çeşitlerine ve pastacılık ürünlerine lezzet katmak amacıyla istenilen miktarda ilave edilebilir. Servis önerisidir.

Saklama Koşulları:
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    en: `Premium syrup with authentic spearmint flavor. Made with real sugar. Adds a delightful sweetness and a refreshing mint taste to your beverages and desserts.

Place of Usage and Direction for Use:
It is a flavored syrup preferred by users in the preparation of international and specialty cocktails and mocktails. It is used at a 1/8 ratio to add flavor and taste in soda-based drinks, flavored iced teas, smoothies, milkshakes, and lemonades. Additionally, it can be diluted with hot or cold water in the same ratio to make it ready to drink. It can also be added in the desired amount to desserts and pastry products to enhance flavor. Service suggestion.

Storage:
Keep away from direct sunlight, keep in cool and dry place.`,
    ar: `شراب فاخر بنكهة النعناع الأخضر الأصلية (النعناع البستاني). مصنوع من السكر الحقيقي. يضيف حلاوة لذيذة وطعم النعناع المنعش إلى المشروبات والحلويات.

مناطق الاستخدام وتعليمات الاستخدام:
هو شراب منكه مفضل لدى المستخدمين في تحضير الكوكتيلات والموكتيلات الدولية والخاصة. يستخدم بنسبة 1/8 لإضافة نكهة وطعم في المشروبات الغازية، الشاي المثلج المنكه، السموثي، الميلك شيك والليموناضة. بالإضافة إلى ذلك، يمكن تخفيفه بالماء الساخن أو البارد بنفس النسبة لجعله جاهزاً للشرب. يمكن إضافته أيضاً بالكمية المرغوبة إلى الحلويات ومنتجات المخابز لإضافة نكهة. اقتراح التقديم.

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
    geschmack: ["bahçe nanesi", "spearmint", "nane", "krauseminze", "menthe verte"],
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
    console.error("Error updating Spearmint Syrup:", error);
  } else {
    console.log("✅ Spearmint Syrup (0c2f58b8...) successfully updated and activated!");
  }
}

updateSpearmintSyrup();
