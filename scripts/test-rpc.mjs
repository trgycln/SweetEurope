import { createClient } from '@supabase/supabase-js';

const NEW_URL = 'https://szuhjzgyhhlrydyllrcd.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6dWhqemd5aGhscnlkeWxscmNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc2NjY2OSwiZXhwIjoyMTAyMzQyNjY5fQ.82PbP8TR5gpJD2-3JW-N3IaIuzBTTAhwIZ55gsmTSQE';

const newSupabase = createClient(NEW_URL, NEW_KEY);

async function testRpc() {
  const { data, error } = await newSupabase.rpc('exec_sql', {
    sql_string: `
      ALTER TABLE public.firmalar ADD COLUMN IF NOT EXISTS pricing_tier TEXT;
      ALTER TABLE public.firmalar ADD COLUMN IF NOT EXISTS ust_bayi_firma_id UUID;
      ALTER TABLE public.firmalar ADD COLUMN IF NOT EXISTS teknik_ozellikler JSONB;
    `
  });
  console.log('RPC Test result:', { data, error });
}

testRpc().catch(console.error);
