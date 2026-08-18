import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateBitterChocolatePowder() {
  const productId = '1be59fa7-c321-4b01-8a36-d29f039e59c6';

  const ad = {
    tr: "Bitter Çikolatalı İçecek Tozu - 1 kg",
    de: "Bitter-Schokoladen-Getränkepulver – 1 kg",
    en: "Bitter Chocolate Powder Drink – 1 kg",
    ar: "مسحوق مشروب الشوكولاتة الداكنة - 1 كجم",
    fr: "Poudre de Boisson au Chocolat Amer – 1 kg",
    es: "Polvo de Bebida con Chocolate de Bitter – 1 kg",
    ru: "Смесь для молочного коктейля со вкусом темного шоколада – 1 кг"
  };

  const slug = "bitter-cikolatali-icecek-tozu-1-kg";
  const ean_gtin = "8691123449498";

  const inhaltsstoffe = {
    tr: "Şeker, Kakao tozu, Bitter çikolata tozu (%5), [Kakao kitlesi, Şeker, Kakao yağı, Emülgatör (Ayçiçek lesitini)], Modifiye mısır nişastası, Kıvam verici (E 415), Asitlik düzenleyici (E 330), Topaklanmayı önleyici (E 551).",
    de: "Zucker, Kakaopulver, Bitterschokoladenpulver (5%), [Kakaomasse, Zucker, Kakaobutter, Emulgator (Sonnenblumenlecithin)], Modifizierte maisstärke, Verdickungsmittel (E 415), Säuerungsmittel (E 330), Trennmittel (E 551).",
    en: "Sugar, Cocoa powder, Dark chocolate powder (5%), [Cocoa mass, Sugar, Cocoa butter, Emulsifier (Sunflower lecithin)], Modified corn starch, Thickener (E 415), Acidity regulator (E 330), Anti-caking agent (E 551).",
    es: "Azúcar, Polvo de cacao, Polvo de chocolate bitter (5%), [Masa de cacao, Azúcar, Aceite de cacao, Emulgente (Lecitina de girasol)], Almidón de maíz modificado, Espesante (E 415), Corrector de acidez (E 330), Antiaglomerante (E 551).",
    fr: "Sucre, Cacao en poudre, Chocolat amer en poudre (5%), [Masse de cacao, Sucre, Beurre de cacao, Émulsifiant (Lécithine de tournesol)], Amidon de maïs modifié, Épaississant (E 415), Correcteur d’acidité (E 330), Anti-agglomérant (E 551).",
    ru: "Сахар, порошок какао, порошок темного шоколада (5%), [какао тертое, сахар, масло какао, эмульгатор (подсолнечный лецитин)], модифицированный кукурузный крахмал, загуститель (E 415), регулятор кислотности (E 330), агент антислеживающий (E 551).",
    ar: "سكر، مسحوق الكاكاو، مسحوق الشوكولاتة الداكنة (5%)، [كتلة الكاكاو، سكر، زبدة الكاكاو، مستحلب (ليسيثين عباد الشمس)]، نشا الذرة المعدل، مغلظ قوام (E 415)، منظم حموضة (E 330)، مانع تكتل (E 551)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 1590,
      energie_kcal: 379,
      fett: 3.7,
      davon_gesaettigt: 2.1,
      cholesterin: 0.0,
      kohlenhydrate: 77.7,
      davon_zucker: 74.9,
      staerke: 4.2,
      ballaststoffe: 6.3,
      eiweiss: 4.8,
      natrium: 0.3,
      salz: 0.75
    }
  };

  const allergene = {
    allergen_free: false,
    milch: false,
    gluten: false,
    soja: false,
    nuesse: false,
    eier: false,
    contains_tr: "Süt, gluten, yumurta, antep fıstığı, badem ve soya içerebilir (eser miktarda).",
    contains_de: "Kann Spuren von Milch, Gluten, Ei, Pistazien, Mandeln und Soja enthalten.",
    contains_en: "May contain milk, gluten, eggs, pistachios, almonds, and soy.",
    contains_es: "Puede contener leche, gluten, huevo, pistacho, almendra y soja.",
    contains_fr: "Peut contenir du lait, du gluten, de l'œuf, de la pistache, de l'amande et du soja.",
    contains_ru: "Может содержать следы молока, глютена, яиц, фисташек, миндаля и сои.",
    contains_ar: "قد يحتوي على آثار من الحليب، الغلوتين، البيض، الفستق، اللوز والصويا."
  };

  const aciklamalar = {
    tr: `Bitter Çikolatalı İçecek Tozu 1 kg

Kullanıldığı Yerler ve Kullanım Talimatı:
Frappe ve smoothie yapımında kullanılır.

Hazırlanışı:
40 gr aromalı içecek tozu, 200 ml pastörize veya sterilize soğuk süt, 10 adet küp buz (200 ml suya eşittir) blendıra konulur. Buzlar kırılıncaya kadar karıştırılır. Daha sonra bardakta servis yapılır.

Saklama Koşulları:
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,

    de: `Bitter-Schokoladen-Getränkepulver 1 kg

Anwendungsbereiche und Gebrauchsanweisung:
Wird zur Zubereitung von Frappe und Smoothie eingesetzt.

Zubereitung:
Es werden 40 g aromatisches Getränkepulver, 200 ml pasteurisierte oder sterilisierte kalte Milch und 10 Eiswürfel (entspricht 200 ml Wasser) im Mixer gemischt, bis die Eiswürfel zerkleinert sind. Anschließend wird das Getränk in einem Glas serviert.

Lagerung:
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,

    en: `Bitter Chocolate Powder Drink 1 kg

Using Areas and Instruction:
Used to make frappe and smoothie.

Preparation:
40 g flavored beverage powder, 200 ml of cold milk (pasteurized or sterilized), and 10 cubes of ice (equal to 200 ml water) are placed in the blender. It is stirred until the ice is broken, then served in cups.

Storage:
Keep away from direct sunlight, keep in a cool and dry place.`,

    ar: `مسحوق مشروب الشوكولاتة الداكنة 1 كجم

مجالات الاستخدام والتعليمات:
يستخدم في تحضير الفرابيه والسموذي والميلك شيك.

طريقة التحضير:
يوضع 40 جم من مسحوق المشروب، 200 مل من الحليب البارد المبستر أو المعقم، و10 مكعبات ثلج (تعادل 200 مل ماء) في الخلاط. يتم الخلط حتى يتفتت الثلج، ثم يقدم في الكوب.

شروط التخزين:
يحفظ في مكان بارد وجاف بعيداً عن أشعة الشمس المباشرة.`,

    fr: `Poudre de Boisson au Chocolat Amer 1 kg

Domaines d'utilisation et mode d'emploi:
Le produit est utilisé pour la préparation de frappé et de boisson fouettée (smoothie).

Préparation:
40 g de poudre de boisson aromatisée, 200 ml de lait froid pasteurisé ou stérilisé et 10 glaçons (équivalent à 200 ml d'eau) sont mis dans un mélangeur. Le mélange est agité jusqu'à ce que les glaçons soient brisés. Ensuite, le mélange est servi dans un verre.

Conservation:
Protéger du rayonnement direct du soleil et conserver dans un endroit frais et sec.`,

    es: `Polvo de Bebida con Chocolate de Bitter 1 kg

Instrucción de uso y lugares de uso:
Se utiliza en la producción de frappé y smoothie.

Preparación:
Se coloca en la licuadora 40 g de polvo de bebida aromatizada, 200 ml de leche fría pasteurizada o esterilizada y 10 cubitos de hielo (equivalente a 200 ml de agua). Se mezcla hasta que el hielo se triture y luego se sirve en un vaso.

Conservación:
Conservar en un lugar seco y fresco y lejos de los rayos solares.`,

    ru: `Смесь для молочного коктейля со вкусом темного шоколада 1 кг

Инструкция по применению:
Используется для приготовления фраппе и милкшейка / смузи.

Приготовление:
40 г смеси, 200 мл (пастеризованного или стерилизованного) холодного молока, 10 кубиков льда (равно 200 мл воды) взбить в блендере. Лед измельчить до тех пор, пока стенки не покроются инеем. Затем разлить в чашки.

Хранение:
Хранить вдали от солнечного света в прохладном и сухом месте.`
  };

  const { data: pData } = await supabase.from('urunler').select('teknik_ozellikler').eq('id', productId).single();
  const existingTeknik = pData?.teknik_ozellikler || {};

  const updatedTeknik = {
    ...existingTeknik,
    vegan: false,
    laktosefrei: false,
    glutenfrei: false,
    vegetarisch: true,
    ohne_zucker: false,
    geschmack: ["bitter çikolata", "bitter chocolate", "bitterschokolade", "chocolat amer", "темный шоколад"],
    birim_agirlik_g: 1000,
    koli_ici_adet: 6,
    palet_ici_adet: 540
  };

  const seo_meta = {
    title: {
      tr: "Bitter Çikolatalı İçecek Tozu 1 kg | Sweet Heaven",
      de: "Bitter-Schokoladen-Getränkepulver 1 kg | Sweet Heaven",
      en: "Bitter Chocolate Powder Drink 1 kg | Sweet Heaven",
      ar: "مسحوق مشروب الشوكولاتة الداكنة 1 كجم | Sweet Heaven"
    },
    description: {
      tr: "Frappe ve smoothie için FO Bitter Çikolatalı İçecek Tozu 1 kg. Yoğun kakao lezzeti ve pürüzsüz kremsi doku.",
      de: "FO Bitter-Schokoladen-Getränkepulver 1 kg für Frappes und Smoothies. Intensiver Kakaogeschmack und cremige Textur.",
      en: "FO Bitter Chocolate Powder Drink 1 kg for frappes and smoothies. Rich dark cocoa taste and smooth texture.",
      ar: "مسحوق مشروب الشوكولاتة الداكنة 1 كجم من فو للفرابيه والسموذي بنكهة غنية وقوام متوازن."
    }
  };

  const updateData = {
    ad,
    slug,
    ean_gtin,
    aktif: true,
    inhaltsstoffe,
    naehrwerte,
    besin_degerleri: JSON.stringify(naehrwerte),
    allergene,
    aciklamalar,
    teknik_ozellikler: updatedTeknik,
    seo_meta,
    herkunftsland: { ar: 'تركيا', de: 'Türkei', en: 'Turkey', tr: 'Türkiye' },
    hersteller_name: 'Özmer Pastacılık ve İçecek Ürünleri San. Paz. Turizm ve Dış Ticaret A.Ş.',
    hersteller_land: 'Türkiye',
    produktdatenblatt_url: "https://szuhjzgyhhlrydyllrcd.supabase.co/storage/v1/object/public/urun-etiketleri/toz-1kg/FO-CIKOLATA-AROMALI-ICECEK-TOZU-1KG.pdf"
  };

  console.log('Updating Bitter Chocolate Powder Drink...');
  const { data, error } = await supabase
    .from('urunler')
    .update(updateData)
    .eq('id', productId)
    .select();

  if (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }

  console.log('Update successful!');
  console.log('Product ID:', data[0].id);
  console.log('Ad:', data[0].ad);
  console.log('Slug:', data[0].slug);
  console.log('Barcode (EAN):', data[0].ean_gtin);
  console.log('Aktif:', data[0].aktif);

  // Clean up the dummy unmigrated stub if exists
  const dummyId = '1bf7e39e-b95d-4177-a981-09f666b356e9';
  const { error: delErr } = await supabase.from('urunler').delete().eq('id', dummyId);
  if (!delErr) {
    console.log('Cleaned up unmigrated stub product:', dummyId);
  }
}

updateBitterChocolatePowder();
