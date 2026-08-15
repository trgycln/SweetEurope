import { createClient } from '@supabase/supabase-js';

const OLD_URL = 'https://atydffkpyvxcmzxyibhj.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eWRmZmtweXZ4Y216eHlpYmhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMyMjYxMiwiZXhwIjoyMDc0ODk4NjEyfQ.LHTstP_K3qHoxD_ie_A6fPkFcnKb732qORSJkxrV3qk';

const client = createClient(OLD_URL, OLD_KEY);

async function check() {
  // Let's see all public tables
  // We can fetch from pg_catalog or sample 1 row from each table
  const testTables = [
    'urunler', 'kategoriler', 'firmalar', 'siparisler', 'siparis_ogeleri',
    'profiller', 'documents', 'etkinlikler', 'alt_bayi_satislar', 'alt_bayi_satis_detay',
    'customer_profiles', 'price_change_requests', 'pricing_rules',
    'system_settings', 'waitlist', 'giderler', 'gider_kategorileri',
    'sample_requests', 'product_reviews', 'product_stock_movement_logs',
    'is_ortaklari_kargo_teklifleri', 'tedarikci_fiyat_loglari', 'iletisim_mesajlari',
    'bayi_hedefleri', 'belgeler'
  ];

  const existingTables = [];
  for (const t of testTables) {
    const { data, error } = await client.from(t).select('*').limit(1);
    if (!error) {
      existingTables.push({ table: t, sample: data?.[0] ? Object.keys(data[0]) : 'empty' });
    }
  }
  console.log('Existing public tables found:', existingTables);
}

check().catch(console.error);
