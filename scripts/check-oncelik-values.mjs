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

// Tüm unique oncelik değerlerini bul
async function checkOncelikValues() {
  console.log('🔍 Tüm unique "oncelik" değerleri kontrol ediliyor...\n');

  const { data: allData } = await supabase
    .from('firmalar')
    .select('unvan, kategori, oncelik');

  if (allData) {
    const uniqueValues = [...new Set(allData.map(f => f.oncelik))].sort();
    console.log(`📊 Unique "oncelik" değerleri: ${uniqueValues.join(', ')}`);
    
    // Her bir değerin sayısı
    for (const val of uniqueValues) {
      const count = allData.filter(f => f.oncelik === val).length;
      console.log(`   - "${val}": ${count} firma`);
    }
  }
}

checkOncelikValues();
