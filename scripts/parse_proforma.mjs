import fs from 'fs';

const raw = fs.readFileSync('_archive/proforma_invoice.txt', 'utf8').trim().split('\n');

const parsed = [];

for (let i = 0; i < raw.length; i++) {
  const line = raw[i].trim();
  if (!line) continue;

  const parts = line.split(/\s+/);
  const barcode = parts[0];
  const gtip = parts[1];

  // Look for indices: after gtip comes product name until unit weight
  // In the line: barcode gtip [PRODUCT NAME...] [weight] [koli] [palet] [total_qty] [gross_kg] [vol_m3] [price1] [unit_price] ...
  
  // Find where EUR or numbers at end are
  // Let's inspect tokens
  parsed.push({ index: i + 1, raw: line, barcode, gtip });
}

console.log(`Parsed ${parsed.length} raw lines.`);
