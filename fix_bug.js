const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://szuhjzgyhhlrydyllrcd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6dWhqemd5aGhscnlkeWxscmNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc2NjY2OSwiZXhwIjoyMTAyMzQyNjY5fQ.82PbP8TR5gpJD2-3JW-N3IaIuzBTTAhwIZ55gsmTSQE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixBug() {
  const partiId = '6fabdb6c-bf20-457b-8685-c61b2fb515f2';
  
  console.log('1. Fetching all items in batch...');
  const { data: kalemler, error: kErr } = await supabase.from('ithalat_parti_kalemleri').select('urun_id').eq('parti_id', partiId);
  if (kErr) {
    console.error('Error fetching kalemler:', kErr);
    return;
  }
  
  if (kalemler && kalemler.length > 0) {
    const urunIds = kalemler.map(k => k.urun_id);
    console.log(`Resetting stocks for ${urunIds.length} products to 0...`);
    const { error: uErr } = await supabase.from('urunler').update({ stok_miktari: 0 }).in('id', urunIds);
    if (uErr) {
      console.error('Error resetting stocks:', uErr);
    } else {
      console.log('Stocks reset to 0 successfully.');
    }
  }
  
  console.log('2. Deleting erroneously generated documents...');
  const { error: dErr } = await supabase.from('belgeler').delete().eq('tir_id', partiId).eq('otomatik_eklendi', true);
  if (dErr) {
    console.error('Error deleting documents:', dErr);
  } else {
    console.log('Documents deleted successfully.');
  }
  
  console.log('3. Deleting erroneously generated expenses...');
  const { error: gErr } = await supabase.from('giderler').delete().eq('tir_id', partiId).eq('otomatik_eklendi', true);
  if (gErr) {
    console.error('Error deleting expenses:', gErr);
  } else {
    console.log('Expenses deleted successfully.');
  }
}

fixBug();
