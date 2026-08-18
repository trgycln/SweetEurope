import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateBlackberrySyrup() {
  const pId = "6acc385e-7fa8-4803-8a11-4d6f672de45f";

  const ad = {
    ar: "فو شراب بنكهة التوت الأسود – 700 مل",
    de: "FO Sirup mit Brombeergeschmack – 700 ml",
    en: "FO Blackberry Flavored Syrup – 700 ml",
    tr: "FO Böğürtlen Aromalı Şurup – 700 ml"
  };

  const inhaltsstoffe = {
    de: "Zucker, Wasser, Aroma (Brombeere), Säuerungsmittel (E 330), Konservierungsstoffe (E 202, E 211), Farbstoffe (E 129, E 133). E 129: Kann Aktivität und Aufmerksamkeit bei Kindern beeinträchtigen.",
    tr: "Şeker, Su, Aroma verici (Böğürtlen), Asitlik düzenleyici (E 330), Koruyucu (E 202, E 211), Renklendirici (E 129, E 133). E 129: Çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
    en: "Sugar, Water, Flavouring (Blackberry), Acidity regulator (E 330), Preservative (E 202, E 211), Colour (E 129, E 133). E 129: May have negative effects on the activities and attentions of the children.",
    ar: "سكر، ماء، نكهة (توت العليق الأسود)، منظم الحموضة (E 330)، مواد حافظة (E 202، E 211)، ملون (E 129، E 133). E 129: قد يؤثر سلباً على نشاط وانتباه الأطفال."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1420,
      energie_kcal: 340,
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
    contains_de: "Glutenfrei, Allergenfrei.",
    contains_tr: "Glütensiz, Alerjen içermez.",
    contains_en: "Gluten free, Allergen free.",
    contains_ar: "خالي من الغلوتين، خالٍ من مسببات الحساسية."
  };

  const aciklamalar = {
    de: `Aromatisierter Sirup mit authentischem Brombeergeschmack. Hergestellt mit echtem Zucker. Verleiht Getränken und Desserts eine angenehme Süße und ein fruchtiges Brombeeraroma.

Anwendungsgebiete und Gebrauchsanweisung:
Es wird empfohlen, 1–2 cl Sirup als Aroma- und Süßungsmittel in heißen und kalten Kaffeespezialitäten, Milchshakes, Cocktails, Mocktails sowie in heißen und kalten Tees zu verwenden. Es kann auch als Getränk zubereitet werden, indem es im Verhältnis 1:8 mit heißem oder kaltem Wasser oder Milch gemischt wird. Es kann in beliebiger Menge Desserts und Gebäck beigefügt werden, um ihnen Geschmack zu verleihen. Servierempfehlung.

Lagerung:
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    tr: `Gerçek şeker ile üretilmiş, otantik böğürtlen aromasına sahip profesyonel şurup. İçeceklerinize ve tatlılarınıza eşsiz bir lezzet ve canlı bir renk katar.

Kullanıldığı Yerler ve Kullanma Talimatı:
Uluslararası ve özel kokteyllerin, mokteyllerin hazırlanmasında kullanıcıların tercih ettiği aromalı şuruptur. Soda bazlı içeceklerde, aromalı soğuk çaylarda, smoothie, milkshake ve limonata gibi içeceklerde, içeceğe aroma ve tat katmak amacıyla 1/8 oranında kullanılır. Ayrıca, sıcak veya soğuk su ile aynı oranda sulandırılarak içime hazır hâle getirilir. Tatlı çeşitlerine ve pastacılık ürünlerine lezzet katmak amacıyla istenilen miktarda ilave edilebilir. Servis önerisidir.

Saklama Koşulları:
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    en: `Premium syrup with authentic blackberry flavor. Made with real sugar. Adds a delightful sweetness and a fruity blackberry taste to your beverages and desserts.

Place of Usage and Direction for Use:
It is a flavored syrup preferred by users in the preparation of international and specialty cocktails and mocktails. It is used at a 1/8 ratio to add flavor and taste in soda-based drinks, flavored iced teas, smoothies, milkshakes, and lemonades. Additionally, it can be diluted with hot or cold water in the same ratio to make it ready to drink. It can also be added in the desired amount to desserts and pastry products to enhance flavor. Service suggestion.

Storage:
Keep away from direct sunlight, keep in cool and dry place.`,
    ar: `شراب فاخر بنكهة التوت الأسود الأصلية. مصنوع من السكر الحقيقي. يضيف حلاوة لذيذة وطعم التوت الأسود الفاكهي إلى المشروبات والحلويات.

مناطق الاستخدام وتعليمات الاستخدام:
هو شراب منكه مفضل لدى المستخدمين في تحضير الكوكتيلات والموكتيلات الدولية والخاصة. يستخدم بنسبة 1/8 لإضافة نكهة وطعم في المشروبات الغازية، الشاي المثلج المنكه، السموثي، الميلك شيك والليموناضة. بالإضافة إلى ذلك، يمكن تخفيفه بالماء الساخن أو البارد بنفس النسبة لجعله جاهزاً للشرب. يمكن إضافته أيضاً بالكمية المرغوبة إلى الحلويات ومنتجات المخابز لإضافة نكهة. اقتراح التقديم.

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
    geschmack: ["böğürtlen", "blackberry", "brombeere", "mûre sauvage"],
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
    console.error("Error updating Blackberry Syrup:", error);
  } else {
    console.log("✅ Blackberry Syrup (6acc385e...) successfully updated and activated!");
  }
}

updateBlackberrySyrup();
