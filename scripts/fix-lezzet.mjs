import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  // Lezzet Dağıtım A.Ş. güncelle
  const { data: updatedBayi, error: err1 } = await supabase
    .from('firmalar')
    .update({
      ticari_tip: 'alt_bayi',
      kategori: 'Alt Bayi',
    })
    .ilike('unvan', '%Lezzet Dağıtım%')
    .select();

  console.log('Güncellenen Bayi:', updatedBayi, 'Hata:', err1);

  const bayiId = updatedBayi[0]?.id;
  if (!bayiId) return;

  // 4 müşteriyi kesin olarak ust_bayi_firma_id'ye bağla
  const { data: updatedMusteriler, error: err2 } = await supabase
    .from('firmalar')
    .update({
      ust_bayi_firma_id: bayiId,
      ticari_tip: 'musteri',
    })
    .in('unvan', [
      'Café Bella Vista Köln',
      'Orient Shisha & Lounge',
      'Bonn Grand Hotel & Event',
      'Elysion Bistro & Bakery'
    ])
    .select('id, unvan, ust_bayi_firma_id, status');

  console.log('Güncellenen Müşteriler:', updatedMusteriler, 'Hata:', err2);
}

main().catch(console.error);
