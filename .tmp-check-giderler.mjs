import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('giderler')
        .select('*')
        .or('aciklama.ilike.%sermaye%,kategori_ad.ilike.%sermaye%,aciklama.ilike.%ahmet%,aciklama.ilike.%turgay%,kategori_ad.ilike.%maaş%')
        .order('tarih', { ascending: false });

    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

check();
