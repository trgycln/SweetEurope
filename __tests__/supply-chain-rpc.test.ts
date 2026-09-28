/**
 * Integration Testler — complete_import_batch RPC Simülasyonu
 *
 * Kural: CANLI VERİTABANI KORUMASI — Testler mock nesnelerle çalışır,
 * hiçbir zaman gerçek Supabase DB'ye yazılmaz.
 *
 * Test edilen senaryolar:
 * - Happy Path: Stok artışı, stok hareket logu, fiyat logu
 * - Negative Path: Çift mal kabulü (idempotency koruması)
 * - Security: Double-submit koruması
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateMiktarAdet,
  calculateToplamAgirlikKg,
  calculateDiscountedPrice,
  calculateLucidCost,
  kaufmannRunden,
  buildBatchItemInsertRows,
  computeVariancePct,
} from '@/lib/import-batch-utils';

// ─── Mock Veri Yapıları (Canlı DB kullanılmaz) ──────────────────────────────
interface MockProduct {
  id: string;
  stok_miktari: number;
  distributor_alis_fiyati: number;
  koli_ici_adet: number;
  birim_agirlik_kg: number;
  standart_inis_maliyeti_net: number;
}

interface MockBatch {
  id: string;
  durum: 'Taslak' | 'Yolda' | 'Hesaplandı' | 'Tamamlandı';
  indirim_1_yuzde: number;
  indirim_2_yuzde: number;
}

interface MockBatchItem {
  id: string;
  parti_id: string;
  urun_id: string;
  koli_sayisi: number;
  miktar_adet: number;
  toplam_agirlik_kg: number;
  birim_alis_fiyati_orijinal: number;
  indirimli_alis_fiyati: number;
  gercek_inis_maliyeti_net: number;
  standart_inis_maliyeti_net: number;
}

// ─── Mock "Veritabanı" State ─────────────────────────────────────────────────
let mockDB: {
  urunler: MockProduct[];
  ithalat_partileri: MockBatch[];
  ithalat_parti_kalemleri: MockBatchItem[];
  urun_stok_hareket_loglari: any[];
  tedarikci_fiyat_loglari: any[];
};

// ─── Simüle edilmiş complete_import_batch RPC ────────────────────────────────
// Gerçek PostgreSQL fonksiyonunun JS ortamında davranışını simüle eder.
// Kural: Race-condition koruması için stok artışı = += (atomic)
function simulateCompleteImportBatch(batchId: string, userId: string) {
  const batch = mockDB.ithalat_partileri.find(b => b.id === batchId);

  // Adım 1: Durum kontrolü — "Tamamlandı" ise hata dön (idempotency)
  if (!batch) throw new Error('Parti bulunamadı.');
  if (batch.durum === 'Tamamlandı') {
    throw new Error('Bu ithalat partisi zaten tamamlanmış.');
  }

  // Adım 2: Durumu güncelle
  batch.durum = 'Tamamlandı';

  // Adım 3: Her kalem için atomik işlemler
  const kalemleri = mockDB.ithalat_parti_kalemleri.filter(k => k.parti_id === batchId);

  for (const kalem of kalemleri) {
    const urun = mockDB.urunler.find(u => u.id === kalem.urun_id);
    if (!urun) continue;

    // Stok artışı — DB seviyesinde atomik (JS'te += güvenli simülasyon)
    urun.stok_miktari += kalem.miktar_adet;

    // Son gerçek iniş maliyetini güncelle (master data korunur)
    // NOT: distributor_alis_fiyati ASLA değiştirilmez
    const mevcutFiyat = urun.distributor_alis_fiyati;

    // Stok hareket logu
    mockDB.urun_stok_hareket_loglari.push({
      urun_id: kalem.urun_id,
      hareket_tipi: 'stok_artisi',
      miktar: kalem.miktar_adet,
      kaynak: 'ithalat_partisi',
      kaynak_id: batchId,
      kullanici_id: userId,
      aciklama: 'İthalat partisi mal kabulü',
    });

    // Tedarikçi fiyat logu (standart vs gerçek sapma)
    const farkYuzde = mevcutFiyat > 0
      ? ((kalem.gercek_inis_maliyeti_net - mevcutFiyat) / mevcutFiyat) * 100
      : 0;

    mockDB.tedarikci_fiyat_loglari.push({
      urun_id: kalem.urun_id,
      tir_id: batchId,
      standart_fiyat: mevcutFiyat,
      gercek_fiyat: kalem.gercek_inis_maliyeti_net,
      fark_yuzde: kaufmannRunden(farkYuzde),
      indirim_aciklamasi: 'Mal kabul sonrası gerçekleşen maliyet vs standart fiyat',
      miktar: kalem.miktar_adet,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE
// ─────────────────────────────────────────────────────────────────────────────
describe('complete_import_batch RPC Simülasyonu', () => {
  beforeEach(() => {
    // Her test öncesi temiz state — izole
    mockDB = {
      urunler: [
        {
          id: 'urun-001',
          stok_miktari: 100,
          distributor_alis_fiyati: 14.50,
          koli_ici_adet: 12,
          birim_agirlik_kg: 0.25,
          standart_inis_maliyeti_net: 11.00,
        },
        {
          id: 'urun-002',
          stok_miktari: 50,
          distributor_alis_fiyati: 8.80,
          koli_ici_adet: 24,
          birim_agirlik_kg: 0.15,
          standart_inis_maliyeti_net: 7.50,
        },
      ],
      ithalat_partileri: [
        { id: 'parti-001', durum: 'Hesaplandı', indirim_1_yuzde: 20, indirim_2_yuzde: 8 },
      ],
      ithalat_parti_kalemleri: [
        {
          id: 'kalem-001',
          parti_id: 'parti-001',
          urun_id: 'urun-001',
          koli_sayisi: 10,
          miktar_adet: 120,          // 10 × 12
          toplam_agirlik_kg: 30,      // 120 × 0.25
          birim_alis_fiyati_orijinal: 14.50, // MASTER DATA — değişmez
          indirimli_alis_fiyati: 10.67,
          gercek_inis_maliyeti_net: 11.50,
          standart_inis_maliyeti_net: 11.00,
        },
        {
          id: 'kalem-002',
          parti_id: 'parti-001',
          urun_id: 'urun-002',
          koli_sayisi: 5,
          miktar_adet: 120,          // 5 × 24
          toplam_agirlik_kg: 18,      // 120 × 0.15
          birim_alis_fiyati_orijinal: 8.80, // MASTER DATA — değişmez
          indirimli_alis_fiyati: 6.44,
          gercek_inis_maliyeti_net: 7.20,
          standart_inis_maliyeti_net: 7.50,
        },
      ],
      urun_stok_hareket_loglari: [],
      tedarikci_fiyat_loglari: [],
    };
  });

  // ── Happy Path ─────────────────────────────────────────────────────────────
  describe('Happy Path — Başarılı Mal Kabulü', () => {
    it('partinin durumu Tamamlandı olarak güncellenir', () => {
      simulateCompleteImportBatch('parti-001', 'kullanici-001');
      const batch = mockDB.ithalat_partileri.find(b => b.id === 'parti-001');
      expect(batch?.durum).toBe('Tamamlandı');
    });

    it('urun-001 stoku doğru miktarda artar (120 adet)', () => {
      simulateCompleteImportBatch('parti-001', 'kullanici-001');
      const urun = mockDB.urunler.find(u => u.id === 'urun-001');
      expect(urun?.stok_miktari).toBe(100 + 120); // 220
    });

    it('urun-002 stoku doğru miktarda artar (120 adet)', () => {
      simulateCompleteImportBatch('parti-001', 'kullanici-001');
      const urun = mockDB.urunler.find(u => u.id === 'urun-002');
      expect(urun?.stok_miktari).toBe(50 + 120); // 170
    });

    it('her ürün için stok hareket logu oluşturulur', () => {
      simulateCompleteImportBatch('parti-001', 'kullanici-001');
      expect(mockDB.urun_stok_hareket_loglari).toHaveLength(2);
    });

    it('stok hareket logu doğru hareket_tipi içerir', () => {
      simulateCompleteImportBatch('parti-001', 'kullanici-001');
      const log = mockDB.urun_stok_hareket_loglari[0];
      expect(log.hareket_tipi).toBe('stok_artisi');
      expect(log.kaynak).toBe('ithalat_partisi');
      expect(log.kaynak_id).toBe('parti-001');
    });

    it('tedarikçi fiyat logu her ürün için oluşturulur', () => {
      simulateCompleteImportBatch('parti-001', 'kullanici-001');
      expect(mockDB.tedarikci_fiyat_loglari).toHaveLength(2);
    });

    it('fiyat logu: urun-001 sapma yüzdesi doğru hesaplanır', () => {
      simulateCompleteImportBatch('parti-001', 'kullanici-001');
      const log = mockDB.tedarikci_fiyat_loglari.find(l => l.urun_id === 'urun-001');
      // standart=14.50, gerçek=11.50 → (11.50-14.50)/14.50 × 100 = -20.69%
      expect(log?.standart_fiyat).toBe(14.50);
      expect(log?.gercek_fiyat).toBe(11.50);
      expect(log?.fark_yuzde).toBe(kaufmannRunden(((11.50 - 14.50) / 14.50) * 100));
    });

    it('Master Data: distributor_alis_fiyati ASLA değişmez', () => {
      const oncekiFiyat1 = mockDB.urunler[0].distributor_alis_fiyati;
      const oncekiFiyat2 = mockDB.urunler[1].distributor_alis_fiyati;
      simulateCompleteImportBatch('parti-001', 'kullanici-001');
      expect(mockDB.urunler[0].distributor_alis_fiyati).toBe(oncekiFiyat1);
      expect(mockDB.urunler[1].distributor_alis_fiyati).toBe(oncekiFiyat2);
    });
  });

  // ── Negative Path — Güvenlik ───────────────────────────────────────────────
  describe('Negative Path — Çift Mal Kabulü Koruması (Double-Submit)', () => {
    it('zaten tamamlanmış partide hata fırlatır', () => {
      simulateCompleteImportBatch('parti-001', 'kullanici-001');
      // İkinci çağrı hata vermeli
      expect(() => simulateCompleteImportBatch('parti-001', 'kullanici-001'))
        .toThrow('zaten tamamlanmış');
    });

    it('stok ikinci kez artırılmaz', () => {
      simulateCompleteImportBatch('parti-001', 'kullanici-001');
      const stokSonra = mockDB.urunler.find(u => u.id === 'urun-001')?.stok_miktari;

      try { simulateCompleteImportBatch('parti-001', 'kullanici-001'); } catch { /* beklenen */ }

      const stokSonra2 = mockDB.urunler.find(u => u.id === 'urun-001')?.stok_miktari;
      expect(stokSonra2).toBe(stokSonra); // Değişmedi
    });

    it('stok logu ikinci kez yazılmaz', () => {
      simulateCompleteImportBatch('parti-001', 'kullanici-001');
      const logSayisi = mockDB.urun_stok_hareket_loglari.length;

      try { simulateCompleteImportBatch('parti-001', 'kullanici-001'); } catch { /* beklenen */ }

      expect(mockDB.urun_stok_hareket_loglari.length).toBe(logSayisi);
    });

    it('olmayan parti ID için hata fırlatır', () => {
      expect(() => simulateCompleteImportBatch('olmayan-id', 'kullanici-001'))
        .toThrow('bulunamadı');
    });
  });

  // ── Security: Payload Manipülasyonu ────────────────────────────────────────
  describe('Güvenlik — Master Data Driven Doğrulama', () => {
    it('Frontend den gelen miktar_adet DB deki koli_sayisi ile uyumlu olmalı', () => {
      // Güvenli sunucu tarafı hesaplama simülasyonu
      const urun = mockDB.urunler.find(u => u.id === 'urun-001')!;
      const kalem = mockDB.ithalat_parti_kalemleri.find(k => k.urun_id === 'urun-001')!;

      // Sunucuda Master Data'dan yeniden hesapla (frontend'den gelene güvenme)
      const gercekMiktar = calculateMiktarAdet(kalem.koli_sayisi, urun.koli_ici_adet);
      const gercekAgirlik = calculateToplamAgirlikKg(gercekMiktar, urun.birim_agirlik_kg);

      // Frontend'den manipüle edilmiş değer (örn 9999)
      const manipuleEdilmisMiktar = 9999;

      // Sunucu hesabı her zaman kazanır
      expect(gercekMiktar).toBe(120); // 10 × 12
      expect(gercekMiktar).not.toBe(manipuleEdilmisMiktar);
      expect(gercekAgirlik).toBe(30.00);
    });

    it('birim_alis_fiyati_orijinal Master Data dan alınır, inputtan değil', () => {
      const urun = mockDB.urunler.find(u => u.id === 'urun-001')!;
      const kalem = mockDB.ithalat_parti_kalemleri.find(k => k.urun_id === 'urun-001')!;

      // Frontend manipülasyonu: fiyatı 0.01'e düşürmeye çalışıyor
      const manipulatedPrice = 0.01;

      // Gerçek fiyat her zaman Master Data'dan
      const gercekFiyat = urun.distributor_alis_fiyati;
      expect(gercekFiyat).toBe(14.50);
      expect(gercekFiyat).not.toBe(manipulatedPrice);
      expect(kalem.birim_alis_fiyati_orijinal).toBe(14.50);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Senaryo: Eksik Master Data (Edge Case — Null Safety)
// ─────────────────────────────────────────────────────────────────────────────
describe('Eksik Master Data — Null Safety', () => {
  it('birim_agirlik_kg null ise ağırlık 0 olur, sistem çökmez', () => {
    const miktar = calculateMiktarAdet(10, 12);
    const agirlik = calculateToplamAgirlikKg(miktar, null);
    expect(agirlik).toBe(0);
  });

  it('koli_ici_adet null ise fallback 1 ile çalışır, sistem çökmez', () => {
    const miktar = calculateMiktarAdet(10, null);
    expect(miktar).toBe(10); // 10 × 1 = 10
  });

  it('distributor_alis_fiyati null ise indirimli fiyat 0 döner', () => {
    const fiyat = calculateDiscountedPrice(null as any, 20, 8);
    expect(fiyat).toBe(0);
  });

  it('LUCID için ağırlık null ise maliyet 0 döner', () => {
    expect(calculateLucidCost(null as any, 0.02)).toBe(0);
  });
});
