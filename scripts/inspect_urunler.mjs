import fs from 'fs';

const data = JSON.parse(fs.readFileSync('_backup/urunler_full_backup_20260912.json', 'utf8'));
console.log('Total products in backup:', data.length);
console.log('Columns:', Object.keys(data[0]));
console.log('Sample barcode/stok:', {
  stok_kodu: data[0].stok_kodu,
  barkod: data[0].barkod,
  ad: data[0].ad,
  kategori_id: data[0].kategori_id,
  tedarikci_id: data[0].tedarikci_id
});
