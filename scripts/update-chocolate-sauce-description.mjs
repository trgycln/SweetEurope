import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAciklamalar() {
  const productId = 'c3029bf8-5bc5-4566-8d50-0e2ba3ab0ffb'; // FO Çikolata Aromalı Dekor Sos 750 gr
  
  const aciklamalar = {
    tr: "Çikolata Aromalı Dekor Sos 750 gr\nFO Çikolata Aromalı Dekor Sos, pasta, dondurma ve tatlılarınıza hem şık bir görünüm hem de lezzet katmak için özel olarak geliştirilmiştir. Pratik kullanım imkanı sunan ambalaj tasarımıyla sunumlarınızı profesyonel bir dokunuşla tamamlamanızı sağlar.\nKullanım Alanları\n- Pasta, kek, tart ve turta süslemeleri\n- Waffle ve kurabiye dekorasyonu\n- Cheesecake ve muffin sunumları\n- Sütlü tatlılar ve dondurma üzeri\nKullanım Talimatı\nDirekt olarak mamul veya tabağın dışına sıkılarak uygulanır. Kapağının pratik ince ucu sayesinde desen vermek ve şekil çizmek çok kolaydır.\nÖne Çıkan Özellikler\n- Şık ve çekici dekorasyonlar\n- Zengin çikolata aroması\n- İnce uçlu kapak ile kolay ve pratik kullanım\n- Tavsiye edilen uygulama sıcaklığı: 20-22°C",
    en: "Chocolate Flavored Decoration Sauce 750 gr\nFO Chocolate Flavored Decoration Sauce is specially developed to add an elegant appearance and flavor to your pastries, ice creams, and desserts. With its practical packaging design, it allows you to complete your presentations with a professional touch.\nAreas of Use\n- Pastry, cake, and tart decorations\n- Waffle and cookie decoration\n- Cheesecake and muffin presentations\n- Milk desserts and ice cream toppings\nDirection for Use\nApplied directly to the product or onto the plate. Thanks to the practical fine tip of the cover, it is very easy to draw patterns and shapes.\nHighlights\n- Elegant and attractive decorations\n- Rich chocolate flavor\n- Easy and practical use with fine tip cover\n- Recommended application temperature: 20-22°C",
    de: "Dekorationssauce mit Schokoladengeschmack 750 gr\nDie FO Dekorationssauce mit Schokoladengeschmack wurde speziell entwickelt, um Ihrem Gebäck, Eis und Desserts ein elegantes Aussehen und Geschmack zu verleihen. Mit seinem praktischen Verpackungsdesign können Sie Ihre Präsentationen mit einem professionellen Touch abrunden.\nEinsatzgebiete\n- Gebäck-, Kuchen- und Tortendekorationen\n- Waffel- und Keksdekoration\n- Käsekuchen- und Muffin-Präsentationen\n- Milchdesserts und Eis-Toppings\nAnwendungspraxis\nWird direkt auf das Produkt oder auf den Teller aufgetragen. Dank der praktischen, feinen Spitze der Abdeckung ist das Zeichnen von Mustern und Formen sehr einfach.\nHöhepunkte\n- Elegante und attraktive Dekorationen\n- Reicher Schokoladengeschmack\n- Einfache und praktische Anwendung mit feiner Spitze\n- Empfohlene Anwendungstemperatur: 20-22°C",
    ar: "صلصة تزيين بنكهة الشوكولاتة 750 جرام\nتم تطوير صلصة التزيين بنكهة الشوكولاتة من فو خصيصًا لإضافة مظهر أنيق ونكهة غنية إلى المعجنات والآيس كريم والحلويات. بفضل تصميم العبوة العملي، تتيح لك إكمال تقديماتك بلمسة احترافية.\nمجالات الاستخدام\n- تزيين المعجنات والكعك والتارت\n- تزيين الوافل والبسكويت\n- تقديم التشيز كيك والمافن\n- حلويات الحليب وطبقات الآيس كريم\nتعليمات الاستخدام\nتُطبق مباشرة على المنتج أو على الطبق. بفضل الطرف الدقيق والعملي للغطاء، يصبح رسم الأنماط والأشكال سهلاً للغاية.\nأبرز الميزات\n- زينة أنيقة وجذابة\n- نكهة شوكولاتة غنية\n- استخدام سهل وعملي مع غطاء ذو طرف دقيق\n- درجة حرارة التطبيق الموصى بها: 20-22 درجة مئوية"
  };

  const { data, error } = await supabase
    .from('urunler')
    .update({ aciklamalar })
    .eq('id', productId)
    .select('id, ad');

  if (error) {
    console.error('Update failed:', error);
  } else {
    console.log('Update successful! Data:', data);
  }
}

updateAciklamalar();
