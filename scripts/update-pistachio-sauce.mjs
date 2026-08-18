import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePistachioSauce() {
  const productId = 'e3b8c6ff-fcf2-4552-b58a-3a616b979a8b'; // ID for Antep Fıstıklı Special Sos 940 gr (%5)

  const updateData = {
    ad: {
      ar: "صلصة الفستق الخاصة 940 جم (5%)",
      de: "Pistazien-Spezialsauce 940 g (5%)",
      en: "Pistachio Special Sauce 940 g (5%)",
      tr: "Antep Fıstıklı Special Sos 940 gr (%5)"
    },
    inhaltsstoffe: {
      tr: "Şeker, Bitkisel yağ (Ayçiçek yağı), Yağsız süttozu (Süt), Antep fıstığı (%5), Emülgatör (Soya lesitini), Aroma verici (Antep fıstığı), Renklendirici (E 141, E 150a).",
      de: "Zucker, Pflanzenöl (Sonnenblumenöl), Magermilchpulver (Milch), Pistazien (5%), Emulgator (Sojalecithin), Aroma (Pistazien), Farbstoff (E 141, E 150a).",
      en: "Sugar, Vegetable oil (Sunflower oil), Skimmed milk powder (Milk), Pistachio (5%), Emulsifier (Soy lecithin), Flavouring (Pistachio), Colour (E 141, E 150a)."
    },
    naehrwerte: {
      pro_100g: {
        energie_kj: 2310,
        energie_kcal: 553,
        fett: 32.1,
        davon_gesaettigt: 3.3,
        kohlenhydrate: 62.3,
        davon_zucker: 57.6,
        staerke: 0.0,
        ballaststoffe: 0.5,
        eiweiss: 3.5,
        salz: 0.4
      }
    },
    allergene: {
      allergen_free: false,
      milch: true,
      gluten: false, // may contain, not strictly contains
      soja: true,
      nuesse: true, // pistachio
      contains_tr: "Alerjen uyarısı: Antep fıstığı, süt ve soya içerir. Eser miktarda fındık, yer fıstığı, gluten, badem ve ceviz içerebilir.",
      contains_de: "Allergenwarnung: Enthält Pistazien, Milch und Soja. Kann Spuren von Haselnüssen, Erdnüssen, Gluten, Mandeln und Walnüssen enthalten.",
      contains_en: "Allergen warning: Contains pistachio, milk, and soy. May contain traces of hazelnut, peanut, gluten, almond, and walnut."
    },
    aciklamalar: {
      tr: "Antep Fıstıklı Special Sos 940 gr (%5)\nDondurma, kahve ve pastacılık ürünlerine eşsiz Antep fıstığı lezzeti katmak için geliştirilmiş özel bir sostur.\nKullanım Alanları\n- Dondurma ve sütlü tatlılar\n- Kahve ve sıcak/soğuk içecekler\n- Pastacılık ürünleri ve kekler\nKullanım Talimatı\nİstenilen lezzeti elde etmek için arzu edilen miktarda kullanılır. Ürünü kullanmadan önce mutlaka çalkalayınız. Güneş ışığından uzakta, serin ve kuru yerde saklayınız.",
      en: "Pistachio Special Sauce 940 gr (5%)\nA special sauce developed to add unique pistachio flavor to ice cream, coffee, and pastry products.\nAreas of Use\n- Ice cream and milk desserts\n- Coffee and hot/cold beverages\n- Pastry products and cakes\nDirection for Use\nDesired amount of the sauce can be used to add flavor. Shake well before use. Keep away from direct sunlight, keep in a cool and dry place.",
      de: "Pistazien-Spezialsauce 940 gr (5%)\nEine Spezialsauce, die entwickelt wurde, um Eis, Kaffee und Konditoreiprodukten einen einzigartigen Pistaziengeschmack zu verleihen.\nEinsatzgebiete\n- Eiscreme und Milchdesserts\n- Kaffee und heiße/kalte Getränke\n- Konditoreiprodukte und Kuchen\nAnwendungspraxis\nEs wird in der gewünschten Menge verwendet, um Geschmack zu verleihen. Vor Gebrauch gut schütteln. Vor Sonneneinstrahlung schützen, kühl und trocken lagern.",
      ar: "صلصة الفستق الخاصة 940 جم (5%)\nصلصة خاصة تم تطويرها لإضافة نكهة الفستق الفريدة إلى الآيس كريم والقهوة ومنتجات المعجنات.\nمجالات الاستخدام\n- الآيس كريم وحلويات الحليب\n- القهوة والمشروبات الساخنة/الباردة\n- منتجات المعجنات والكعك\nتعليمات الاستخدام\nيمكن استخدام الكمية المرغوبة من الصلصة لإضافة النكهة. يُرج جيدًا قبل الاستخدام. يُحفظ بعيدًا عن أشعة الشمس المباشرة، في مكان بارد وجاف."
    },
    ean_gtin: "8691123467454",
    aktif: true
  };

  updateData.besin_degerleri = JSON.stringify(updateData.naehrwerte);

  const { data: pData } = await supabase.from('urunler').select('teknik_ozellikler').eq('id', productId).single();
  const existingTeknik = pData?.teknik_ozellikler || {};

  updateData.teknik_ozellikler = {
    ...existingTeknik,
    vegan: false,
    laktosefrei: false,
    glutenfrei: false,
    vegetarisch: true,
    geschmack: ["antep fıstığı", "pistachio", "pistazie"],
    birim_agirlik_g: 940
  };

  console.log('Updating Pistachio Sauce 940g...');
  
  const { data, error } = await supabase
    .from('urunler')
    .update(updateData)
    .eq('id', productId)
    .select();

  if (error) {
    console.error('Update failed:', error);
  } else {
    console.log('Update successful! Data:', JSON.stringify(data[0].ad, null, 2));
    console.log('Updated fields:', Object.keys(updateData).join(', '));
  }
}

updatePistachioSauce();
