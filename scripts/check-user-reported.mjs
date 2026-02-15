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

const userList = [
  'OSMAN 30',
  'Cahidem Cologne',
  'Tarz Lounge',
  'Vera Restaurant & Cafe',
  'Kompis Shisha Bar & Lounge',
  'Emessa Cafe & Restaurant (Suriye Restorani)',
  'EMPIRE ONE',
  'Ottoman Köln',
  'Shisha Bar Derwisch Orienthaus',
  'Makara',
  'Imperial Shisha Lounge',
  'Smoke Nation Restobar',
  'Mantikor',
  'Numinos',
  'Sterling Lounge',
  'Bogletti',
  'Mason\'s'
];

async function checkUserReportedFirmas() {
  console.log('🔍 Kullanıcının Rapor Ettiği Firmaları Kontrol Et\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Tüm firmalardan sorgu yap
    const { data: allFirmas } = await supabase
      .from('firmalar')
      .select('id, unvan, kategori, oncelik, oncelik_puani');

    if (!allFirmas) return;

    const results = [];
    
    for (const userFirmaName of userList) {
      // Eşleşme - tam veya partial match
      const firma = allFirmas.find(f => 
        f.unvan.toLowerCase() === userFirmaName.toLowerCase() ||
        f.unvan.toLowerCase().includes(userFirmaName.toLowerCase().split('(')[0].trim())
      );

      if (firma) {
        const isMatch = (firma.kategori === 'C' && firma.oncelik === 'C') ||
                       (firma.kategori === 'D' && firma.oncelik === 'C');
        
        results.push({
          unvan: firma.unvan,
          kategori: firma.kategori,
          oncelik: firma.oncelik,
          puani: firma.oncelik_puani,
          match: isMatch
        });
      } else {
        results.push({
          unvan: userFirmaName,
          notFound: true
        });
      }
    }

    // Uyumsuzlukları göster
    const mismatches = results.filter(r => !r.match && !r.notFound);
    
    console.log(`📊 Toplam: ${results.length}`);
    console.log(`   ✅ Doğru: ${results.filter(r => r.match).length}`);
    console.log(`   ⚠️  Hata: ${mismatches.length}`);
    console.log(`   ❌ Bulunamadı: ${results.filter(r => r.notFound).length}\n`);

    if (mismatches.length > 0) {
      console.log('⚠️  UYUMSUZLUKLAR:\n');
      for (const r of mismatches) {
        console.log(`  ${r.unvan}`);
        console.log(`    Kategori: ${r.kategori}, Oncelik: ${r.oncelik} (C olmalı), Puan: ${r.puani}`);
      }
    } else {
      console.log('✅ Listedeki tüm firmalar DOĞRU durumda!');
    }

    console.log('\n───────────────────────────────────────────────────────\n');
    console.log('📋 DETYL LİSTE:\n');
    
    for (const r of results) {
      if (r.notFound) {
        console.log(`❌ ${r.unvan} (BULUNAMADI)`);
      } else {
        const status = r.match ? '✅' : '⚠️';
        console.log(`${status} ${r.unvan}`);
        console.log(`   K=${r.kategori}, O=${r.oncelik}, P=${r.puani}`);
      }
    }

  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

checkUserReportedFirmas();
