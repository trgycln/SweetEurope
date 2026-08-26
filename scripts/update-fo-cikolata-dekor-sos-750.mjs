import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runUpdates() {
  console.log('--- Updating FO Çikolata Aromalı Dekor Sos 750 gr ---');
  
  const pId = 'c3029bf8-5bc5-4566-8d50-0e2ba3ab0ffb';

  const ad = {
    tr: 'FO Çikolata Aromalı Dekor Sos 750 gr',
    en: 'FO Chocolate Flavored Decor Sauce 750 g',
    de: 'FO Dekorationssauce mit Schokoladengeschmack 750 g',
    ar: 'صوص تزيين بنكهة الشوكولاتة فو 750 جم'
  };

  const aciklamalar = {
    tr: `FO Çikolata Aromalı Dekor Sos 750 gr, çikolatanın yoğun ve dengeli lezzetiyle tatlı ve içecek sunumlarına zengin bir tat ve estetik görünüm katmak için geliştirilmiştir. Akışkan ve parlak yapısı sayesinde tabak ve bardak dekorlarında kolayca uygulanarak homojen ve iştah açıcı bir sunum sağlar. Kafe ve pastane menülerinde pratik kullanım ve şık dekorlar hedefleyen profesyonel uygulamalar için idealdir.

Kullanım Alanları
– Tatlı ve pasta süslemeleri
– Dondurma ve waffle sunumları
– Milkshake ve içecek dekorları
– Kafe ve pastane menüleri

Öne Çıkan Özellikler
– Yoğun ve dengeli çikolata aroması
– Akışkan ve parlak dekor sos yapısı
– Kolay uygulanabilir form
– 750 gr ambalaj`,

    en: `FO Chocolate Flavored Decor Sauce 750 g is specially developed to bring rich flavor and sophisticated aesthetics to dessert and beverage presentations with its intense, balanced chocolate taste. Thanks to its fluid and glossy texture, it applies smoothly on plates and glassware to create homogeneous, appetizing presentations. Ideal for professional applications aiming for practical use and elegant decoration across cafe and bakery menus.

Areas of Use
– Dessert and cake garnishing
– Ice cream and waffle presentations
– Milkshake and beverage decoration
– Cafe and bakery menus

Highlights
– Intense and balanced chocolate aroma
– Fluid and glossy decor sauce consistency
– Easy-to-apply formula
– 750 g bottle`,

    de: `Die FO Schokoladen-Dekorsauce 750 g wurde entwickelt, um Dessert- und Getränkepräsentationen mit dem intensiven, ausgewogenen Geschmack edler Schokolade eine reichhaltige Note und ästhetische Optik zu verleihen. Dank ihrer fließfähigen und glänzenden Textur lässt sie sich mühelos auf Tellern und Gläsern auftragen und sorgt für eine gleichmäßige, appetitliche Präsentation. Ideal für professionelle Anwendungen in Cafés und Konditoreien, die Wert auf praktische Handhabung und stilvolle Dekorationen legen.

Einsatzbereiche
– Dessert- und Tortendekoration
– Eiscreme- und Waffelpräsentationen
– Milkshake- und Getränkegarnituren
– Café- und Konditoreikarten

Highlights
– Intensives und ausgewogenes Schokoladenaroma
– Fließende, glänzende Dekorsaucen-Konsistenz
– Leicht anzuwendende Formel
– 750 g Verpackung`,

    ar: `تم تطوير صوص تزيين بنكهة الشوكولاتة من فو 750 جم لإضفاء مذاق غني ومظهر جمالي راقٍ على تقديمات الحلويات والمشروبات بفضل نكهة الشوكولاتة الغنية والمتوازنة. بفضل قوامه الانسيابي واللامع، ينسكب بسهولة لتزيين الأطباق والأكواب، مما يوفر تقديمات متجانسة وشهية. مثالي للتطبيقات الاحترافية في المقاهي ومحلات الحلويات التي تستهدف الاستخدام العملي والديكورات الأنيقة.

مجالات الاستخدام
– تزيين الحلويات والكيك
– تقديمات الآيس كريم والوافل
– تزيين الميلك شيك والمشروبات
– قوائم المقاهي ومحلات الحلويات

أبرز الميزات
– نكهة شوكولاتة غنية ومتوازنة
– قوام انسيابي ولامع لصوص التزيين
– تركيبة سهلة الاستخدام والتطبيق
– عبوة سعة 750 جم`
  };

  const { data: existingP } = await supabase
    .from('urunler')
    .select('teknik_ozellikler')
    .eq('id', pId)
    .single();

  const currentTeknik = existingP?.teknik_ozellikler || {};
  const updatedTeknik = {
    ...currentTeknik,
    vegan: true,
    vegetarisch: true,
    glutenfrei: true,
    laktosefrei: true,
    geschmack: ['çikolata', 'chocolate', 'schokolade', 'شوكولاتة'],
    birim_agirlik_g: 750,
    net_agirlik_gram: 750,
    net_agirlik_g: 750,
    net_agirlik_kg: 0.75
  };

  const updateRes = await supabase
    .from('urunler')
    .update({
      ad,
      aciklamalar,
      birim_agirlik_kg: 0.75,
      teknik_ozellikler: updatedTeknik
    })
    .eq('id', pId);

  if (updateRes.error) {
    console.error('Error updating product:', updateRes.error);
  } else {
    console.log('FO Çikolata Aromalı Dekor Sos 750 gr updated successfully!');
  }
}

runUpdates().catch(console.error);
