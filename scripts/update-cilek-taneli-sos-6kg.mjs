import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runUpdates() {
  console.log('--- Updating FO Çilek Taneli Sos 6 kg ---');
  
  const pId = 'c46b20ac-e0ed-4674-8f3e-1def14c08331';

  const ad = {
    tr: 'FO Çilek Taneli Sos 6 kg',
    en: 'FO Strawberry Fruited Sauce 6 kg',
    de: 'FO Fruchtige Erdbeersauce mit Fruchtstücken 6 kg',
    ar: 'صوص قطع الفراولة الطبيعية فو 6 كجم'
  };

  const aciklamalar = {
    tr: `FO Çilek Taneli Sos 6 kg, çileğin tatlı ve ferah aroması ile gerçek meyve tanelerini bir araya getirerek tatlı ve pastacılık uygulamalarında zengin bir lezzet ve doku sunmak için geliştirilmiştir. Yoğun kıvamı ve meyve parçacıklı yapısı sayesinde tatlılarda homojen dağılım ve dikkat çekici bir sunum sağlar. Pastane, kafe ve profesyonel mutfaklarda yüksek hacimli kullanım, standart kalite ve pratik servis hedefleyen uygulamalar için idealdir.

Kullanım Alanları
– Pasta ve tatlı dolguları
– Cheesecake ve tart uygulamaları
– Dondurma ve waffle sunumları
– Pastane ve profesyonel mutfaklar

Öne Çıkan Özellikler
– Gerçek çilek taneleri içeren yapı
– Tatlı ve ferah çilek aroması
– Yoğun ve akışkan sos kıvamı
– 6 kg ambalaj`,

    en: `FO Strawberry Fruited Sauce 6 kg is developed to provide a rich flavor and texture in dessert and pastry creations by pairing the sweet, refreshing aroma of strawberries with real fruit pieces. Thanks to its dense consistency and real fruit chunks, it ensures homogeneous distribution and striking visual appeal in desserts. Ideal for bakeries, cafes, and professional kitchens aiming for high-volume use, consistent quality, and practical service.

Areas of Use
– Cake and pastry fillings
– Cheesecake and tart toppings
– Ice cream and waffle presentations
– Bakeries and professional kitchens

Highlights
– Contains real strawberry pieces
– Sweet and refreshing strawberry flavor
– Dense yet fluid sauce consistency
– 6 kg professional packaging`,

    de: `Die FO Erdbeer-Fruchtsauce 6 kg verbindet das süße, frische Aroma sonnengereifter Erdbeeren mit echten Fruchtstücken, um Patisserie- und Dessertkreationen einen intensiven Geschmack und eine vollmundige Textur zu verleihen. Dank ihrer dichten Konsistenz und der saftigen Fruchtstücke garantiert sie eine gleichmäßige Verteilung und eine appetitliche Präsentation. Ideal für Konditoreien, Bäckereien, Cafés und Profiküchen, die auf rationelle Großgebinde, verlässliche Spitzenqualität und einfachen Service setzen.

Einsatzbereiche
– Kuchen- und Dessertfüllungen
– Cheesecake- und Tarte-Toppings
– Eiscreme- und Waffelpräsentationen
– Konditoreien und Profiküchen

Highlights
– Enthält echte saftige Erdbeerstücke
– Süßes und frisches Erdbeeraroma
– Dichte und zugleich fließfähige Konsistenz
– 6 kg Großverpackung für Profis`,

    ar: `تم تطوير صوص قطع الفراولة من فو 6 كجم ليجمع بين نكهة الفراولة الحلوة والمنعشة وقطع الفاكهة الطبيعية الحقيقية، مما يمنح الحلويات والمخبوزات مذاقاً غنياً وقواماً مميزاً. بفضل قوامه الكثيف واحتوائه على قطع الفاكهة، يضمن توزيعاً متجانساً وعرضاً جذاباً في مختلف أطباق الحلويات. مثالي لمحلات الحلويات والمقاهي والمطابخ المهنية التي تبحث عن الاستخدام عالي الحجم، والجودة القياسية، وسرعة وسهولة التقديم.

مجالات الاستخدام
– حشوات الكيك والحلويات
– تطبيقات التشيز كيك والتارت
– تقديمات الآيس كريم والوافل
– محلات الحلويات والمطابخ الاحترافية

أبرز الميزات
– يحتوي على قطع وحبوب الفراولة الطبيعية
– نكهة فراولة حلوة ومنعشة
– قوام صوص كثيف وانسيابي
– عبوة مهنية سعة 6 كجم`
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
    geschmack: ['çilek', 'strawberry', 'erdbeere', 'فراولة'],
    birim_agirlik_g: 6000,
    net_agirlik_gram: 6000,
    net_agirlik_g: 6000,
    net_agirlik_kg: 6.0
  };

  const updateRes = await supabase
    .from('urunler')
    .update({
      ad,
      aciklamalar,
      birim_agirlik_kg: 6.0,
      teknik_ozellikler: updatedTeknik
    })
    .eq('id', pId);

  if (updateRes.error) {
    console.error('Error updating strawberry fruited sauce:', updateRes.error);
  } else {
    console.log('FO Çilek Taneli Sos 6 kg updated successfully!');
  }

  console.log('\n--- Fixing weights for all other 6kg sauces ---');
  const other6kgSauces = [
    { id: '00eb5ff5-91b3-40dd-bab6-6d237a8c767e', name: 'Vişne Taneli Sos 6 Kg' },
    { id: '8df8fedd-e91e-4abc-bf5f-3e7007a1eb45', name: 'Frambuaz Taneli Sos 6 Kg' },
    { id: '7fbddec8-675d-495c-9230-ac4db2f0076b', name: 'Şeftali Taneli Sos 6 Kg' },
    { id: '41e92134-8afb-4288-ad01-72b24ca37a4a', name: 'Orman Meyveli Taneli Sos 6 Kg' },
    { id: 'ffca2b58-0cd8-49c0-acb4-b7888392116d', name: 'Yaban Mersini Taneli Sos 6 Kg' },
    { id: 'ce6113b0-9ebc-4f8b-bd2a-03d515de48fb', name: 'Dubai Antep Fıstıklı Kadayıflı Sos 6 kg' }
  ];

  for (const item of other6kgSauces) {
    const { data: p } = await supabase.from('urunler').select('id, ad, birim_agirlik_kg, teknik_ozellikler').eq('id', item.id).single();
    if (p) {
      const pTeknik = p.teknik_ozellikler || {};
      const updatedP = {
        ...pTeknik,
        birim_agirlik_g: 6000,
        net_agirlik_gram: 6000,
        net_agirlik_g: 6000,
        net_agirlik_kg: 6.0
      };

      const { error } = await supabase
        .from('urunler')
        .update({
          birim_agirlik_kg: 6.0,
          teknik_ozellikler: updatedP
        })
        .eq('id', item.id);

      if (error) {
        console.error(`Error updating weight for ${item.name}:`, error);
      } else {
        console.log(`Updated weight to 6.0 kg (6000g) for: ${item.name}`);
      }
    }
  }

  console.log('\n--- All updates finished ---');
}

runUpdates().catch(console.error);
