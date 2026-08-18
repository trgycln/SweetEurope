import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateStrawberryFlavoredSauce() {
  const productId = 'fbb3ce44-1950-4ed2-b7a5-21718fc48436'; // ID for Çilek Aromalı Dekor Sos 750 gr

  const updateData = {
    ad: {
      ar: "صلصة تزيين بنكهة الفراولة 750 جرام",
      de: "Dekorationssauce mit Erdbeergeschmack 750 gr",
      en: "Strawberry Flavored Decoration Sauce 750 gr",
      tr: "Çilek Aromalı Dekor Sos 750 gr"
    },
    inhaltsstoffe: {
      tr: "Glikoz şurubu, Su, Kıvam artırıcı (E 440, E 406), Asitlik düzenleyici (E 330, E 331iii), Aroma verici (Çilek), Renklendirici (E 129, E 150d), Koruyucu (E 202). E 129: Çocukların aktivite ve dikkatleri üzerine olumsuz etkileri bulunabilir.",
      de: "Glukosesirup, Wasser, Verdickungsmittel (E 440, E 406), Säureregulator (E 330, E 331iii), Aroma (Erdbeere), Farbstoff (E 129, E 150d), Konservierungsstoff (E 202). E 129: Kann negative Auswirkungen auf die Aktivität und Aufmerksamkeit von Kindern haben.",
      en: "Glucose syrup, Water, Thickener (E 440, E 406), Acidity regulator (E 330, E 331iii), Flavouring (Strawberry), Colour (E 129, E 150d), Preservative (E 202). E 129: May have negative effects on the activities and attentions of the children."
    },
    naehrwerte: {
      pro_100g: {
        energie_kj: 1080,
        energie_kcal: 258,
        fett: 0.0,
        davon_gesaettigt: 0.0,
        kohlenhydrate: 62.0,
        davon_zucker: 31.2,
        staerke: 20.8,
        ballaststoffe: 0.5,
        eiweiss: 0.5,
        salz: 0.28
      }
    },
    allergene: {
      allergen_free: true,
      milch: false,
      gluten: false,
      soja: false,
      nuesse: false,
      contains_tr: "Alerjen içermez.",
      contains_de: "Allergenfrei.",
      contains_en: "Allergen free.",
      contains_ar: "خالٍ من مسببات الحساسية."
    },
    aciklamalar: {
      tr: "Çilek Aromalı Dekor Sos 750 gr\nFO Çilek Aromalı Dekor Sos, pasta, dondurma ve tatlılarınıza hem şık bir görünüm hem de lezzet katmak için özel olarak geliştirilmiştir. Pratik kullanım imkanı sunan ambalaj tasarımıyla sunumlarınızı profesyonel bir dokunuşla tamamlamanızı sağlar.\nKullanım Alanları\n- Pasta, kek, tart ve turta süslemeleri\n- Waffle ve kurabiye dekorasyonu\n- Cheesecake ve muffin sunumları\n- Sütlü tatlılar ve dondurma üzeri\nKullanım Talimatı\nDirekt olarak mamul veya tabağın dışına sıkılarak uygulanır. Kapağının pratik ince ucu sayesinde desen vermek ve şekil çizmek çok kolaydır.\nÖne Çıkan Özellikler\n- Şık ve çekici dekorasyonlar\n- Zengin çilek aroması\n- İnce uçlu kapak ile kolay ve pratik kullanım\n- Tavsiye edilen uygulama sıcaklığı: 20-22°C",
      en: "Strawberry Flavored Decoration Sauce 750 gr\nFO Strawberry Flavored Decoration Sauce is specially developed to add an elegant appearance and flavor to your pastries, ice creams, and desserts. With its practical packaging design, it allows you to complete your presentations with a professional touch.\nAreas of Use\n- Pastry, cake, and tart decorations\n- Waffle and cookie decoration\n- Cheesecake and muffin presentations\n- Milk desserts and ice cream toppings\nDirection for Use\nApplied directly to the product or onto the plate. Thanks to the practical fine tip of the cover, it is very easy to draw patterns and shapes.\nHighlights\n- Elegant and attractive decorations\n- Rich strawberry flavor\n- Easy and practical use with fine tip cover\n- Recommended application temperature: 20-22°C",
      de: "Dekorationssauce mit Erdbeergeschmack 750 gr\nDie FO Dekorationssauce mit Erdbeergeschmack wurde speziell entwickelt, um Ihrem Gebäck, Eis und Desserts ein elegantes Aussehen und Geschmack zu verleihen. Mit seinem praktischen Verpackungsdesign können Sie Ihre Präsentationen mit einem professionellen Touch abrunden.\nEinsatzgebiete\n- Gebäck-, Kuchen- und Tortendekorationen\n- Waffel- und Keksdekoration\n- Käsekuchen- und Muffin-Präsentationen\n- Milchdesserts und Eis-Toppings\nAnwendungspraxis\nWird direkt auf das Produkt oder auf den Teller aufgetragen. Dank der praktischen, feinen Spitze der Abdeckung ist das Zeichnen von Mustern und Formen sehr einfach.\nHöhepunkte\n- Elegante und attraktive Dekorationen\n- Reicher Erdbeergeschmack\n- Einfache und praktische Anwendung mit feiner Spitze\n- Empfohlene Anwendungstemperatur: 20-22°C",
      ar: "صلصة تزيين بنكهة الفراولة 750 جرام\nتم تطوير صلصة التزيين بنكهة الفراولة من فو خصيصًا لإضافة مظهر أنيق ونكهة غنية إلى المعجنات والآيس كريم والحلويات. بفضل تصميم العبوة العملي، تتيح لك إكمال تقديماتك بلمسة احترافية.\nمجالات الاستخدام\n- تزيين المعجنات والكعك والتارت\n- تزيين الوافل والبسكويت\n- تقديم التشيز كيك والمافن\n- حلويات الحليب وطبقات الآيس كريم\nتعليمات الاستخدام\nتُطبق مباشرة على المنتج أو على الطبق. بفضل الطرف الدقيق والعملي للغطاء، يصبح رسم الأنماط والأشكال سهلاً للغاية.\nأبرز الميزات\n- زينة أنيقة وجذابة\n- نكهة فراولة غنية\n- استخدام سهل وعملي مع غطاء ذو طرف دقيق\n- درجة حرارة التطبيق الموصى بها: 20-22 درجة مئوية"
    },
    ean_gtin: "8691123350020",
    aktif: true
  };

  updateData.besin_degerleri = JSON.stringify(updateData.naehrwerte);

  const { data: pData } = await supabase.from('urunler').select('teknik_ozellikler').eq('id', productId).single();
  const existingTeknik = pData?.teknik_ozellikler || {};

  updateData.teknik_ozellikler = {
    ...existingTeknik,
    vegan: true,
    laktosefrei: true,
    glutenfrei: true,
    vegetarisch: true,
    geschmack: ["çilek", "strawberry", "erdbeere"],
    birim_agirlik_g: 750
  };

  console.log('Updating Strawberry Flavored Sauce 750g...');
  
  const { data, error } = await supabase
    .from('urunler')
    .update(updateData)
    .eq('id', productId)
    .select();

  if (error) {
    console.error('Update failed:', error);
  } else {
    console.log('Update successful! Data:', JSON.stringify(data[0].ad, null, 2));
    console.log('Updated fields:', Object.keys(updateData).join(', '));
  }
}

updateStrawberryFlavoredSauce();
