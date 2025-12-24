/**
 * Admin Fiyat Hesaplama Utility
 * Mevcut CalculatorClient hesaplama mantığını paylaşılan fonksiyon olarak export eder.
 */

export interface PricingParams {
  purchase: number;
  shippingPerBox: number;
  customsPct: number;
  operationalPct: number;
  distributorMarginPct: number;
  dealerMarginPct: number;
  roundStep: number;
  slicesPerBox?: number;
}

export interface PricingResult {
  baseCost: number;
  distributor: {
    net: number;
    gross: number;
    perSliceNet?: number;
    perSliceGross?: number;
  };
  dealer: {
    net: number;
    gross: number;
    perSliceNet?: number;
    perSliceGross?: number;
  };
}

/**
 * Admin fiyat hesaplama fonksiyonu
 * Yeni Mantık (Basit Hesaplayıcı ile uyumlu):
 * 1. Fabrika Çıkış + Nakliye = Gümrük Öncesi Maliyet
 * 2. Gümrük Öncesi * (1 + Gümrük%) = Gümrüklü Maliyet
 * 3. Gümrüklü * (1 + Operasyonel%) = Nihai Maliyet (Landed Cost)
 */
export function calculateAdminPrice(params: PricingParams): PricingResult {
  const {
    purchase,
    shippingPerBox,
    customsPct,
    operationalPct,
    distributorMarginPct,
    dealerMarginPct,
    roundStep,
    slicesPerBox,
  } = params;

  // Validate inputs
  const validCost = Number.isFinite(purchase) ? Math.max(0, purchase) : 0;
  const validShip = Number.isFinite(shippingPerBox) ? Math.max(0, shippingPerBox) : 0;
  const validCst = Number.isFinite(customsPct) ? Math.max(0, customsPct) : 0;
  const validOpr = Number.isFinite(operationalPct) ? Math.max(0, operationalPct) : 0;

  // 1. Gümrük Öncesi (Fabrika + Nakliye)
  const costBeforeCustoms = validCost + validShip;

  // 2. Gümrüklü Maliyet
  const costAfterCustoms = costBeforeCustoms * (1 + validCst / 100);

  // 3. Nihai Maliyet (Operasyonel eklenmiş)
  const baseCost = costAfterCustoms * (1 + validOpr / 100);

  // Distributor price (our selling price to dealers)
  // Hedef Kâr Marjı üzerinden hesaplama: Cost * (1 + Margin)
  const validDistMargin = Number.isFinite(distributorMarginPct)
    ? Math.min(95, Math.max(0, distributorMarginPct))
    : 30;
  const distributorPrice = baseCost * (1 + validDistMargin / 100);

  // Dealer price (dealer's selling price to end customers)
  const validDealerMargin = Number.isFinite(dealerMarginPct)
    ? Math.min(95, Math.max(0, dealerMarginPct))
    : 20;
  // Alt bayi formülü: Distributor / (1 - Margin) mi yoksa Distributor * (1 + Margin) mi?
  // Basit hesaplayıcıda "Target Price" hesaplanıyordu.
  // Burada mevcut mantığı koruyalım veya basit hesaplayıcıya bakalım.
  // Basit hesaplayıcıda sadece "Target Price" var.
  // Burada "Dealer Price" genellikle "Tavsiye Edilen Satış Fiyatı"dır.
  // Eski kod: distributorPrice / (1 - validDealerMargin / 100)
  // Bu, "Dealer %20 marj kalsın istiyorsa satış fiyatı ne olmalı" mantığıdır.
  const dealerNet = distributorPrice / (1 - validDealerMargin / 100);

  // Apply rounding
  const distributorRounded = roundTo(distributorPrice, roundStep);
  const dealerRounded = roundTo(dealerNet, roundStep);

  // Add VAT (7%)
  const distributorGross = distributorRounded * 1.07;
  const dealerGross = dealerRounded * 1.07;

  // Per-slice calculation (optional)
  const spl = Number.isFinite(slicesPerBox as any) && slicesPerBox ? Number(slicesPerBox) : 0;
  const perSlice = (price: number) => (spl > 0 ? price / spl : undefined);

  return {
    baseCost,
    distributor: {
      net: distributorRounded,
      gross: distributorGross,
      perSliceNet: perSlice(distributorRounded),
      perSliceGross: perSlice(distributorGross),
    },
    dealer: {
      net: dealerRounded,
      gross: dealerGross,
      perSliceNet: perSlice(dealerRounded),
      perSliceGross: perSlice(dealerGross),
    },
  };
}

/**
 * Rounding helper
 */
function roundTo(value: number, step: number): number {
  if (!step || step <= 0) return value;
  const inv = 1 / step;
  return Math.round(value * inv) / inv;
}

/**
 * Format number helper (for display)
 */
export function formatPrice(n?: number | null): string {
  if (n == null) return '-';
  return Number(n).toFixed(2);
}
