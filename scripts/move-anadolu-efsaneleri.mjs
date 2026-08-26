import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const anadoluCatId = '4e8d38d9-7477-4c8c-8762-8c0a26070d1b';

    const { error } = await supabase
        .from('kategoriler')
        .update({ ust_kategori_id: null })
        .eq('id', anadoluCatId);
        
    if (error) {
        console.error(`Error updating Anadolu Efsaneleri:`, error);
    } else {
        console.log(`Updated Anadolu Efsaneleri to have no parent (Top Level).`);
    }
}

run();
