/**
 * fix-webp-images.mjs
 *
 * Bu 10 ürünün resmi WebP formatında olmasına rağmen .jpg uzantısıyla
 * Supabase'e yüklenmiş. Meta Content-Type uyumsuzluğu nedeniyle
 * "Image fetch failed" hatası veriyor.
 *
 * Bu script:
 * 1. Mevcut kırık URL'yi indirir
 * 2. Gerçek formatı (WebP/PNG/JPEG) tespit eder
 * 3. Doğru uzantıyla yeniden yükler
 * 4. DB'deki ana_resim_url alanını günceller
 */

import { createClient } from '@supabase/supabase-js';
import https from 'https';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const BUCKET = 'urun-gorselleri';

// 10 sorunlu ürün
const PROBLEM_IDS = [
  '024aecdc-953c-4f7e-8a6f-28427a757e9b',
  '03e6cf67-efe7-4141-9f69-87ec5e70f9fa',
  '0eb33808-ed37-43da-9b85-33144cdb4653',
  '11924546-d75b-43d5-9562-1976c25c0489',
  '2d438bd2-d047-4b8f-b163-c4d6bcd57ea5',
  '346a52b2-1034-48fb-b605-89b9886c8ffd',
  '381703aa-92f3-486e-ab39-b37b041b49e8',
  '531facb3-06cc-453b-8367-955fcde6458e',
  '5bcfaac8-3211-429b-abb2-e12ef66da2cc',
  'bd631ea3-4c9a-4e87-9723-d97d7d30b052',
];

function detectFormat(buf) {
  if (buf[0] === 0xFF && buf[1] === 0xD8) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf[0] === 0x89 && buf[1] === 0x50) return { ext: 'png', mime: 'image/png' };
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[8] === 0x57) return { ext: 'webp', mime: 'image/webp' };
  // Generic RIFF/WebP check
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return { ext: 'bin', mime: 'application/octet-stream' };
}

function download(url) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    https.get(url, (res) => {
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('');

  const { data: products, error } = await supabase
    .from('urunler')
    .select('id, ad, ana_resim_url')
    .in('id', PROBLEM_IDS);

  if (error) { console.error('DB hatası:', error); process.exit(1); }

  let fixed = 0, failed = 0;

  for (const prod of products) {
    const name = prod.ad?.de ?? prod.ad?.en ?? prod.id;
    const oldUrl = prod.ana_resim_url;

    if (!oldUrl) {
      console.log(`⚠️  ${name}: URL yok, atlaniyor`);
      failed++;
      continue;
    }

    console.log(`\n📦 ${name}`);
    console.log(`   Eski URL: ${oldUrl}`);

    // 1. İndir
    let buf;
    try {
      buf = await download(oldUrl);
    } catch (e) {
      console.log(`   ❌ İndirme hatası: ${e.message}`);
      failed++;
      continue;
    }

    // 2. Gerçek formatı tespit et
    const fmt = detectFormat(buf);
    console.log(`   Format tespit: ${fmt.ext.toUpperCase()} (${fmt.mime}) | ${buf.length} bytes`);

    // Eski path'i bul ve doğru uzantıyla yeni path oluştur
    const url = new URL(oldUrl);
    const pathParts = url.pathname.split('/');
    const oldFileName = pathParts[pathParts.length - 1]; // örn: 8691123120663.jpg
    const baseName = oldFileName.replace(/\.[^.]+$/, '');   // örn: 8691123120663
    const newFileName = `${baseName}.${fmt.ext}`;            // örn: 8691123120663.webp
    const storagePath = `fixed/${newFileName}`;

    // Eğer zaten doğru formattaysa
    if (fmt.ext === 'jpg' || fmt.ext === 'jpeg') {
      console.log(`   ✅ Zaten JPEG, sadece yeniden yüklüyorum...`);
    }

    // 3. Supabase'e doğru MIME ile yükle
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buf, {
        contentType: fmt.mime,
        upsert: true,
      });

    if (upErr) {
      console.log(`   ❌ Yükleme hatası: ${upErr.message}`);
      failed++;
      continue;
    }

    // 4. Public URL al
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const newUrl = urlData.publicUrl;
    console.log(`   ✅ Yeni URL: ${newUrl}`);

    // 5. DB güncelle
    const { error: dbErr } = await supabase
      .from('urunler')
      .update({ ana_resim_url: newUrl })
      .eq('id', prod.id);

    if (dbErr) {
      console.log(`   ❌ DB güncelleme hatası: ${dbErr.message}`);
      failed++;
      continue;
    }

    console.log(`   ✅ DB güncellendi`);
    fixed++;
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Düzeltildi: ${fixed} / ${products.length}`);
  console.log(`❌ Başarısız: ${failed}`);
}

main();
