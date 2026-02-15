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

async function checkEtiketler() {
  console.log('🏷️  Etiketler yapısı kontrol ediliyor...\n');

  // Etiketleri kullanan firmalar kontrol et
  const { data: firmasWithTags, error } = await supabase
    .from('firmalar')
    .select('id, unvan, kategori, etiketler')
    .not('etiketler', 'is', null);

  if (error) {
    console.error('❌ Hata:', error);
    return;
  }

  console.log(`📊 Etiket içeren firma sayısı: ${firmasWithTags?.length || 0}\n`);
  
  if (firmasWithTags && firmasWithTags.length > 0) {
    console.log('Etiket örnekleri:');
    for (const firma of firmasWithTags.slice(0, 5)) {
      console.log(`  - ${firma.unvan}: ${JSON.stringify(firma.etiketler)}`);
    }
  }

  // Tüm unique etiketleri bul
  if (firmasWithTags && firmasWithTags.length > 0) {
    const allTags = new Set();
    for (const firma of firmasWithTags) {
      if (Array.isArray(firma.etiketler)) {
        firma.etiketler.forEach(tag => allTags.add(tag));
      }
    }
    
    console.log(`\n💡 Tüm unique etiketler (${allTags.size}):`);
    Array.from(allTags).sort().forEach(tag => {
      console.log(`  - ${tag}`);
    });
  }
}

checkEtiketler();
