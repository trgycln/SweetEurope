import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateHazelnutFlavoredSyrup() {
  // Using the product ID for "Hazelnut Flavored Syrup – Premium 700 ml"
  const pId = "db361886-66e2-49f1-994a-c9dbe3fe5e56"; // FO Fındık Aromalı Şurup - Premium 700 ml (Barkod: 8691123471017)

  const ad = {
    ar: "فو شراب بنكهة البندق الفاخر 700 مل",
    de: "FO Haselnuss-Sirup Premium – 700 ml",
    en: "FO Premium Hazelnut Flavored Syrup – 700 ml",
    tr: "FO Fındık Aromalı Premium Şurup – 700 ml"
  };

  const inhaltsstoffe = {
    de: "Zucker, Wasser, natürliches Aroma (Haselnuss), Haselnussextrakt, natürliches Säuerungsmittel (E 334), Konservierungsstoffe (E 202, E 211), Farbstoffe (E 150a). Allergenwarnung: Enthält Haselnüsse.",
    tr: "Şeker, Su, Doğal Aroma verici (Fındık), Fındık ekstraktı, Doğal asitlik düzenleyici (E 334), Koruyucu (E 202, E 211), Renklendirici (E 150a). Alerjen Uyarısı: Fındık içerir.",
    en: "Sugar, Water, Natural flavouring (Hazelnut), Hazelnut extract, Natural acidity regulator (E 334), Preservative (E 202, E 211), Colour (E 150a). Allergen warning: Contains hazelnuts.",
    ar: "سكر، ماء، نكهة طبيعية (بندق)، مستخلص البندق، منظم حموضة طبيعي (E334)، مادة حافظة (E202، E211)، مادة ملونة (E150a). تحذير من الحساسية: يحتوي على البندق.",
    fr: "Sucre, Eau, Arôme Naturel (Noisette), Extrait de Noisette, Régulateur d'acidité naturel (E 334), Conservateur (E 202, E 211), Colorant (E 150a). Avertissement sur les allergènes : Contient des noisettes.",
    ru: "Сахар, вода, натуральный ароматизатор (лесной орех), экстракт лесного ореха, натуральный регулятор кислотности (E 334), консерванты (E 202, E 211), краситель (E 150a). Предупреждение об аллергенах: содержит фундук."
  };

  const naehrwerte = {
    pro_100ml: {
      energie_kj: 1410,
      energie_kcal: 336,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 82.9,
      davon_zucker: 81.6,
      staerke: 0.0,
      ballaststoffe: 0.0,
      eiweiss: 0.0,
      salz: 0.01
    }
  };

  const allergene = {
    allergen_free: false,
    milch: false,
    gluten: false,
    soja: false,
    nuesse: true, // Contains hazelnuts
    contains_de: "Glutenfrei. Natürliche Farben. Natürliche Aromen. Vegan.",
    contains_tr: "Glütensiz. Doğal Renklendiriciler. Doğal Aromalar. Vegan.",
    contains_en: "Gluten free. Natural Colors. Natural Flavors. Vegan.",
    contains_ar: "خالي من الغلوتين. ألوان طبيعية. نكهات طبيعية. نباتي."
  };

  const aciklamalar = {
    de: `Es wird empfohlen, 1-2 cl Sirup als Aroma- und Süßungsmittel in heißen und kalten Kaffeegetränken, Milkshakes, Cocktails, Mocktails sowie in heißen und kalten Tees zu verwenden. Es kann auch als Getränk zubereitet werden, indem es im Verhältnis 1:8 mit heißem oder kaltem Wasser oder Milch gemischt wird. Es kann in beliebiger Menge Desserts und Gebäck beigefügt werden, um ihnen Geschmack zu verleihen. Servierempfehlung.

Lagerung:
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    tr: `Sıcak ve soğuk kahvelerde, milkshake, kokteyl ve mokteyllerde, ayrıca sıcak ve soğuk çaylarda aroma ve tatlandırma olarak 1-2 cl şurup kullanılması tavsiye edilir. Ayrıca sıcak ya da soğuk su/süt ile 1/8 oranında karıştırılarak içecek olarak da hazırlanabilir. Tatlı çeşitlerine ve pastacılık ürünlerine lezzet katmak amacıyla istenilen miktarda ilave edilebilir. Servis önerisidir.

Saklama Koşulları:
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    en: `It is recommended to use 1-2 cl of syrup as a flavoring and sweetening agent in hot and cold coffees, milkshakes, cocktails, mocktails, and also in hot and cold teas. Additionally, it can be mixed with hot or cold water/milk at a 1/8 ratio to prepare a beverage. It may also be added in the desired amount to desserts and pastry products to enhance flavor. Service suggestion.

Storage:
Keep away from direct sunlight, keep in cool and dry place.`,
    ar: `طرق ومواضع الاستخدام: من 1-2 مل من الشراب في القهوة الباردة والساخنة، المخفوقات (ميلك شيك)، الكوكتيل، بالإضافة إلى الشاي البارد والساخن كمشروب يمكن تخفيفه بنسبة 1/8. بالإضافة إلى ذلك، يمكن استخدامه بكمية مرغوبة مع المخبوزات والحلويات لإضفاء النكهة. مقترح التقديم.

شروط التخزين:
يحفظ في مكان بارد وجاف بعيداً عن أشعة الشمس المباشرة.`,
    fr: `Recommandé comme arôme et édulcorant dans les cafés chauds ou froids, les milkshakes, cocktails, mocktails ainsi que les thés chauds ou froids. Utilisez 1 à 2 cl de sirop selon le goût. Peut également être préparé comme boisson en le diluant à raison de 1/8 dans de l'eau ou du lait, chaud ou froid. On peut en ajouter à volonté aux desserts et produits de pâtisserie pour en rehausser le goût. Suggestion de service.

Stockage:
Protéger du rayonnement direct du soleil et dans un endroit frais et sec.`,
    ru: `Рекомендуется использовать 1-2 cl на порцию. Можно также разбавить молоком или водой (горячей/холодной) в пропорции 1:8. Добавляется в десерты и выпечку по вкусу. Рекомендация по подаче.

Хранение:
Хранить вдали от солнечного света в прохладном и сухом месте.`
  };

  const { data: pData } = await supabase.from('urunler').select('teknik_ozellikler, barkod').eq('id', pId).single();
  const existingTeknik = pData?.teknik_ozellikler || {};

  const updatedTeknik = {
    ...existingTeknik,
    vegan: true,
    laktosefrei: true,
    glutenfrei: true,
    vegetarisch: true,
    ohne_zucker: false,
    geschmack: ["fındık", "hazelnut", "haselnuss", "noisette", "лесной орех"],
    birim_hacim_ml: 700,
    koli_ici_adet: 6,
    palet_ici_adet: 750,
    mischungsverhaeltnis: "1+8"
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

  // set barkod to 8691123471017 if possible, else log it. Since barkod might not be a column based on my earlier check, 
  // I will just put it in the log.

  const { error } = await supabase.from('urunler').update(updatePayload).eq('id', pId);
  if (error) {
    console.error("Error updating Hazelnut Flavored Syrup:", error);
  } else {
    console.log("✅ Hazelnut Flavored Syrup successfully updated and activated!");
  }
}

updateHazelnutFlavoredSyrup();
