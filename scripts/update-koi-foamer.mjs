import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateKoiFoamer() {
  const pId = "cf80047e-584b-406e-ab2e-d65dd41c5901";

  const ad = {
    ar: "كوي كوكتيل رغوي نباتي 100 مل",
    de: "KOI Vegan Cocktail Foamer 100 ml",
    en: "KOI Vegan Cocktail Foamer 100 ml",
    tr: "KOI Vegan Kokteyl Köpürtücü 100 ml"
  };

  const inhaltsstoffe = {
    de: "Seifenkrautextrakt, Feuchthaltemittel [Glycerin (E 422)].",
    tr: "Çöven Ekstraktı, Nem verici [Gliserol (E 422)].",
    en: "Soapwort Extract, Humectant [Glycerol (E 422)].",
    ar: "مستخلص عرق الحلاوة، مرطب [الجليسرول (E 422)]."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 411,
      energie_kcal: 98,
      fett: 7.9,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 14.9,
      davon_zucker: 0.0,
      staerke: 0.0,
      ballaststoffe: 0.0,
      eiweiss: 3.5,
      salz: 0.0
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
    de: `Ein 100 % pflanzlicher, veganer Cocktailschäumer, der aus Seifenkrautextrakt hergestellt wird. Die ideale Lösung, um die Eiklar-Alternative in Cocktails zu ersetzen, ohne den Geschmack zu beeinträchtigen. Verleiht Ihren Getränken einen stabilen, lang anhaltenden und seidigen Schaum.

Anwendungsgebiete und Gebrauchsanweisung:
Wird zum Aufschäumen von Cocktails verwendet. 3 Tropfen in 250 ml Cocktail geben und 10 Sekunden lang schütteln. Serviervorschlag.

Lagerung:
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    tr: `Çöven ekstraktından elde edilen, %100 bitkisel ve vegan kokteyl köpürtücü. Kokteyllerde yumurta akı kullanımına son veren, içeceğin lezzetini ve kokusunu etkilemeyen profesyonel bir alternatiftir. İçeceklerinize kalıcı, pürüzsüz ve yoğun bir köpük dokusu kazandırır.

Kullanıldığı Yerler ve Kullanma Talimatı:
Kokteyllerin köpürtülmesinde kullanılır. 250ml kokteyle 3 damla ilave edilir, 10 saniye boyunca çalkalanır. Servis önerisidir.

Saklama Koşulları:
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    en: `A 100% plant-based, vegan cocktail foamer made from soapwort extract. It serves as a professional alternative to egg whites in cocktails without altering the taste or aroma of your drinks. Creates a stable, smooth, and rich foam texture.

Place of Usage and Direction for Use:
It is used to foam cocktails. Add 3 drops to 250ml cocktail and shake for 10 seconds. Service suggestion.

Storage:
Keep away from direct sunlight, keep in cool and dry place.`,
    ar: `صانع رغوة كوكتيل نباتي 100% مصنوع من مستخلص عرق الحلاوة. البديل الاحترافي المثالي لبياض البيض في الكوكتيلات دون تغيير طعم أو رائحة المشروب. يمنح مشروباتك رغوة كثيفة وناعمة تدوم طويلاً.

مناطق الاستخدام وتعليمات الاستخدام:
يستخدم لرغوة الكوكتيلات. أضف 3 قطرات إلى 250 مل من الكوكتيل ورج لمدة 10 ثوانٍ. اقتراح التقديم.

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
    ohne_zucker: true,
    geschmack: ["köpürtücü", "foamer", "schäumer"],
    birim_hacim_ml: 100
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
    console.error("Error updating Koi Foamer:", error);
  } else {
    console.log("✅ Koi Foamer (cf80047e...) successfully updated and activated!");
  }
}

updateKoiFoamer();
