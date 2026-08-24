import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const draftKey = 'supplier_order_plan_draft_642896a8-ec56-4a58-917d-eafe2831a104';
  const { data: row, error } = await supabase.from('system_settings').select('*').eq('setting_key', draftKey).single();
  if (error) {
      console.error(error);
      return;
  }
  
  let draft = JSON.parse(row.setting_value);
  let updatedCount = 0;
  
  for (let i = 0; i < draft.items.length; i++) {
      if (!draft.items[i].id) {
          // Generate a unique ID similar to how the app does it
          const uniqueId = draft.items[i].productId + '-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex');
          draft.items[i].id = uniqueId;
          updatedCount++;
      }
  }

  if (updatedCount > 0) {
      const { error: updError } = await supabase.from('system_settings').update({ setting_value: JSON.stringify(draft) }).eq('setting_key', draftKey);
      if (updError) console.error('Hata:', updError);
      else console.log(`${updatedCount} adet ürüne eksik 'id' alanı eklendi ve taslak güncellendi.`);
  } else {
      console.log('Tüm ürünlerin id alanı zaten mevcut.');
  }
}
run();
