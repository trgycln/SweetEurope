import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const xlsx = require('xlsx');

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data } = await s.from('urunler').select('id,stok_kodu,ad').not('stok_kodu', 'is', null).limit(5000);
const broken = data.filter(u => {
  const ad = u.ad;
  if (!ad || typeof ad !== 'object') return false;
  return Object.values(ad).every(v => v === u.stok_kodu);
});
console.log('Bozuk kayit toplam:', broken.length);

// Grupla: MM/TC kodlu (gerçekten bozuk) vs isim-gibi stok_kodu
const mmTcBroken = broken.filter(u => /^(MM|TC)\d/.test(u.stok_kodu));
const nameLike = broken.filter(u => !/^(MM|TC)\d/.test(u.stok_kodu));
console.log('MM/TC kodlu bozuk:', mmTcBroken.length, mmTcBroken.map(u => u.stok_kodu));
console.log('İsim-gibi stok_kodu (büyük ihtimalle sorun yok):', nameLike.length, nameLike.map(u => u.stok_kodu));

// Excel'den tüm sheet'lerdeki stok_kodu → ad eşlemesini oluştur
const wb = xlsx.readFile('YeniListe.xlsx');
const excelMap = {};
for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
  for (const row of rows) {
    const code = String(row[0] || '').trim();
    const name = String(row[1] || '').trim();
    if (code && name && code !== name && !code.toLowerCase().includes('stok') && !code.toLowerCase().includes('ad')) {
      excelMap[code] = name;
    }
  }
}
console.log('Excel map size:', Object.keys(excelMap).length);
console.log('Örnek Excel map:', Object.entries(excelMap).slice(0, 5));

let updated = 0;
const notFound = [];

// Sadece gerçekten bozuk MM/TC kodlu olanları düzelt
for (const u of mmTcBroken) {
  const excelName = excelMap[u.stok_kodu];
  if (!excelName) {
    notFound.push(u.stok_kodu);
    continue;
  }
  const slug = u.stok_kodu.toLowerCase().replace(/[^a-z0-9]/g, '-')
    + '-' + excelName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50);

  const res = await s.from('urunler').update({
    ad: { tr: excelName, de: excelName, en: excelName },
    slug,
  }).eq('id', u.id);

  if (res.error) {
    console.error('Güncelleme hatası', u.stok_kodu, res.error.message);
  } else {
    updated++;
    console.log(`✓ ${u.stok_kodu} → ${excelName}`);
  }
}

console.log('\n--- SONUÇ ---');
console.log('Güncellenen:', updated);
console.log('MM/TC kodlu - Excel\'de bulunamayan (' + notFound.length + '):', notFound);
