import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE URL or KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clean() {
  console.log('Starting surgical clean...');

  // 1. Delete test portal profiles
  const { error: e1 } = await supabase.from('profiller')
    .delete()
    .in('rol', ['Müşteri', 'Alt Bayi']);
  if (e1) console.error('Error cleaning profiller:', e1);

  // 2. Clear order & sales data (use neq with dummy uuid if needed, or simply delete all rows)
  // Delete all orders
  const { error: e2 } = await supabase.from('siparisler').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e2) console.error('Error cleaning siparisler:', e2);
  
  const { error: e3 } = await supabase.from('alt_bayi_satislar').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e3) console.error('Error cleaning alt_bayi_satislar:', e3);
  
  const { error: e4 } = await supabase.from('alt_bayi_satis_kayitlari').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e4) console.error('Error cleaning alt_bayi_satis_kayitlari:', e4);

  // 3. Clear Alt Bayi finance & stock
  const { error: e5 } = await supabase.from('alt_bayi_giderleri').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e5) console.error('Error cleaning alt_bayi_giderleri:', e5);
  
  const { error: e6 } = await supabase.from('alt_bayi_gelirleri').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e6) console.error('Error cleaning alt_bayi_gelirleri:', e6);
  
  const { error: e7 } = await supabase.from('alt_bayi_stoklari').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e7) console.error('Error cleaning alt_bayi_stoklari:', e7);

  // 4. Clear Requests & Reviews
  const { error: e8 } = await supabase.from('numune_talepleri').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e8) console.error('Error cleaning numune_talepleri:', e8);
  
  const { error: e9 } = await supabase.from('yeni_urun_talepleri').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e9) console.error('Error cleaning yeni_urun_talepleri:', e9);
  
  const { error: e10 } = await supabase.from('sample_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e10) console.error('Error cleaning sample_requests:', e10);
  
  const { error: e11 } = await supabase.from('urun_degerlendirmeleri').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e11) console.error('Error cleaning urun_degerlendirmeleri:', e11);

  // 5. Clear Logs, Notifications & Contact Messages
  const { error: e12 } = await supabase.from('ai_chat_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e12) console.error('Error cleaning ai_chat_logs:', e12);
  
  const { error: e13 } = await supabase.from('bildirimler').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e13) console.error('Error cleaning bildirimler:', e13);
  
  const { error: e14 } = await supabase.from('iletisim_mesajlari').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e14) console.error('Error cleaning iletisim_mesajlari:', e14);
  
  const { error: e15 } = await supabase.from('waitlist').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e15) console.error('Error cleaning waitlist:', e15);

  console.log('Surgical clean complete!');
}

clean();
