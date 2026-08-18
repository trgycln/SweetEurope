import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updatePremiumCaramelSyrup() {
  const pId = "5de34925-b25a-463f-ae71-b093693c38bf";

  const ad = {
    ar: "شراب الكراميل بريميوم (700 مل)",
    de: "Premium Karamellsirup (700 ml)",
    en: "Premium Caramel Syrup (700 ml)",
    tr: "Premium Karamelli Şurup (700 ml)"
  };

  const inhaltsstoffe = {
    de: "Zucker, Wasser, Karamell (1,5%) [Zucker, Maltodextrin, Butter, Sonnenblumenlecithin, Salz], natürliches Aroma (Karamell), Farbstoffe (E 150a), natürliches Säuerungsmittel (E 334), Konservierungsstoffe (E 202, E 211).",
    tr: "Şeker, Su, Karamel (%1,5) [Şeker, Maltodekstrin, Tereyağı, Ayçiçek lesitini, Tuz], Doğal aroma verici (Karamel), Renklendirici (E 150a), Doğal asitlik düzenleyici (E 334), Koruyucu (E 202, E 211).",
    en: "Sugar, Water, Caramel (1,5%) [Sugar, Maltodextrin, Butter, Sunflower lecithin, Salt], Natural flavouring (Caramel), Colour (E 150a), Natural acidity regulator (E 334), Preservative (E 202, E 211).",
    ar: "سكر، ماء، كراميل (1.5%) [سكر، مالتوديكسترين، زبدة، ليسيثين دوار الشمس، ملح]، نكهة طبيعية (كراميل)، ملون (E 150a)، منظم حموضة طبيعي (E 334)، مواد حافظة (E 202، E 211)."
  };

  const naehrwerte = {
    pro_100ml: {
      energie_kj: 1590,
      energie_kcal: 379,
      fett: 0.3,
      davon_gesaettigt: 0.2,
      kohlenhydrate: 92.7,
      davon_zucker: 90.9,
      staerke: 0.0,
      ballaststoffe: 0.0,
      eiweiss: 0.0,
      salz: 0.02
    }
  };

  const allergene = {
    allergen_free: false,
    milch: true,
    gluten: false,
    soja: false,
    nuesse: false,
    contains_de: "Allergenhinweis: Enthält Milch und Milchprodukte.",
    contains_tr: "Alerjen uyarısı: Süt ve süt ürünleri içerir.",
    contains_en: "Allergen warning: Contains milk and dairy products.",
    contains_ar: "تحذير من مسببات الحساسية: يحتوي على الحليب ومنتجات الألبان."
  };

  const aciklamalar = {
    de: `Premium Karamellsirup. 

Anwendungsgebiete und Gebrauchsanweisung:
Es wird empfohlen, 1–2 cl Sirup als Aroma- und Süßungsmittel in heißen und kalten Kaffeespezialitäten, Milchshakes, Cocktails, Mocktails sowie in heißen und kalten Tees zu verwenden. Es kann auch als Getränk zubereitet werden, indem es im Verhältnis 1:4 mit heißem oder kaltem Wasser oder Milch gemischt wird. Es kann in beliebiger Menge Desserts und Gebäck beigefügt werden, um ihnen Geschmack zu verleihen. Servierempfehlung.

Lagerung:
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    tr: `Premium Karamelli Şurup.

Kullanıldığı Yerler ve Kullanma Talimatı:
Sıcak ve soğuk kahvelerde, milkshake, kokteyl ve mokteyllerde, ayrıca sıcak ve soğuk çaylarda aroma ve tatlandırıcı olarak 1–2 cl şurup kullanılması tavsiye edilir. Ayrıca sıcak ya da soğuk su/süt ile 1/4 oranında karıştırılarak içecek olarak da hazırlanabilir. Tatlı çeşitlerine ve pastacılık ürünlerine lezzet katmak amacıyla istenilen miktarda ilave edilebilir. Servis önerisidir.

Saklama Koşulları:
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    en: `Premium Caramel Syrup.

Place of Usage and Direction for Use:
It is recommended to use 1–2 cl of syrup as a flavoring and sweetening agent in hot and cold coffees, milkshakes, cocktails, mocktails, and also in hot and cold teas. Additionally, it can be mixed with hot or cold water/milk at a 1/4 ratio to prepare a beverage. It may also be added in the desired amount to desserts and pastry products to enhance flavor. Service suggestion.

Storage:
Keep away from direct sunlight, keep in cool and dry place.`,
    ar: `شراب الكراميل بريميوم.

مناطق الاستخدام وتعليمات الاستخدام:
يوصى باستخدام 1-2 سنتيلتر من الشراب كعامل منكه ومحلي في القهوة الساخنة والباردة والميلك شيك والكوكتيلات والموكتيلات، وأيضاً في الشاي الساخن والبارد. بالإضافة إلى ذلك، يمكن خلطه مع الماء/الحليب الساخن أو البارد بنسبة 1/4 لتحضير مشروب. يمكن إضافته بالكمية المرغوبة إلى الحلويات ومنتجات المخابز لإضافة نكهة. اقتراح التقديم.

شروط التخزين:
يحفظ في مكان بارد وجاف بعيداً عن أشعة الشمس المباشرة.`
  };

  const { data: pData } = await supabase.from('urunler').select('teknik_ozellikler').eq('id', pId).single();
  const existingTeknik = pData?.teknik_ozellikler || {};

  const updatedTeknik = {
    ...existingTeknik,
    vegan: false,
    laktosefrei: false,
    glutenfrei: true,
    vegetarisch: true,
    ohne_zucker: false,
    geschmack: ["karamel", "caramel", "karamell"],
    birim_hacim_ml: 700,
    koli_ici_adet: 6,
    mensei: "Türkiye / Made in Turkey",
    mischungsverhaeltnis: "1+4"
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
    console.error("Error updating Premium Caramel Syrup:", error);
  } else {
    console.log("✅ Premium Caramel Syrup (c937be53...) successfully updated and activated!");
  }
}

updatePremiumCaramelSyrup();
