import fs from 'fs';

const backup = JSON.parse(fs.readFileSync('_backup/urunler_full_backup_20260912.json', 'utf8'));

// Unique suppliers
const suppliers = new Set(backup.map(p => p.tedarikci_id).filter(Boolean));
console.log('Suppliers:', Array.from(suppliers));

// Category distribution
const catCounts = {};
backup.forEach(p => {
  catCounts[p.kategori_id] = (catCounts[p.kategori_id] || 0) + 1;
});
console.log('Categories count:', Object.keys(catCounts).length);

// Barcode coverage in backup
const withBarcode = backup.filter(p => p.ean_gtin);
console.log(`Products with ean_gtin: ${withBarcode.length} / ${backup.length}`);

// Image coverage
const withImage = backup.filter(p => p.ana_resim_url);
console.log(`Products with ana_resim_url: ${withImage.length} / ${backup.length}`);

// Map barcode to existing image
const barcodeImageMap = {};
backup.forEach(p => {
  if (p.ean_gtin && p.ana_resim_url) {
    barcodeImageMap[p.ean_gtin] = p.ana_resim_url;
  }
});
console.log(`Barcodes mapped to images: ${Object.keys(barcodeImageMap).length}`);
