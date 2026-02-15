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

// Kategori -> Puan mapping'i
const PUANLAMA_ARALIK = {
  'A': 90,
  'B': 70,
  'C': 50,
  'D': 20
};

async function fixCategoriPuanMismatch() {
  console.log('🔍 Tüm firmalar kontrol ediliyor...\n');

  try {
    // Tüm firmalar getir
    const { data: firmalar, error: fetchError } = await supabase
      .from('firmalar')
      .select('id, unvan, kategori, oncelik_puani');

    if (fetchError) {
      console.error('❌ Firmalar getirme hatası:', fetchError);
      return;
    }

    console.log(`📊 Toplam firma sayısı: ${firmalar?.length || 0}\n`);

    const mismatches = [];
    const toUpdate = [];

    // Uyumsuzlukları bul
    for (const firma of firmalar || []) {
      const expectedPuan = PUANLAMA_ARALIK[firma.kategori];
      
      if (expectedPuan !== undefined && firma.oncelik_puani !== expectedPuan) {
        mismatches.push({
          id: firma.id,
          unvan: firma.unvan,
          kategori: firma.kategori,
          currentPuan: firma.oncelik_puani,
          expectedPuan: expectedPuan
        });
        
        toUpdate.push({
          id: firma.id,
          oncelik_puani: expectedPuan
        });
      }
    }

    if (mismatches.length === 0) {
      console.log('✅ Tüm firmalar doğru puanlara sahip! Hiçbir düzeltme gerekmedi.\n');
      return;
    }

    console.log(`⚠️  ${mismatches.length} firma uyumsuzluğu bulundu:\n`);
    
    // Uyumsuzlukları göster
    for (const m of mismatches) {
      console.log(`  📍 ${m.unvan}`);
      console.log(`     Kategori: ${m.kategori}`);
      console.log(`     Şu Puan: ${m.currentPuan} → Beklenen: ${m.expectedPuan}`);
      console.log();
    }

    // Kullanıcıdan onay al
    console.log('Bu uyumsuzlukları düzeltmek istediğiniz onaylanıyor...\n');

    // Toplu güncelleme
    let updateCount = 0;
    let errorCount = 0;

    for (const update of toUpdate) {
      const { error } = await supabase
        .from('firmalar')
        .update({ oncelik_puani: update.oncelik_puani })
        .eq('id', update.id);

      if (error) {
        console.error(`❌ Hata [${update.id}]:`, error.message);
        errorCount++;
      } else {
        updateCount++;
      }
    }

    console.log(`\n✅ Güncelleme tamamlandı:`);
    console.log(`   Başarılı: ${updateCount}`);
    console.log(`   Hata: ${errorCount}`);

    // Doğrulama
    console.log('\n🔍 Doğrulama yapılıyor...\n');
    
    const { data: updated, error: verifyError } = await supabase
      .from('firmalar')
      .select('id, unvan, kategori, oncelik_puani')
      .in('id', toUpdate.map(u => u.id));

    if (verifyError) {
      console.error('❌ Doğrulama hatası:', verifyError);
      return;
    }

    let allCorrect = true;
    for (const firma of updated || []) {
      const expectedPuan = PUANLAMA_ARALIK[firma.kategori];
      const isCorrect = firma.oncelik_puani === expectedPuan;
      
      if (!isCorrect) {
        console.log(`⚠️  ${firma.unvan}: ${firma.oncelik_puani} (Beklenen: ${expectedPuan})`);
        allCorrect = false;
      }
    }

    if (allCorrect) {
      console.log('✅ Tüm düzeltmeler doğrulandı!');
    } else {
      console.log('⚠️  Bazı düzeltmelerde sorun var');
    }

  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error);
  }
}

fixCategoriPuanMismatch();
