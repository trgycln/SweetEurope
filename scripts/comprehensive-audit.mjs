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

async function comprehensiveAudit() {
  console.log('🔍 KAPSAMLI SİSTEM AUDITÜ\n');
  console.log('════════════════════════════════════════════════════════\n');

  try {
    const { data: firmalar } = await supabase
      .from('firmalar')
      .select('id, unvan, kategori, oncelik, oncelik_puani, etiketler');

    if (!firmalar) return;

    console.log(`📊 Toplam firma: ${firmalar.length}\n`);

    const expectedMapping = {
      'A': 'A',
      'B': 'B',
      'C': 'C',
      'D': 'C'
    };

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
      let basePuan = KATEGORI_BASE_PUAN[kategori] || 50;
      let toplamPuan = basePuan;

      if (Array.isArray(etiketler)) {
        for (const etiket of etiketler) {
          const etiketPuan = ETIKET_PUANLARI[etiket];
          if (etiketPuan !== undefined) {
            toplamPuan += etiketPuan;
          }
        }
      }

      const aralik = KATEGORI_ARALIK[kategori];
      if (aralik) {
        toplamPuan = Math.max(aralik.min, Math.min(aralik.max, toplamPuan));
      }

      return toplamPuan;
    }

    // Tüm kontroller
    let oncelikMismatch = [];
    let puanMismatch = [];
    let allGood = [];

    for (const firma of firmalar) {
      const expectedOncelik = expectedMapping[firma.kategori];
      const expectedPuan = hesaplaPuan(firma.kategori, firma.etiketler);

      const oncelikOk = firma.oncelik === expectedOncelik;
      const puanOk = firma.oncelik_puani === expectedPuan;

      if (!oncelikOk && !puanOk) {
        // Her ikisi de yanlış
        oncelikMismatch.push({
          id: firma.id,
          unvan: firma.unvan,
          kategori: firma.kategori,
          currentOncelik: firma.oncelik,
          expectedOncelik,
          currentPuan: firma.oncelik_puani,
          expectedPuan,
          etiketler: firma.etiketler
        });
        puanMismatch.push({
          id: firma.id,
          unvan: firma.unvan,
          kategori: firma.kategori,
          currentPuan: firma.oncelik_puani,
          expectedPuan,
          etiketler: firma.etiketler
        });
      } else if (!oncelikOk) {
        oncelikMismatch.push({
          id: firma.id,
          unvan: firma.unvan,
          kategori: firma.kategori,
          currentOncelik: firma.oncelik,
          expectedOncelik,
          etiketler: firma.etiketler
        });
      } else if (!puanOk) {
        puanMismatch.push({
          id: firma.id,
          unvan: firma.unvan,
          kategori: firma.kategori,
          currentPuan: firma.oncelik_puani,
          expectedPuan,
          etiketler: firma.etiketler
        });
      } else {
        allGood.push(firma.unvan);
      }
    }

    // ONCELIK UYUMSUZLUKLARI
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`⚠️  ONCELIK UYUMSUZLUKLARI: ${oncelikMismatch.length}\n`);
    
    for (const m of oncelikMismatch) {
      console.log(`  ${m.unvan}`);
      console.log(`    Kategori: ${m.kategori}`);
      console.log(`    Oncelik: ${m.currentOncelik} → ${m.expectedOncelik}`);
      if (m.etiketler) console.log(`    Etiketler: ${m.etiketler.join(', ')}`);
    }

    // PUAN UYUMSUZLUKLARI
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`⚠️  PUAN UYUMSUZLUKLARI: ${puanMismatch.length}\n`);
    
    for (const m of puanMismatch) {
      console.log(`  ${m.unvan}`);
      console.log(`    Kategori: ${m.kategori}`);
      console.log(`    Puan: ${m.currentPuan} → ${m.expectedPuan}`);
      if (m.etiketler) console.log(`    Etiketler: ${m.etiketler.join(', ')}`);
    }

    // ÖZET
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 ÖZET:\n');
    console.log(`  ✅ Tamam: ${allGood.length}`);
    console.log(`  ⚠️  Oncelik Hatası: ${oncelikMismatch.length}`);
    console.log(`  ⚠️  Puan Hatası: ${puanMismatch.length}`);
    console.log(`  Total Hata: ${oncelikMismatch.length + puanMismatch.length}`);

  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

comprehensiveAudit();
