import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateBlueRaspberryFlavoredSyrup() {
  const pId = "0bd6e288-322b-4676-8e9a-e8c75d5986b4";

  const ad = {
    ar: "شراب بنكهة التوت البري الأزرق فو 700 مل",
    de: "FO Blaue Himbeere Sirup 700 ml",
    en: "FO Blue Raspberry Flavored Syrup 700 ml",
    tr: "FO Mavi Frambuaz Aromalı Şurup 700 ml"
  };

  const inhaltsstoffe = {
    de: "Zucker, Wasser, Aroma (Himbeer), Säuerungsmittel (E 330), Farbstoffe (E 133), Konservierungsstoffe (E 202, E 211).",
    tr: "Şeker, Su, Aroma verici (Frambuaz), Asitlik düzenleyici (E 330), Renklendirici (E 133), Koruyucu (E 202, E 211).",
    en: "Sugar, Water, Flavouring (Raspberry), Acidity regulator (E 330), Colour (E 133), Preservative (E 202, E 211).",
    ar: "سكر، ماء، نكهة (توت العليق)، منظم الحموضة (E 330)، ملون (E 133)، مواد حافظة (E 202، E 211)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1410,
      energie_kcal: 337,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 81.9,
      davon_zucker: 81.9,
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
    contains_de: "Allergenfrei / Keine Allergene enthalten.",
    contains_tr: "Alerjen içermez.",
    contains_en: "Allergen free.",
    contains_ar: "خالٍ من مسببات الحساسية."
  };

  const aciklamalar = {
    de: `Für die Zubereitung internationaler Cocktails und Mocktails empfehlen Barkeeper diesen Sirup.

Anwendungsgebiete und Gebrauchsanweisung:
Er wird im Verhältnis 1:8 verwendet, um kohlensäurehaltigen Getränken, aromatisierten Eistees, Smoothies, Milchshakes und Limonaden Aroma und Geschmack zu verleihen. Zusätzlich kann er im gleichen Verhältnis mit heißem oder kaltem Wasser gemischt werden, um ein trinkfertiges Getränk zu erhalten. Er kann auch in gewünschter Menge zu Desserts und Gebäck hinzugefügt werden. Servierempfehlung. Vor Gebrauch schütteln.

Lagerung:
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    tr: `Uluslararası ve özel kokteyllerin, mokteyllerin hazırlanmasında kullanıcıların tercih ettiği aromalı şuruptur.

Kullanıldığı Yerler ve Kullanma Talimatı:
Soda bazlı içeceklerde, aromalı soğuk çaylarda, smoothie, milkshake ve limonata gibi içeceklerde, içeceğe aroma ve tat katmak amacıyla 1/8 oranında kullanılır. Ayrıca, sıcak veya soğuk su ile aynı oranda sulandırılarak içime hazır hâle getirilir. Tatlı çeşitlerine ve pastacılık ürünlerine lezzet katmak amacıyla istenilen miktarda ilave edilebilir. Servis önerisidir. Kullanmadan önce çalkalayınız.

Saklama Koşulları:
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    en: `It is a flavored syrup preferred by users in the preparation of international and specialty cocktails and mocktails.

Place of Usage and Direction for Use:
It is used at a 1/8 ratio to add flavor and taste in soda-based drinks, flavored iced teas, smoothies, milkshakes, and lemonades. Additionally, it can be diluted with hot or cold water in the same ratio to make it ready to drink. It can also be added in the desired amount to desserts and pastry products to enhance flavor. Service suggestion. Shake before use.

Storage:
Keep away from direct sunlight, keep in cool and dry place.`,
    ar: `إنه شراب منكه يفضله المستخدمون في تحضير الكوكتيلات والموكتيلات العالمية والخاصة.

مناطق الاستخدام وتعليمات الاستخدام:
يتم استخدامه بنسبة 1/8 لإضافة نكهة وطعم في المشروبات الغازية، والشاي المثلج المنكه، والسموثي، والميلك شيك، وعصير الليمون. بالإضافة إلى ذلك، يمكن تخفيفه بالماء الساخن أو البارد بنفس النسبة لجعله جاهزًا للشرب. يمكن أيضًا إضافته بالكمية المطلوبة إلى الحلويات ومنتجات المعجنات لتعزيز النكهة. اقتراح التقديم. يرج قبل الاستعمال.

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
    geschmack: ["mavi frambuaz", "blue raspberry", "blaue himbeere", "framboise bleue"],
    birim_hacim_ml: 700,
    koli_ici_adet: 6,
    palet_ici_adet: 750
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
    console.error("Error updating Blue Raspberry Flavored Syrup:", error);
  } else {
    console.log("✅ Blue Raspberry Flavored Syrup (0bd6e288...) successfully updated and activated!");
  }
}

updateBlueRaspberryFlavoredSyrup();
