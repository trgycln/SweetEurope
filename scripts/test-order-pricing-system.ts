import {
  getKoliIciAdet,
  getPaletIciKoliAdet,
  getPaletToplamAdet,
  hasPaletOption,
  hesaplaToplamAdet,
  hesaplaBirimFiyat,
  hesaplaKoliMiktar,
  getAktifKademe,
  hesaplaSepetSatiri,
} from '../src/lib/pricingUtils';
import { calculateShipping } from '../src/lib/shippingUtils';
import { isKolnBonnArea as isKolnArea } from '../src/lib/plzLookup';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures: Array<{ testName: string; details: string }> = [];

function assert(condition: boolean, testName: string, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${testName} -> ${details}`);
    failures.push({ testName, details });
  }
}

console.log('================================================================');
console.log('🧪 SUITE 1: CEV & PAKETLEME DÖNÜŞÜMLERİ (pricingUtils)');
console.log('================================================================');

const mockUrun = {
  koli_ici_adet: 12,
  palet_ici_koli_adet: 40,
  palet_ici_adet: 480,
  satis_fiyati_musteri: 10.0,
  satis_fiyati_toptanci: 8.5,
  satis_fiyati_palet: 7.0,
  satis_fiyati_alt_bayi: 6.0,
};

// 1.1 Koli içi adet
assert(getKoliIciAdet(mockUrun) === 12, 'getKoliIciAdet: Normal ürün için 12 dönmeli');
assert(getKoliIciAdet({ koli_ici_adet: null }) === 1, 'getKoliIciAdet: Null ise varsayılan 1 dönmeli');
assert(getKoliIciAdet({}) === 1, 'getKoliIciAdet: Boş obje için varsayılan 1 dönmeli');

// 1.2 Palet içi koli adet
assert(getPaletIciKoliAdet(mockUrun) === 40, 'getPaletIciKoliAdet: palet_ici_koli_adet 40 ise 40 dönmeli');
assert(
  getPaletIciKoliAdet({ koli_ici_adet: 10, palet_ici_adet: 500, palet_ici_koli_adet: null }) === 50,
  'getPaletIciKoliAdet: palet_ici_adet / koli_ici_adet (500/10) = 50 hesaplamalı'
);
assert(hasPaletOption(mockUrun) === true, 'hasPaletOption: Palet desteği olan ürün için true dönmeli');
assert(
  hasPaletOption({ koli_ici_adet: 12, palet_ici_koli_adet: 0, palet_ici_adet: 0 }) === false,
  'hasPaletOption: Paleti olmayan ürün için false dönmeli'
);

// 1.3 Toplam adet çevrimleri (hesaplaToplamAdet)
assert(hesaplaToplamAdet(mockUrun, 'adet', 5) === 5, 'hesaplaToplamAdet: 5 adet = 5');
assert(hesaplaToplamAdet(mockUrun, 'koli', 3) === 36, 'hesaplaToplamAdet: 3 koli (12 adet) = 36 adet');
assert(
  hesaplaToplamAdet(mockUrun, 'palet', 2) === 960,
  'hesaplaToplamAdet: 2 palet (40 koli * 12 adet = 480 * 2) = 960 adet'
);

// 1.4 Koli miktar hesabı (hesaplaKoliMiktar)
assert(hesaplaKoliMiktar(mockUrun, 'koli', 4) === 4, 'hesaplaKoliMiktar: 4 koli = 4 koli');
assert(hesaplaKoliMiktar(mockUrun, 'palet', 1) === 40, 'hesaplaKoliMiktar: 1 palet = 40 koli');
assert(
  hesaplaKoliMiktar(mockUrun, 'adet', 30) === 2,
  'hesaplaKoliMiktar: 30 adet (12li koli) = Math.floor(30/12) = 2 koli'
);

console.log('\n================================================================');
console.log('🧪 SUITE 2: FİYAT KADEMELERİ VE ROLLER (pricingUtils)');
console.log('================================================================');

// 2.1 Standart Müşteri (1-4 Koli)
assert(hesaplaBirimFiyat(mockUrun, 'koli', 1) === 10.0, 'BirimFiyat: 1 koli müşteri fiyatı 10.0 €');
assert(hesaplaBirimFiyat(mockUrun, 'koli', 4) === 10.0, 'BirimFiyat: 4 koli müşteri fiyatı 10.0 €');
assert(getAktifKademe('koli', 3) === 'musteri', 'AktifKademe: 3 koli "musteri" olmalı');

// 2.2 Toptancı Kademesi (5+ Koli)
assert(hesaplaBirimFiyat(mockUrun, 'koli', 5) === 8.5, 'BirimFiyat: 5 koli toptancı fiyatı 8.5 €');
assert(hesaplaBirimFiyat(mockUrun, 'koli', 10) === 8.5, 'BirimFiyat: 10 koli toptancı fiyatı 8.5 €');
assert(getAktifKademe('koli', 5) === 'toptanci', 'AktifKademe: 5 koli "toptanci" olmalı');

// 2.3 Palet Kademesi
assert(hesaplaBirimFiyat(mockUrun, 'palet', 40) === 7.0, 'BirimFiyat: Palet birim fiyatı 7.0 €');
assert(getAktifKademe('palet', 40) === 'palet', 'AktifKademe: Palet için kademe "palet" olmalı');

// 2.4 Alt Bayi Rolü (Adetten bağımsız en ucuz bayi fiyatı)
assert(
  hesaplaBirimFiyat(mockUrun, 'adet', 1, 'Alt Bayi') === 6.0,
  'Alt Bayi: 1 adet alsa bile alt_bayi fiyatı (6.0 €) geçerli'
);
assert(
  hesaplaBirimFiyat(mockUrun, 'koli', 1, 'Alt Bayi') === 6.0,
  'Alt Bayi: 1 koli alsa bile alt_bayi fiyatı (6.0 €) geçerli'
);
assert(
  hesaplaBirimFiyat(mockUrun, 'palet', 40, 'Alt Bayi') === 6.0,
  'Alt Bayi: Palette de alt_bayi fiyatı (6.0 €) geçerli'
);

// 2.5 Sepet Satırı Komple Hesaplama (hesaplaSepetSatiri)
const sepet1Koli = hesaplaSepetSatiri(mockUrun, 'koli', 2);
assert(sepet1Koli.toplamAdet === 24, 'hesaplaSepetSatiri: 2 koli = 24 adet');
assert(sepet1Koli.adetFiyat === 10.0, 'hesaplaSepetSatiri: 2 koli adet fiyat = 10.0 €');
assert(sepet1Koli.toplamFiyat === 240.0, 'hesaplaSepetSatiri: 2 koli toplam tutar = 240.0 €');

const sepet6Koli = hesaplaSepetSatiri(mockUrun, 'koli', 6);
assert(sepet6Koli.toplamAdet === 72, 'hesaplaSepetSatiri: 6 koli = 72 adet');
assert(sepet6Koli.adetFiyat === 8.5, 'hesaplaSepetSatiri: 6 koli adet fiyat = 8.5 € (toptan)');
assert(sepet6Koli.toplamFiyat === 612.0, 'hesaplaSepetSatiri: 6 koli toplam tutar = 612.0 €');

console.log('\n================================================================');
console.log('🧪 SUITE 3: KARGO & LOJİSTİK HESAPLARI (shippingUtils)');
console.log('================================================================');

// 3.1 Köln & Çevresi Posta Kodu Tespiti (isKolnArea)
assert(isKolnArea('50667') === true, 'isKolnArea: 50667 Köln Merkezi true');
assert(isKolnArea('51147') === true, 'isKolnArea: 51147 Köln Porz / Depo true');
assert(isKolnArea('50825') === true, 'isKolnArea: 50825 Köln Ehrenfeld true');
assert(isKolnArea('40210') === false, 'isKolnArea: 40210 Düsseldorf false (Köln dışı)');
assert(isKolnArea('10115') === false, 'isKolnArea: 10115 Berlin false (Köln dışı)');
assert(isKolnArea(null) === false, 'isKolnArea: null posta kodu false');
assert(isKolnArea('') === false, 'isKolnArea: boş posta kodu false');

// 3.2 Köln Bölgesi Kargo Ücreti Kademeleri
const kolnAlt = calculateShipping(149.99, '50667');
assert(kolnAlt.isKolnArea === true, 'Köln Altı: isKolnArea true');
assert(kolnAlt.shippingCost === 15.0, 'Köln Altı: < 150 € için 15.00 € sabit teslimat ücreti');
assert(kolnAlt.isFreeShipping === false, 'Köln Altı: isFreeShipping false');

const kolnUst = calculateShipping(150.00, '51147');
assert(kolnUst.shippingCost === 0, 'Köln Eşik: >= 150 € için Ücretsiz teslimat (0 €)');
assert(kolnUst.isFreeShipping === true, 'Köln Eşik: isFreeShipping true');

// 3.3 Almanya Geneli Kargo Ücreti Kademeleri
const deAlt = calculateShipping(399.99, '10115');
assert(deAlt.isKolnArea === false, 'Almanya Geneli: isKolnArea false');
assert(deAlt.shippingCost === 29.0, 'Almanya Geneli: < 400 € için 29.00 € standart nakliye ücreti');
assert(deAlt.isFreeShipping === false, 'Almanya Geneli: isFreeShipping false');

const deUst = calculateShipping(400.00, '60311');
assert(deUst.shippingCost === 0, 'Almanya Geneli: >= 400 € için Ücretsiz nakliye (0 €)');
assert(deUst.isFreeShipping === true, 'Almanya Geneli: isFreeShipping true');

console.log('\n================================================================');
console.log('🧪 SUITE 4: KDV, BRÜT/NET VE FATURA DENKLEŞTİRME');
console.log('================================================================');

// 4.1 Gıda KDV Oranı (%7 - Almanca ermäßigter Steuersatz §12 Abs. 2 Nr. 1 UStG)
const netGidaTutar = 100.0;
const kdvGida = Number((netGidaTutar * 0.07).toFixed(2));
const brutGida = Number((netGidaTutar + kdvGida).toFixed(2));
assert(kdvGida === 7.0, 'KDV %7 gıda: 100 € net -> 7.00 € KDV');
assert(brutGida === 107.0, 'KDV %7 gıda: 100 € net -> 107.00 € brüt');

// 4.2 Kargo KDV Tutarsızlığı Denetimi:
// Portal: shippingCost * 1.07 vs Stripe: shippingCost * 1.19
const shippingCost = 29.0;
const portalShippingGross = Number((shippingCost * 1.07).toFixed(2)); // 31.03 €
const stripeShippingGross = Number((shippingCost * 1.19).toFixed(2)); // 34.51 €
console.log(`  ℹ️ Not: Kargo KDV Tutarsızlığı -> Portal %7 (${portalShippingGross} €) uygularken, Stripe %19 (${stripeShippingGross} €) uyguluyor.`);

// 4.3 Admin Paneli "KDV" Hesabı Yanılsama Testi
// Gerçek sipariş 9efadf50 simülasyonu: Net=62.70, Kargo=29.00, Brüt=101.60
const simNet = 62.70;
const simUrunKdv = Number((simNet * 0.07).toFixed(2)); // 4.39 €
const simKargoGross = Number((29.00 * 1.19).toFixed(2)); // 34.51 €
const simToplamBrut = Number((simNet + simUrunKdv + simKargoGross).toFixed(2)); // 101.60 €

// Admin panelindeki mevcut hesaplama mantığı:
const adminHesaplananKdv = Number((simToplamBrut - simNet).toFixed(2));
assert(adminHesaplananKdv === 38.90, 'Admin panelindeki mevcut formül (Brüt - Net) = 38.90 € hesaplıyor');
assert(adminHesaplananKdv !== simUrunKdv, 'BULGU KANITI: Admin paneli aradaki kargo farkını KDV (%7) olarak etiketliyor!');

console.log('\n================================================================');
console.log(`📊 TEST SONUÇLARI: Toplam: ${totalTests} | Başarılı: ${passedTests} | Başarısız: ${failedTests}`);
console.log('================================================================');
