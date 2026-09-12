import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkReferences() {
  const tables = ['siparis_detay', 'favori_urunler', 'fiyat_listesi_ogeleri', 'stok_hareketleri', 'teklif_ogeleri', 'ithalat_parti_ogeleri'];
  for (const t of tables) {
    try {
      const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`Table ${t}: Error (${error.message})`);
      } else {
        console.log(`Table ${t}: ${count} rows`);
      }
    } catch (e) {
      console.log(`Table ${t}: Exception (${e.message})`);
    }
  }
}

checkReferences();
