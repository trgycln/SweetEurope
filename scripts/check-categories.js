require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkCategories() {
  // Tüm kategorileri getir
  const { data: kategoriler, error } = await supabase
    .from('kategoriler')
    .select('id, slug, ad, ust_kategori_id, urun_gami');

  if (error) {
    console.error('Error fetching categories:', error);
    return;
  }

  console.log('\n=== TÜM KATEGORİLER ===\n');

  // Parent kategorileri göster
  const parentKategoriler = kategoriler.filter(k => !k.ust_kategori_id);
  console.log(`\nPARENT KATEGORİLER (${parentKategoriler.length}):`);
  parentKategoriler.forEach(k => {
    const childCount = kategoriler.filter(c => c.ust_kategori_id === k.id).length;
    console.log(`  - ${k.slug} | ${k.ad?.de || k.ad?.tr} (${childCount} child)`);
  });

  // "Soslar & Malzemeler" araması
  const soslarkategorisi = kategoriler.find(k =>
    k.ad?.de?.includes('Soslar') ||
    k.ad?.tr?.includes('Soslar') ||
    k.slug?.includes('sauces') ||
    k.slug?.includes('sauce')
  );

  if (soslarkategorisi) {
    console.log(`\n\n=== "${soslarkategorisi.ad?.de || soslarkategorisi.ad?.tr}" KATEGORİSİ DETAYLARI ===`);
    console.log(`ID: ${soslarkategorisi.id}`);
    console.log(`Parent ID: ${soslarkategorisi.ust_kategori_id}`);

    const childKats = kategoriler.filter(k => k.ust_kategori_id === soslarkategorisi.id);
    console.log(`\nChild kategoriler (${childKats.length}):`);
    childKats.forEach(k => {
      // Bu kategorideki ürün sayısı
      console.log(`  - ${k.slug} | ${k.ad?.de || k.ad?.tr}`);
    });
  }

  // Top-level FO kategorileri (barista-bakery-essentials)
  const foKategoriler = kategoriler.filter(k =>
    k.urun_gami === 'barista-bakery-essentials' && !k.ust_kategori_id
  );
  console.log(`\n\n=== FO TOP-LEVEL KATEGORİLER (${foKategoriler.length}) ===`);
  foKategoriler.forEach(k => {
    console.log(`  - ${k.slug} | ${k.ad?.de || k.ad?.tr}`);
  });

  // Her kategorideki ürün sayısını göster
  console.log('\n\n=== HER KATEGORİDEKİ ÜRÜN SAYISI ===');
  for (const kat of kategoriler) {
    const { count } = await supabase
      .from('urunler')
      .select('id', { count: 'exact' })
      .eq('kategori_id', kat.id);

    if (count > 0) {
      const parent = kategoriler.find(k => k.id === kat.ust_kategori_id);
      const parentInfo = parent ? ` [parent: ${parent.slug}]` : '';
      console.log(`  ${kat.slug}: ${count} ürün${parentInfo}`);
    }
  }
}

checkCategories().catch(console.error);
