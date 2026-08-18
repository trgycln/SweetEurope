import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateWhiteChocolateSyrup() {
  const pId = "2cd6dc8e-1433-438d-8fd1-764b8d8045ce";

  const ad = {
    tr: "FO Beyaz Çikolatalı Şurup 700 ml",
    de: "FO Sirup mit weißer Schokolade 700 ml",
    en: "FO White Chocolate Syrup 700 ml",
    ar: "شراب الشوكولاتة البيضاء فو 700 مل"
  };

  const inhaltsstoffe = {
    tr: "Şeker, Su, Nem verici [Gliserol (E 422)], Yağsız süt tozu, Modifiye mısır nişastası, Beyaz çikolata (% 1) [Şeker, Tam yağlı süt tozu, Kakao yağı, Laktoz (Süt), Yağsız süt tozu, Emülgatör (Soya lesitini E 322)], Doğal Aroma verici (Beyaz çikolata), Emülgatör (E 471), Koruyucu (E 202, E 211).",
    de: "Zucker, Wasser, Feuchthaltemittel [Glycerin (E 422)], Magermilchpulver, modifizierte Maisstärke, weiße Schokolade (1%) [Zucker, Vollmilchpulver, Kakaobutter, Laktose (Milch), Magermilchpulver, Emulgator (Sojalecithin E 322)], natürliches Aroma (weiße Schokolade), Emulgator (E 471), Konservierungsstoffe (E 202, E 211).",
    en: "Sugar, Water, Humectant [Glycerol (E 422)], Skimmed milk powder, Modified corn starch, White chocolate (1%) [Sugar, Fatty milk powder, Cocoa butter, Lactose (milk), Skimmed milk powder, Emulsifier (Soy lecithin E 322)], Natural flavouring (White chocolate), Emulsifier (E 471), Preservative (E 202, E 211).",
    ar: "سكر، ماء، مرطب [جليسرول (E 422)]، مسحوق حليب منزوع الدسم، نشاء الذرة المعدل، شوكولاتة بيضاء (1%) [سكر، مسحوق حليب كامل الدسم، زبدة الكاكاو، لاكتوز (حليب)، مسحوق حليب منزوع الدسم، مستحلب (ليسيثين الصويا E 322)]، نكهة طبيعية (شوكولاتة بيضاء)، مستحلب (E 471)، مواد حافظة (E 202، E 211)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1420,
      energie_kcal: 339,
      fett: 0.7,
      davon_gesaettigt: 0.4,
      kohlenhydrate: 86.1,
      davon_zucker: 78.5,
      staerke: 7.0,
      ballaststoffe: 0.0,
      eiweiss: 0.9,
      salz: 0.09
    }
  };

  const allergene = {
    allergen_free: false,
    milch: true,
    gluten: false,
    soja: true,
    nuesse: true,
    contains_tr: "Süt, süt ürünleri ve soya içerir. Fındık içerebilir.",
    contains_de: "Enthält Milch, Milchprodukte und Soja. Kann Haselnüsse enthalten.",
    contains_en: "Contains milk, dairy products, and soy. May contain hazelnuts.",
    contains_ar: "يحتوي على الحليب ومنتجات الألبان وفول الصويا. قد يحتوي على البندق."
  };

  const aciklamalar = {
    tr: `Premium beyaz çikolatalı şurup. Gerçek şeker ile üretilmiş, otantik beyaz çikolata aromasına sahiptir. İçeceklerinize ve tatlılarınıza eşsiz bir lezzet katar. Glüten içermez.

**Kullanıldığı Yerler ve Kullanma Talimatı:**
- Sıcak ve soğuk kahvelerde, milkshake, kokteyl ve mokteyllerde, ayrıca sıcak ve soğuk çaylarda aroma ve tatlandırıcı olarak 1-2 cl şurup kullanılması tavsiye edilir.
- Ayrıca sıcak ya da soğuk su/süt ile 1/8 oranında karıştırılarak içecek olarak da hazırlanabilir.
- Tatlı çeşitlerine ve pastacılık ürünlerine lezzet katmak amacıyla istenilen miktarda ilave edilebilir. Servis önerisidir. Kullanmadan önce çalkalayınız.

**Saklama Koşulları:**
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    de: `Premium Sirup mit weißer Schokolade. Hergestellt mit echtem Zucker, mit authentischem Geschmack nach weißer Schokolade. Verleiht Ihren Getränken und Desserts ein einzigartiges Aroma. Glutenfrei.

**Anwendungsgebiete und Gebrauchsanweisung:**
- Es wird empfohlen, 1–2 cl Sirup als Aroma- und Süßungsmittel in heißen und kalten Kaffeespezialitäten, Milchshakes, Cocktails, Mocktails sowie in heißen und kalten Tees zu verwenden.
- Es kann auch als Getränk zubereitet werden, indem es im Verhältnis 1:8 mit heißem oder kaltem Wasser oder Milch gemischt wird.
- Es kann in beliebiger Menge Desserts und Gebäck beigefügt werden, um ihnen Geschmack zu verleihen. Servierempfehlung. Vor Gebrauch schütteln.

**Lagerung:**
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    en: `Premium white chocolate syrup. Made with real sugar, featuring authentic white chocolate flavor. Adds a delightful taste to your beverages and desserts. Gluten free.

**Place of Usage and Direction for Use:**
- It is recommended to use 1-2 cl of syrup as a flavoring and sweetening agent in hot and cold coffees, milkshakes, cocktails, mocktails, and also in hot and cold teas.
- Additionally, it can be mixed with hot or cold water/milk at a 1/8 ratio to prepare a beverage.
- It may also be added in the desired amount to desserts and pastry products to enhance flavor. Service suggestion. Shake before use.

**Storage:**
Keep away from direct sunlight, keep in cool and dry place.`,
    ar: `شراب الشوكولاتة البيضاء الفاخر. مصنوع من السكر الحقيقي، بنكهة الشوكولاتة البيضاء الأصيلة. يضيف طعماً لذيذاً إلى مشروباتك وحلوياتك. خالي من الغلوتين.

**مناطق الاستخدام وتعليمات الاستخدام:**
- يوصى باستخدام 1-2 سنتيلتر من الشراب كعامل منكه ومحلي في القهوة الساخنة والباردة والميلك شيك والكوكتيلات والموكتيلات، وأيضاً في الشاي الساخن والبارد.
- بالإضافة إلى ذلك، يمكن خلطه مع الماء/الحليب الساخن أو البارد بنسبة 1/8 لتحضير مشروب.
- يمكن إضافته بالكمية المرغوبة إلى الحلويات ومنتجات المخابز لإضافة نكهة. اقتراح التقديم. يرج قبل الاستعمال.

**شروط التخزين:**
يحفظ في مكان بارد وجاف بعيداً عن أشعة الشمس المباشرة.`
  };

  const { data: pData } = await supabase.from('urunler').select('teknik_ozellikler').eq('id', pId).single();
  const existingTeknik = pData?.teknik_ozellikler || {};

  const updatedTeknik = {
    ...existingTeknik,
    vegan: false,
    laktosefrei: false,
    glutenfrei: true,
    vegetarisch: true,
    ohne_zucker: false,
    geschmack: ["beyaz çikolata", "white chocolate", "weiße schokolade", "شوكولاتة بيضاء"],
    birim_hacim_ml: 700,
    koli_ici_adet: 6,
    palet_ici_adet: 170
  };

  const updatePayload = {
    ad,
    ean_gtin: "8691123471857",
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
    console.error("Error updating White Chocolate Syrup:", error);
  } else {
    console.log("✅ White Chocolate Syrup (2cd6dc8e...) successfully updated and activated!");
  }
}

updateWhiteChocolateSyrup();
