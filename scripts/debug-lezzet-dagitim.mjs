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

async function debugLezzetDagitim() {
  console.log('\n=== Alt Bayi Firmaları Debug ===\n');

  // 1. Find all alt bayi firma
  const { data: allAltBayi, error: firmaErr } = await supabase
    .from('firmalar')
    .select('*')
    .or('kategori.eq.Alt Bayi,ticari_tip.eq.alt_bayi');

  if (firmaErr) {
    console.error('❌ Alt bayi firmalar sorgulanırken hata:', firmaErr.message);
    return;
  }

  console.log('📋 Tüm Alt Bayi Firmaları:', allAltBayi?.length || 0);
  allAltBayi?.forEach(f => {
    console.log(`  - ${f.unvan} (ID: ${f.id})`);
    console.log(`    Kategori: ${f.kategori}, Ticari Tip: ${f.ticari_tip}, Sahip ID: ${f.sahip_id}`);
  });

  if (!allAltBayi || allAltBayi.length === 0) {
    console.log('⚠️  Hiç alt bayi firması bulunamadı!');
    return;
  }

  // İlk firmayı incele
  const altBayiFirma = allAltBayi[0];

  console.log('✅ Alt Bayi Firma:', {
    id: altBayiFirma.id,
    unvan: altBayiFirma.unvan,
    kategori: altBayiFirma.kategori,
    ticari_tip: altBayiFirma.ticari_tip,
    sahip_id: altBayiFirma.sahip_id,
    firma_id: altBayiFirma.firma_id
  });

  // 2. Find profiles linked to this firma via firma_id
  const { data: profilesByFirmaId, error: profileErr1 } = await supabase
    .from('profiller')
    .select('*')
    .eq('firma_id', altBayiFirma.id);

  console.log('\n📋 Profiller (firma_id ile):', profilesByFirmaId?.length || 0);
  profilesByFirmaId?.forEach(p => {
    console.log(`  - ${p.ad_soyad || 'N/A'} (${p.email}) - Rol: ${p.rol}, ID: ${p.id}`);
  });

  // 3. Find all Alt Bayi profiles
  const { data: allAltBayiProfiles, error: profileErr2 } = await supabase
    .from('profiller')
    .select('*')
    .eq('rol', 'Alt Bayi');

  console.log('\n👥 Tüm Alt Bayi Profilleri:', allAltBayiProfiles?.length || 0);
  allAltBayiProfiles?.forEach(p => {
    console.log(`  - ${p.ad_soyad || 'N/A'} (${p.email}) - Firma: ${p.firma_adi}, ID: ${p.id}`);
  });

  // 4. Find customers linked to this alt bayi
  if (altBayiFirma.sahip_id) {
    const { data: customers, count, error: custErr } = await supabase
      .from('firmalar')
      .select('id, unvan, sahip_id, ticari_tip', { count: 'exact' })
      .eq('sahip_id', altBayiFirma.sahip_id)
      .or('ticari_tip.eq.musteri,ticari_tip.is.null');

    console.log('\n🏪 Müşteriler (sahip_id ile):', count || 0);
    customers?.forEach(c => {
      console.log(`  - ${c.unvan} (Tip: ${c.ticari_tip || 'null'})`);
    });
  } else {
    console.log('\n⚠️  sahip_id NULL - müşteri sorgusu yapılamaz');
  }

  // 5. Find customers by profile IDs from firma_id link
  if (profilesByFirmaId && profilesByFirmaId.length > 0) {
    const ownerIds = profilesByFirmaId
      .filter(p => p.rol === 'Alt Bayi')
      .map(p => p.id);

    console.log('\n🔗 Owner IDs (firma_id bağlantısından):', ownerIds);

    if (ownerIds.length > 0) {
      const { data: customers2, count: count2, error: custErr2 } = await supabase
        .from('firmalar')
        .select('id, unvan, sahip_id, ticari_tip', { count: 'exact' })
        .in('sahip_id', ownerIds)
        .or('ticari_tip.eq.musteri,ticari_tip.is.null');

      console.log('\n🏪 Müşteriler (owner IDs ile):', count2 || 0);
      customers2?.forEach(c => {
        console.log(`  - ${c.unvan} (Sahip: ${c.sahip_id}, Tip: ${c.ticari_tip || 'null'})`);
      });
    }
  }

  // 6. Recommendation
  console.log('\n=== Öneriler ===');
  if (!altBayiFirma.sahip_id && allAltBayiProfiles && allAltBayiProfiles.length === 1) {
    console.log('💡 Tek bir Alt Bayi profili var, otomatik bağlama yapılabilir:');
    console.log(`   UPDATE firmalar SET sahip_id = '${allAltBayiProfiles[0].id}' WHERE id = '${altBayiFirma.id}';`);
  } else if (!altBayiFirma.sahip_id) {
    console.log('⚠️  sahip_id bağlantısı eksik ve birden fazla Alt Bayi profili var');
  } else {
    console.log('✅ sahip_id bağlantısı mevcut');
  }

  if (!altBayiFirma.ticari_tip) {
    console.log('💡 ticari_tip alanı NULL, güncellenmeli:');
    console.log(`   UPDATE firmalar SET ticari_tip = 'alt_bayi' WHERE id = '${altBayiFirma.id}';`);
  }
}

debugLezzetDagitim().catch(console.error);
