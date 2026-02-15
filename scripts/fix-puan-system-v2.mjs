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
const KATEGORI_BASE_PUAN = {
  'A': 85,
  'B': 65,
  'C': 45,
  'D': 20
};

const KATEGORI_ARALIK = {
  'A': { min: 80, max: 100 },
  'B': { min: 60, max: 79 },
  'C': { min: 40, max: 59 },
  'D': { min: 1, max: 39 }
};

// Etiket puan tablosu
const ETIKET_PUANLARI = {
  '#Yüksek_Sirkülasyon': 15,
  '#Vitrin_Boş': 15,
  '#Türk_Sahibi': 8,
  '#Yeni_Açılış': 8,
  '#Lüks_Mekan': 5,
  '#Teraslı': 5,
  '#Mutfak_Yok': 5,
  '#Kendi_Üretimi': -10
};

function hesaplaPuan(kategori, etiketler) {
  // Base puan al
  let basePuan = KATEGORI_BASE_PUAN[kategori] || 50;
  let toplamPuan = basePuan;

  // Etiketlerden puan ekle
  if (Array.isArray(etiketler)) {
    for (const etiket of etiketler) {
      const etiketPuan = ETIKET_PUANLARI[etiket];
      if (etiketPuan !== undefined) {
        toplamPuan += etiketPuan;
      }
    }
  }

  // Kategori aralığını aşmaması gerekli
  const aralik = KATEGORI_ARALIK[kategori];
  if (aralik) {
    toplamPuan = Math.max(aralik.min, Math.min(aralik.max, toplamPuan));
  }

  return toplamPuan;
}

function mapKategorieToOncelik(kategori) {
  // D kategorisini C'ye map et (çünkü oncelik CHECK (oncelik IN ('A', 'B', 'C')))
  if (kategori === 'D') return 'C';
  return kategori;
}

async function fixPuanSystemV2() {
  console.log('🔧 Puan Sistemi Düzeltiliyor (Kategori-Based v2)...\n');
  console.log('ℹ️  NOT: Oncelik alanı constraint nedeniyle D değerini KABUL ETMEDİĞİ için:');
  console.log('    D kategorisine sahip firmalar oncelik=C olarak ayarlanacak,');
  console.log('    ancak oncelik_puani D kategorisinin puanı (1-39) alacak.\n');

  try {
    // Tüm firmalar getir
    const { data: firmalar, error: fetchError } = await supabase
      .from('firmalar')
      .select('id, unvan, kategori, oncelik, oncelik_puani, etiketler');

    if (fetchError) {
      console.error('❌ Firmalar getirme hatası:', fetchError);
      return;
    }

    console.log(`📊 Toplam firma: ${firmalar?.length || 0}\n`);

    const updates = [];
    const mismatches = [];

    // Tüm firmaları kontrol et
    for (const firma of firmalar || []) {
      const dogruOncelik = mapKategorieToOncelik(firma.kategori);
      const dogruPuan = hesaplaPuan(firma.kategori, firma.etiketler);
      
      let needsUpdate = false;
      
      if (firma.oncelik !== dogruOncelik) {
        needsUpdate = true;
      }
      
      if (firma.oncelik_puani !== dogruPuan) {
        needsUpdate = true;
      }

      if (needsUpdate) {
        mismatches.push({
          unvan: firma.unvan,
          kategori: firma.kategori,
          oncekiOncelik: firma.oncelik,
          dogruOncelik: dogruOncelik,
          oncekiPuan: firma.oncelik_puani,
          dogruPuan: dogruPuan,
          etiketler: firma.etiketler
        });

        updates.push({
          id: firma.id,
          oncelik: dogruOncelik,
          oncelik_puani: dogruPuan
        });
      }
    }

    if (mismatches.length === 0) {
      console.log('✅ Tüm firmalar doğru durumda! Hiçbir düzeltme gerekmedi.\n');
      return;
    }

    console.log(`⚠️  ${mismatches.length} firma düzeltilmesi gerekiyor:\n`);
    
    // Uyumsuzlukları göster
    for (const m of mismatches.slice(0, 10)) {
      console.log(`📍 ${m.unvan}`);
      console.log(`   Kategori: ${m.kategori}`);
      console.log(`   Oncelik: ${m.oncekiOncelik || 'null'} → ${m.dogruOncelik}`);
      console.log(`   Puan: ${m.oncekiPuan} → ${m.dogruPuan}`);
      if (m.etiketler && m.etiketler.length > 0) {
        console.log(`   Etiketler: ${m.etiketler.join(', ')}`);
      }
      console.log();
    }

    if (mismatches.length > 10) {
      console.log(`... ve ${mismatches.length - 10} tane daha\n`);
    }

    // Toplu güncelleme
    console.log('🔄 Güncelleme yapılıyor...\n');
    let updateCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      const { error } = await supabase
        .from('firmalar')
        .update({
          oncelik: update.oncelik,
          oncelik_puani: update.oncelik_puani
        })
        .eq('id', update.id);

      if (error) {
        console.error(`❌ Hata [${update.unvan}]:`, error.message);
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
    
    const { data: updated, error: verifyError } = await supabase
      .from('firmalar')
      .select('id, unvan, kategori, oncelik, oncelik_puani, etiketler')
      .in('id', updates.map(u => u.id));

    if (verifyError) {
      console.error('❌ Doğrulama hatası:', verifyError);
      return;
    }

    let allCorrect = true;
    let correctCount = 0;

    for (const firma of updated || []) {
      const dogruOncelik = mapKategorieToOncelik(firma.kategori);
      const dogruPuan = hesaplaPuan(firma.kategori, firma.etiketler);
      
      const isCorrect = firma.oncelik === dogruOncelik && firma.oncelik_puani === dogruPuan;
      
      if (isCorrect) {
        correctCount++;
      } else {
        console.log(`⚠️  ${firma.unvan}: k=${firma.kategori}, o=${firma.oncelik} (${dogruOncelik}), p=${firma.oncelik_puani} (${dogruPuan})`);
        allCorrect = false;
      }
    }

    console.log(`✓ Doğrulanan: ${correctCount}/${updates.length}`);
    
    if (allCorrect) {
      console.log('✅ Tüm düzeltmeler başarıyla doğrulandı!');
    } else {
      console.log('⚠️  Bazı düzeltmelerde sorun var');
    }

  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error);
  }
}

fixPuanSystemV2();
