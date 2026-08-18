import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePoppingCandy() {
  const productId = '4efd0ab0-01b8-4e94-b61a-40576c2c6bb0'; // Patlayan Şekerli Special Sos 1000 gr

  const updateData = {
    ad: {
      tr: 'Patlayan Şekerli Sos',
      en: 'Popping Candy Sauce',
      de: 'Spezialsauce mit Knallbonbons',
      ar: 'صلصة السكر المفرقعة الخاصة'
    },
    inhaltsstoffe: {
      tr: "Şeker, Patlayan şeker (%30) [Şeker, Glikoz şurubu, Kakao yağı, Karbondioksit, Süt tozu], Su, Aroma verici (Çilek, Frambuaz), Renklendirici (E 129, E 133), Bitkisel yağ (Ayçiçek yağı), Emülgatör (Soya lesitini).\nE 129: Çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
      en: "Sugar, Popping candy (30%) [Sugar, Glucose syrup, Cocoa butter, Carbon dioxide, Milk powder], Water, Flavouring (Strawberry, Raspberry), Colour (E 129, E 133), Vegetable oil (Sunflower oil), Emulsifier (Soy lecithin).\nE 129: May have negative effects on the activities and attentions of the children.",
      de: "Zucker, Knallbonbons (30%) [Zucker, Glukosesirup, Kakaobutter, Kohlendioxid, Milchpulver], Wasser, Aroma (Erdbeere, Himbeere), Farbstoffe (E 129, E 133), Pflanzenöl (Sonnenblume), Emulgatoren (Sojalecithin).\nE 129: Kann zu den Aktivitäten und Konzentration der Kinder negativen Einfluss haben.",
      ar: "المكونات: سكر، حلوى المفرقعة (30%) [سكر، شراب الجلوكوز، زبدة الكاكاو، ثاني أكسيد الكربون، الحليب]، ماء، نكهة مطابقة للطبيعية (فراولة، توت)، الملون (E 129، E 133)، الزيت النباتي (زيت دوار الشمس)، مستحلب (ليسيثين الصويا).\nأي 129: قد تؤثر سلبيا على نشاط ودقة الأطفال."
    },
    naehrwerte: {
      pro_100g: {
        energie_kj: 2170,
        energie_kcal: 519,
        fett: 25.3,
        davon_gesaettigt: 2.7,
        kohlenhydrate: 70.4,
        davon_zucker: 38.3,
        ballaststoffe: 0.0,
        eiweiss: 2.8,
        salz: 0.4
      }
    },
    allergene: {
      milch: true,
      soja: true,
      allergen_free: false,
      contains_tr: "Süt ve soya içerir. Antep fıstığı, yer fıstığı, gluten, fındık, ceviz ve badem içerebilir.",
      contains_de: "Enthält Milch und Soja. Kann Pistazien, Erdnüsse, Gluten, Haselnüsse, Walnüsse und Mandeln enthalten.",
      contains_en: "Contains milk and soy. May contain pistachios, peanuts, gluten, hazelnuts, walnuts, and almonds.",
      contains_ar: "يحتوي على الحليب والصويا. قد يحتوي على الفستق والفول السوداني والغلوتين والبندق والجوز واللوز."
    }
  };

  updateData.ean_gtin = '8691123471444';

  console.log('Updating POPPING CANDY SAUCE...');
  
  const { data, error } = await supabase
    .from('urunler')
    .update(updateData)
    .eq('id', productId)
    .select();

  if (error) {
    console.error('Update failed:', error);
  } else {
    console.log('Update successful! Data:', JSON.stringify(data[0].ad, null, 2));
    console.log('Barcode applied to ean_gtin:', data[0].ean_gtin);
  }
}

updatePoppingCandy();
