/**
 * Unit Testler — import-batch-utils.ts
 *
 * Test Stratejisi:
 * - Canlı veritabanı kullanılmaz (tamamen izole, mock-free)
 * - kaufmannRunden, calculateDiscountedPrice, calculateLucidCost,
 *   calculateMiktarAdet, calculateToplamAgirlikKg fonksiyonlarını kapsar
 * - Happy path, negative path ve edge case senaryoları
 */
import { describe, it, expect } from 'vitest';
import {
  kaufmannRunden,
  calculateDiscountedPrice,
  calculateLucidCost,
  calculateMiktarAdet,
  calculateToplamAgirlikKg,
  toSafeNumber,
  normalizeBatchQuantity,
  computeVariancePct,
  buildBatchItemInsertRows,
} from '@/lib/import-batch-utils';

// ─────────────────────────────────────────────────────────────
// kaufmannRunden (Ticari Yuvarlama — Kaufmännisches Runden)
// ─────────────────────────────────────────────────────────────
describe('kaufmannRunden', () => {
  it('normal yuvarlamayı doğru yapar', () => {
    expect(kaufmannRunden(10.004)).toBe(10.00);
    expect(kaufmannRunden(10.005)).toBe(10.01);
    expect(kaufmannRunden(10.125)).toBe(10.13);
  });

  it('floating point hatasını tolere eder', () => {
    // 0.1 + 0.2 = 0.30000000000000004 → 0.30 olmalı
    const raw = 0.1 + 0.2;
    expect(kaufmannRunden(raw)).toBe(0.30);
  });

  it('sıfır için sıfır döner', () => {
    expect(kaufmannRunden(0)).toBe(0);
  });

  it('negatif değerleri doğru yuvarlar', () => {
    // Math.round(-10.005 + EPSILON) → -10.01 (Number.EPSILON negatif için tam simetriktir)
    // JavaScript'te -10.005 zaten -10.01'e doğru yuvarlanır
    expect(kaufmannRunden(-10.005)).toBe(-10.01);
  });

  it('tam sayıları değiştirmez', () => {
    expect(kaufmannRunden(42)).toBe(42);
    expect(kaufmannRunden(100)).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────
// calculateDiscountedPrice (Çift Kademeli İndirim)
// ─────────────────────────────────────────────────────────────
describe('calculateDiscountedPrice', () => {
  it('%20 + %8 çift indirimini doğru hesaplar', () => {
    // 100 × (1 - 0.20) = 80 → 80 × (1 - 0.08) = 73.60
    expect(calculateDiscountedPrice(100, 20, 8)).toBe(73.60);
  });

  it('tek indirim (%20 + %0) doğru çalışır', () => {
    expect(calculateDiscountedPrice(100, 20, 0)).toBe(80.00);
  });

  it('indirim yoksa baz fiyatı döner', () => {
    expect(calculateDiscountedPrice(50, 0, 0)).toBe(50.00);
  });

  it('gerçekçi tedarikçi fiyatı örneği', () => {
    // 14.50 € × (1 - 0.20) = 11.60 € × (1 - 0.08) = 10.672 → 10.67
    expect(calculateDiscountedPrice(14.50, 20, 8)).toBe(10.67);
  });

  it('Master Data korunur — baz fiyat değişmez', () => {
    const basePrice = 25.99;
    const discounted = calculateDiscountedPrice(basePrice, 20, 8);
    // Baz fiyat değişmemiş olmalı
    expect(basePrice).toBe(25.99);
    expect(discounted).toBeLessThan(basePrice);
  });

  it('null/undefined değerleri güvenle işler (fallback 0)', () => {
    expect(calculateDiscountedPrice(100, null as any, undefined as any)).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────
// calculateLucidCost (LUCID Ambalaj Sicili Maliyeti)
// ─────────────────────────────────────────────────────────────
describe('calculateLucidCost', () => {
  it('standart LUCID oranı ile hesaplar (0.02 €/kg)', () => {
    // 50 kg × 0.02 = 1.00 €
    expect(calculateLucidCost(50, 0.02)).toBe(1.00);
  });

  it('küsuratlı ağırlığı doğru yuvarlar', () => {
    // 33.333 kg × 0.02 = 0.66666... → 0.67 €
    expect(calculateLucidCost(33.333, 0.02)).toBe(0.67);
  });

  it('ağırlık sıfırsa maliyet sıfırdır', () => {
    expect(calculateLucidCost(0, 0.02)).toBe(0);
  });

  it('oran sıfırsa maliyet sıfırdır', () => {
    expect(calculateLucidCost(100, 0)).toBe(0);
  });

  it('null ağırlık için güvenli fallback kullanır', () => {
    expect(calculateLucidCost(null as any, 0.02)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// calculateMiktarAdet (Master Data: Koli → Adet)
// ─────────────────────────────────────────────────────────────
describe('calculateMiktarAdet', () => {
  it('10 koli × 12 adet/koli = 120 adet', () => {
    expect(calculateMiktarAdet(10, 12)).toBe(120);
  });

  it('1 koli × 24 adet/koli = 24 adet', () => {
    expect(calculateMiktarAdet(1, 24)).toBe(24);
  });

  it('koli_ici_adet null ise fallback 1 kullanır (güvenli)', () => {
    // null → 1 fallback, 5 koli × 1 = 5
    expect(calculateMiktarAdet(5, null)).toBe(5);
  });

  it('koli_ici_adet 0 ise fallback 1 kullanır (div/0 koruması)', () => {
    expect(calculateMiktarAdet(5, 0)).toBe(5);
  });

  it('Kısmi Teslimat: koli sayısı 10 dan 8 e düşer', () => {
    // 8 koli × 12 = 96 adet
    expect(calculateMiktarAdet(8, 12)).toBe(96);
    // Daha önceki değer 10 × 12 = 120 idi
    expect(calculateMiktarAdet(10, 12)).toBe(120);
  });
});

// ─────────────────────────────────────────────────────────────
// calculateToplamAgirlikKg (Master Data: Adet → Ağırlık)
// ─────────────────────────────────────────────────────────────
describe('calculateToplamAgirlikKg', () => {
  it('120 adet × 0.25 kg = 30 kg', () => {
    expect(calculateToplamAgirlikKg(120, 0.25)).toBe(30.00);
  });

  it('küsuratlı ağırlık doğru yuvarlanır', () => {
    // 7 adet × 1.333 kg = 9.331 → 9.33
    expect(calculateToplamAgirlikKg(7, 1.333)).toBe(9.33);
  });

  it('birim_agirlik_kg null ise 0 kg döner (güvenli)', () => {
    expect(calculateToplamAgirlikKg(100, null)).toBe(0);
  });

  it('miktar sıfırsa ağırlık sıfırdır', () => {
    expect(calculateToplamAgirlikKg(0, 0.5)).toBe(0);
  });

  it('Kısmi Teslimat: 8 koli × 12 adet × 0.25 kg', () => {
    const miktarAdet = calculateMiktarAdet(8, 12); // 96
    const agirlik = calculateToplamAgirlikKg(miktarAdet, 0.25); // 24 kg
    expect(agirlik).toBe(24.00);
  });
});

// ─────────────────────────────────────────────────────────────
// toSafeNumber (Güvenli Sayı Dönüşümü)
// ─────────────────────────────────────────────────────────────
describe('toSafeNumber', () => {
  it('geçerli sayıları dönüştürür', () => {
    expect(toSafeNumber('42.5')).toBe(42.5);
    expect(toSafeNumber(100)).toBe(100);
  });

  it('null/undefined için fallback döner', () => {
    expect(toSafeNumber(null)).toBe(0);
    expect(toSafeNumber(undefined)).toBe(0);
  });

  it('NaN için fallback döner', () => {
    expect(toSafeNumber(NaN)).toBe(0);
    expect(toSafeNumber('abc')).toBe(0);
  });

  it('özel fallback değeri — null için Number(null)=0 geçerli sayıdır', () => {
    // Number(null) = 0, bu geçerli bir sayıdır → fallback devreye girmez
    // Bunun yerine NaN üretecek değerler fallback'i tetikler
    expect(toSafeNumber(NaN, 1)).toBe(1);       // NaN → fallback 1
    expect(toSafeNumber('abc', 99)).toBe(99);   // 'abc' → NaN → fallback 99
    expect(toSafeNumber(null, 5)).toBe(0);      // null → 0 (geçerli sayı, fallback girmez)
  });
});

// ─────────────────────────────────────────────────────────────
// normalizeBatchQuantity
// ─────────────────────────────────────────────────────────────
describe('normalizeBatchQuantity', () => {
  it('pozitif tam sayıyı olduğu gibi döner', () => {
    expect(normalizeBatchQuantity(10)).toBe(10);
  });

  it('sıfır için minimum 1 döner', () => {
    expect(normalizeBatchQuantity(0)).toBe(1);
  });

  it('negatif için minimum 1 döner', () => {
    expect(normalizeBatchQuantity(-5)).toBe(1);
  });

  it('kesirli sayıyı aşağı yuvarlar', () => {
    expect(normalizeBatchQuantity(3.7)).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────
// computeVariancePct (Maliyet Sapma Yüzdesi)
// ─────────────────────────────────────────────────────────────
describe('computeVariancePct', () => {
  it('olumlu sapma (pahalanma) doğru hesaplanır', () => {
    // (110 - 100) / 100 × 100 = %10
    expect(computeVariancePct(100, 110)).toBe(10);
  });

  it('olumsuz sapma (ucuzlama) doğru hesaplanır', () => {
    // (90 - 100) / 100 × 100 = %-10
    expect(computeVariancePct(100, 90)).toBe(-10);
  });

  it('standart maliyet sıfırsa 0 döner (div/0 koruması)', () => {
    expect(computeVariancePct(0, 50)).toBe(0);
  });

  it('eşit değerlerde 0 döner', () => {
    expect(computeVariancePct(50, 50)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// buildBatchItemInsertRows (Entegre hesaplama)
// ─────────────────────────────────────────────────────────────
describe('buildBatchItemInsertRows', () => {
  const mockItem = {
    urunId: 'uuid-001',
    koliSayisi: 10,
    miktarAdet: 120,       // 10 × 12
    toplamAgirlikKg: 30,   // 120 × 0.25
    birimAlisFiyatiOrijinal: 14.50,
    indirimliAlisFiyati: 10.67, // 14.50 × (1-0.20) × (1-0.08)
    ciplakMaliyetEur: 10.67,
    dagitilanNavlunEur: 50,
    dagitilanGumrukEur: 20,
    dagitilanOzelGiderEur: 5,
    operasyonVeRiskYukuEur: 0,
    gercekInisMaliyetiNet: 11.50,
    standartInisMaliyetiNet: 11.00,
    maliyetSapmaYuzde: 4.55,
  };

  it('LUCID payını dagitilan_ozel_gider_eur içine otomatik ekler', () => {
    const rows = buildBatchItemInsertRows('parti-001', [mockItem], 0.02);
    // 30 kg × 0.02 = 0.60 € LUCID → 5 + 0.60 = 5.60
    expect(rows[0].dagitilan_ozel_gider_eur).toBeCloseTo(5.60, 2);
  });

  it('birim_alis_fiyati_orijinal (master data) değişmez', () => {
    const rows = buildBatchItemInsertRows('parti-001', [mockItem], 0.02);
    expect(rows[0].birim_alis_fiyati_orijinal).toBe(14.50);
  });

  it('LUCID oranı 0 ise LUCID payı eklenmez', () => {
    const rows = buildBatchItemInsertRows('parti-001', [mockItem], 0);
    expect(rows[0].dagitilan_ozel_gider_eur).toBeCloseTo(5.00, 2);
  });

  it('miktar_adet doğru set edilir', () => {
    const rows = buildBatchItemInsertRows('parti-001', [mockItem], 0.02);
    expect(rows[0].miktar_adet).toBe(120);
  });

  it('koli_sayisi doğru set edilir', () => {
    const rows = buildBatchItemInsertRows('parti-001', [mockItem], 0.02);
    expect(rows[0].koli_sayisi).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────────
// Senaryo: Kısmi Teslimat (Edge Case)
// ─────────────────────────────────────────────────────────────
describe('Kısmi Teslimat Senaryosu', () => {
  it('koli sayısı düşünce tüm değerler anında güncellenir', () => {
    const koliIciAdet = 12;
    const birimAgirlik = 0.25;
    const lucidOran = 0.02;

    // Orijinal sipariş: 10 koli
    const miktarAdet10 = calculateMiktarAdet(10, koliIciAdet); // 120
    const agirlik10 = calculateToplamAgirlikKg(miktarAdet10, birimAgirlik); // 30 kg
    const lucid10 = calculateLucidCost(agirlik10, lucidOran); // 0.60 €

    // Kısmi teslimat: 8 koli geldi
    const miktarAdet8 = calculateMiktarAdet(8, koliIciAdet); // 96
    const agirlik8 = calculateToplamAgirlikKg(miktarAdet8, birimAgirlik); // 24 kg
    const lucid8 = calculateLucidCost(agirlik8, lucidOran); // 0.48 €

    expect(miktarAdet8).toBe(96);
    expect(agirlik8).toBe(24.00);
    expect(lucid8).toBe(0.48);
    expect(lucid8).toBeLessThan(lucid10);
  });
});
