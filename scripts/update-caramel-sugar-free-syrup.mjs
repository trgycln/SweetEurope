import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateCaramelSugarFreeSyrup() {
  // If the product ID is not in DB yet, you can replace this with the actual UUID later
  const pId = "REPLACE_WITH_ACTUAL_UUID"; // FO Karamel Aromalı Şurup Şekersiz 700ml (Barkod: 8691123463470)

  const ad = {
    ar: "فو شراب بنكهة الكراميل - خالي من السكر 700 مل",
    de: "FO Karamell-Aromasirup - Zuckerfrei 700 ml",
    en: "FO Caramel Flavored Syrup - Sugar Free 700 ml",
    tr: "FO Karamel Aromalı Şurup - Şekersiz 700 ml"
  };

  const inhaltsstoffe = {
    de: "Wasser, Polydextrose (E 1200), Aroma (Karamell), Verdickungsmittel (E 466), Säuerungsmittel (E 334), Süßungsmittel [Sucralose (E 955), Acesulfam K (E 950)], Konservierungsstoffe (E 202, E 211), Farbstoffe (E 150d). Enthält Süßungsmittel.",
    tr: "Su, Polidekstroz (E 1200), Aroma verici (Karamel), Kıvam verici (E 466), Asitlik düzenleyici (E 334), Tatlandırıcı [Sükraloz (E 955), Asesülfam K (E 950)], Koruyucu (E 202, E 211), Renklendirici (E 150d). Tatlandırıcı içerir.",
    en: "Water, Polydextrose (E 1200), Flavouring (Caramel), Thickener (E 466), Acidity regulator (E 334), Sweetener [Sucralose (E 955), Acesulfame K (E 950)], Preservative (E 202, E 211), Colour (E 150d). Contains sweetener.",
    ar: "ماء، بوليديكستروز (E 1200)، نكهة (كراميل)، مثخن (E 466)، منظم الحموضة (E 334)، محلي [سوكرالوز (E 955)، أسيسولفام ك (E 950)]، مواد حافظة (E 202، E 211)، ملون (E 150d). يحتوي على محلي."
  };

  const naehrwerte = {
    pro_100ml: {
      energie_kj: 55,
      energie_kcal: 13,
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
    contains_de: "Allergenfrei.",
    contains_tr: "Alerjen içermez.",
    contains_en: "Allergen free.",
    contains_ar: "خالٍ من مسببات الحساسية."
  };

  const aciklamalar = {
    de: "FO Karamell-Aromasirup - Zuckerfrei 700 ml\n Es wird empfohlen, 1-2 cl Sirup als Aroma- und Süßungsmittel in heißen und kalten Kaffeespezialitäten, Milchshakes, Cocktails, Mocktails sowie in heißen und kalten Tees zu verwenden. Es kann auch als Getränk zubereitet werden, indem es im Verhältnis 1:8 mit heißem oder kaltem Wasser oder Milch gemischt wird. Es kann in beliebiger Menge Desserts und Gebäck beigefügt werden, um ihren Geschmack zu verstärken. Serviervorschlag.",
    tr: "FO Karamel Aromalı Şurup - Şekersiz 700 ml\n Sıcak ve soğuk kahvelerde, milkshake, kokteyl ve mokteyllerde, ayrıca sıcak ve soğuk çaylarda aroma ve tatlandırıcı olarak 1-2 cl şurup kullanılması tavsiye edilir. Ayrıca sıcak ya da soğuk su/süt ile 1/8 oranında karıştırılarak içecek olarak da hazırlanabilir. Tatlı çeşitlerine ve pastacılık ürünlerine lezzet katmak amacıyla istenilen miktarda ilave edilebilir. Servis önerisidir.",
    en: "FO Caramel Flavored Syrup - Sugar Free 700 ml\n It is recommended to use 1-2 cl of syrup as a flavoring and sweetening agent in hot and cold coffees, milkshakes, cocktails, mocktails, and also in hot and cold teas. Additionally, it can be mixed with hot or cold water/milk at a 1/8 ratio to prepare a beverage. It may also be added in the desired amount to desserts and pastry products to enhance flavor. Service suggestion.",
    ar: "فو شراب بنكهة الكراميل - خالي من السكر 700 مل\n يوصى باستخدام 1-2 سل من الشراب كعامل تنكيه وتحلية في القهوة الساخنة والباردة والميلك شيك والكوكتيلات والموكتيلات والشاي الساخن والبارد. بالإضافة إلى ذلك ، يمكن مزجه بالماء / الحليب الساخن أو البارد بنسبة 1/8 لتحضير مشروب. يمكن إضافته بالكمية المطلوبة إلى الحلويات ومنتجات المعجنات لتعزيز النكهة. اقتراح الخدمة."
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
    geschmack: ["karamel", "caramel", "karamell", "كراميل", "şekersiz", "sugar free", "zuckerfrei"],
    birim_hacim_ml: 700,
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
    aktif: true,
    produktdatenblatt_url: "https://szuhjzgyhhlrydyllrcd.supabase.co/storage/v1/object/public/urun-etiketleri/suruplar-700ml/karamel-aromali-surup-sekersiz-700ml.pdf" // Placeholder
  };

  const { error } = await supabase.from('urunler').update(updatePayload).eq('id', pId);
  if (error) {
    console.error("Error updating Caramel Sugar Free Syrup:", error);
  } else {
    console.log("✅ Caramel Sugar Free Syrup successfully updated and activated!");
  }
}

updateCaramelSugarFreeSyrup();
