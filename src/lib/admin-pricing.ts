/**
 * Admin Fiyat Hesaplama Utility
 * Mevcut CalculatorClient hesaplama mantığını paylaşılan fonksiyon olarak export eder.
 */

export interface PricingParams {
  purchase: number;
  shippingPerBox: number;
  customsPct: number;
  storageCost: number;
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
 * Excel mantığı: Maliyet → Distribütör Fiyatı (bizim satış) → Alt Bayi Fiyatı
 */
export function calculateAdminPrice(params: PricingParams): PricingResult {
  const {
    purchase,
    shippingPerBox,
    customsPct,
    storageCost,
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
  const validStorage = Number.isFinite(storageCost) ? Math.max(0, storageCost) : 0;
  const validOpr = Number.isFinite(operationalPct) ? Math.max(0, operationalPct) : 0;

  // Base cost calculation
  const baseCost = validCost
    + validShip
    + validCost * (validCst / 100)
    + validStorage
    + validCost * (validOpr / 100);

  // Distributor price (our selling price to dealers)
  const validDistMargin = Number.isFinite(distributorMarginPct)
    ? Math.min(95, Math.max(0, distributorMarginPct))
    : 25;
  const distributorPrice = baseCost * (1 + validDistMargin / 100);

  // Dealer price (dealer's selling price to end customers)
  const validDealerMargin = Number.isFinite(dealerMarginPct)
    ? Math.min(95, Math.max(0, dealerMarginPct))
    : 20;
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
