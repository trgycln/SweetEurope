import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

const outputDir = path.resolve(process.cwd(), 'public', 'templates');
fs.mkdirSync(outputDir, { recursive: true });

const templateRows = [
  {
    stok_kodu: 'CHEESE-001',
    urun_adi_tr: 'Frambuazli Cheesecake',
    urun_adi_de: 'Raspberry Cheesecake',
    urun_adi_en: 'Raspberry Cheesecake',
    kategori: 'Pastalar',
    alt_kategori: 'Cheesecake',
    urun_tipi: 'Donuk',
    alis_fiyat_seviyesi: 'kutu',
    alis_fiyati: 18.5,
    kutu_ici_adet: 12,
    koli_ici_kutu: 8,
    palet_ici_koli: 24,
  },
  {
    stok_kodu: 'COOKIE-101',
    urun_adi_tr: 'Mini Cookie Box',
    urun_adi_de: 'Mini Cookie Box',
    urun_adi_en: 'Mini Cookie Box',
    kategori: 'Kurabiyeler',
    alt_kategori: 'Mini Kurabiyeler',
    urun_tipi: 'Donuk olmayan',
    alis_fiyat_seviyesi: 'koli',
    alis_fiyati: 72,
    kutu_ici_adet: 24,
    koli_ici_kutu: 6,
    palet_ici_koli: 30,
  },
];

const guideRows = [
  { kolon: 'stok_kodu', durum: 'Zorunlu', aciklama: 'Urun eslestirme icin benzersiz kod. En kritik alan.' },
  { kolon: 'urun_adi_tr / de / en', durum: 'Onerilir', aciklama: 'Yeni urun olusursa kart adlari bu alanlardan uretilir.' },
  { kolon: 'kategori', durum: 'Zorunlu (yeni urun icin)', aciklama: 'Veritabanindaki ana kategori ile ayni isim olmali.' },
  { kolon: 'alt_kategori', durum: 'Onerilir', aciklama: 'Yeni urunun dogru alt kategoriye dusmesi icin kullanilir.' },
  { kolon: 'urun_tipi', durum: 'Onerilir', aciklama: 'Donuk veya Donuk olmayan. Bos ise secili liste tipi kullanilir.' },
  { kolon: 'alis_fiyat_seviyesi', durum: 'Zorunlu', aciklama: 'adet / kutu / koli / palet' },
  { kolon: 'alis_fiyati', durum: 'Zorunlu', aciklama: 'Secilen seviyedeki net alis fiyati.' },
  { kolon: 'kutu_ici_adet', durum: 'Zorunlu', aciklama: 'Bir kutudaki adet/porsiyon miktari.' },
  { kolon: 'koli_ici_kutu', durum: 'Zorunlu', aciklama: 'Bir kolide kac kutu oldugu.' },
  { kolon: 'palet_ici_koli', durum: 'Zorunlu', aciklama: 'Bir palette kac koli oldugu.' },
];

const workbook = XLSX.utils.book_new();
const templateSheet = XLSX.utils.json_to_sheet(templateRows);
const guideSheet = XLSX.utils.json_to_sheet(guideRows);

XLSX.utils.book_append_sheet(workbook, templateSheet, 'urunler');
XLSX.utils.book_append_sheet(workbook, guideSheet, 'aciklama');

const outputFile = path.join(outputDir, 'toptanci-urun-import-sablonu.xlsx');
XLSX.writeFile(workbook, outputFile);

console.log(`Template created: ${outputFile}`);
