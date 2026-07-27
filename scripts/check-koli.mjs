import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('urunler').select('id, ad, palet_ici_koli_adet').like('palet_ici_koli_adet', '%koli%').limit(5).then(res => console.log(res.data));
