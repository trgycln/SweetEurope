import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateRazzyElectricFlower() {
  const pId = "53ba43ac-992c-4eef-9724-035f9d724dfb";

  const ad = {
    ar: "رازي اليكتريك قاعدة بنكهة الزهور والتوت 700 مل",
    de: "Razzy-Electric Basis mit Blumen- und Blaubeergeschmack, 700 ml",
    en: "Razzy-Electric Flower & Blueberry Flavored Base 700ml",
    tr: "FO Razzy Elektrik Çiçeği & Yaban Mersini Aromalı Baz 700ml"
  };

  const inhaltsstoffe = {
    de: "Zucker, Wasser, Säuerungsmittel (E 330, E 332ii), Natürliches Aroma (Elektrisch Blume, Blaubeere, Himbeere, Minze), Konservierungsstoffe (E 202, E 211), Farbstoff (Blauer Mais-Extrakt).",
    tr: "Şeker, Su, Asitlik Düzenleyici (E 330, E 332ii), Doğal Aroma Verici (Elektrik çiçeği, Yaban mersini, Frambuaz, Nane), Koruyucu (E 202, E 211), Renklendirici (Mavi Mısır Ekstraktı).",
    en: "Sugar, Water, Acidity regulator (E 330, E 332ii), Natural Flavourings (Electric flower, Blueberry, Raspberry, Mint), Preservatives (E 202, E 211), Colouring (Blue Corn Extract).",
    ar: "سكر، ماء، منظم الحموضة (E330، E332ii)، نكهة طبيعية (زهرة الكهرباء، توت أزرق، توت العليق، نعناع)، مواد حافظة (E202، E211)، ملون (مستخلص الذرة الزرقاء)."
  };

  const naehrwerte = {
    pro_100ml: {
      energie_kj: 1100,
      energie_kcal: 262,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 60.8,
      davon_zucker: 60.8,
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
    de: `Hochwertige Basis mit elektrischem Blumen- und Blaubeergeschmack. Verleiht Getränken eine lebendige blaue Farbe und ein einzigartiges Geschmackserlebnis. Hergestellt mit natürlichen Farben und Aromen, glutenfrei, vegan und mit echtem Zucker.

Anwendungsgebiete und Gebrauchsanweisung:
Zur Zubereitung von kalten Getränken. Für ein 450 ml Glas; 1 Maß (40 ml) Basis aus, nach Vorliebe mit 3 Maß (120 ml), 4 Maß (160 ml) oder 5 Maß (200 ml) Wasser verdünnen und mit viel Eis servieren. Serviervorschlag.

Lagerung:
Vor direkter Sonneneinstrahlung schützen. Kühl und trocken lagern.`,
    tr: `Elektrik çiçeği ve yaban mersini aromalı profesyonel baz. İçeceklere canlı mavi rengini ve eşsiz lezzet profilini katar. Doğal renk ve aromalarla üretilmiştir, glütensizdir, vegandır ve gerçek şeker kullanılmıştır.

Kullanıldığı Yerler ve Kullanım Talimatı:
Soğuk içecek yapımında kullanılır. 450 ml bardak için; 1 ölçü (40 ml) baz, isteğe bağlı 3 ölçü (120 ml), 4 ölçü (160 ml) veya 5 ölçü (200 ml) su ile sulandırılıp bol buz ile servis edilir. Servis önerisidir.

Saklama Koşulları:
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    en: `Premium electric flower and blueberry flavored base. Delivers a vibrant blue color and a unique taste profile to beverages. Made with natural colors and flavors, gluten-free, vegan, and made with real sugar.

Place of Usage and Direction for Use:
It is used to prepare cold drinks. For 450ml cup; 1 scope (40 ml) base is diluted optionally with 3 scopes (120 ml), 4 scopes (160 ml) or 5 scopes (200 ml) of water and served with plenty of ice. Service suggestion.

Storage:
Store in a cool and dry place away from direct sunlight.`,
    ar: `قاعدة بنكهة زهرة الكهرباء والتوت الأزرق. يمنح المشروبات لوناً أزرق زاهياً ومذاقاً فريداً. مصنوع بألوان ونكهات طبيعية، خالي من الغلوتين، نباتي، ومصنوع من السكر الحقيقي.

مناطق الاستخدام وتعليمات الاستخدام:
يستخدم في صنع المشروبات الباردة. لكوب سعة 450 مل؛ يخفف مقدار 1 (40 مل) من الأساس اختياريا مع 3 مقادير (120 مل)، 4 مقادير (160 مل) أو 5 مقادير (200 مل) من الماء ويقدم مع الكثير من الثلج. اقتراح التقديم.

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
    geschmack: ["yaban mersini", "blueberry", "blaubeere", "elektrik çiçeği", "electric flower", "elektrisch blume"],
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
    console.error("Error updating Razzy Electric Flower Base:", error);
  } else {
    console.log("✅ Razzy Electric Flower Base (53ba43ac...) successfully updated and activated!");
  }
}

updateRazzyElectricFlower();
