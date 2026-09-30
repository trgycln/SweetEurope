import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Use postgrest query to query siparisler. If it errors with missing column, we know it's missing.
  // Actually, we can just execute the SQL via postgres if we have a way.
  // Does supabase expose an rpc 'execute_sql'? Let's check if it throws.
  const { error } = await supabase.rpc('exec_sql', { 
    query: `
      ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS lexware_invoice_id text; 
      ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS lexware_invoice_no text; 
      ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS fatura_durumu text DEFAULT 'yok'; 
      ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS lexware_storno_id text; 
      ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS lexware_storno_no text; 
      ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS lexware_pdf_url text;
    ` 
  });
  console.log('RPC execute_sql Error:', error);
}

run();
