import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateCoolLimeMix() {
  const pId = "e26771eb-f6d0-4cd9-8c27-316633f348f7"; // Nane Ve Misket Limonu Aromalı İçecek (700 ml)

  const ad = {
    tr: "FO Cool Lime Mix - Nane ve Misket Limonu Aromalı İçecek 700 ml",
    de: "FO Cool Lime Mix - Getränk mit Pfefferminz- und Limettenaroma 700 ml",
    en: "FO Cool Lime Mix - Mint and Lime Flavored Beverage 700 ml",
    ar: "فو مزيج الليمون البارد - مشروب بنكهة النعناع والليمون 700 مل"
  };

  const inhaltsstoffe = {
    tr: "Su, Şeker, Asitlik düzenleyici (E 330, E 332ii), Aroma verici (Bahçe Nanesi, Misket limonu), Koruyucu (E 202, E 211), Renklendirici (E 150a).",
    de: "Wasser, Zucker, Säuerungsmittel (E 330, E 332ii), Aroma (Grüne Minze, Limette), Konservierungsstoffe (E 202, E 211), Farbstoffe (E 150a).",
    en: "Water, Sugar, Acidity regulator (E 330, E 332ii), Flavouring (Spearmint, Lime), Preservative (E 202, E 211), Colour (E 150a).",
    ar: "ماء، سكر، منظم حموضة (E 330، E 332ii)، منكهات (النعناع، الليمون)، مادة حافظة (E 202، E 211)، ملون (E 150a)."
  };

  const naehrwerte = {
    pro_100g: {
      energie_kj: 292,
      energie_kcal: 70,
      fett: 0.0,
      davon_gesaettigt: 0.0,
      kohlenhydrate: 16.0,
      davon_zucker: 16.0,
      staerke: 0.0,
      ballaststoffe: 0.0,
      eiweiss: 0.0,
      salz: 0.015
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
    tr: `Cool Lime Mix kullanıcıların hazır olarak tercih ettiği bir üründür. Hazırlanışı pratik, sunumu kolaydır.

**Kullanım Alanları ve Talimatı:**
- Cool Lime Mix'in bol buzla servis yapılması önerilir. 
- Tercihe göre %25 ve %50 oranlarında sulandırılarak da hazırlanabilir. 
- Bol buzla servis yapınız. Servis önerisidir.

**Saklama Koşulları:**
Güneş ışığından uzakta, serin ve kuru yerde saklayınız.`,
    de: `Cool Lime Mix ist ein Produkt, das bereits fertig von Benutzern bevorzugt wird. Es ist praktisch in der Zubereitung und einfach in der Präsentation.

**Anwendungsgebiete und Gebrauchsanweisung:**
- Es wird empfohlen, den Cool Lime Mix mit viel Eis zu servieren.
- Je nach Vorliebe kann es auch in 25% oder 50% verdünnt zubereitet werden.
- Serviervorschlag.

**Lagerung:**
Vor Sonneneinstrahlung schützen, kühl und trocken lagern.`,
    en: `Cool Lime Mix is a ready to use product preferred by users. It's practical to prepare and easy to serve.

**Directions for Use:**
- It is recommended to serve Cool Lime Mix with plenty of ice.
- It can be prepared by diluting 25% and 50% if desired.
- Service suggestion.

**Storage:**
Keep away from direct sunlight. Keep in cool and dry place.`,
    ar: `Cool Lime Mix هو منتج جاهز يفضله المستخدمون. تحضيرها عملي وعرضها سهل.

**المناطق المستخدمة وتعليمات الاستخدام:**
- يوصى بتقديم مزيج الليمون البارد مع الكثير من الثلج.
- يمكن أيضًا تحضيره عن طريق التخفيف بنسبة 25٪ و 50٪ حسب الأفضلية.
- إنها توصية خدمة.

**شروط التخزين:**
يُخزن في مكان بارد وجاف، بعيداً عن أشعة الشمس المباشرة.`
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
    geschmack: ["nane", "misket limonu", "cool lime", "minze", "limette", "mint", "lime", "نعناع", "ليمون"],
    birim_hacim_ml: 700,
    koli_ici_adet: 6,
    palet_ici_adet: 170
  };

  const updatePayload = {
    ad,
    ean_gtin: "8691123462916",
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
    console.error("Error updating Cool Lime Mix:", error);
  } else {
    console.log("✅ Cool Lime Mix successfully updated and activated!");
  }
}

updateCoolLimeMix();
