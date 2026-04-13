import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase
  .from('system_settings')
  .select('setting_key, category, updated_at, updated_by, setting_value')
  .or('category.eq.supplier_order_plan,setting_key.ilike.%supplier_order_plan%,setting_key.ilike.%tedarikci%,setting_key.ilike.%siparis_plani%,setting_key.ilike.%draft%,setting_key.ilike.%history%')
  .order('updated_at', { ascending: false })
  .limit(500);

if (error) {
  console.error(error);
  process.exit(1);
}

console.log('rows', data.length);
for (let i = 0; i < data.length; i++) {
  const r = data[i];
  let count = '-';
  try {
    const p = JSON.parse(r.setting_value || 'null');
    if (Array.isArray(p)) count = `arr:${p.length}`;
    else if (p && typeof p === 'object' && Array.isArray(p.items)) count = `draftItems:${p.items.length}`;
  } catch {}

  console.log(`${i + 1}. ${r.setting_key} | ${r.category} | ${r.updated_at} | ${r.updated_by} | ${count}`);
}
