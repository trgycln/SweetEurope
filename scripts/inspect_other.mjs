import fs from 'fs';

const items = JSON.parse(fs.readFileSync('data/canonical_triangulation_90.json', 'utf8'));

const other = items.filter(item => {
  const name = item.proforma_name.toUpperCase();
  return !(name.includes('SAUCE') || name.includes('SOS') || name.includes('SYRUP') || name.includes('SURUP') || name.includes('DRINK') || name.includes('POWDER') || name.includes('BASE') || name.includes('FOAMER'));
});
console.log('Other items:', other.map(o => ({ barcode: o.barcode, name: o.proforma_name })));
