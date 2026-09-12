import fs from 'fs';

const rawLines = fs.readFileSync('_archive/proforma_invoice.txt', 'utf8').trim().split('\n');

const products = rawLines.map((line, idx) => {
  const parts = line.trim().split(/\s+/);
  const barcode = parts[0];
  const gtip = parts[1];

  // The line ends with:
  // [kg_price] [unit_piece_price] [box_price] [total_raw] [%disc1] [%disc2] [disc_kg] [disc_piece] [total_net] EUR
  const len = parts.length;
  // parts[len - 1] is 'EUR'
  // parts[len - 2] is total_net
  // parts[len - 3] is disc_piece
  // parts[len - 4] is disc_kg
  // parts[len - 5] is %disc2
  // parts[len - 6] is %disc1
  // parts[len - 7] is total_raw
  // parts[len - 8] is box_price
  // parts[len - 9] is unit_piece_price!
  // parts[len - 10] is kg_price

  const unitPiecePriceStr = parts[len - 9].replace(',', '.');
  const unitPiecePrice = parseFloat(unitPiecePriceStr);

  const boxPriceStr = parts[len - 8].replace(',', '.');
  const boxPrice = parseFloat(boxPriceStr);

  // Before kg_price, we have: [weight] [koli] [palet] [total_qty] [gross_kg] [vol_m3]
  const volM3Str = parts[len - 11].replace(',', '.');
  const grossKgStr = parts[len - 12].replace(',', '.');
  const totalQty = parseInt(parts[len - 13], 10);
  const paletIciKoli = parseInt(parts[len - 14], 10);
  const koliIciAdet = parseInt(parts[len - 15], 10);
  const unitWeightStr = parts[len - 16].replace(',', '.');
  const unitWeight = parseFloat(unitWeightStr);

  // Everything between parts[2] and parts[len - 16] is the product name and package description!
  const nameParts = parts.slice(2, len - 16);
  const rawName = nameParts.join(' ');

  return {
    index: idx + 1,
    barcode,
    gtip,
    proforma_name: rawName,
    unit_weight: unitWeight,
    koli_ici_adet: koliIciAdet,
    palet_ici_koli: paletIciKoli,
    unit_price_eur: unitPiecePrice,
    box_price_eur: boxPrice
  };
});

if (!fs.existsSync('data')) fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/canonical_proforma_90.json', JSON.stringify(products, null, 2), 'utf8');

console.log(`✅ Successfully generated data/canonical_proforma_90.json with ${products.length} products!`);
console.log('Sample 3 products:');
console.log(products.slice(0, 3));
