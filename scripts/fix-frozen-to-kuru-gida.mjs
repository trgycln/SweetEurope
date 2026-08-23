/**
 * fix-frozen-to-kuru-gida.mjs
 * 
 * Veritabanında urun_gami array'inde 'frozen-desserts' olan tüm ürünleri
 * 'barista-bakery-essentials' (kuru gıda) olarak günceller.
 * 
 * Kullanım:
 *   node scripts/fix-frozen-to-kuru-gida.mjs           -> günceller
 *   node scripts/fix-frozen-to-kuru-gida.mjs --dry-run -> sadece sayar
 */

const SUPABASE_URL = 'https://szuhjzgyhhlrydyllrcd.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6dWhqemd5aGhscnlkeWxscmNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc2NjY2OSwiZXhwIjoyMTAyMzQyNjY5fQ.82PbP8TR5gpJD2-3JW-N3IaIuzBTTAhwIZ55gsmTSQE';

const isDryRun = process.argv.includes('--dry-run');

async function supabaseRequest(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const prefer = options.prefer || (options.method === 'PATCH' ? 'return=representation' : 'return=representation');
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': prefer,
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase hata [${res.status}]: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function main() {
  console.log('🔍 Veritabanı sorgulanıyor...\n');

  // urun_gami bir text[] kolonu.
  // PostgREST'te array contains sorgusu: cs.{"frozen-desserts"}
  const frozenProducts = await supabaseRequest(
    '/urunler?urun_gami=cs.%7B%22frozen-desserts%22%7D&select=id,ad,urun_gami&order=id'
  );

  if (!frozenProducts || frozenProducts.length === 0) {
    console.log('✅ frozen-desserts içeren ürün bulunamadı. Güncelleme gerekmiyor.');
    return;
  }

  console.log(`📦 urun_gami içinde "frozen-desserts" olan toplam ${frozenProducts.length} ürün bulundu.\n`);

  // İlk 10 ürünü göster
  const preview = frozenProducts.slice(0, 10);
  console.log('📋 Örnek ürünler (ilk 10):');
  preview.forEach((p, i) => {
    const name = typeof p.ad === 'object' ? (p.ad?.tr || p.ad?.de || p.ad?.en || JSON.stringify(p.ad)) : (p.ad || '-');
    console.log(`  ${i + 1}. [${p.id}] ${name} | urun_gami: ${JSON.stringify(p.urun_gami)}`);
  });
  if (frozenProducts.length > 10) {
    console.log(`  ... ve ${frozenProducts.length - 10} tane daha.\n`);
  }

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN modu - Gerçek güncelleme yapılmadı.');
    console.log(`   Güncelleme için: node scripts/fix-frozen-to-kuru-gida.mjs`);
    return;
  }

  // Güncelleme: urun_gami = ["barista-bakery-essentials"]
  console.log('\n🔄 Güncelleme başlıyor...');
  
  // PostgREST ile array contains filtresi + PATCH
  const updated = await supabaseRequest(
    '/urunler?urun_gami=cs.%7B%22frozen-desserts%22%7D',
    {
      method: 'PATCH',
      prefer: 'return=representation',
      body: JSON.stringify({ urun_gami: ['barista-bakery-essentials'] }),
    }
  );

  const updatedCount = Array.isArray(updated) ? updated.length : 0;
  console.log(`\n✅ Başarılı! ${updatedCount} ürün güncellendi.`);
  console.log('   urun_gami: ["frozen-desserts"] → ["barista-bakery-essentials"]');

  // Doğrulama
  const remaining = await supabaseRequest(
    '/urunler?urun_gami=cs.%7B%22frozen-desserts%22%7D&select=id'
  );
  console.log(`\n🔍 Doğrulama: Kalan frozen-desserts ürün sayısı: ${remaining?.length ?? 0}`);
  
  const allBbe = await supabaseRequest(
    '/urunler?urun_gami=cs.%7B%22barista-bakery-essentials%22%7D&select=id'
  );
  console.log(`📊 Toplam barista-bakery-essentials (kuru gıda) ürün sayısı: ${allBbe?.length ?? 0}`);
  
  console.log('\n✨ İşlem tamamlandı! Sayfayı yenileyince Donuk (0) görünmeli.');
}

main().catch(err => {
  console.error('❌ Hata:', err.message);
  process.exit(1);
});
