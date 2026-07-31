import dotenv from 'dotenv';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const items = [
  { barcode: '8691123120571', search: 'WHITE CHOCOLATE Flavored Syrup', exclude: ['Sugar Free', 'PREMIUM'] },
  { barcode: '8691123120236', search: 'FO Caramel Flavored Syrup', exclude: ['Sugar Free', 'PREMIUM'] },
  { barcode: '8691123120700', search: 'STRAWBERRY Flavored Syrup', exclude: ['Sugar Free', 'PREMIUM'] },
  { barcode: '8691123120106', search: 'VANILLA Flavored Syrup', exclude: ['Sugar Free', 'PREMIUM'] },
  { barcode: '8691123120618', search: 'TOFFEE NUT', exclude: ['Sugar Free', 'PREMIUM', 'Sauce'] },
  { barcode: '8691123120229', search: 'MANGO Flavored Syrup', exclude: ['Sugar Free', 'PREMIUM'] },
  { barcode: '8691123120014', search: 'GRENADINE Flavored Syrup', exclude: ['Sugar Free', 'PREMIUM'] },
  { barcode: '8691123120588', search: 'GREEN APPLE Flavored Syrup', exclude: ['Sugar Free', 'PREMIUM', 'with Sugar', 'Sugar'] },
  { barcode: '8691123120564', search: 'SPEARMINT Flavored Syrup', exclude: ['Sugar Free', 'PREMIUM'] },
  { barcode: '8691123120137', search: 'PEACH Flavored Syrup', exclude: ['Sugar Free', 'PREMIUM'] },
  { barcode: '8691123120052', search: 'COCONUT Flavored Syrup', exclude: ['Sugar Free', 'PREMIUM', 'With Sugar', 'Blanc'] }
];

async function run() {
  const updates = [];
  
  for (let item of items) {
    let query = supabase.from('urunler').select('id, ad, ean_gtin, stok_kodu').ilike('ad->>en', '%' + item.search + '%');
    for (let exc of item.exclude) {
      query = query.not('ad->>en', 'ilike', '%' + exc + '%');
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error for', item.search, error);
      continue;
    }
    
    console.log('\n--- Searching for: ' + item.search + ' ---');
    if (data.length === 0) {
      console.log('NOT FOUND!');
      // try a broader search
      const { data: d2 } = await supabase.from('urunler').select('id, ad').ilike('ad->>en', '%' + item.search.split(' ')[0] + '%');
      if(d2) d2.forEach(d => console.log('   Possible match:', d.ad.en));
    } else if (data.length > 1) {
      console.log('MULTIPLE FOUND:');
      data.forEach(d => console.log('  ', d.id, d.ad.en));
    } else {
      console.log('FOUND: ', data[0].id, data[0].ad.en);
      console.log('Current EAN:', data[0].ean_gtin);
      console.log('Will set to:', item.barcode);
      updates.push({ id: data[0].id, name: data[0].ad.en, barcode: item.barcode });
    }
  }
  
  console.log('\nUpdates ready:', updates.length);
  
  const DRY_RUN = process.argv.includes('--dry');
  if (DRY_RUN) {
    console.log('Dry run completed. Run without --dry to apply.');
    return;
  }
  
  for (const update of updates) {
    const { error } = await supabase
      .from('urunler')
      .update({ ean_gtin: update.barcode })
      .eq('id', update.id);
      
    if (error) {
      console.error('Failed to update', update.name, error);
    } else {
      console.log('Successfully updated', update.name, 'to', update.barcode);
    }
  }
  
  console.log('All done!');
}
run();
