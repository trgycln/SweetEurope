import * as XLSX from 'xlsx';

const HEADERS = [
  'stok_kodu', 'urun_adi_de', 'urun_adi_tr', 'urun_adi_en',
  'aciklama_de', 'aciklama_tr',
  'kategori', 'alt_kategori', 'tedarikci',
  'distributoralisfiyati', 'alis_fiyat_seviyesi',
  'koli_ici_adet', 'paleticikoli',
  'ean_gtin', 'haltbarkeit_monate',
  'mindest_bestellmenge', 'mindest_bestellmenge_einheit',
  'hersteller_name', 'hersteller_land', 'herkunftsland_de',
  'vegan', 'glutenfrei', 'laktosefrei', 'bio', 'ohne_zucker',
  'katkisiz', 'koruyucusuz', 'pompa_uyumlu', 'halal',
  'inhaltsstoffe_de', 'inhaltsstoffe_tr',
  'naehrwert_energie_kj', 'naehrwert_energie_kcal',
  'naehrwert_fett', 'naehrwert_kohlenhydrate', 'naehrwert_zucker',
  'naehrwert_eiweiss', 'naehrwert_salz',
  'stok_miktari', 'aktif', 'satis_fiyati_musteri',
];

const HEADER_LABELS: Record<string, string> = {
  stok_kodu: 'Stok Kodu *',
  urun_adi_de: 'Ürün Adı (Almanca)',
  urun_adi_tr: 'Ürün Adı (Türkçe)',
  urun_adi_en: 'Ürün Adı (İngilizce)',
  aciklama_de: 'Açıklama (Almanca)',
  aciklama_tr: 'Açıklama (Türkçe)',
  kategori: 'Kategori',
  alt_kategori: 'Alt Kategori',
  tedarikci: 'Tedarikçi',
  distributoralisfiyati: 'Alış Fiyatı (€/adet)',
  alis_fiyat_seviyesi: 'Alış Birimi (adet/koli/palet)',
  koli_ici_adet: 'Koli İçi Adet *',
  paleticikoli: 'Palet İçi Koli *',
  ean_gtin: 'EAN / GTIN Barkod',
  haltbarkeit_monate: 'Raf Ömrü (ay)',
  mindest_bestellmenge: 'Min. Sipariş Miktarı',
  mindest_bestellmenge_einheit: 'Min. Sipariş Birimi',
  hersteller_name: 'Üretici Adı',
  hersteller_land: 'Üretici Ülke',
  herkunftsland_de: 'Menşei Ülke (Almanca)',
  vegan: 'Vegan (1=Evet, 0=Hayır)',
  glutenfrei: 'Glutensiz (1/0)',
  laktosefrei: 'Laktozsuz (1/0)',
  bio: 'Bio (1/0)',
  ohne_zucker: 'Şekersiz (1/0)',
  katkisiz: 'Katkısız (1/0)',
  koruyucusuz: 'Koruyucusuz (1/0)',
  pompa_uyumlu: 'Pompa Uyumlu (1/0)',
  halal: 'Helal (1/0)',
  inhaltsstoffe_de: 'İçindekiler (Almanca - LMIV)',
  inhaltsstoffe_tr: 'İçindekiler (Türkçe)',
  naehrwert_energie_kj: 'Enerji (kJ/100g)',
  naehrwert_energie_kcal: 'Enerji (kcal/100g)',
  naehrwert_fett: 'Yağ (g/100g)',
  naehrwert_kohlenhydrate: 'Karbonhidrat (g/100g)',
  naehrwert_zucker: 'Şeker (g/100g)',
  naehrwert_eiweiss: 'Protein (g/100g)',
  naehrwert_salz: 'Tuz (g/100g)',
  stok_miktari: 'Stok Miktarı',
  aktif: 'Aktif (1/0)',
  satis_fiyati_musteri: 'Satış Fiyatı Müşteri (€)',
};

const EXAMPLE_ROW = [
  'FO01110', 'Karamell Eiscreme-Sauce 1 kg', 'Karamel Dondurma Sosu 1 kg', 'Caramel Ice Cream Sauce 1 kg',
  'Soße für Eisdesserts und Pâtisserie', 'Dondurma ve pastacılık için karamel sos',
  'Eis-Toppingsoßen 1 kg', '', 'OZMER PASTACILIK',
  '3.82', 'adet',
  '6', '120',
  '8690123456789', '36',
  '1', 'Kiste',
  'OZMER PASTACILIK A.Ş.', 'Türkiye', 'Türkei',
  '0', '1', '1', '0', '0', '0', '0', '0', '1',
  'Zucker, Glukosesirup, Wasser, Karamellaroma, Verdickungsmittel (Pektin), Konservierungsstoff (Kaliumsorbat)',
  'Şeker, glikoz şurubu, su, karamel aroması, kıvamlaştırıcı (pektin), koruyucu (potasyum sorbat)',
  '1231', '294', '0', '72.2', '58.6', '0', '0.13',
  '0', '1', '',
];

export async function GET() {
  const wb = XLSX.utils.book_new();

  // ── Şablon sayfası ────────────────────────────────────────────────────
  const wsData = [
    HEADERS.map(h => HEADER_LABELS[h] || h),
    EXAMPLE_ROW,
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Sütun genişlikleri
  ws['!cols'] = HEADERS.map(h => {
    if (['aciklama_de', 'aciklama_tr', 'inhaltsstoffe_de', 'inhaltsstoffe_tr'].includes(h)) return { wch: 50 };
    if (['urun_adi_de', 'urun_adi_tr'].includes(h)) return { wch: 35 };
    if (['distributoralisfiyati', 'satis_fiyati_musteri', 'alis_fiyat_seviyesi'].includes(h)) return { wch: 20 };
    return { wch: 18 };
  });

  XLSX.utils.book_append_sheet(wb, ws, 'FO Ürün İmport');

  // ── Açıklama sayfası ───────────────────────────────────────────────────
  const guideData = [
    ['Sütun', 'Açıklama', 'Zorunlu', 'Örnek'],
    ['stok_kodu', 'Eşleştirme anahtarı. Aynı kodu tekrar yüklerseniz güncelleme yapılır.', 'Evet', 'FO01110'],
    ['urun_adi_de', 'Almanca ürün adı (müşteriye gösterilir)', 'Önerilir', 'Karamell Eiscreme-Sauce 1 kg'],
    ['urun_adi_tr', 'Türkçe ürün adı', '-', 'Karamel Dondurma Sosu'],
    ['aciklama_de', 'Almanca açıklama (ürün detay sayfasında gösterilir)', '-', 'Soße für Eisdesserts...'],
    ['aciklama_tr', 'Türkçe açıklama', '-', ''],
    ['kategori', 'Kategori adı. Fuzzy eşleştirme yapılır. Boş → mevcut kategori korunur.', '-', 'Eis-Toppingsoßen 1 kg'],
    ['alt_kategori', 'Alt kategori adı.', '-', ''],
    ['tedarikci', 'Tedarikçi adı. Eşleşme bulunamazsa boş bırakılır.', '-', 'OZMER PASTACILIK'],
    ['distributoralisfiyati', 'Alış fiyatı EUR. alis_fiyat_seviyesi ile birlikte kullanın.', 'Fiyat için', '3.82'],
    ['alis_fiyat_seviyesi', 'adet / koli / palet. Boş → adet kabul edilir.', '-', 'adet'],
    ['koli_ici_adet', '1 kolide kaç adet ürün var.', 'Önerilir', '6'],
    ['paleticikoli', '1 paletteki koli sayısı.', 'Önerilir', '120'],
    ['ean_gtin', 'EAN-13 barkod numarası.', 'B2B için gerekli', '8690123456789'],
    ['haltbarkeit_monate', 'Raf ömrü (ay cinsinden).', 'Önerilir', '36'],
    ['mindest_bestellmenge', 'Minimum sipariş miktarı (sayı).', '-', '1'],
    ['mindest_bestellmenge_einheit', 'Minimum sipariş birimi (Kiste, Palette, Stk.).', '-', 'Kiste'],
    ['hersteller_name', 'Üretici firma adı.', '-', 'OZMER PASTACILIK A.Ş.'],
    ['hersteller_land', 'Üretici ülke.', '-', 'Türkiye'],
    ['herkunftsland_de', 'Menşei ülke (Almanca). Almanya\'daki etiket için.', 'B2B için gerekli', 'Türkei'],
    ['vegan / glutenfrei / laktosefrei / bio / ohne_zucker / katkisiz / koruyucusuz / pompa_uyumlu / halal', '1 = Evet, 0 = Hayır, boş = değişmez.', '-', '1 veya 0'],
    ['inhaltsstoffe_de', 'İçindekiler listesi (Almanca, LMIV gereği zorunlu).', 'B2B için gerekli', 'Zucker, Glukosesirup...'],
    ['inhaltsstoffe_tr', 'İçindekiler listesi (Türkçe).', '-', 'Şeker, glikoz şurubu...'],
    ['naehrwert_energie_kj / kcal / fett / kohlenhydrate / zucker / eiweiss / salz', '100g başına besin değerleri.', 'B2B için gerekli', '294'],
    ['stok_miktari', 'Mevcut stok miktarını doğrudan yazar. Boş → değişmez.', '-', '0'],
    ['aktif', '1 = aktif, 0 = pasif. Boş → değişmez.', '-', '1'],
    ['satis_fiyati_musteri', 'Satış fiyatını manuel gir. Boş → alış fiyatından otomatik hesaplanır.', '-', ''],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
  wsGuide['!cols'] = [{ wch: 55 }, { wch: 55 }, { wch: 15 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Sütun Rehberi');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="fo-urun-import-sablonu.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
}
