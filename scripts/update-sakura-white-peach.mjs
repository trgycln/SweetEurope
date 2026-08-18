import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateSakuraWhitePeach() {
  const pId = "ffefea8f-c4ed-40c9-b445-8d573a17af0f";

  const ad = {
    tr: "FO Sakura ve Beyaz Şeftali Aromalı Baz Şurup 700 ml",
    de: "FO Basissirup mit Sakura- und weißem Pfirsichgeschmack 700 ml",
    en: "FO Sakura and White Peach Flavored Base Syrup 700 ml",
    ar: "شراب بنكهة الساكورا والخوخ الأبيض فو 700 مل"
  };

  const inhaltsstoffe = {
    tr: "Şeker, Su, Asitlik düzenleyici (E 330, E 332ii), Aroma verici (Sakura, Beyaz Şeftali), Koruyucu (E 202, E 211), Renklendirici (Hibiskus Ekstraktı).",
    de: "Zucker, Wasser, Säuerungsmittel (E 330, E 332ii), Aroma (Sakura, weißer Pfirsich), Konservierungsstoffe (E 202, E 211), Farbstoffe (Hibiskusextrakt).",
    en: "Sugar, Water, Acidity regulator (E 330, E 332ii), Flavouring (Sakura, White Peach), Preservative (E 202, E 211), Colour (Hibiscus Extract).",
    ar: "سكر، ماء، منظم الحموضة (E 330، E 332ii)، نكهة (ساكورا، خوخ أبيض)، مواد حافظة (E 202، E 211)، ملون (خلاصة الكركديه)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1210,
      energie_kcal: 289,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 68.7,
      davon_zucker: 68.7,
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
    tr: `Soğuk içecek yapımında kullanılır. Sakura ve beyaz şeftali lezzeti katar.

**Kullanım Alanları ve Talimatı:**
- 450 ml bardak için; 1 ölçü (40 ml) baz, 4 ölçü (160ml) su ile sulandırılıp bol buz ile servis edilir. Servis önerisidir.

**Saklama Koşulları:**
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    de: `Wird zur Zubereitung von Kaltgetränken verwendet. Verleiht Sakura- und weißen Pfirsichgeschmack.

**Anwendung:**
- Für ein 450 ml Glas; 1 Teil (40 ml) Basis mit 4 Teilen (160 ml) Wasser verdünnen und mit viel Eis servieren. Serviervorschlag.

**Lagerung:**
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    en: `Used in the preparation of cold beverages. Adds sakura and white peach flavor.

**Directions for Use:**
- For a 450 ml glass: dilute 1 part (40 ml) base with 4 parts (160 ml) water and serve with plenty of ice. Service suggestion.

**Storage:**
Store in a cool, dry place away from sunlight.`,
    ar: `يستخدم في تحضير المشروبات الباردة.

**تعليمات الاستخدام:**
- لكوب سعة 450 مل؛ يخفف جزء واحد (40 مل) من الأساس مع 4 أجزاء (160 مل) من الماء ويقدم مع الكثير من الثلج. اقتراح التقديم.

**شروط التخزين:**
يحفظ في مكان بارد وجاف، بعيداً عن أشعة الشمس المباشرة.`
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
    geschmack: ["sakura", "beyaz şeftali", "white peach", "weißer pfirsich", "خوخ أبيض"],
    birim_hacim_ml: 700,
    koli_ici_adet: 6,
    palet_ici_adet: 170
  };

  const updatePayload = {
    ad,
    ean_gtin: "8691123469663",
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
    console.error("Error updating Sakura and White Peach Flavored Base Syrup:", error);
  } else {
    console.log("✅ Sakura and White Peach Flavored Base Syrup successfully updated and activated!");
  }
}

updateSakuraWhitePeach();
