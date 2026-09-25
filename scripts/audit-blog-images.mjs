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

async function main() {
  const { data: posts, error } = await supabase
    .from('blog_yazilari')
    .select('id, slug, image_url, title, published_at, is_published')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Hata:', error.message);
    process.exit(1);
  }

  console.log(`\n📋 Toplam ${posts.length} blog yazısı:\n`);

  const issues = [];

  for (const p of posts) {
    const imageUrl = p.image_url || '';
    const domain = imageUrl ? new URL(imageUrl).hostname : 'YOK';
    const title = p.title?.de || p.title?.en || '(başlık yok)';

    console.log(`• [${p.is_published ? '✅' : '❌'}] ${p.slug}`);
    console.log(`  Başlık: ${title.substring(0, 60)}`);
    console.log(`  Resim domain: ${domain}`);
    console.log(`  Yayın tarihi: ${p.published_at}`);
    console.log();

    if (!p.image_url) issues.push(`❌ Resim YOK: ${p.slug}`);
    if (domain !== 'images.unsplash.com' && domain !== 'YOK' && !domain.includes('supabase.co') && !domain.includes('pexels.com')) {
      issues.push(`⚠️  Tanımsız domain (Next.js Image optimizer'da çalışmaz): ${domain} → ${p.slug}`);
    }
  }

  // Duplikat kontrol
  const imageMap = {};
  for (const p of posts) {
    if (p.image_url) {
      imageMap[p.image_url] = (imageMap[p.image_url] || []);
      imageMap[p.image_url].push(p.slug);
    }
  }
  for (const [url, slugs] of Object.entries(imageMap)) {
    if (slugs.length > 1) {
      issues.push(`🔁 Aynı resim ${slugs.length} yazıda: ${slugs.join(', ')}`);
    }
  }

  if (issues.length === 0) {
    console.log('✅ Sorun bulunamadı!');
  } else {
    console.log(`\n⚠️  BULUNAN SORUNLAR (${issues.length}):\n`);
    issues.forEach(i => console.log(i));
  }
}

main();
