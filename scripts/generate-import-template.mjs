import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

const outputDir = path.resolve(process.cwd(), 'public', 'templates');
fs.mkdirSync(outputDir, { recursive: true });

// ---------------------------------------------------------------------------
// Sheet 1: Ürün verisi (örnek satırlar)
// ---------------------------------------------------------------------------
const templateRows = [
  {
    stok_kodu: 'CHEESE-001',
    urun_adi_tr: 'Frambuazlı Cheesecake',
    urun_adi_de: 'Himbeer-Käsekuchen',
    urun_adi_en: 'Raspberry Cheesecake',
    urun_adi_ar: '',
    aciklama_tr: 'Taze frambuaz ile hazırlanmış kremsi cheesecake. 12 dilim.',
    aciklama_de: 'Cremiger Käsekuchen mit frischen Himbeeren. 12 Stück.',
    aciklama_en: 'Creamy cheesecake with fresh raspberries. 12 slices.',
    aciklama_ar: '',
    kategori: 'Pastalar',
    alt_kategori: 'Cheesecake',
    tedarikci: '',
    urun_tipi: 'Donuk',
    alis_fiyat_seviyesi: 'kutu',
    alis_fiyati: 18.5,
    satis_fiyati_musteri: '',
    satis_fiyati_alt_bayi: '',
    kutu_ici_adet: 12,
    koli_ici_kutu: 8,
    palet_ici_koli: 24,
    stok_miktari: 100,
    aktif: 1,
  },
  {
    stok_kodu: 'COOKIE-101',
    urun_adi_tr: 'Mini Cookie Box',
    urun_adi_de: 'Mini Cookie Box',
    urun_adi_en: 'Mini Cookie Box',
    urun_adi_ar: '',
    aciklama_tr: '',
    aciklama_de: '',
    aciklama_en: '',
    aciklama_ar: '',
    kategori: 'Kurabiyeler',
    alt_kategori: 'Mini Kurabiyeler',
    tedarikci: 'Sweet Heaven',
    urun_tipi: 'Donuk olmayan',
    alis_fiyat_seviyesi: 'koli',
    alis_fiyati: 72,
    satis_fiyati_musteri: '',
    satis_fiyati_alt_bayi: '',
    kutu_ici_adet: 24,
    koli_ici_kutu: 6,
    palet_ici_koli: 30,
    stok_miktari: '',
    aktif: 1,
  },
  {
    stok_kodu: 'TIRAMISÙ-050',
    urun_adi_tr: 'Tiramisu Dilim',
    urun_adi_de: 'Tiramisu Stück',
    urun_adi_en: 'Tiramisu Slice',
    urun_adi_ar: 'تيراميسو شريحة',
    aciklama_tr: 'Gerçek mascarpone ile yapılmış klasik tiramisu. Bireysel porsiyonlar.',
    aciklama_de: 'Klassisches Tiramisu mit echtem Mascarpone. Einzelportionen.',
    aciklama_en: 'Classic tiramisu made with real mascarpone. Individual portions.',
    aciklama_ar: 'تيراميسو كلاسيكي مصنوع من الماسكاربوني الحقيقي.',
    kategori: 'Pastalar',
    alt_kategori: 'Dilim Pastalar',
    tedarikci: '',
    urun_tipi: 'Donuk',
    alis_fiyat_seviyesi: 'adet',
    alis_fiyati: 2.8,
    satis_fiyati_musteri: 6.5,
    satis_fiyati_alt_bayi: '',
    kutu_ici_adet: 10,
    koli_ici_kutu: 10,
    palet_ici_koli: 20,
    stok_miktari: 50,
    aktif: 1,
  },
];

// Sütun genişlikleri (karakter)
const templateColWidths = [
  { wch: 16 }, // stok_kodu
  { wch: 28 }, // urun_adi_tr
  { wch: 28 }, // urun_adi_de
  { wch: 28 }, // urun_adi_en
  { wch: 20 }, // urun_adi_ar
  { wch: 40 }, // aciklama_tr
  { wch: 40 }, // aciklama_de
  { wch: 40 }, // aciklama_en
  { wch: 30 }, // aciklama_ar
  { wch: 18 }, // kategori
  { wch: 20 }, // alt_kategori
  { wch: 18 }, // tedarikci
  { wch: 18 }, // urun_tipi
  { wch: 20 }, // alis_fiyat_seviyesi
  { wch: 16 }, // alis_fiyati
  { wch: 22 }, // satis_fiyati_musteri
  { wch: 22 }, // satis_fiyati_alt_bayi
  { wch: 14 }, // kutu_ici_adet
  { wch: 14 }, // koli_ici_kutu
  { wch: 14 }, // palet_ici_koli
  { wch: 14 }, // stok_miktari
  { wch: 10 }, // aktif
];

// ---------------------------------------------------------------------------
// Sheet 2: Talimatlar
// ---------------------------------------------------------------------------
const talimatRows = [
  // --- Genel kurallar ---
  { başlık: '════  GENEL KURALLAR  ════', açıklama: '' },
  {
    başlık: 'Eşleştirme anahtarı',
    açıklama:
      'stok_kodu veritabanındaki mevcut ürünü bulur. Eşleşme olursa güncelleme yapılır; bulunamazsa yeni ürün oluşturulur.',
  },
  {
    başlık: 'Boş hücre = koru',
    açıklama:
      'Boş bırakılan her hücre ESKİ DEĞERİ KORUR. O alan üzerinde hiçbir değişiklik yapılmaz.',
  },
  {
    başlık: 'Silmek için __CLEAR__',
    açıklama:
      'Bir alanı sıfırlamak/silmek istiyorsanız hücreye tam olarak  __CLEAR__  yazın.',
  },
  {
    başlık: 'Bağımsız dil sütunları',
    açıklama:
      'tr / de / en / ar sütunları birbirinden bağımsızdır. Sadece güncellemek istediğiniz dili doldurun; diğerleri bozulmaz.',
  },
  {
    başlık: 'Sayısal format',
    açıklama:
      'Fiyat ve adet sütunlarında nokta (.) ondalık ayracı olarak kullanın. Binlik ayraç (. veya ,) otomatik temizlenir.',
  },
  { başlık: '', açıklama: '' },

  // --- Sütun açıklamaları ---
  { başlık: '════  SÜTUN AÇIKLAMALARI  ════', açıklama: '' },
  {
    başlık: 'stok_kodu',
    açıklama:
      'ZORUNLU. Ürünü veritabanında bulan benzersiz stok kodu. Hiçbir zaman değiştirmeyin.',
  },
  {
    başlık: 'urun_adi_tr / de / en / ar',
    açıklama:
      'Ürün adı (4 dil). Boş bırakılan dil mevcut adını korur. Yeni ürün oluşturulurken en az bir dil dolu olmalı.',
  },
  {
    başlık: 'aciklama_tr / de / en / ar',
    açıklama:
      'Ürün açıklaması (4 dil). Boş = korur. İstersen sadece Türkçe doldurup diğerlerini bırakabilirsin.',
  },
  {
    başlık: 'kategori',
    açıklama:
      'Ana kategori adı (bkz. "kategori_listesi" sayfası). Sistem yakın eşleşme yapar. Mevcut ürün güncelleniyorsa boş bırakabilirsin.',
  },
  {
    başlık: 'alt_kategori',
    açıklama: 'Alt kategori adı. Yeni ürünün doğru konuma yerleşmesi için kullanılır. Boş = ana kategoriye düşer.',
  },
  {
    başlık: 'tedarikci',
    açıklama:
      'Tedarikçi şirket adı. Boş bırakılırsa içe aktarma panelinde seçilen tedarikçi kullanılır.',
  },
  {
    başlık: 'urun_tipi',
    açıklama:
      '"Donuk"  veya  "Donuk olmayan". Nakliye ve gümrük hesaplamalarını etkiler. Boş = panelde seçilen tip kullanılır.',
  },
  {
    başlık: 'alis_fiyat_seviyesi',
    açıklama:
      '"adet" | "kutu" | "koli" | "palet". Alış fiyatının hangi birime ait olduğunu belirtir. Bkz. aşağıdaki örnekler.',
  },
  {
    başlık: 'alis_fiyati',
    açıklama:
      'EUR cinsinden alış fiyatı. Sistem bu değeri kutu başına normalize ederek satış fiyatlarını hesaplar. Boş = korur.',
  },
  {
    başlık: 'satis_fiyati_musteri',
    açıklama:
      'Müşteri satış fiyatı EUR (kutu başına). Dolu ise otomatik hesaplamayı DEVREDIŞİ bırakır. Boş = mevcut fiyat korunur.',
  },
  {
    başlık: 'satis_fiyati_alt_bayi',
    açıklama:
      'Alt bayi satış fiyatı EUR (kutu başına). Dolu ise otomatik hesaplamayı devre dışı bırakır. Boş = korur.',
  },
  {
    başlık: 'kutu_ici_adet',
    açıklama:
      'Bir kutudaki adet / dilim / porsiyon sayısı. Fiyat hesaplamalarının temel birimi.',
  },
  {
    başlık: 'koli_ici_kutu',
    açıklama: 'Bir kolide kaç kutu olduğu. Koli bazlı fiyat çevirisinde kullanılır.',
  },
  {
    başlık: 'palet_ici_koli',
    açıklama: 'Bir paletteki koli sayısı. Palet bazlı fiyat çevirisi için.',
  },
  {
    başlık: 'stok_miktari',
    açıklama: 'Mevcut stok adedi (tam sayı). Boş = korur.',
  },
  {
    başlık: 'aktif',
    açıklama: '1 = aktif (katalogda görünür)   |   0 = pasif (gizli). Boş = korur.',
  },
  { başlık: '', açıklama: '' },

  // --- Fiyat seviyesi örnekleri ---
  { başlık: '════  ALIŞ FİYATI SEVİYESİ ÖRNEKLERİ  ════', açıklama: '' },
  {
    başlık: 'alis_fiyat_seviyesi: adet',
    açıklama:
      'Örnek: kutu_ici_adet=12, alis_fiyati=1.50 → Kutu fiyatı = 1.50 × 12 = 18.00 EUR',
  },
  {
    başlık: 'alis_fiyat_seviyesi: kutu',
    açıklama: 'Örnek: alis_fiyati=18.50 → Kutu fiyatı direkt 18.50 EUR (en yaygın format)',
  },
  {
    başlık: 'alis_fiyat_seviyesi: koli',
    açıklama:
      'Örnek: koli_ici_kutu=8, alis_fiyati=148.00 → Kutu fiyatı = 148.00 ÷ 8 = 18.50 EUR',
  },
  {
    başlık: 'alis_fiyat_seviyesi: palet',
    açıklama:
      'Örnek: koli_ici_kutu=8, palet_ici_koli=24, alis_fiyati=3552 → Kutu = 3552 ÷ (8×24) = 18.50 EUR',
  },
  { başlık: '', açıklama: '' },

  // --- Kategori eşleştirme ---
  { başlık: '════  KATEGORİ EŞLEŞTİRME  ════', açıklama: '' },
  {
    başlık: 'Nasıl çalışır?',
    açıklama:
      'Sistem girilen kategori adını veritabanındaki slug ve isimlerle karşılaştırır. Tam eşleşme önceliklidir; bulunamazsa yakın eşleşme denenir.',
  },
  {
    başlık: 'Örnek eşleşmeler',
    açıklama:
      '"pasta" → "Pastalar" ✓  |  "cheesecake" → "Cheesecake" ✓  |  "kuru pasta" → "Kurabiyeler" ✓',
  },
  {
    başlık: 'Uyarı',
    açıklama:
      'Yanlış eşleşme olursa ürün yanlış kategoriye düşer. Mevcut ürünleri güncellerken kategori sütununu boş bırakmak daha güvenlidir.',
  },
  {
    başlık: 'Kategori listesi',
    açıklama: '"kategori_listesi" sayfasına bakın (elle doldurun veya veritabanından kopyalayın).',
  },
  { başlık: '', açıklama: '' },

  // --- Teknik özellikler ---
  { başlık: '════  TEKNİK ÖZELLİKLER  ════', açıklama: '' },
  {
    başlık: 'gramaj, kalori vb.',
    açıklama:
      'Ürüne özgü teknik özellikler (gramaj, kalori, allerjenler vb.) Excel üzerinden aktarılmaz; ürün detay sayfasından elle girilir.',
  },
  {
    başlık: 'Paketleme verileri',
    açıklama:
      'kutu_ici_adet / koli_ici_kutu / palet_ici_koli sütunları teknik özellik tablosuna da yazılır; ayrıca girmenize gerek yok.',
  },
];

const talimatColWidths = [{ wch: 38 }, { wch: 90 }];

// ---------------------------------------------------------------------------
// Sheet 3: Kategori listesi (şablon — kullanıcı doldurur)
// ---------------------------------------------------------------------------
const kategoriRows = [
  { ana_kategori: 'Pastalar', alt_kategori: '', slug_ipucu: 'pastalar' },
  { ana_kategori: 'Pastalar', alt_kategori: 'Cheesecake', slug_ipucu: 'cheesecake' },
  { ana_kategori: 'Pastalar', alt_kategori: 'Dilim Pastalar', slug_ipucu: 'dilim-pastalar' },
  { ana_kategori: 'Kurabiyeler', alt_kategori: '', slug_ipucu: 'kurabiyeler' },
  { ana_kategori: 'Kurabiyeler', alt_kategori: 'Mini Kurabiyeler', slug_ipucu: 'mini-kurabiyeler' },
  { ana_kategori: '↑ Bu sayfa yalnızca referans içindir.', alt_kategori: '', slug_ipucu: '' },
  {
    ana_kategori: 'Veritabanındaki gerçek kategori adlarını Admin › Ürün Yönetimi › Kategoriler sayfasından kopyalayın.',
    alt_kategori: '',
    slug_ipucu: '',
  },
];

const kategoriColWidths = [{ wch: 55 }, { wch: 30 }, { wch: 28 }];

// ---------------------------------------------------------------------------
// Çalışma kitabı oluştur
// ---------------------------------------------------------------------------
const workbook = XLSX.utils.book_new();

const templateSheet = XLSX.utils.json_to_sheet(templateRows);
templateSheet['!cols'] = templateColWidths;
XLSX.utils.book_append_sheet(workbook, templateSheet, 'urunler');

const talimatSheet = XLSX.utils.json_to_sheet(talimatRows);
talimatSheet['!cols'] = talimatColWidths;
XLSX.utils.book_append_sheet(workbook, talimatSheet, 'talimatlar');

const kategoriSheet = XLSX.utils.json_to_sheet(kategoriRows);
kategoriSheet['!cols'] = kategoriColWidths;
XLSX.utils.book_append_sheet(workbook, kategoriSheet, 'kategori_listesi');

const outputFile = path.join(outputDir, 'toptanci-urun-import-sablonu.xlsx');
XLSX.writeFile(workbook, outputFile);

console.log(`Şablon oluşturuldu: ${outputFile}`);
console.log('Sayfalar: urunler | talimatlar | kategori_listesi');
console.log(`Sütunlar (${Object.keys(templateRows[0]).length}): ${Object.keys(templateRows[0]).join(', ')}`);
