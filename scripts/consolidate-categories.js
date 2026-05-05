require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function consolidateCategories() {
  console.log('=== KATEGORI KONSOLİDASYONU BAŞLATILIYOR ===\n');

  const { data: kategoriler } = await supabase
    .from('kategoriler')
    .select('id, slug, ad, ust_kategori_id, urun_gami');

  // Old "sauces-and-ingredients" parent kategori bul
  const oldParent = kategoriler.find(k => k.slug === 'sauces-and-ingredients' && !k.ust_kategori_id);
  if (!oldParent) {
    console.log('❌ "sauces-and-ingredients" parent kategori bulunamadı');
    return;
  }

  console.log(`✓ Old parent kategori bulundu: "${oldParent.slug}" (ID: ${oldParent.id})\n`);

  // Old parent'ın tüm children'larını bul
  const oldChildren = kategoriler.filter(k => k.ust_kategori_id === oldParent.id);
  console.log(`Old child kategoriler (${oldChildren.length}):`);
  oldChildren.forEach(k => {
    console.log(`  - ${k.slug} (ID: ${k.id})`);
  });

  // Tüm kategorileri (parent + children) bul
  const oldKategorileri = [oldParent, ...oldChildren];
  console.log(`\nToplam old kategoriler: ${oldKategorileri.length}\n`);

  // Her old kategorideki ürünleri say
  console.log('=== HER KATEGORİDEKİ ÜRÜNLER ===');
  const productsByCategory = {};
  for (const kat of oldKategorileri) {
    const { count } = await supabase
      .from('urunler')
      .select('id', { count: 'exact' })
      .eq('kategori_id', kat.id);

    productsByCategory[kat.slug] = count || 0;
    console.log(`  ${kat.slug}: ${count || 0} ürün`);
  }

  const totalOldProducts = Object.values(productsByCategory).reduce((a, b) => a + b, 0);
  console.log(`\nToplam ürün (old system): ${totalOldProducts}\n`);

  // Mapping stratejisi
  console.log('=== MAPPING STRATEJİSİ ===');
  console.log('Slug eşleşmesi kullanılacak. Eşleşmeyen kategoriler için manuel müdahale gerekir.\n');

  const mapping = {};
  for (const oldKat of oldKategorileri) {
    const newKat = kategoriler.find(k =>
      k.slug === oldKat.slug && k.urun_gami === 'barista-bakery-essentials' && !k.ust_kategori_id
    );

    if (newKat) {
      mapping[oldKat.id] = { oldKat: oldKat.slug, newKat: newKat.slug, newKatId: newKat.id };
      console.log(`✓ ${oldKat.slug} → ${newKat.slug}`);
    } else {
      mapping[oldKat.id] = { oldKat: oldKat.slug, newKat: null };
      console.log(`⚠ ${oldKat.slug} → (eşleşme bulunamadı!)`);
    }
  }

  // Eşleşmeyen kategorileri göster
  const unmatched = Object.entries(mapping).filter(([_, m]) => !m.newKat);
  if (unmatched.length > 0) {
    console.log(`\n⚠️  ${unmatched.length} kategori eşleşmedi:\n`);
    unmatched.forEach(([oldId, m]) => {
      console.log(`   - "${m.oldKat}" (${productsByCategory[m.oldKat]} ürün)`);
    });
    console.log('\nBu kategoriler için manuel mapping yapılması gerekiyor.\n');
  }

  // Konsolidasyon planı
  console.log('=== KONSOLIDASYON PLANI ===');
  const toUpdate = Object.entries(mapping).filter(([_, m]) => m.newKat);
  const toDelete = oldKategorileri.map(k => k.id);

  console.log(`1. ${toUpdate.length} kategorideki ürünleri yeni kategoriglere taşı`);
  console.log(`2. ${oldKategorileri.length} eski kategoriyi sil\n`);

  // Konsolidasyon yapılacak mı?
  console.log('Devam etmek için /konsolidate-categories-execute.js dosyasını çalıştırın');
}

consolidateCategories().catch(console.error);
