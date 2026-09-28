const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function check() {
  const { data } = await supabase.from('ithalat_partileri').select('indirim_1_yuzde, indirim_2_yuzde').eq('id', '6fabdb6c-bf20-457b-8685-c61b2fb515f2').single();
  console.log(data);
}
check();
