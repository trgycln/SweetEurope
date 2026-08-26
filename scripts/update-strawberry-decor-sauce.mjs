import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runUpdates() {
  console.log('--- Starting Update for FO Çilek Aromalı Dekor Sos 750 gr ---');
  
  const strawberryId = 'fbb3ce44-1950-4ed2-b7a5-21718fc48436';

  const strawberryAd = {
    tr: 'FO Çilek Aromalı Dekor Sos 750 gr',
    en: 'FO Strawberry Flavored Decor Sauce 750 g',
    de: 'FO Dekorationssauce mit Erdbeergeschmack 750 g',
    ar: 'صوص تزيين بنكهة الفراولة فو 750 جم'
  };

  const strawberryAciklamalar = {
    tr: `FO Çilek Aromalı Dekor Sos 750 gr, taze çilek aromasını yoğun ve tatlı bir lezzetle birleştirerek tatlı ve dondurma sunumlarına canlılık ve görsellik kazandırmak için geliştirilmiştir. Akışkan yapısı sayesinde kolay dökülür, yüzeyde homojen şekilde yayılır ve dekoratif uygulamalarda profesyonel sonuçlar sağlar. Kafe, pastane ve ev mutfaklarında pratik kullanım için idealdir.

Kullanım Alanları
– Dondurma ve frozen ürünler
– Pasta ve kek süslemeleri
– Waffle, pancake ve krep dekorları
– Tatlı tabakları ve kup sunumları
– Kokteyl ve smoothie üst süslemeleri

Öne Çıkan Özellikler
– Canlı ve tatlı çilek aroması
– Akışkan ve parlak sos kıvamı
– Kolay dökülebilen ve homojen yapı
– Görsel olarak çekici ve kalıcı lezzet
– 750 gr ambalaj`,

    en: `FO Strawberry Flavored Decor Sauce 750 g is specially crafted to combine fresh strawberry flavor with rich sweetness, adding vibrant color and elegance to dessert and ice cream presentations. Thanks to its smooth, fluid texture, it pours effortlessly, spreads evenly across surfaces, and delivers professional results in decorative applications. Ideal for practical use in cafes, bakeries, and home kitchens.

Areas of Use
– Ice cream and frozen desserts
– Cake and pastry decorating
– Waffles, pancakes, and crepes topping
– Dessert plates and sundae cups
– Cocktails and smoothie garnishes

Highlights
– Vibrant and sweet strawberry aroma
– Fluid and glossy sauce consistency
– Easy-to-pour and homogeneous texture
– Visually appealing and lasting flavor
– 750 g bottle`,

    de: `Die FO Erdbeer-Dekorsauce 750 g vereint das fruchtige Aroma frischer Erdbeeren mit einer intensiven Süße, um Desserts und Eiskreationen Frische und ein ansprechendes Aussehen zu verleihen. Dank ihrer fließfähigen Textur lässt sie sich mühelos dosieren, verteilt sich homogen auf der Oberfläche und sorgt für professionelle Ergebnisse bei dekorativen Anwendungen. Ideal für den praktischen Einsatz in Cafés, Konditoreien und der heimischen Küche.

Einsatzbereiche
– Eiscreme und Frozen-Desserts
– Torten- und Kuchendekoration
– Waffel-, Pancake- und Crêpe-Toppings
– Dessertteller und Eisbecher-Präsentationen
– Cocktail- und Smoothie-Garnituren

Highlights
– Lebendiges und süßes Erdbeeraroma
– Fließende und glänzende Konsistenz
– Leicht zu dosieren und homogene Struktur
– Optisch ansprechend mit langanhaltendem Geschmack
– 750 g Verpackung`,

    ar: `تم تطوير صوص تزيين بنكهة الفراولة من فو 750 جم ليجمع بين نكهة الفراولة الطازجة والمذاق الحلو الغني، مما يضفي حيوية وجاذبية بصرية على تقديمات الحلويات والآيس كريم. بفضل قوامه الانسيابي، ينسكب بسهولة ويتوزع بشكل متجانس على الأسطح، مما يوفر نتائج احترافية في تطبيقات التزيين والديكور. مثالي للاستخدام العملي في المقاهي ومحلات الحلويات والمطابخ المنزلية.

مجالات الاستخدام
– الآيس كريم والحلويات المجمدة
– تزيين الكيك والتورتات والمعجنات
– تزيين الوافل والبان كيك والكريب
– أطباق الحلويات وكؤوس التقديم
– تزيين الكوكتيلات والعصائر (السموذي)

أبرز الميزات
– نكهة ورائحة فراولة منعشة وحلوة
– قوام انسيابي ولامع
– سهل السكب وذو بنية متجانسة
– مظهر جذاب ونكهة غنية تدوم طويلاً
– عبوة عملية سعة 750 جم`
  };

  const { data: existingStrawberry } = await supabase
    .from('urunler')
    .select('teknik_ozellikler')
    .eq('id', strawberryId)
    .single();

  const currentTeknik = existingStrawberry?.teknik_ozellikler || {};
  const updatedStrawberryTeknik = {
    ...currentTeknik,
    vegan: true,
    vegetarisch: true,
    glutenfrei: true,
    laktosefrei: true,
    ohne_zucker: false,
    geschmack: ['çilek', 'strawberry', 'erdbeere', 'فراولة'],
    birim_agirlik_g: 750,
    net_agirlik_gram: 750,
    net_agirlik_g: 750,
    net_agirlik_kg: 0.75
  };

  const strawberryUpdateRes = await supabase
    .from('urunler')
    .update({
      ad: strawberryAd,
      aciklamalar: strawberryAciklamalar,
      birim_agirlik_kg: 0.75,
      teknik_ozellikler: updatedStrawberryTeknik
    })
    .eq('id', strawberryId);

  if (strawberryUpdateRes.error) {
    console.error('Error updating strawberry sauce:', strawberryUpdateRes.error);
  } else {
    console.log('FO Çilek Aromalı Dekor Sos 750 gr updated successfully!');
  }

  console.log('\n--- Checking and fixing weights for all 750g sauces ---');
  const sauce750Ids = [
    'c3029bf8-5bc5-4566-8d50-0e2ba3ab0ffb', // Çikolata Aromalı Dekor Sos 750 gr
    'fbb3ce44-1950-4ed2-b7a5-21718fc48436', // Çilek Aromalı Dekor Sos 750 gr
    'd3a65dda-d82a-4e54-816d-8751d3cab9a1', // FO Akçaağaç Aromalı Dekor Sos 750 gr
    '561da504-fbf0-4573-93b5-cc7580f8cca7', // Karamel Aromalı Dekor Sos 750 gr
    '89b956c8-42d3-46e0-ba53-589887a71d47', // Vanilya Aromalı Dekor Sos 750 gr
    'ee1b3744-74d5-4bdd-9841-a8c5ad52b094', // Muz Aromalı Dekor Sos 750 gr
    '12a44a2c-019d-4c44-b4f7-3cbde0c7fded', // Turunç Aromalı Dekor Sos 750 gr
    '22a36ec6-b799-4065-b6ce-c7458f7fbacb'  // Kivi Aromalı Dekor Sos 750 gr
  ];

  for (const id of sauce750Ids) {
    const { data: p } = await supabase.from('urunler').select('id, ad, birim_agirlik_kg, teknik_ozellikler').eq('id', id).single();
    if (p) {
      const pTeknik = p.teknik_ozellikler || {};
      const updatedP = {
        ...pTeknik,
        birim_agirlik_g: 750,
        net_agirlik_gram: 750,
        net_agirlik_g: 750,
        net_agirlik_kg: 0.75
      };

      const { error } = await supabase
        .from('urunler')
        .update({
          birim_agirlik_kg: 0.75,
          teknik_ozellikler: updatedP
        })
        .eq('id', id);

      if (error) {
        console.error(`Error updating weight for ${p.ad?.tr} (${id}):`, error);
      } else {
        console.log(`Updated weight to 0.75 kg (750g) for: ${p.ad?.tr}`);
      }
    }
  }

  console.log('\n--- All updates finished ---');
}

runUpdates().catch(console.error);
