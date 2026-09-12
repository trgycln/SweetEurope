import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkMatches() {
  const proforma = JSON.parse(fs.readFileSync('data/canonical_proforma_90.json', 'utf8'));
  const specs = JSON.parse(fs.readFileSync('_archive/parsed_all_specs.json', 'utf8'));
  const labels = JSON.parse(fs.readFileSync('src/lib/label-files.json', 'utf8'));

  const { data: dbProducts } = await supabase.from('urunler').select('id, ad, ean_gtin, stok_kodu, aktif');

  console.log(`Total Proforma Products: ${proforma.length}`);
  console.log(`Total Specs: ${specs.length}`);
  console.log(`Total Labels: ${labels.length}`);
  console.log(`Total DB Products: ${dbProducts.length}`);

  let matchedInDb = 0;
  let matchedInSpecs = 0;
  let matchedInLabels = 0;

  const matchReport = proforma.map(item => {
    // Check DB by barcode
    const dbMatch = dbProducts.find(p => p.ean_gtin === item.barcode);
    if (dbMatch) matchedInDb++;

    // Check Specs by name matching
    // Clean name
    const cleanName = item.proforma_name
      .replace(/^FO\s+/i, '')
      .replace(/\s+(1\s*KG|2,5\s*KG|2\.5\s*KG|700\s*ML|70\s*CL|750\s*GR|940\s*GR|6\s*KG|1000\s*GR)/i, '')
      .trim().toLowerCase();

    const specMatch = specs.find(s => {
      const sName = (s.product_name || s.file || '').toLowerCase();
      // Simple word token overlap
      const tokens = cleanName.split(/\s+/).filter(t => t.length > 2);
      const hits = tokens.filter(t => sName.includes(t));
      return hits.length >= Math.min(tokens.length, 2);
    });
    if (specMatch) matchedInSpecs++;

    // Check Labels
    const labelMatch = labels.find(l => {
      const lName = (l.originalName || '').toLowerCase();
      const tokens = cleanName.split(/\s+/).filter(t => t.length > 2);
      const hits = tokens.filter(t => lName.includes(t));
      return hits.length >= Math.min(tokens.length, 2);
    });
    if (labelMatch) matchedInLabels++;

    return {
      barcode: item.barcode,
      name: item.proforma_name,
      dbMatch: !!dbMatch,
      specMatch: specMatch ? (specMatch.product_name || specMatch.file) : null,
      labelMatch: labelMatch ? labelMatch.originalName : null
    };
  });

  console.log(`\nResults:`);
  console.log(`- Matched in DB (exact barcode): ${matchedInDb} / 90`);
  console.log(`- Matched in Specs: ${matchedInSpecs} / 90`);
  console.log(`- Matched in Labels: ${matchedInLabels} / 90`);

  fs.writeFileSync('data/match_report_initial.json', JSON.stringify(matchReport, null, 2), 'utf8');
}

checkMatches();
