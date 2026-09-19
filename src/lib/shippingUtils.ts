// src/lib/shippingUtils.ts
// ===================================================================
// KARGO HESAPLAMA — TAM REVİZYON
// Alman Vergi Hukuku UStG Nebenleistung Prensibi:
//   - Gıda ürünleri %7 KDV → Kargo da %7 KDV
//   - Bölge A: Köln + Bonn öz teslimat (kendi araçla)
//   - Bölge B: Almanya geneli DHL/Spedition ağırlık bazlı
// ===================================================================

import { isKolnBonnArea } from './plzLookup';

// Kargo KDV oranı sabit: Nebenleistung = ana ürün oranı = gıda %7
export const SHIPPING_VAT_RATE = 0.07;

// -----------------------------------------------------------------------
// Kargo Tarife Ayarları (varsayılan değerler — admin panelinden override edilir)
// -----------------------------------------------------------------------
export interface ShippingSettings {
  // Köln + Bonn yerel teslimat
  kolnBonnFreeThreshold: number;   // ≥ X € net → ücretsiz (varsayılan: 150)
  kolnBonnFlatRateNet: number;      // < eşik → bu net ücret (varsayılan: 10)

  // Almanya Geneli DHL/Spedition — ağırlık dilimleri (net ücretler)
  dilim1MaxKg: number;              // 0 – X kg arası (varsayılan: 5)
  dilim1Net: number;                // (varsayılan: 6.99)
  dilim2MaxKg: number;              // X – Y kg arası (varsayılan: 15)
  dilim2Net: number;                // (varsayılan: 12.49)
  dilim3MaxKg: number;              // Y – Z kg arası (varsayılan: 31.5)
  dilim3Net: number;                // (varsayılan: 19.99)
  speditionNet: number;             // > Z kg Spedition (varsayılan: 49.99)

  // NOT: Ulusal kargo için ücretsiz eşik YOKTUR (her zaman ağırlık bazlı ücret alınır)
  // B2B gıda dağıtımında standart uygulama budur — ağır ürünlerde maliyet ciddi olabilir
}

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  kolnBonnFreeThreshold: 150,
  kolnBonnFlatRateNet: 10,
  dilim1MaxKg: 5,
  dilim1Net: 6.99,
  dilim2MaxKg: 15,
  dilim2Net: 12.49,
  dilim3MaxKg: 31.5,
  dilim3Net: 19.99,
  speditionNet: 49.99,
};

// -----------------------------------------------------------------------
// Sonuç Tipi — KDV ayrıştırılmış
// -----------------------------------------------------------------------
export interface ShippingCalculationResult {
  /** Teslimat bölgesi */
  zone: 'koln_bonn_local' | 'germany_national';
  /** Kendi aracımızla mı? (Köln/Bonn) */
  isLocalDelivery: boolean;
  /** Kargo ücretsiz mi? */
  isFreeShipping: boolean;
  /** Ücretsiz kargo eşiği (yalnızca yerel bölge için geçerli) */
  freeShippingThreshold: number;
  /** Kargo ücreti KDV hariç (net) */
  shippingCostNet: number;
  /** Kargo KDV oranı (0.07 = %7, sabit) */
  shippingVatRate: number;
  /** Kargo KDV tutarı */
  shippingVatAmount: number;
  /** Kargo ücreti KDV dahil (brüt) */
  shippingCostGross: number;
  /** Teslimat yöntemi adı */
  shippingMethodName: string;
  /** Kargo açıklaması */
  description: string;
  /** Kullanılan ağırlık bilgisi (kg) */
  weightKg?: number;
  /** Eski uyumluluk alanı — shippingCostGross ile aynı */
  shippingCost: number;
  /** Eski uyumluluk alanı — isLocalDelivery ile aynı */
  isKolnArea: boolean;
}

// -----------------------------------------------------------------------
// Yardımcı: Net ücret → KDV ayrıştırılmış sonuç oluştur
// -----------------------------------------------------------------------
function buildResult(
  params: {
    zone: ShippingCalculationResult['zone'];
    netCost: number;
    freeThreshold: number;
    isFree: boolean;
    methodName: string;
    description: string;
    weightKg?: number;
  }
): ShippingCalculationResult {
  const cost = params.isFree ? 0 : params.netCost;
  const vatAmount = Number((cost * SHIPPING_VAT_RATE).toFixed(2));
  const grossCost = Number((cost + vatAmount).toFixed(2));
  const isLocal = params.zone === 'koln_bonn_local';

  return {
    zone: params.zone,
    isLocalDelivery: isLocal,
    isFreeShipping: params.isFree,
    freeShippingThreshold: params.freeThreshold,
    shippingCostNet: cost,
    shippingVatRate: SHIPPING_VAT_RATE,
    shippingVatAmount: vatAmount,
    shippingCostGross: grossCost,
    shippingMethodName: params.methodName,
    description: params.description,
    weightKg: params.weightKg,
    // Geriye dönük uyumluluk
    shippingCost: grossCost,
    isKolnArea: isLocal,
  };
}

// -----------------------------------------------------------------------
// Ana Hesaplama Fonksiyonu
// -----------------------------------------------------------------------
/**
 * Kargo ücretini hesaplar.
 *
 * @param orderSubtotalNet  - Siparişin net ürün tutarı (KDV hariç)
 * @param plz               - Teslimat adresi PLZ kodu
 * @param totalWeightKg     - Toplam ağırlık (kg) — ulusal kargo için gerekli
 * @param settings          - Kargo tarifeleri (system_settings'den gelir, yoksa varsayılan)
 */
export function calculateShipping(
  orderSubtotalNet: number,
  plz?: string | null,
  totalWeightKg?: number,
  settings?: Partial<ShippingSettings>
): ShippingCalculationResult {
  const cfg: ShippingSettings = { ...DEFAULT_SHIPPING_SETTINGS, ...settings };
  const inKolnBonn = isKolnBonnArea(plz);

  // ─── BÖLGE A: Köln + Bonn — Öz Teslimat ───────────────────────────
  if (inKolnBonn) {
    const isFree = orderSubtotalNet >= cfg.kolnBonnFreeThreshold;
    const methodName = 'Köln & Bonn Direktauslieferung';

    return buildResult({
      zone: 'koln_bonn_local',
      netCost: cfg.kolnBonnFlatRateNet,
      freeThreshold: cfg.kolnBonnFreeThreshold,
      isFree,
      methodName,
      description: isFree
        ? `Kostenlose Lieferung (ab ${cfg.kolnBonnFreeThreshold} € Netto-Bestellwert im Köln & Bonn Liefergebiet)`
        : `Lokale Zustellpauschale Köln & Bonn: ${cfg.kolnBonnFlatRateNet.toFixed(2)} € (zzgl. ${(SHIPPING_VAT_RATE * 100).toFixed(0)}% MwSt.)`,
    });
  }

  // ─── BÖLGE B: Almanya Geneli — Ağırlık Bazlı ──────────────────────
  // NOT: Ulusal kargo için ücretsiz eşik uygulanmaz (B2B gıda standardı)
  const weightKg = totalWeightKg ?? 0;
  let netCost: number;
  let weightLabel: string;

  if (weightKg <= cfg.dilim1MaxKg) {
    netCost = cfg.dilim1Net;
    weightLabel = `bis ${cfg.dilim1MaxKg} kg`;
  } else if (weightKg <= cfg.dilim2MaxKg) {
    netCost = cfg.dilim2Net;
    weightLabel = `${cfg.dilim1MaxKg}–${cfg.dilim2MaxKg} kg`;
  } else if (weightKg <= cfg.dilim3MaxKg) {
    netCost = cfg.dilim3Net;
    weightLabel = `${cfg.dilim2MaxKg}–${cfg.dilim3MaxKg} kg`;
  } else {
    netCost = cfg.speditionNet;
    weightLabel = `über ${cfg.dilim3MaxKg} kg (Spedition)`;
  }

  const methodName = 'DHL / Spedition — Deutschlandweit';

  return buildResult({
    zone: 'germany_national',
    netCost,
    freeThreshold: 0, // Ulusal için ücretsiz eşik yok
    isFree: false,    // Her zaman ücretli
    methodName,
    description: `Versandpauschale Deutschlandweit (${weightLabel}): ${netCost.toFixed(2)} € (zzgl. ${(SHIPPING_VAT_RATE * 100).toFixed(0)}% MwSt.)`,
    weightKg,
  });
}
