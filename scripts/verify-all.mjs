import { createClient } from '@supabase/supabase-js';

const NEW_URL = 'https://szuhjzgyhhlrydyllrcd.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6dWhqemd5aGhscnlkeWxscmNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc2NjY2OSwiZXhwIjoyMTAyMzQyNjY5fQ.82PbP8TR5gpJD2-3JW-N3IaIuzBTTAhwIZ55gsmTSQE';

const newSupabase = createClient(NEW_URL, NEW_KEY);

async function verify() {
  console.log('=== VERIFYING NEW SUPABASE DATABASE ===');

  const tables = [
    'urunler', 'kategoriler', 'firmalar', 'profiller', 'system_settings',
    'giderler', 'etkinlikler', 'waitlist', 'siparisler', 'siparis_detay',
    'dis_kontaklar', 'duyurular', 'bildirimler', 'gorevler'
  ];

  for (const t of tables) {
    const { count, error } = await newSupabase.from(t).select('*', { count: 'exact', head: true });
    if (error) console.log(`Table [${t}]: Error (${error.message})`);
    else console.log(`✓ Table [${t}]: ${count} rows`);
  }

  console.log('\n=== VERIFYING NEW STORAGE BUCKETS ===');
  const { data: buckets } = await newSupabase.storage.listBuckets();
  for (const b of buckets || []) {
    const { data: files } = await newSupabase.storage.from(b.name).list('', { limit: 1000 });
    console.log(`✓ Bucket [${b.name}]: ${files?.length || 0} items/folders`);
  }
}

verify().catch(console.error);
