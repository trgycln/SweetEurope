import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAltBayiLinks() {
  console.log('\n=== Alt Bayi Bağlantılarını Düzeltme ===\n');

  // 1. Tüm alt bayi firmalarını bul
  const { data: altBayiFirmalar, error: firmaErr } = await supabase
    .from('firmalar')
    .select('id, unvan, sahip_id, kategori, ticari_tip')
    .or('kategori.eq.Alt Bayi,ticari_tip.eq.alt_bayi');

  if (firmaErr) {
    console.error('❌ Hata:', firmaErr.message);
    return;
  }

  console.log(`📋 Toplam ${altBayiFirmalar?.length || 0} alt bayi firması bulundu\n`);

  for (const firma of altBayiFirmalar || []) {
    console.log(`\n🔍 İşleniyor: ${firma.unvan} (${firma.id})`);
    console.log(`   Mevcut sahip_id: ${firma.sahip_id || 'null'}`);

    // Eğer sahip_id zaten varsa, atla
    if (firma.sahip_id) {
      console.log('   ✅ Zaten bağlı, atlanıyor');
      continue;
    }

    // Bu firmaya bağlı profilleri bul
    const { data: profiles, error: profileErr } = await supabase
      .from('profiller')
      .select('id, tam_ad, rol')
      .eq('firma_id', firma.id)
      .eq('rol', 'Alt Bayi');

    if (profileErr) {
      console.error('   ❌ Profil sorgusu hatası:', profileErr.message);
      continue;
    }

    if (!profiles || profiles.length === 0) {
      console.log('   ⚠️  Bağlı profil bulunamadı');
      continue;
    }

    if (profiles.length === 1) {
      // Tek profil varsa otomatik bağla
      const profileId = profiles[0].id;
      console.log(`   💡 Tek profil bulundu: ${profiles[0].tam_ad || 'N/A'} (${profileId})`);
      
      const { error: updateErr } = await supabase
        .from('firmalar')
        .update({ sahip_id: profileId })
        .eq('id', firma.id);

      if (updateErr) {
        console.error('   ❌ Güncelleme hatası:', updateErr.message);
      } else {
        console.log('   ✅ sahip_id başarıyla güncellendi!');
      }
    } else {
      console.log(`   ⚠️  Birden fazla profil bulundu (${profiles.length}), manuel seçim gerekli:`);
      profiles.forEach(p => {
        console.log(`      - ${p.tam_ad || 'N/A'} (${p.id})`);
      });
    }
  }

  console.log('\n\n=== İşlem Tamamlandı ===\n');
}

fixAltBayiLinks().catch(console.error);
