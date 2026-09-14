/**
 * migrate-images.mjs
 *
 * Eski Supabase bucket'indaki (atydffkpyvxcmzxyibhj) urun resimlerini
 * aktif bucket'a (szuhjzgyhhlrydyllrcd) tasiyip veritabani URL'lerini gunceller.
 *
 * Kullanim:
 *   node scripts/migrate-images.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET           = 'urun-gorselleri';
const OLD_PROJECT_HOST = 'atydffkpyvxcmzxyibhj.supabase.co';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ .env.local icinde SUPABASE_URL veya SERVICE_ROLE_KEY eksik!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function extractStoragePath(url) {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length).split('?')[0];
}

function mimeToExt(contentType) {
  if (!contentType) return '.jpg';
  if (contentType.includes('png'))  return '.png';
  if (contentType.includes('webp')) return '.webp';
  if (contentType.includes('gif'))  return '.gif';
  return '.jpg';
}

async function run() {
  console.log('🔍 Eski bucket\'taki urunler sorgulanıyor...\n');

  const { data: products, error } = await supabase
    .from('urunler')
    .select('id, ad, ana_resim_url')
    .eq('aktif', true);

  if (error) {
    console.error('❌ Supabase sorgu hatasi:', error.message);
    process.exit(1);
  }

  const toMigrate = products.filter(
    (p) => p.ana_resim_url && p.ana_resim_url.includes(OLD_PROJECT_HOST)
  );

  if (toMigrate.length === 0) {
    console.log('✅ Tum resimler zaten aktif bucket\'ta. Yapilacak islem yok.');
    return;
  }

  console.log(`📦 Tasinacak urun sayisi: ${toMigrate.length}\n`);
  console.log('─'.repeat(70));

  const results = { success: [], failed: [] };

  for (const prod of toMigrate) {
    const title = (prod.ad?.de || prod.ad?.en || prod.id).substring(0, 45);
    const oldUrl = prod.ana_resim_url;
    const storagePath = extractStoragePath(oldUrl);

    process.stdout.write(`⬇️  ${title}  `);

    // 1. Resmi indir
    let imageBuffer, contentType;
    try {
      const response = await fetch(oldUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      contentType = response.headers.get('content-type') || 'image/jpeg';
      imageBuffer = Buffer.from(await response.arrayBuffer());
      process.stdout.write(`(${(imageBuffer.length / 1024).toFixed(0)} KB) `);
    } catch (err) {
      process.stdout.write(`\n   ❌ Indirme basarisiz: ${err.message}\n`);
      results.failed.push({ title, oldUrl, reason: `Download: ${err.message}` });
      continue;
    }

    // 2. Yeni bucket'a yukle
    const uploadPath = storagePath || `migrated/${prod.id}${mimeToExt(contentType)}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(uploadPath, imageBuffer, { contentType, upsert: true });

    if (uploadError) {
      process.stdout.write(`\n   ❌ Yukleme basarisiz: ${uploadError.message}\n`);
      results.failed.push({ title, oldUrl, reason: `Upload: ${uploadError.message}` });
      continue;
    }

    // 3. Public URL al
    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(uploadPath);
    const newUrl = publicData.publicUrl;

    // 4. DB guncelle
    const { error: updateError } = await supabase
      .from('urunler')
      .update({ ana_resim_url: newUrl })
      .eq('id', prod.id);

    if (updateError) {
      process.stdout.write(`\n   ❌ DB guncelleme basarisiz: ${updateError.message}\n`);
      results.failed.push({ title, oldUrl, reason: `DB: ${updateError.message}` });
      continue;
    }

    process.stdout.write(`✅\n`);
    results.success.push({ title, oldUrl, newUrl });
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`✅ BASARILI : ${results.success.length} urun tasindi`);
  console.log(`❌ BASARISIZ: ${results.failed.length} urun`);

  if (results.failed.length > 0) {
    console.log('\n⚠️  Basarisiz urunler:');
    results.failed.forEach((r) => console.log(`   • ${r.title} → ${r.reason}`));
  }

  if (results.success.length > 0) {
    console.log('\n🔗 Yeni URL ornekleri (ilk 3):');
    results.success.slice(0, 3).forEach((r) => console.log(`   • ${r.title}\n     ${r.newUrl}`));
  }

  console.log('\n🏁 Migrasyon tamamlandi.');
}

run().catch((err) => {
  console.error('💥 Beklenmeyen hata:', err);
  process.exit(1);
});
