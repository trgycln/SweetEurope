import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const dryRun = !process.argv.includes('--apply');

// Fiyatlandırma Kuralları
function determinePrice(productName) {
  const name = productName.toLowerCase();
  
  // 1. Anadolu Efsaneleri
  if (name.includes('afrodit') || name.includes('apollo') || name.includes('hera ') || name.includes('dionysos') || name.includes('zeus') || name.includes('helios') || name.includes('herakles') || name.includes('demeter') || name.includes('persephone') || name.includes('eros')) {
    if (name.includes('800') || name.includes('karışık meyveli içecek') || name.includes('karisik meyveli icecek')) {
      return 8.00;
    }
  }

  // 2. Özel Soslar (940gr) - Fıstık (Pistachio) Serisi
  if (name.includes('fıstık') || name.includes('fistik') || name.includes('pistachio')) {
    if (name.includes('6 kg') || name.includes('6kg')) {
      if (name.includes('kadaifi') || name.includes('kadayif') || name.includes('dubai')) return 110.40;
      if (name.includes('spread') || name.includes('krem') || name.includes('kreması')) return 124.89;
    }
    if (name.includes('1.4') || name.includes('1,4')) {
      if (name.includes('kadaifi') || name.includes('kadayif') || name.includes('dubai')) return 31.40;
    }
    // Fıstık sosları % oranlı (940g)
    if (name.includes('%20') || name.includes('% 20')) return 17.86;
    if (name.includes('%15') || name.includes('% 15')) return 14.49;
    if (name.includes('%10') || name.includes('% 10')) return 10.53;
    if (name.includes('%5') || name.includes('% 5')) return 6.96;
    if (name.includes('oil base') || name.includes('yağ bazlı')) return 13.66; // Normal fıstık oil base
    if (name.includes('verde') && (name.includes('oil base') || name.includes('yağ bazlı'))) return 14.75; // Verde oil base
    if (name.includes('940')) return 10.53; // default for pistachio 940g? let's stick to % matches
  }

  // 3. Profesyonel Cafe-Bar-Patiseri Sosları
  if (name.includes('çikolata sos') || name.includes('chocolate sauce') || name.includes('beyaz çikolata sos') || name.includes('white chocolate sauce')) {
    if (!name.includes('940') && !name.includes('750') && !name.includes('1 kg') && !name.includes('1kg')) {
      return 13.66; // 2.5kg varsayılan
    }
  }
  if ((name.includes('toffee caramel') || name.includes('toffe karamel')) && (name.includes('sauce') || name.includes('sos'))) {
    if (!name.includes('940') && !name.includes('750') && !name.includes('1 kg') && !name.includes('1kg')) {
      return 10.11; // 2.5kg varsayılan
    }
  }
  if ((name.includes('hazelnut') || name.includes('fındık')) && (name.includes('sauce') || name.includes('sos'))) {
    if (!name.includes('940') && !name.includes('750') && !name.includes('1 kg') && !name.includes('1kg')) {
      return 15.81; // 2.5kg varsayılan
    }
  }
  if ((name.includes('karamelize bisküvi') || name.includes('caramelized biscuit')) && (name.includes('sauce') || name.includes('sos'))) {
    if (!name.includes('940') && !name.includes('750') && !name.includes('1 kg') && !name.includes('1kg')) {
      return 13.75; // 2.5kg varsayılan
    }
  }
  if (name.includes('bar-sauce') || name.includes('condenced milk') || name.includes('condensed milk')) {
    if (name.includes('2.5') || name.includes('2,5')) return 9.34;
    return 10.00; // FO Sweetened Condensed Milk Sauce 2.5 kg
  }

  // 4. Sürülebilir Kremler
  if (name.includes('spread') || name.includes('sürülebilir') || name.includes('krem') || name.includes('cream')) {
    if (name.includes('nummy') || name.includes('lotus')) {
      if (name.includes('6 kg') || name.includes('6kg')) return 44.85; // Caramelized biscuit
      if (name.includes('340')) return 3.17;
      if (name.includes('370')) {
        if (name.includes('çikolata') || name.includes('chocolate')) return 4.14;
        if (name.includes('kakaolu fındık') || name.includes('cocoa and hazelnut')) return 3.94;
        if (name.includes('karamelize bisküvi') || name.includes('caramelized biscuit')) return 3.45;
      }
    }
  }
  
  if (name.includes('çikolata krem') || name.includes('chocolate spread')) {
    if (name.includes('6 kg') || name.includes('6kg')) return 55.89;
  }

  // 5. Meyveli Soslar / Püreler
  if (name.includes('puree') || name.includes('püre') || name.includes('purée')) {
    if (name.includes('frozen') || name.includes('donuk')) {
      if (name.includes('yuzu')) return 3.50;
      return 5.60;
    }
  }
  if (name.includes('fruited sauce') || name.includes('meyveli sos')) {
    if (name.includes('1 kg') || name.includes('1kg')) {
      if (name.includes('çilek') || name.includes('strawberry')) return 3.82; // FO STRAWBEERY Fruited Sauce 1 KG
      if (name.includes('frambuaz') || name.includes('raspberry')) return 7.65;
    }
  }
  if (name.includes('fruited sauce') || name.includes('meyveli sos')) { // the other ones are 1kg ? (wait, the list says 3.82, 6.56, 2.81, 4.42, 6.43, etc)
      if (name.includes('black berry') || name.includes('böğürtlen')) return 6.56;
      if (name.includes('wild berries') || name.includes('orman meyve')) return 6.01;
      if (name.includes('pomegranate') || name.includes('nar')) return 6.01;
      if (name.includes('passion fruit') || name.includes('çarkıfelek')) return 6.01;
      if (name.includes('blueberry') || name.includes('yaban mersini')) return 8.74;
      if (name.includes('pineapple') || name.includes('ananas')) return 6.01;
      // All other fruited sauces:
      if (name.includes('kiwi') || name.includes('sour cherry') || name.includes('mango') || name.includes('melon') || name.includes('watermelon') || name.includes('peach') || name.includes('green apple') || name.includes('banana') || name.includes('lemon') || name.includes('coconut') || name.includes('mandarin') || name.includes('pumpkin')) {
         if (name.includes('mango')) return 6.01;
         return 3.82; // Wait, actually the 3.82 is 6 eur box price. The middle column is 3.82, right column is 2.81.
      }
  }

  // 6. Dondurma Sosları & Dekor Sosları
  if ((name.includes('dekor') || name.includes('topping')) && (name.includes('750'))) {
    if (name.includes('çikolata') || name.includes('chocolate')) return 2.42;
    if (name.includes('maple') || name.includes('akçaağaç')) return 2.25;
    return 1.98; // strawberry, caramel, kiwi, banana, vanilla, blue curacao
  }
  if (name.includes('dondurma sos') || name.includes('ice cream sauce')) {
    if (name.includes('çikolata') || name.includes('chocolate')) return 3.11;
    if (name.includes('karamel') || name.includes('caramel')) {
       if (name.includes('salted') || name.includes('tuzlu')) return 6.01;
       if (name.includes('milky') || name.includes('sütlü')) return 3.66;
       return 3.11;
    }
    if (name.includes('frambuaz') || name.includes('raspberry')) return 4.64;
    if (name.includes('kivi') || name.includes('kiwi')) return 3.66;
    if (name.includes('vişne') || name.includes('sour cherry')) return 3.11;
    if (name.includes('fındık') || name.includes('hazelnut')) return 5.18;
    if (name.includes('fıstık') || name.includes('pistachio')) {
      if (name.includes('verde') && name.includes('oil')) return 14.75;
      if (name.includes('oil')) return 13.66;
      return 7.21;
    }
    if (name.includes('muz') || name.includes('banana')) return 3.11;
    if (name.includes('portakal') || name.includes('orange')) return 3.11;
    if (name.includes('ceviz') || name.includes('walnut')) return 6.56;
    if (name.includes('kahve') || name.includes('coffee')) return 3.66;
    if (name.includes('böğürtlen') || name.includes('blackberry')) return 4.37;
    if (name.includes('kavun') || name.includes('melon')) return 3.11;
    if (name.includes('karpuz') || name.includes('watermelon')) return 3.11;
    if (name.includes('yeşil elma') || name.includes('green apple')) return 3.11;
    if (name.includes('karadut') || name.includes('black mulberry')) return 3.66;
    if (name.includes('limon') || name.includes('lemon')) return 3.66;
    if (name.includes('şeftali') || name.includes('peach')) return 3.11;
    if (name.includes('yaban mersini') || name.includes('blueberry')) return 4.37;
    if (name.includes('orman meyveleri') || name.includes('wild berries')) return 4.70;
    if (name.includes('mango')) return 3.11;
    if (name.includes('safran') || name.includes('saffron')) return 5.03;
    if (name.includes('gül') || name.includes('rose')) return 5.03;
    if (name.includes('blue velvet')) return 4.92;
    if (name.includes('red velvet')) return 6.56;
    return 3.11; // fallback
  }

  // 6.5 Toz İçecekler / Powder Drinks
  if (name.includes('matcha')) {
    return 7.65;
  }

  // 7. Simli Şuruplar
  if (name.includes('simli') || name.includes('silvery')) {
    return 3.50;
  }

  // 8. Premium Şuruplar
  if (name.includes('premium')) {
    if (name.includes('şurup') || name.includes('syrup')) {
      return 5.50;
    }
  }

  // 9. Şurup Bazları (Ice Tea & Kokteyl vb.)
  if (name.includes('baz') || name.includes('base')) {
    if (name.includes('ice tea') || name.includes('buzlu çay')) return 4.00;
    if (name.includes('sorrel') || name.includes('madam sorrel')) return 5.50;
    if (name.includes('mojito') || name.includes('mint & lime') || name.includes('küba nanesi')) return 3.65;
    return 2.73; // FO Mint and Lime Flavored Syrup (BASE) vb.
  }

  // 10. KOKTEYL MİXLERİ
  if (name.includes('mix') || name.includes('pina colada') || name.includes('margarita') || name.includes('blue hawai') || name.includes('cosmopolitan') || name.includes('sea garden')) {
    if (!name.includes('şurup') && !name.includes('syrup')) {
       return 2.38;
    }
  }

  // 11. Şuruplar (SYRUP / ŞURUP) - THE MAIN ISSUE
  if (name.includes('şurup') || name.includes('syrup') || name.includes('şurubu')) {
    
    // Şekerli (With Sugar) olanları kontrol et
    // Karamel, Vanilya, Fındık, Toffee Nut'ın "Şekerli" varyasyonları
    if (
      name.includes('şekerli') || 
      name.includes('with sugar')
    ) {
      if (
        name.includes('karamel') || name.includes('caramel') ||
        name.includes('vanilya') || name.includes('vanilla') ||
        name.includes('fındık') || name.includes('hazelnut') ||
        name.includes('toffee') || name.includes('toffe') ||
        name.includes('çilek') || name.includes('strawberry') ||
        name.includes('karpuz') || name.includes('watermelon') ||
        name.includes('kızılcık') || name.includes('cranberry') ||
        name.includes('tiramisu') || name.includes('antep fıstık') || name.includes('pistachio')
      ) {
        return 3.06;
      }
      return 3.06; // Eğer isimde 'şekerli' geçiyorsa genel olarak 3.06 atayalım. Çünkü bazılarının özel adı olabilir.
    }
    
    // Şekerli "olmayan" karamel, vanilya vs. 2.73'tür.
    // Geri kalan tüm normal şuruplar (Blue Curacao, Çilek, vs) 2.73'tür.
    
    // İstisna: Patlamış mısır (Popcorn) Şurubu -> PDF'te 6 € 3,06 € 2,25 diyor.
    if (name.includes('popcorn') || name.includes('patlamış mısır')) {
      return 3.06;
    }
    
    // İstisna: Limon Şurubu - Donuk Limonata -> PDF'te 6 € 3,00 € 2,21
    if (name.includes('donuk limonata') || name.includes('lemonade')) {
      return 3.00;
    }

    return 2.73; // Geri kalan normal kokteyl şurupları
  }

  return null; // Eşleşmeyenler
}

async function run() {
  console.log(`[FO Prices Update] Mode: ${dryRun ? 'DRY-RUN' : 'APPLY'}`);
  
  const { data: tedarikci } = await supabase.from('tedarikciler').select('id, unvan').ilike('unvan', '%Fo%').single();
  
  if (!tedarikci) {
    console.log('Fo tedarikcisi bulunamadi');
    return;
  }

  const { data: urunler } = await supabase.from('urunler')
    .select('id, ad, stok_kodu, ean_gtin, distributor_alis_fiyati')
    .eq('tedarikci_id', tedarikci.id);

  let updatedCount = 0;
  let skippedCount = 0;
  let noMatchCount = 0;
  
  const updates = [];

  for (const urun of urunler) {
    const adObj = urun.ad || {};
    const trName = adObj.tr || adObj.en || '';
    const enName = adObj.en || '';
    const fullName = `${trName} ${enName}`.trim();
    
    if (!fullName) continue;

    let targetPrice = determinePrice(fullName);
    
    // Some specific barcode checks from user's examples
    if (urun.ean_gtin === '8691123472908') { // Turunç Blue Curacao
      targetPrice = 2.73;
    }
    if (urun.ean_gtin === '8691123467799') { // Tiramisu Aromalı Şurup Şekerli
      targetPrice = 3.06;
    }
    
    if (targetPrice === null) {
      noMatchCount++;
      // console.log(`Eşleşemedi: ${trName}`);
      continue;
    }

    if (Math.abs((urun.distributor_alis_fiyati || 0) - targetPrice) > 0.001) {
      console.log(`[UPDATE] ${urun.ean_gtin || 'NO-BARCODE'} | ${trName} | Mevcut: ${urun.distributor_alis_fiyati} -> YENI: ${targetPrice}`);
      updates.push({
        id: urun.id,
        distributor_alis_fiyati: targetPrice,
      });
      updatedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`\nÖzet:`);
  console.log(`Toplam FO Ürünü: ${urunler.length}`);
  console.log(`Değişecek: ${updatedCount}`);
  console.log(`Aynı Kalan: ${skippedCount}`);
  console.log(`Eşleşemeyen: ${noMatchCount}`);

  if (!dryRun && updates.length > 0) {
    console.log('\nVeritabanı güncelleniyor...');
    let success = 0;
    let fail = 0;
    for (const update of updates) {
      const { error } = await supabase.from('urunler').update({ distributor_alis_fiyati: update.distributor_alis_fiyati }).eq('id', update.id);
      if (error) {
        console.error(`HATA (ID: ${update.id}):`, error);
        fail++;
      } else {
        success++;
      }
    }
    console.log(`Güncelleme tamamlandı. Başarılı: ${success}, Hatalı: ${fail}`);
  } else if (dryRun) {
    console.log('\nDRY-RUN mode. Veritabanına yazılmadı. Gerçek güncelleme için --apply parametresini ekleyin.');
  }
}

run();
