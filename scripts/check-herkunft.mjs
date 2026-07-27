import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkHerkunftsland() {
    const { data, error } = await supabase.from('urunler').select('id, ad, herkunftsland').limit(5);
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}
checkHerkunftsland();
