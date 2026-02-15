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

async function fixRemainingIssues() {
  console.log('🔧 Son kalan sorunları düzelt\n');

  const fixes = [
    {
      id: 'f314f9c2-53cc-4dc2-8574-2e8bf2d01a8e',
      unvan: 'Argana Köln Kalk (Marokkanish)',
      kategori: 'C',
      oncelik: 'C',
      oncelik_puani: 45  // 65 → 45
    },
    {
      id: '493ebe23-3c48-4d20-b40f-9e6fa1db60aa',
      unvan: 'Berket Market',
      kategori: 'D',  // null → D (Market olduğu için)
      oncelik: 'C',   // D → C (constraint nedeniyle)
      oncelik_puani: 20
    }
  ];

  console.log(`💾 ${fixes.length} firma düzeltiliyor...\n`);

  for (const fix of fixes) {
    console.log(`  🔄 ${fix.unvan}`);
    console.log(`     Kategori: ${fix.kategori}, Oncelik: ${fix.oncelik}, Puan: ${fix.oncelik_puani}`);

    const { error } = await supabase
      .from('firmalar')
      .update({
        kategori: fix.kategori,
        oncelik: fix.oncelik,
        oncelik_puani: fix.oncelik_puani
      })
      .eq('id', fix.id);

    if (error) {
      console.log(`     ❌ HATA: ${error.message}`);
    } else {
      console.log(`     ✅ Başarılı`);
    }
  }

  console.log('\n✅ Düzeltme tamamlandı!');
  
  // Doğrula
  console.log('\n🔍 Doğrulama...\n');
  const { data: updated } = await supabase
    .from('firmalar')
    .select('id, unvan, kategori, oncelik, oncelik_puani')
    .in('id', fixes.map(f => f.id));

  for (const firma of updated || []) {
    const fix = fixes.find(f => f.id === firma.id);
    const ok = firma.kategori === fix.kategori && 
               firma.oncelik === fix.oncelik && 
               firma.oncelik_puani === fix.oncelik_puani;
    
    console.log(`  ${ok ? '✅' : '❌'} ${firma.unvan}: K=${firma.kategori} O=${firma.oncelik} P=${firma.oncelik_puani}`);
  }
}

fixRemainingIssues();
