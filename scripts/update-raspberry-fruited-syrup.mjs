import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateRaspberryFruitedSyrup() {
  const pId = "00718ba0-52e7-4abd-81fe-6c930f6f3a10"; // FO Ahududu Premium Şurup 700ml (Barkod: 8691123470959)

  const ad = {
    ar: "فو شراب التوت الممتاز 700 مل",
    de: "FO Himbeer-Fruchtsirup Premium – 700 ml",
    en: "FO Premium Raspberry Fruited Syrup – 700 ml",
    tr: "FO Frambuaz Meyveli Premium Şurup – 700 ml"
  };

  const inhaltsstoffe = {
    de: "Zucker, Wasser, Himbeersaftkonzentrat, Natürliches aroma (Himbeere), Natürlicher säuerungsmittel (E 334), Farbstoffe (E 150a, Hibiskus-Extrakt), Konservierungsstoffe (E 202, E 211). Enthält 40% Himbeersaft.",
    tr: "Şeker, Su, Frambuaz suyu konsantresi, Doğal aroma verici (Frambuaz), Doğal asitlik düzenleyici (E 334), Renklendirici (E 150a, Hibiskus ekstraktı), Koruyucu (E 202, E 211). %40 Frambuaz suyu içerir.",
    en: "Sugar, Water, Raspberry juice concentrate, Natural flavouring (Raspberry), Natural acidity regulator (E 334), Colour (E 150a, Hibiscus extract), Preservative (E 202, E 211). Contains 40% Raspberry juice.",
    ar: "سكر، ماء، مركز عصير توت العليق، نكهة طبيعية (توت العليق)، منظم حموضة طبيعي (E 334)، ملون (E150a، مستخلص الكركديه)، مواد حافظة (E 202، E 211). يحتوي على 40% من عصير توت العليق.",
    fr: "Sucre, Eau, Concentré de jus de framboise, Arôme naturel (Framboise), Correcteur d'acidité naturel (E 334), Colorant (E 150a, Extrait d'hibiscus), Conservateur (E 202, E 211). Contient 40% de jus de framboise.",
    ru: "сахар, вода, концентрат малинового сока, натуральный ароматизатор (малина), натуральный регулятор кислотности (Е 334), красители (Е 150а, экстракт гибискуса), консерванты (Е 202, Е 211). Содержит 40% малинового сока."
  };

  const naehrwerte = {
    pro_100ml: {
      energie_kj: 1430,
      energie_kcal: 342,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 84.6,
      davon_zucker: 83.3,
      staerke: 0.0,
      ballaststoffe: 0.0,
      eiweiss: 0.0,
      salz: 0.0
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
    de: `Es ist der von den Nutzern bevorzugte Fruchtsirup bei der Zubereitung von internationalen und speziellen Cocktails sowie Mocktails. Es wird im Verhältnis 1:8 in Limonaden, aromatisierten Eistees, Smoothies, Milchshakes und anderen Erfrischungsgetränken verwendet, um diesen Aroma und Geschmack zu verleihen. Es kann auch trinkfertig zubereitet werden, indem es im gleichen Verhältnis mit heißem oder kaltem Wasser verdünnt wird. Es kann in beliebiger Menge Desserts und Gebäck beigefügt werden, um ihnen Geschmack zu verleihen. Servierempfehlung.\n\nLagerung:\nVor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    tr: `Uluslararası ve özel kokteyllerin, mokteyllerin hazırlanmasında kullanıcıların tercih ettiği meyveli şuruptur. Soda bazlı içeceklerde, aromalı soğuk çaylarda, smoothie, milkshake ve limonata gibi içeceklerde, içeceğe aroma ve tat katmak amacıyla 1/8 oranında kullanılır. Ayrıca, sıcak veya soğuk su ile aynı oranda sulandırılarak içime hazır hâle getirilir. Tatlı çeşitlerine ve pastacılık ürünlerine lezzet katmak amacıyla istenilen miktarda ilave edilebilir. Servis önerisidir.\n\nSaklama Koşulları:\nGüneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    en: `It is a fruited syrup preferred by users in the preparation of international and specialty cocktails and mocktails. It is used at a 1/8 ratio to add flavor and taste in soda-based drinks, flavored iced teas, smoothies, milkshakes, and lemonades. Additionally, it can be diluted with hot or cold water in the same ratio to make it ready to drink. It can also be added in the desired amount to desserts and pastry products to enhance flavor. Service suggestion.\n\nStorage:\nKeep away from direct sunlight, keep in cool and dry place.`,
    ar: `شراب فاكهي مفضل لدى المستخدمين في تحضير الكوكتيلات والموكتيلات الدولية والخاصة. يستخدم بنسبة 1/8 لإضافة نكهة وطعم في المشروبات الغازية، الشاي المثلج المنكه، السموثي، الميلك شيك والليموناضة. بالإضافة إلى ذلك، يمكن تخفيفه بالماء الساخن أو البارد بنفس النسبة لجعله جاهزاً للشرب. يمكن إضافته أيضاً بالكمية المرغوبة إلى الحلويات ومنتجات المخابز لإضافة نكهة. اقتراح التقديم.\n\nشروط التخزين:\nيحفظ في مكان بارد وجاف بعيداً عن أشعة الشمس المباشرة.`,
    fr: `C'est le sirop de fruits préféré des utilisateurs pour la préparation de cocktails et mocktails internationaux et spéciaux. Il est également utilisé dans les boissons à base de soda, les thés glacés aromatisés, les smoothies, les milkshakes et les citronnades, en proportion de 1/8 pour ajouter de la saveur et de l’arôme. Il peut aussi être dilué dans de l’eau chaude ou froide à parts égales pour une consommation directe. On peut en ajouter à volonté aux desserts et produits de pâtisserie pour en rehausser le goût. Suggestion de service.\n\nStockage:\nProtéger du rayonnement direct du soleil et dans un endroit frais et sec.`,
    ru: `Идеален для коктейлей, моктейлей, газированных напитков, холодного чая, смузи, милкшейков и лимонадов. Использовать в пропорции 1:8 для придания вкуса и аромата. Также можно разбавить водой (горячей или холодной) в равных частях и употреблять как напиток. Добавляется по вкусу в десерты и кондитерские изделия. Рекомендация по подаче.\n\nХранение:\nХранить вдали от солнечного света в прохладном и сухом месте.`
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
    geschmack: ["frambuaz", "raspberry", "himbeere", "framboise", "малина", "ahududu"],
    birim_hacim_ml: 700,
    koli_ici_adet: 6,
    palet_ici_adet: 750,
    mischungsverhaeltnis: "1+8",
    fruchtanteil: "40%",
    barkod: "8691123470959"
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
    console.error("Error updating Raspberry Fruited Syrup:", error);
  } else {
    console.log("✅ Raspberry Fruited Syrup successfully updated and activated!");
  }
}

updateRaspberryFruitedSyrup();
