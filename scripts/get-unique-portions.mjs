import { createClient } from '@supabase/supabase-js';

// Using the project ID we know from the conversation: atydffkpyvxcmzxyibhj
const supabase = createClient(
    'https://atydffkpyvxcmzxyibhj.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eWRmZmtweXZ4Y216eHlpYmhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1MDg0ODUsImV4cCI6MjA0NzA4NDQ4NX0.X7TkJxuRdLLAP3RL8LpNjlKGo-2FgFqCYWX85LtMyHs'
);

async function getUniquePorsiyonlar() {
  console.log('Fetching all active products...');
  
  const { data: urunler, error } = await supabase
    .from('urunler')
    .select('id, ad, teknik_ozellikler')
    .eq('aktif', true);

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  console.log(`Found ${urunler.length} active products`);

  const uniquePorsiyonlar = new Set();

  urunler.forEach(urun => {
    const teknikOzellikler = urun.teknik_ozellikler || {};
    
    // Check dilim_adedi
    if (teknikOzellikler.dilim_adedi) {
      uniquePorsiyonlar.add(String(teknikOzellikler.dilim_adedi));
    }
    
    // Check kutu_ici_adet
    if (teknikOzellikler.kutu_ici_adet) {
      uniquePorsiyonlar.add(String(teknikOzellikler.kutu_ici_adet));
    }
  });

  const sortedPorsiyonlar = Array.from(uniquePorsiyonlar)
    .map(p => parseInt(p))
    .filter(p => !isNaN(p))
    .sort((a, b) => a - b);

  console.log('\n=== UNIQUE PORTION/SLICE COUNTS ===');
  console.log('Found', sortedPorsiyonlar.length, 'unique values:');
  console.log(sortedPorsiyonlar.join(', '));
  
  console.log('\n=== Example products for each portion size ===');
  sortedPorsiyonlar.slice(0, 10).forEach(portion => {
    const examples = urunler.filter(u => {
      const to = u.teknik_ozellikler || {};
      return String(to.dilim_adedi) === String(portion) || String(to.kutu_ici_adet) === String(portion);
    }).slice(0, 2);
    
    console.log(`\n${portion} portions:`);
    examples.forEach(ex => {
      console.log(`  - ${ex.ad?.de || ex.ad?.tr || 'Unnamed'}`);
    });
  });
}

getUniquePorsiyonlar();
