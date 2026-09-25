import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

// Bar/kafe/kokteyl konularına göre aranacak kelimeler
const SEARCH_KEYWORDS = [
  'cocktail bar',
  'barista coffee',
  'cafe interior',
  'coffee latte art',
  'bartender drinks',
  'syrup cocktail',
  'espresso coffee',
  'bar restaurant night',
  'coffee shop',
  'smoothie drinks',
  'cocktail making',
  'hotel restaurant',
];

async function fetchUnsplashImage(query) {
  if (!UNSPLASH_KEY) {
    console.error('❌ UNSPLASH_ACCESS_KEY bulunamadı!');
    return null;
  }
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encoded}&orientation=landscape&client_id=${UNSPLASH_KEY}`
    );
    if (!res.ok) {
      console.warn(`  ⚠️  Unsplash hata: ${res.status} - query: ${query}`);
      return null;
    }
    const data = await res.json();
    return data?.urls?.regular || null;
  } catch (e) {
    console.warn(`  ⚠️  Fetch hatası: ${e.message}`);
    return null;
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('🔍 Blog yazıları yükleniyor...\n');

  const { data: posts, error } = await supabase
    .from('blog_yazilari')
    .select('id, slug, image_url, title')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Veritabanı hatası:', error.message);
    process.exit(1);
  }

  console.log(`📋 Toplam ${posts.length} blog yazısı bulundu.\n`);

  // Hangi resimler tekrar ediyor?
  const imageCount = {};
  for (const p of posts) {
    imageCount[p.image_url] = (imageCount[p.image_url] || 0) + 1;
  }

  const duplicateUrls = Object.entries(imageCount)
    .filter(([, count]) => count > 1)
    .map(([url]) => url);

  console.log(`🔁 Tekrar eden resim URL'leri (${duplicateUrls.length} adet):`);
  for (const url of duplicateUrls) {
    console.log(`   ${imageCount[url]}x → ${url.substring(0, 80)}...`);
  }

  // Tüm yazıları güncelle (her birine farklı Unsplash resmi)
  console.log('\n🖼️  Resimler güncelleniyor...\n');

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const keyword = SEARCH_KEYWORDS[i % SEARCH_KEYWORDS.length];
    
    console.log(`[${i + 1}/${posts.length}] "${post.slug}" → aranan: "${keyword}"`);

    const newImageUrl = await fetchUnsplashImage(keyword);

    if (newImageUrl) {
      const { error: updateErr } = await supabase
        .from('blog_yazilari')
        .update({ image_url: newImageUrl })
        .eq('id', post.id);

      if (updateErr) {
        console.log(`  ❌ Güncelleme hatası: ${updateErr.message}`);
        failed++;
      } else {
        console.log(`  ✅ Güncellendi: ${newImageUrl.substring(0, 70)}...`);
        updated++;
      }
    } else {
      console.log(`  ⚠️  Unsplash'tan resim alınamadı, atlandı.`);
      failed++;
    }

    // Rate limit aşmamak için bekle (Unsplash: 50 req/saat demo key)
    if (i < posts.length - 1) {
      await sleep(1200);
    }
  }

  console.log(`\n✅ Tamamlandı! Güncellenen: ${updated}, Başarısız: ${failed}`);
}

main();
