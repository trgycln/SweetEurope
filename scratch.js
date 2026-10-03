const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=\"?(.*?)\"?$/m)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=\"?(.*?)\"?$/m)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data } = await supabase.from('siparisler').select('*').order('id', {ascending: false}).limit(2);
  console.log(JSON.stringify(data, null, 2));
}
check();
