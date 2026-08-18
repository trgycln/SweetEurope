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

async function updateEclipseVanilla() {
  const productId = 'e343b424-22f9-4c72-8ec3-d7ac9872dda0'; // ID for Madagaskar Vanilya Aromalı Sos 1 Kg - Eclipse

  const updateData = {
    ad: {
      ar: "صلصة فانيليا مدغشقر 1 كغ - إكليبس",
      de: "Madagaskar-Vanille-Geschmackssauce 1 kg - Eclipse",
      en: "Madagascar Vanilla Flavored Sauce 1 Kg - Eclipse",
      tr: "Madagaskar Vanilya Aromalı Sos 1 Kg - Eclipse"
    },
    inhaltsstoffe: {
      tr: "Şeker, Su, Nem verici (E 422), Modifiye mısır nişastası, Renklendirici (E 153), Aroma verici (Vanilya), Madagaskar vanilya ekstraktı, Asitlik düzenleyici (E 331iii, E 330), Koruyucu (E 202), Tuz.",
      de: "Zucker, Wasser, Feuchthaltemittel (E 422), Modifizierte Maisstärke, Farbstoff (E 153), Aroma (Vanille), Madagaskar Vanilleextrakt, Säuerungsmittel (E 331iii, E 330), Konservierungsstoffe (E 202), Salz.",
      en: "Sugar, Water, Humectant (E 422), Modified corn starch, Colour (E 153), Flavouring (Vanilla), Madagascar vanilla extract, Acidity regulator (E 331iii, E 330), Preservative (E 202), Salt."
    },
    naehrwerte: {
      pro_100g: {
        energie_kj: 996,
        energie_kcal: 238,
        fett: 0.0,
        davon_gesaettigt: 0.0,
        kohlenhydrate: 65.6,
        davon_zucker: 55.6,
        staerke: 2.1,
        ballaststoffe: 0.0,
        eiweiss: 0.0,
        salz: 0.18
      }
    },
    allergene: {
      allergen_free: true,
      milch: false,
      gluten: false,
      soja: false,
      nuesse: false,
      contains_tr: "Alerjen içermez.",
      contains_de: "Allergenfrei.",
      contains_en: "Allergen free.",
      contains_ar: "خالٍ من مسببات الحساسية."
    },
    aciklamalar: {
      tr: "Madagaskar Vanilya Aromalı Sos 1 Kg - Eclipse\nSıcak ve soğuk içeceklerinize eşsiz Madagaskar vanilyası lezzeti katmak için özel olarak formüle edilmiştir.\nKullanım Alanları\n- Sıcak ve soğuk kahve çeşitleri\n- Sütlü içecekler ve frappeler\n- Dondurma ve tatlı süslemeleri\nKullanım Talimatı\nSıcak ve soğuk içecekleri lezzetlendirmek için tercihen 15-30 gram arası kullanılır. Güneş ışığından uzakta, serin ve kuru yerde saklayınız.\nÖne Çıkan Özellikler\n- Doğal renkler (Natural Colors)\n- Doğal aromalar (Natural Flavors)\n- Şeker ile üretilmiştir (Made with Sugar)\n- Barista dostu (Barista Friendly)",
      en: "Madagascar Vanilla Flavored Sauce 1 Kg - Eclipse\nSpecially formulated to add unique Madagascar vanilla flavor to your hot and cold beverages.\nAreas of Use\n- Hot and cold coffee varieties\n- Milk beverages and frappes\n- Ice cream and dessert decorations\nDirection for Use\nIt is recommended to use between 15 to 30 grams to enhance the flavor of hot and cold beverages. Keep away from direct sunlight, keep in a cool and dry place.\nHighlights\n- Natural Colors\n- Natural Flavors\n- Made with Sugar\n- Barista Friendly",
      de: "Madagaskar-Vanille-Geschmackssauce 1 kg - Eclipse\nSpeziell formuliert, um Ihren heißen und kalten Getränken den einzigartigen Geschmack von Madagaskar-Vanille zu verleihen.\nEinsatzgebiete\n- Heiße und kalte Kaffeevariationen\n- Milchgetränke und Frappés\n- Eis- und Dessertdekorationen\nAnwendungspraxis\nWird je nach Geschmack in Mengen von 15-30 Gramm zum Aromatisieren von Heiß- und Kaltgetränken verwendet. An einem kühlen, trockenen Ort und fern von direkter Sonneneinstrahlung aufbewahren.\nHöhepunkte\n- Natürliche Farben (Natural Colors)\n- Natürliche Aromen (Natural Flavors)\n- Mit Zucker hergestellt (Made with Sugar)\n- Barista-freundlich (Barista Friendly)",
      ar: "صلصة فانيليا مدغشقر 1 كغ - إكليبس\nتمت صياغته خصيصًا لإضافة نكهة فانيليا مدغشقر الفريدة إلى مشروباتك الساخنة والباردة.\nمجالات الاستخدام\n- أصناف القهوة الساخنة والباردة\n- مشروبات الحليب والفرابيه\n- تزيين الآيس كريم والحلويات\nتعليمات الاستخدام\nيوصى باستخدام ما بين 15 إلى 30 جرامًا لتعزيز نكهة المشروبات الساخنة والباردة. يُحفظ بعيدًا عن أشعة الشمس المباشرة، في مكان بارد وجاف.\nأبرز الميزات\n- ألوان طبيعية\n- نكهات طبيعية\n- مصنوع من السكر\n- صديق للباريستا"
    },
    ean_gtin: "8691123473905",
    aktif: true
  };

  updateData.besin_degerleri = JSON.stringify(updateData.naehrwerte);

  const { data: pData } = await supabase.from('urunler').select('teknik_ozellikler').eq('id', productId).single();
  const existingTeknik = pData?.teknik_ozellikler || {};

  updateData.teknik_ozellikler = {
    ...existingTeknik,
    vegan: true,
    laktosefrei: true,
    glutenfrei: true,
    vegetarisch: true,
    geschmack: ["vanilya", "vanilla", "vanille"],
    birim_agirlik_g: 1000
  };

  console.log('Updating Eclipse Vanilla Sauce 1kg...');
  
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

updateEclipseVanilla();
