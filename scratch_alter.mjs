import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { error } = await supabase.rpc('exec_sql', { 
    query: `
      ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS lexware_proforma_id text; 
      ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS lexware_proforma_no text; 
      ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS proforma_durumu text DEFAULT 'yok'; 
      ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS lexware_proforma_pdf_url text;
    ` 
  });
  console.log('RPC execute_sql Error:', error);
}

run();
