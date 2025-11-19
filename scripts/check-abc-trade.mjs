import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Eksik env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkABCTrade() {
  console.log('🔍 ABC Trade firmasi aranıyor...\n');

  // ABC Trade'i bul
  const { data: abcTrade, error } = await supabase
    .from('firmalar')
    .select('id, unvan, sahip_id, created_at')
    .ilike('unvan', '%ABC Trade%')
    .single();

  if (error) {
    console.error('❌ Hata:', error.message);
    return;
  }

  if (!abcTrade) {
    console.log('⚠️ ABC Trade bulunamadı!');
    return;
  }

  console.log('✅ ABC Trade bulundu:');
  console.log('   ID:', abcTrade.id);
  console.log('   Firma Adı:', abcTrade.unvan);
  console.log('   Sahip ID:', abcTrade.sahip_id);
  console.log('   Oluşturulma:', abcTrade.created_at);

  // Sahip bilgisini kontrol et
  if (abcTrade.sahip_id) {
    const { data: owner, error: ownerError } = await supabase
      .from('profiller')
      .select('isim, email, role')
      .eq('id', abcTrade.sahip_id)
      .single();

    if (!ownerError && owner) {
      console.log('\n👤 Sahip bilgileri:');
      console.log('   İsim:', owner.isim);
      console.log('   Email:', owner.email);
      console.log('   Role:', owner.role);
    }
  } else {
    console.log('\n⚠️ SAHIP ID NULL!');
  }

  // Tüm firmalar sahip_id'leri
  const { data: allFirmalar, error: allError } = await supabase
    .from('firmalar')
    .select('id, unvan, sahip_id')
    .order('unvan');

  if (!allError && allFirmalar) {
    console.log(`\n📊 Toplam ${allFirmalar.length} firma var:`);
    
    const sahipIdGroups = {};
    allFirmalar.forEach(f => {
      const sahip = f.sahip_id || 'NULL';
      if (!sahipIdGroups[sahip]) {
        sahipIdGroups[sahip] = [];
      }
      sahipIdGroups[sahip].push(f.unvan);
    });

    Object.entries(sahipIdGroups).forEach(([sahipId, firmalar]) => {
      console.log(`\n   Sahip ID: ${sahipId}`);
      console.log(`   Firmalar (${firmalar.length}):`, firmalar.slice(0, 5).join(', '), firmalar.length > 5 ? '...' : '');
    });
  }
}

checkABCTrade()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
