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

async function checkProblematicFirmas() {
  console.log('🔍 Sorunlu firmaların detaylarını kontrol et\n');

  const { data } = await supabase
    .from('firmalar')
    .select('*')
    .or('unvan.ilike.%Argana%,kategori.is.null');

  if (!data) return;

  for (const firma of data) {
    console.log(`📍 ${firma.unvan}`);
    console.log(`   ID: ${firma.id}`);
    console.log(`   Kategori: ${firma.kategori}`);
    console.log(`   Oncelik: ${firma.oncelik}`);
    console.log(`   Puan: ${firma.oncelik_puani}`);
    console.log(`   Etiketler: ${firma.etiketler ? firma.etiketler.join(', ') : 'yok'}`);
    console.log();
  }
}

checkProblematicFirmas();
