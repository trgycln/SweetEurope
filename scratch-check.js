const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .from('siparisler')
    .select('lexware_invoice_id, lexware_invoice_no, lexware_pdf_url, lexware_invoice_url')
    .limit(1);

  console.log("Data:", data);
  console.log("Error:", error);
}

main().catch(console.error);
