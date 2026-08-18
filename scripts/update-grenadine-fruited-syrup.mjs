import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateGrenadineFruitedSyrup() {
  const pId = "3368c956-7293-4a1a-8111-2fd1129d8f04"; // FO Nar Meyveli Premium Şurup 700ml (Barkod: 8691123471024)

  const ad = {
    ar: "فو شراب الرمان الفاخر 700 مل",
    de: "FO Granatapfel-Fruchtsirup Premium – 700 ml",
    en: "FO Premium Grenadine Fruited Syrup – 700 ml",
    tr: "FO Nar Meyveli Premium Şurup – 700 ml"
  };

  const inhaltsstoffe = {
    de: "Zucker, Wasser, Granatapfelsaftkonzentrat, Natürliches Aroma (Granatapfel), Natürlicher Säuerungsmittel (E 334), Farbstoffe (E 163, E 150a, Hibiskus-Extrakt), Konservierungsstoffe (E 202, E 211). Enthält 40% Granatapfelsaft.",
    tr: "Şeker, Su, Nar suyu konsantresi, Doğal aroma verici (Nar), Doğal asitlik düzenleyici (E 334), Renklendirici (E 163, E 150a, Hibiskus ekstraktı), Koruyucu (E 202, E 211). %40 Nar suyu içerir.",
    en: "Sugar, Water, Grenadine juice concentrate, Natural flavouring (Grenadine), Natural acidity regulator (E 334), Colour (E 163, E 150a, Hibiscus extract), Preservative (E 202, E 211). Contains 40% Grenadine juice.",
    ar: "سكر، ماء، مركز عصير الرمان، نكهة طبيعية (رمان)، منظم حموضة طبيعي (E 334)، ملون (E 163, E 150a, مستخلص الكركديه)، مادة حافظة (E 202, E 211). يحتوي على 40% من عصير الرمان."
  };

  const naehrwerte = {
    pro_100ml: {
      energie_kj: 1450,
      energie_kcal: 346,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 84.3,
      davon_zucker: 82.2,
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
    contains_de: "Glutenfrei, Allergenfrei. Natürliche Farben. Natürliche Aromen. Vegan.",
    contains_tr: "Glütensiz, Alerjen içermez. Doğal Renklendiriciler. Doğal Aromalar. Vegan.",
    contains_en: "Gluten free, Allergen free. Natural Colors. Natural Flavors. Vegan.",
    contains_ar: "خالي من الغلوتين، خالٍ من مسببات الحساسية. ألوان طبيعية. نكهات طبيعية. نباتي."
  };

  const aciklamalar = {
    de: "FO Granatapfel-Fruchtsirup Premium 700 ml\n FO Granatapfel-Fruchtsirup Premium 700 ml ist ein von Barkeepern bevorzugter aromatisierter Sirup bei der Zubereitung von internationalen und speziellen Cocktails sowie Mocktails. Er wird als Aroma und Sirup in Cocktails, Kuchen, Pudding, speziellen Desserts und Heißgetränken wie Tee und Kaffee verwendet. Ideal, um Getränkerezepten und Desserts einen reichen Granatapfelgeschmack zu verleihen.\n Einsatzgebiete\n – Zubereitung von internationalen und speziellen Cocktails sowie Mocktails\n – Kuchen, Pudding und spezielle Desserts\n – Heißgetränke wie Tee und Kaffee\n – Kalt- und Heißgetränke, zubereitet durch Verdünnen mit Wasser\n Höhepunkte\n – Natürliches Granatapfelaroma und -geschmack\n – Hohe Ergiebigkeit durch 1:8 Mischungsverhältnis\n – Trinkfertig durch Verdünnen mit heißem oder kaltem Wasser\n – Vegane, glutenfreie und allergenfreie Struktur\n – 700 ml Verpackung",
    tr: "FO Nar Meyveli Premium Şurup 700 ml\n FO Nar Meyveli Premium Şurup 700 ml, uluslararası ve özel kokteyllerin, mokteyllerin hazırlanmasında barmenlerin tercih ettiği aromalı şuruptur. Kokteyllerde, pasta, kek, puding, özel tatlılarda ve çay, kahve gibi sıcak içeceklerde içeceğe ve yiyeceklere aroma katmak amacıyla kullanılır. İçecek tariflerine ve tatlılara zengin bir nar lezzeti kazandırmak için idealdir.\n Kullanım Alanları\n – Uluslararası ve özel kokteyl ile mokteyl hazırlıkları\n – Pasta, kek, puding ve özel tatlılar\n – Çay ve kahve gibi sıcak içecekler\n – Su ile seyreltilerek hazırlanan soğuk ve sıcak içecekler\n Öne Çıkan Özellikler\n – Doğal nar aroması ve lezzeti\n – 1/8 oranında kullanım ile yüksek verim\n – Sıcak veya soğuk su ile sulandırılarak içime hazır hâle gelme\n – Vegan, glütensiz ve alerjen içermeyen yapı\n – 700 ml ambalaj",
    en: "FO Premium Grenadine Fruited Syrup 700 ml\n FO Premium Grenadine Fruited Syrup 700 ml is the flavored syrup that bartenders prefer in the preparation of international cocktails and mocktails. It is used as an aroma and syrup in cocktails, cakes, puddings, specialty desserts, and hot beverages such as tea and coffee. It is ideal for giving a rich grenadine flavor to beverage recipes and desserts.\n Areas of Use\n – Preparation of international and specialty cocktails and mocktails\n – Cakes, puddings, and specialty desserts\n – Hot beverages such as tea and coffee\n – Cold and hot drinks prepared by diluting with water\n Highlights\n – Natural grenadine flavor and aroma\n – High efficiency with 1/8 usage ratio\n – Ready to drink by diluting with hot or cold water\n – Vegan, gluten-free and allergen-free structure\n – 700 ml packaging",
    ar: "فو شراب الرمان الفاخر 700 مل\n فو شراب الرمان الفاخر 700 مل هو الشراب المنكه الذي يفضله السقاة في تحضير الكوكتيلات والموكتيلات الدولية والخاصة. يستخدم كنكهة وشراب في الكوكتيلات، الكعك، البودينغ، الحلويات الخاصة، والمشروبات الساخنة مثل الشاي والقهوة. إنه مثالي لإضفاء نكهة الرمان الغنية على وصفات المشروبات والحلويات.\n مجالات الاستخدام\n – تحضير الكوكتيلات والموكتيلات الدولية والخاصة\n – الكعك، البودينغ، والحلويات الخاصة\n – المشروبات الساخنة مثل الشاي والقهوة\n – المشروبات الباردة والساخنة المحضرة بالتخفيف بالماء\n أبرز\n – نكهة ورائحة الرمان الطبيعية\n – كفاءة عالية مع نسبة استخدام 1/8\n – جاهز للشرب عن طريق التخفيف بالماء الساخن أو البارد\n – تركيبة نباتية، خالية من الغلوتين ومسببات الحساسية\n – عبوة 700 مل"
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
    geschmack: ["nar", "grenadine", "granatapfel", "pomegranate"],
    birim_hacim_ml: 700,
    mischungsverhaeltnis: "1+8",
    fruchtanteil: "40%"
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
    console.error("Error updating Grenadine Fruited Syrup:", error);
  } else {
    console.log("✅ Grenadine Fruited Syrup successfully updated and activated!");
  }
}

updateGrenadineFruitedSyrup();
