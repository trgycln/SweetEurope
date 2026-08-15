import { createClient } from '@supabase/supabase-js';

const OLD_URL = 'https://atydffkpyvxcmzxyibhj.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eWRmZmtweXZ4Y216eHlpYmhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMyMjYxMiwiZXhwIjoyMDc0ODk4NjEyfQ.LHTstP_K3qHoxD_ie_A6fPkFcnKb732qORSJkxrV3qk';

const NEW_URL = 'https://szuhjzgyhhlrydyllrcd.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6dWhqemd5aGhscnlkeWxscmNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc2NjY2OSwiZXhwIjoyMTAyMzQyNjY5fQ.82PbP8TR5gpJD2-3JW-N3IaIuzBTTAhwIZ55gsmTSQE';

const oldClient = createClient(OLD_URL, OLD_KEY);
const newClient = createClient(NEW_URL, NEW_KEY);

async function inspect() {
  console.log('=== INSPECTING OLD SUPABASE ===');
  
  // 1. Users
  const { data: { users }, error: usersErr } = await oldClient.auth.admin.listUsers();
  if (usersErr) console.error('Users error:', usersErr);
  else console.log(`Users count: ${users.length}`);

  // 2. Storage Buckets
  const { data: buckets, error: bucketsErr } = await oldClient.storage.listBuckets();
  if (bucketsErr) console.error('Buckets error:', bucketsErr);
  else {
    console.log('Buckets:', buckets.map(b => ({ name: b.name, public: b.public })));
    for (const b of buckets) {
      const { data: files } = await oldClient.storage.from(b.name).list();
      console.log(`Bucket [${b.name}] files:`, files?.length || 0);
    }
  }

  // 3. Check some key tables
  const tables = [
    'urunler', 'kategoriler', 'firmalar', 'siparisler', 'siparis_ogeleri',
    'profiller', 'documents', 'etkinlikler', 'alt_bayi_satislar',
    'customer_profiles', 'price_change_requests', 'pricing_rules',
    'system_settings', 'waitlist', 'giderler'
  ];

  console.log('\n--- Table Row Counts in Old DB ---');
  for (const table of tables) {
    try {
      const { count, error } = await oldClient.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`Table [${table}]: Error (${error.message})`);
      } else {
        console.log(`Table [${table}]: ${count} rows`);
      }
    } catch (e) {
      console.log(`Table [${table}]: Exception (${e.message})`);
    }
  }
}

inspect().catch(console.error);
