import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateChocolateDecorSauce() {
  const pId = "2fe1553f-c23a-4444-b29a-9d6c7bacf91f"; // FO Çikolata Aromalı Dekor Sos 750g (Barkod: 8691123492244)

  const ad = {
    ar: "صلصة تزيين بنكهة الشوكولاتة فو 750 جم",
    de: "FO Dekorsauce mit Schokoladengeschmack - 750 g",
    en: "FO Chocolate Flavored Decor Sauce - 750 g",
    es: "FO Salsa Decorativa Sabor Chocolate - 750 g",
    ru: "FO Топпинг со вкусом шоколада - 750 г",
    tr: "FO Çikolata Aromalı Dekor Sos - 750 g"
  };

  const inhaltsstoffe = {
    de: "Glukosesirup, Wasser, Farbstoffe (E 150d, E 153, E 129, E 155), Verdickungsmittel (E 440, E 466), Kakaopulver, Konservierungsmittel (E 202, E 211), Aroma (Schokolade), Säuerungsmittel (E 330). E 129: Kann negative Auswirkungen auf die Aktivität und Aufmerksamkeit von Kindern haben.",
    tr: "Glikoz şurubu, Su, Renklendirici (E 150d, E 153, E 129, E 155), Kıvam verici (E 440, E 466), Kakao tozu, Koruyucu (E 202, E 211), Aroma verici (Çikolata), Asitlik düzenleyici (E 330). E 129: Çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
    en: "Glucose syrup, Water, Colour (E 150d, E 153, E 129, E 155), Thickener (E 440, E 466), Cocoa powder, Preservative (E 202, E 211), Flavouring (Chocolate), Acidity regulator (E 330). E 129: May have negative effects on the activities and attentions of the children.",
    ar: "شراب الجلوكوز ، ماء ، ملون (E 150d ، E 153 ، E 129 ، E 155) ، مثخن (E 440 ، E 466) ، مسحوق الكاكاو ، مادة حافظة (E 202 ، E 211) ، نكهة (الشوكولاتة) ، منظم الحموضة (E 330). E 129: قد يكون له آثار سلبية على نشاط الأطفال وانتباههم.",
    es: "Jarabe de glucosa, Agua, Colorante (E 150d, E 153, E 129, E 155), Espesante (E 440, E 466), Cacao en polvo, Conservadores (E 202, E 211), Aroma (Chocolate), Correctores de la acidez (E 330). E 129: Puede tener efectos negativos sobre la actividad y la atención de los niños.",
    ru: "Сироп глюкозы, вода, краситель (Е 150d, Е 153, Е 129, Е 155), загуститель (Е 440, Е 466), какао-порошок, консервант (Е 202, Е 211), ароматизатор (шоколад), регулятор кислотности (Е 330). Е 129: Содержит краситель, который может оказывать отрицательное влияние на активность и внимание детей."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1050,
      energie_kcal: 250,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 61.0,
      davon_zucker: 30.3,
      staerke: 19.9,
      ballaststoffe: 0.7,
      eiweiss: 0.5,
      salz: 0.3
    }
  };

  const allergene = {
    allergen_free: true,
    milch: false,
    gluten: false,
    soja: false,
    nuesse: false,
    contains_de: "Allergenfrei.",
    contains_tr: "Alerjen içermez.",
    contains_en: "Allergen free.",
    contains_ar: "خالٍ من مسببات الحساسية.",
    contains_es: "Libre de alérgenos.",
    contains_ru: "Без аллергенов."
  };

  const aciklamalar = {
    de: "FO Dekorsauce mit Schokoladengeschmack 750 g\nWird als Dekorationssoße für Kuchen, Tartes, Waffeln, Plätzchen, Käsekuchen, Muffin, Charlotte, Pudding und Eis verwendet. Es ist für den direkten Verzehr geeignet. Die Spitze des Deckels ist schmal, daher ist die Anwendung praktisch. Die Anwendungstemperatur des Produktes beträgt zwischen 20-22°C.",
    tr: "FO Çikolata Aromalı Dekor Sos 750 g\nPasta, kek, tart, turta, waffle, kurabiye, cheesecake, muffin, şarlot pasta, soslu tatlılar ve dondurma yapımında dekorasyon amacıyla kullanılır. Direkt olarak mamul veya pasta tabağı üzerine uygulanır. Kapağın uç kısmının ince olması nedeniyle kullanımı pratiktir. Tavsiye edilen uygulama sıcaklığı 20-22°C arasındadır.",
    en: "FO Chocolate Flavored Decor Sauce 750 g\nMay be used as a topping sauce for decorating pastries, cakes, tarts, waffle, biscuits, cheesecakes, muffins, charlotte, desserts with sauces and ice creams. It is applied directly to the product or on a cake plate. It is practical to apply due to the extreme side of the cover is thin. The application temperature is recommended between 20-22°C.",
    ar: "صلصة تزيين بنكهة الشوكولاتة فو 750 جم\nيستخدم كصوص للتزيين في الكيك، والفطائر، والوافل، والكعك، والشيز كيك، والمافن، وكيك الشارلوت، والحلويات مع الصوص، والآيس كريم. يوضع مباشرة على المنتج أو على طبق الكيك. تصميمه ذو الطرف الرفيع يجعله عملياً في الاستخدام. تتراوح درجة حرارة التطبيق الموصى بها بين 20-22 درجة مئوية.",
    es: "FO Salsa Decorativa Sabor Chocolate 750 g\nSe utiliza como adorno decorativo en la presentación de helados, dulces de leche, tartas, pasteles, tortas, waffle, galletas, cheesecake, muffin, charlotte. Se aplica directamente al alimento o sobre el plato de tarta. Por el motivo de ser fina la parte inferior el uso es muy práctico. La temperatura de aplicación del producto está entre 20-22°C.",
    ru: "FO Топпинг со вкусом шоколада 750 г\nПрименяется как декор для всех видов кондитерских изделий, тортов, вафель, тарталеток, печенья, чизкейков, шарлоток, маффинов, десертов, а также мороженого. Применяется напрямую на продукт или на тарелку для торта. Тонкий носик на крышке позволяет применять продукт легко и практично. Рекомендуемая температура для применения продукта 20-22°C."
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
    geschmack: ["çikolata", "chocolate", "schokolade", "شوكولاتة", "шоколад"],
    net_agirlik_g: 750
  };

  const updatePayload = {
    ad,
    inhaltsstoffe,
    naehrwerte,
    besin_degerleri: JSON.stringify(naehrwerte),
    allergene,
    aciklamalar,
    teknik_ozellikler: updatedTeknik,
    ean_gtin: "8691123492244",
    aktif: true,
    produktdatenblatt_url: "https://szuhjzgyhhlrydyllrcd.supabase.co/storage/v1/object/public/urun-etiketleri/soslar-750g/cikolata-aromali-dekor-sos-750g.pdf"
  };

  const { error } = await supabase.from('urunler').update(updatePayload).eq('id', pId);
  if (error) {
    console.error("Error updating Chocolate Flavored Decor Sauce:", error);
  } else {
    console.log("✅ Chocolate Flavored Decor Sauce successfully updated and activated!");
  }
}

updateChocolateDecorSauce();
