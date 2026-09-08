import { inferProductLineFromCategoryId, inferSupplierProfileFromProductLine, isProductLineKey, type ProductLineKey, type SupplierProfile } from '@/lib/product-lines';

export interface HubPricingSettings {
  pricing_shipping_frozen_per_box?: number;
  pricing_shipping_non_cold_per_box?: number;
  pricing_customs_frozen_percent?: number;
  pricing_customs_non_cold_percent?: number;
  pricing_operational_percent?: number;
  pricing_vat_rate?: number;
  pricing_alt_bayi_margin?: number;
  pricing_koli_bazli_margin?: number;
  pricing_cok_koli_margin?: number;
  pricing_palet_margin?: number;
  pricing_round_step?: number;
  [key: string]: any;
}

export interface CalculatedPrices {
  landedCost: number;       // Net Maliyet
  altBayiNet: number;       // Alt Bayi (%1 marj) - en ucuz
  koliBazliNet: number;     // 1 Koli / Müşteri (%30 marj)
  cokKoliNet: number;       // 5 Koli+ / Toptancı (%20 marj)
  paletNet: number;         // Palet Bazlı (%10 marj)
  kdvGross: number;         // 1 Koli KDV Dahil
  profile: SupplierProfile; // cold-chain / non-cold
}

function r2(v: number): number {
  return Math.round((Number(v) || 0) * 100) / 100;
}

function roundToStep(v: number, step: number): number {
  if (!step || step <= 0) return r2(v);
  return r2(Math.round(v / step) * step);
}

export function calculateHubPrices(
  product: {
    distributor_alis_fiyati?: number | null;
    kategori_id?: string | null;
    urun_gami?: string[] | string | null;
    gumruk_vergi_orani_yuzde?: number | null;
    almanya_kdv_orani?: number | null;
  },
  categories?: any[],
  settings?: HubPricingSettings
): CalculatedPrices {
  const purchase = Math.max(0, Number(product.distributor_alis_fiyati) || 0);

  // Profile tespiti: Kuru vs Donuk
  const rawLine = Array.isArray(product.urun_gami) ? product.urun_gami[0] : product.urun_gami;
  const storedLine: ProductLineKey = isProductLineKey(rawLine)
    ? rawLine
    : (inferProductLineFromCategoryId(categories || [], product.kategori_id) || 'barista-bakery-essentials');
  const profile: SupplierProfile = inferSupplierProfileFromProductLine(storedLine);

  // Parametreler
  const isCold = profile === 'cold-chain';
  const shipping = Number(
    isCold
      ? (settings?.pricing_shipping_frozen_per_box ?? (350 / 384))
      : (settings?.pricing_shipping_non_cold_per_box ?? 0.45)
  ) || 0;

  const customsPct = Number(
    product.gumruk_vergi_orani_yuzde ??
    (isCold
      ? (settings?.pricing_customs_frozen_percent ?? 15)
      : (settings?.pricing_customs_non_cold_percent ?? 9))
  ) || 0;

  const operationalPct = Number(settings?.pricing_operational_percent ?? 20) || 0;
  const taxPct = Number(product.almanya_kdv_orani ?? settings?.pricing_vat_rate ?? 7) || 0;
  const roundStep = Number(settings?.pricing_round_step ?? 0) || 0;

  // Marjlar (Varsayılanlar: Alt Bayi %1, Palet %10, 5 Koli %20, 1 Koli %30)
  const altBayiPct = Number(settings?.pricing_alt_bayi_margin ?? settings?.pricing_tier1_margin_percent ?? 1);
  const koliBazliPct = Number(settings?.pricing_koli_bazli_margin ?? settings?.pricing_tier3_margin_percent ?? 30);
  const cokKoliPct = Number(settings?.pricing_cok_koli_margin ?? settings?.pricing_tier2_margin_percent ?? 20);
  const paletPct = Number(settings?.pricing_palet_margin ?? 10);

  // Maliyet Formülü (Hub ile birebir aynı)
  const beforeCustoms = purchase + shipping;
  const afterCustoms = beforeCustoms * (1 + customsPct / 100);
  const landedCost = afterCustoms * (1 + operationalPct / 100);

  // Kademe Fiyatları:
  // 1) Alt Bayi (En ucuz)
  const altBayiNet = roundToStep(landedCost * (1 + altBayiPct / 100), roundStep);
  // 2) Palet Bazlı (Müşteri için palet indirimi)
  const paletNet = roundToStep(landedCost * (1 + paletPct / 100), roundStep);
  // 3) 5 Koli+ (Toptan)
  const cokKoliNet = roundToStep(landedCost * (1 + cokKoliPct / 100), roundStep);
  // 4) 1 Koli (Standart Müşteri)
  const koliBazliNet = roundToStep(landedCost * (1 + koliBazliPct / 100), roundStep);

  const kdvGross = r2(koliBazliNet * (1 + taxPct / 100));

  return {
    landedCost: r2(landedCost),
    altBayiNet,
    paletNet,
    cokKoliNet,
    koliBazliNet,
    kdvGross,
    profile,
  };
}
