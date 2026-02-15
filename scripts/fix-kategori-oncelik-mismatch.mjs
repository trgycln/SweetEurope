import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

async function findKategoriOncelikMismatch() {
  console.log('🔍 Kategori ile Oncelik uyumsuzluğu aranıyor...\n');

  try {
    // Tüm firmalar getir
    const { data: firmalar, error } = await supabase
      .from('firmalar')
      .select('id, unvan, kategori, oncelik');

    if (error) {
      console.error('❌ Hata:', error);
      return;
    }

    console.log(`📊 Toplam firma: ${firmalar?.length || 0}\n`);

    // Kuralları tanımla
    const expectedMapping = {
      'A': 'A',
      'B': 'B',
      'C': 'C',
      'D': 'C'  // D kategorisine C atanır (constraint nedeniyle)
    };

    // Uyumsuzlukları bul
    const mismatches = [];

    for (const firma of firmalar || []) {
      const expectedOncelik = expectedMapping[firma.kategori];
      
      if (expectedOncelik && firma.oncelik !== expectedOncelik) {
        mismatches.push({
          id: firma.id,
          unvan: firma.unvan,
          kategori: firma.kategori,
          currentOncelik: firma.oncelik,
          expectedOncelik: expectedOncelik
        });
      }
    }

    if (mismatches.length === 0) {
      console.log('✅ Tüm firmalar kategori-oncelik uyumsuzluğu yok!\n');
      return;
    }

    console.log(`⚠️  ${mismatches.length} firma uyumsuzluğu bulundu:\n`);
    
    // Uyumsuzlukları göster (tümü)
    for (const m of mismatches) {
      console.log(`  ${m.unvan}`);
      console.log(`    Kategori: ${m.kategori}, Oncelik: ${m.currentOncelik} → ${m.expectedOncelik}`);
    }

    console.log(`\n🔄 Bu uyumsuzlukları düzeltmek istediğiniz onaylanıyor.\n`);

    // Toplu güncelleme
    let updateCount = 0;
    let errorCount = 0;

    for (const mismatch of mismatches) {
      const { error: updateError } = await supabase
        .from('firmalar')
        .update({ oncelik: mismatch.expectedOncelik })
        .eq('id', mismatch.id);

      if (updateError) {
        console.error(`❌ Hata [${mismatch.unvan}]:`, updateError.message);
        errorCount++;
      } else {
        updateCount++;
      }
    }

    console.log(`✅ Güncelleme tamamlandı:`);
    console.log(`   Başarılı: ${updateCount}`);
    console.log(`   Hata: ${errorCount}\n`);

    // Doğrulama
    console.log('🔍 Doğrulama yapılıyor...\n');
    
    const { data: updated } = await supabase
      .from('firmalar')
      .select('id, unvan, kategori, oncelik')
      .in('id', mismatches.map(m => m.id));

    let allCorrect = true;
    for (const firma of updated || []) {
      const expectedOncelik = expectedMapping[firma.kategori];
      if (firma.oncelik !== expectedOncelik) {
        console.log(`⚠️  ${firma.unvan}: kategori=${firma.kategori}, oncelik=${firma.oncelik} (beklenen: ${expectedOncelik})`);
        allCorrect = false;
      }
    }

    if (allCorrect) {
      console.log('✅ Tüm düzeltmeler başarıyla doğrulandı!');
    }

  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error);
  }
}

findKategoriOncelikMismatch();
