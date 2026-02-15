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

const targetFirmas = [
  'Argana Köln Kalk (Marokkanish)',
  'YE',
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

async function checkTargetFirmas() {
  console.log('🔍 Kullanıcı tarafından belirtilen firmaları kontrol ediliyor...\n');

  try {
    const { data: firmalar } = await supabase
      .from('firmalar')
      .select('id, unvan, kategori, oncelik, oncelik_puani');

    if (!firmalar) return;

    const expectedMapping = {
      'A': 'A',
      'B': 'B',
      'C': 'C',
      'D': 'C'
    };

    const results = [];
    
    for (const targetName of targetFirmas) {
      const firma = firmalar.find(f => 
        f.unvan.toLowerCase() === targetName.toLowerCase() ||
        f.unvan.toLowerCase().includes(targetName.toLowerCase().split('(')[0].trim())
      );

      if (firma) {
        const expectedOncelik = expectedMapping[firma.kategori];
        const isMatch = firma.oncelik === expectedOncelik;
        
        results.push({
          unvan: firma.unvan,
          kategori: firma.kategori,
          oncelik: firma.oncelik,
          expectedOncelik: expectedOncelik,
          match: isMatch,
          puani: firma.oncelik_puani
        });
      } else {
        results.push({
          unvan: targetName,
          kategori: '?',
          oncelik: '?',
          expectedOncelik: '?',
          match: false,
          puani: '?',
          notFound: true
        });
      }
    }

    // Uyumsuzlukları göster
    console.log('📋 Kontrol Sonuçları:\n');
    const mismatches = results.filter(r => !r.match);
    
    for (const r of results) {
      const status = r.notFound ? '❌ BULUNAMADI' : (r.match ? '✅' : '⚠️');
      console.log(`${status} ${r.unvan}`);
      if (!r.notFound) {
        console.log(`   Kategori: ${r.kategori}, Oncelik: ${r.oncelik} ${!r.match ? `→ ${r.expectedOncelik}` : ''}, Puan: ${r.puani}`);
      }
    }

    console.log(`\n📊 Özet:`);
    console.log(`   Toplam: ${results.length}`);
    console.log(`   Uyumsuzluk: ${mismatches.length}`);
    console.log(`   Bulunamayan: ${results.filter(r => r.notFound).length}`);

  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

checkTargetFirmas();
