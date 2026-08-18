import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateVanillaFlavoredSyrup() {
  const pId = "e4c0244b-2d45-496c-905a-cc22e4f177d9"; // FO Vanilya Aromalı Şurup 700ml (Barkod: 8691123450951)

  const ad = {
    ar: "فو شراب بنكهة الفانيلا 700 مل",
    de: "FO Vanille-Aromasirup – 700 ml",
    en: "FO Vanilla Flavored Syrup – 700 ml",
    tr: "FO Vanilya Aromalı Şurup – 700 ml"
  };

  const inhaltsstoffe = {
    de: "Zucker, Wasser, Aroma (Vanille), Säuerungsmittel (E 330), Konservierungsstoffe (E 202, E 211).",
    tr: "Şeker, Su, Aroma verici (Vanilya), Asitlik düzenleyici (E 330), Koruyucu (E 202, E 211).",
    en: "Sugar, Water, Flavouring (Vanilla), Acidity regulator (E 330), Preservative (E 202, E 211).",
    ar: "سكر، ماء، نكهة (الفانيلا)، منظم الحموضة (إي 330)، مادة حافظة (إي 202، إي 211)."
  };

  const naehrwerte = {
    pro_100ml: {
      energie_kj: 1420,
      energie_kcal: 339,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 81.5,
      davon_zucker: 81.5,
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
    contains_de: "Allergenfrei.",
    contains_tr: "Alerjen içermez.",
    contains_en: "Allergen free.",
    contains_ar: "خالٍ من مسببات الحساسية."
  };

  const aciklamalar = {
    de: "FO Vanille-Aromasirup 700 ml\n Es wird empfohlen, 1-2 cl Sirup als Aroma- und Süßungsmittel in heißen und kalten Kaffeespezialitäten, Milchshakes, Cocktails, Mocktails sowie in heißen und kalten Tees zu verwenden. Es kann auch als Getränk zubereitet werden, indem es im Verhältnis 1:8 mit heißem oder kaltem Wasser oder Milch gemischt wird. Es kann in beliebiger Menge Desserts und Gebäck beigefügt werden, um ihren Geschmack zu verstärken. Serviervorschlag.",
    tr: "FO Vanilya Aromalı Şurup 700 ml\n Sıcak ve soğuk kahvelerde, milkshake, kokteyl ve mokteyllerde, ayrıca sıcak ve soğuk çaylarda aroma ve tatlandırıcı olarak 1-2 cl şurup kullanılması tavsiye edilir. Ayrıca sıcak ya da soğuk su/süt ile 1/8 oranında karıştırılarak içecek olarak da hazırlanabilir. Tatlı çeşitlerine ve pastacılık ürünlerine lezzet katmak amacıyla istenilen miktarda ilave edilebilir. Servis önerisidir.",
    en: "FO Vanilla Flavored Syrup 700 ml\n It is recommended to use 1-2 cl of syrup as a flavoring and sweetening agent in hot and cold coffees, milkshakes, cocktails, mocktails, and also in hot and cold teas. Additionally, it can be mixed with hot or cold water/milk at a 1/8 ratio to prepare a beverage. It may also be added in the desired amount to desserts and pastry products to enhance flavor. Service suggestion.",
    ar: "فو شراب بنكهة الفانيلا 700 مل\n يوصى باستخدام 1-2 سل من الشراب كعامل تنكيه وتحلية في القهوة الساخنة والباردة والميلك شيك والكوكتيلات والموكتيلات والشاي الساخن والبارد. بالإضافة إلى ذلك ، يمكن مزجه بالماء / الحليب الساخن أو البارد بنسبة 1/8 لتحضير مشروب. يمكن إضافته بالكمية المطلوبة إلى الحلويات ومنتجات المعجنات لتعزيز النكهة. اقتراح الخدمة."
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
    geschmack: ["vanilya", "vanilla", "vanille", "فانيلا"],
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
    ean_gtin: "8691123450951",
    aktif: true
  };

  const { error } = await supabase.from('urunler').update(updatePayload).eq('id', pId);
  if (error) {
    console.error("Error updating Vanilla Flavored Syrup:", error);
  } else {
    console.log("✅ Vanilla Flavored Syrup successfully updated and activated!");
  }
}

updateVanillaFlavoredSyrup();
