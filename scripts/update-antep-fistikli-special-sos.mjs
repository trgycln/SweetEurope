import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runUpdates() {
  console.log('--- Updating FO Antep Fıstıklı Special Sos 940 gr (%5) ---');
  
  const pId = 'e3b8c6ff-fcf2-4552-b58a-3a616b979a8b';

  const ad = {
    tr: 'FO Antep Fıstıklı Special Sos 940 gr (%5)',
    en: 'FO Pistachio Special Sauce 940 g (5%)',
    de: 'FO Pistazien-Spezialsauce 940 g (5%)',
    ar: 'صوص الفستق الحلبي الخاص فو 940 جم (5%)'
  };

  const aciklamalar = {
    tr: `FO Antep Fıstıklı Special Sos 940 gr (%5), daha hafif antep fıstığı aromasıyla tatlı ve pastacılık tariflerinde dengeli bir lezzet sunar. Dolgu, kaplama ve dekor amaçlı kullanımlarda tarifin ana lezzetini bastırmadan destekleyici bir aroma sağlar. Günlük üretim yapan pastane ve kafeler için idealdir.

Kullanım Alanları
– Pasta ve tatlı dolguları
– Krema ve sos bazlı tarifler
– Pastane ve kafe uygulamaları

Öne Çıkan Özellikler
– %5 antep fıstık aroması
– Dengeli ve hafif lezzet profili
– 940 gr ambalaj
– Günlük profesyonel kullanıma uygun`,

    en: `FO Pistachio Special Sauce 940 g (5%) offers a harmonious taste in dessert and pastry recipes with its subtle pistachio aroma. In filling, coating, and decorative applications, it provides a gentle complementary flavor without overpowering the main dessert profile. Ideal for bakeries, patisseries, and cafes in daily professional production.

Areas of Use
– Cake and dessert fillings
– Cream and sauce-based recipes
– Patisserie and cafe creations

Highlights
– 5% pistachio aroma profile
– Balanced and mild flavor profile
– 940 g bottle
– Suitable for daily professional use`,

    de: `Die FO Pistazien-Spezialsauce 940 g (5%) bietet mit ihrem feinen Pistazienaroma einen ausgewogenen Geschmack für feine Desserts und Gebäckkreationen. Bei der Verwendung als Füllung, Glasur oder Dekoration sorgt sie für eine harmonische Geschmacksnote, ohne den Hauptgeschmack des Rezepts zu überdecken. Ideal für Konditoreien, Bäckereien und Cafés im täglichen professionellen Einsatz.

Einsatzbereiche
– Kuchen- und Dessertfüllungen
– Cremes und saucenbasierte Rezepturen
– Patisserie- und Café-Anwendungen

Highlights
– 5% Pistazienaroma
– Ausgewogenes und mildes Geschmacksprofil
– 940 g Verpackung
– Ideal für den täglichen professionellen Einsatz`,

    ar: `يقدم صوص الفستق الحلبي الخاص من فو 940 جم (5%) نكهة متوازنة في وصفات الحلويات والمعجنات بفضل نكهة الفستق اللطيفة والخفيفة. يوفر نكهة داعمة ومكملة دون أن تطغى على المذاق الأساسي للحلويات، سواء تم استخدامه للحشو أو التغطية أو التزيين. مثالي للمخابز ومحلات الحلويات والمقاهي في الإنتاج اليومي الاحترافي.

مجالات الاستخدام
– حشوات الكيك والحلويات
– وصفات الكريمة وقواعد الصوص
– تطبيقات المعجنات والمقاهي

أبرز الميزات
– تركيز 5% بنكهة الفستق الحلبي
– مذاق متوازن وخفيف
– عبوة سعة 940 جم
– مناسب للاستخدام المهني اليومي`
  };

  const { data: existingP } = await supabase
    .from('urunler')
    .select('teknik_ozellikler')
    .eq('id', pId)
    .single();

  const currentTeknik = existingP?.teknik_ozellikler || {};
  const updatedTeknik = {
    ...currentTeknik,
    vegan: false,
    vegetarisch: true,
    geschmack: ['antep fıstığı', 'pistachio', 'pistazie', 'فستق'],
    birim_agirlik_g: 940,
    net_agirlik_gram: 940,
    net_agirlik_g: 940,
    net_agirlik_kg: 0.94
  };

  const updateRes = await supabase
    .from('urunler')
    .update({
      ad,
      aciklamalar,
      birim_agirlik_kg: 0.94,
      teknik_ozellikler: updatedTeknik
    })
    .eq('id', pId);

  if (updateRes.error) {
    console.error('Error updating product:', updateRes.error);
  } else {
    console.log('FO Antep Fıstıklı Special Sos 940 gr (%5) updated successfully!');
  }

  console.log('\n--- Checking and fixing weights for other special sauces ---');
  const otherSauces = [
    { id: 'd2830d9b-b9ff-4594-9b6f-db5da307f217', weightKg: 0.94, weightG: 940, name: 'FO Antep Fıstıklı Special Sos 940 gr (%20)' },
    { id: '1eb128b1-1df5-4157-82e8-8cf2b638c596', weightKg: 0.94, weightG: 940, name: 'FO Speculoos Bisküvili Special Sos 940 gr' },
    { id: '4efd0ab0-01b8-4e94-b61a-40576c2c6bb0', weightKg: 1.0, weightG: 1000, name: 'FO Patlayan Şekerli Special Sos 1000 gr' }
  ];

  for (const item of otherSauces) {
    const { data: p } = await supabase.from('urunler').select('id, ad, birim_agirlik_kg, teknik_ozellikler').eq('id', item.id).single();
    if (p) {
      const pTeknik = p.teknik_ozellikler || {};
      const updatedP = {
        ...pTeknik,
        birim_agirlik_g: item.weightG,
        net_agirlik_gram: item.weightG,
        net_agirlik_g: item.weightG,
        net_agirlik_kg: item.weightKg
      };

      const { error } = await supabase
        .from('urunler')
        .update({
          birim_agirlik_kg: item.weightKg,
          teknik_ozellikler: updatedP
        })
        .eq('id', item.id);

      if (error) {
        console.error(`Error updating weight for ${item.name}:`, error);
      } else {
        console.log(`Updated weight to ${item.weightKg} kg (${item.weightG}g) for: ${item.name}`);
      }
    }
  }

  console.log('\n--- All updates finished ---');
}

runUpdates().catch(console.error);
