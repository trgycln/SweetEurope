import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  const { data: bayi } = await supabase.from('firmalar').select('id').eq('unvan', 'Lezzet Dağıtım A.Ş.').single();
  const { data: musteri } = await supabase.from('firmalar').select('id').eq('unvan', 'Café Bella Vista Köln').single();

  if (!musteri) return;

  // Örnek etkinlik
  await supabase.from('etkinlikler').insert({
    firma_id: musteri.id,
    etkinlik_tipi: 'Telefon Görüşmesi',
    aciklama: 'Lezzet Dağıtım A.Ş. temsilcisi aradı. Haftalık 20 koli Trileçe ve Sufle teslimatı için anlaşıldı.',
  });

  // Örnek görev
  await supabase.from('gorevler').insert({
    ilgili_firma_id: musteri.id,
    baslik: 'Yeni menü tadım numuneleri teslim edilecek',
    oncelik: 'Yüksek',
    tamamlandi: false,
    son_tarih: new Date(Date.now() + 3 * 86400000).toISOString(),
  });

  console.log('Etkinlik ve görev eklendi!');
}

main().catch(console.error);
