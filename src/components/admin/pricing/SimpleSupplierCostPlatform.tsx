'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { toast } from 'sonner';
import { bulkSaveProductPricesAction, saveProductPricesAction } from '@/app/actions/urun-fiyat-actions';
import { importSupplierPriceListAction } from '@/app/actions/supplier-price-import-actions';
import { savePricingDefaultsAction } from '@/app/actions/system-settings-actions';
import {
  getProductLineLabel,
  inferProductLineFromCategoryId,
  inferSupplierProfileFromProductLine,
  isProductLineKey,
  type ProductLineKey,
} from '@/lib/product-lines';
import { dedupeSuppliers, getCanonicalSupplierLabel, normalizeSupplierGroupKey } from '@/lib/supplier-utils';

type ProductLite = {
  id: string;
  ad: Record<string, string> | string | null;
  kategori_id?: string | null;
  tedarikci_id?: string | null;
  stok_miktari?: number | null;
  distributor_alis_fiyati?: number | null;
  satis_fiyati_alt_bayi?: number | null;
  satis_fiyati_toptanci?: number | null;
  satis_fiyati_musteri?: number | null;
  teknik_ozellikler?: Record<string, unknown> | null;
  urun_gami?: string | null;
  stok_kodu?: string | null;
  aktif?: boolean | null;
  birim_agirlik_kg?: number | null;
  lojistik_sinifi?: string | null;
  gumruk_vergi_orani_yuzde?: number | null;
  almanya_kdv_orani?: number | null;
  gunluk_depolama_maliyeti_eur?: number | null;
  ortalama_stokta_kalma_suresi?: number | null;
  fire_zayiat_orani_yuzde?: number | null;
  standart_inis_maliyeti_net?: number | null;
  son_gercek_inis_maliyeti_net?: number | null;
  son_maliyet_sapma_yuzde?: number | null;
  karlilik_alarm_aktif?: boolean | null;
};

type SupplierProfile = 'cold-chain' | 'non-cold';

type PricingRow = {
  product: ProductLite;
  profile: SupplierProfile;
  line: ProductLineKey;
  purchase: number;
  unitsPerBox: number;
  calculation: ReturnType<typeof calculatePricing>;
};

type RecentBatchLite = {
  id: string;
  referans_kodu: string;
  tedarikci_id?: string | null;
  navlun_soguk_eur?: number | null;
  navlun_kuru_eur?: number | null;
  gumruk_vergi_toplam_eur?: number | null;
  traces_numune_ardiye_eur?: number | null;
  varis_tarihi?: string | null;
  created_at?: string | null;
  durum?: string | null;
  itemCount?: number;
  totalQuantity?: number;
};

interface Props {
  locale: string;
  products: ProductLite[];
  categories?: Array<{ id: string; ad: Record<string, string> | string | null; slug?: string | null; ust_kategori_id?: string | null; urun_gami?: string | null }>;
  companies?: Array<{ id: string; unvan: string }>;
  suppliers?: Array<{ id: string; unvan: string | null }>;
  recentBatches?: RecentBatchLite[];
  systemSettings?: Record<string, unknown>;
}

const DEFAULT_FROZEN_SHIPPING_PER_BOX = 350 / 384;
const DEFAULT_NON_COLD_SHIPPING_PER_BOX = 0.45;
const DEFAULT_FROZEN_CUSTOMS_PCT = 15;
const DEFAULT_NON_COLD_CUSTOMS_PCT = 9;
const DEFAULT_CUSTOMER_PROFIT_PCT = 30;
const DEFAULT_WHOLESALE_PROFIT_PCT = 25;
const DEFAULT_RESELLER_PROFIT_PCT = 5;
const DEFAULT_STOCK_DAYS = 7;

function money(value: number) {
  if (!Number.isFinite(value)) return '0.00 €';
  return `${value.toFixed(2)} €`;
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Like toNumber, but treats null/undefined as missing (returns fallback instead of 0).
// Needed because Number(null) === 0 which is finite, so toNumber(null, default) wrongly returns 0.
function toNumberOrDefault(value: unknown, fallback: number): number {
  if (value === null || value === undefined) return fallback;
  return toNumber(value, fallback);
}

function round2(value: number) {
  return Number(toNumber(value, 0).toFixed(2));
}

function roundToStep(value: number, step: number) {
  const safeValue = toNumber(value, 0);
  const safeStep = toNumber(step, 0);
  if (!safeStep || safeStep <= 0) return round2(safeValue);
  return round2(Math.round(safeValue / safeStep) * safeStep);
}

function inferUnitsPerBox(raw: Record<string, unknown> | null | undefined): number {
  if (!raw || typeof raw !== 'object') return 1;
  const keys = [
    'dilim',
    'dilim_sayisi',
    'dilimsayisi',
    'porsiyon',
    'porsiyon_sayisi',
    'portion',
    'portions',
    'slice',
    'slices',
    'slice_count',
  ];

  for (const key of Object.keys(raw)) {
    const lowered = key.toLowerCase();
    if (!keys.some((candidate) => lowered.includes(candidate))) continue;

    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.max(1, Math.floor(value));
    }
    if (typeof value === 'string') {
      const match = value.match(/(\d{1,3})/);
      if (match) {
        const parsed = Number.parseInt(match[1], 10);
        if (parsed > 0) return parsed;
      }
    }
  }

  return 1;
}

function getPositiveInt(raw: Record<string, unknown> | null | undefined, keys: string[], fallback = 1) {
  if (!raw || typeof raw !== 'object') return fallback;

  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.max(1, Math.floor(value));
    }
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return fallback;
}

function getNumericMetric(raw: Record<string, unknown> | null | undefined, keys: string[], fallback = 0) {
  if (!raw || typeof raw !== 'object') return fallback;

  for (const key of keys) {
    const value = raw[key];
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return fallback;
}

function getPackagingMetrics(raw: Record<string, unknown> | null | undefined, fallbackUnits: number) {
  const unitsPerBox = Math.max(1, getPositiveInt(raw, ['kutu_ici_adet', 'dilim_sayisi', 'slice_count'], fallbackUnits));
  const boxesPerCase = Math.max(1, getPositiveInt(raw, ['koli_ici_kutu_adet'], 1));
  const casesPerPallet = Math.max(1, getPositiveInt(raw, ['palet_ici_koli_adet'], 1));

  return {
    unitsPerBox,
    boxesPerCase,
    casesPerPallet,
    unitsPerCase: unitsPerBox * boxesPerCase,
    boxesPerPallet: boxesPerCase * casesPerPallet,
    unitsPerPallet: unitsPerBox * boxesPerCase * casesPerPallet,
  };
}

function buildLevelPrices(perUnitNet: number, packaging: ReturnType<typeof getPackagingMetrics>, discounts: { box: number; case: number; pallet: number }) {
  return {
    unit: perUnitNet,
    box: perUnitNet * packaging.unitsPerBox * (1 - discounts.box / 100),
    case: perUnitNet * packaging.unitsPerCase * (1 - discounts.case / 100),
    pallet: perUnitNet * packaging.unitsPerPallet * (1 - discounts.pallet / 100),
  };
}

function getLocalizedText(raw: unknown, locale: string, fallback = 'Ürün') {
  if (typeof raw === 'string' && raw.trim().length > 0) return raw;
  const localized = raw?.[locale];
  if (typeof localized === 'string' && localized.trim().length > 0) return localized;
  if (raw && typeof raw === 'object') {
    const firstText = Object.values(raw).find((value) => typeof value === 'string' && value.trim().length > 0);
    if (typeof firstText === 'string') return firstText;
  }
  return fallback;
}

function profileLabel(profile: SupplierProfile) {
  return profile === 'cold-chain' ? 'Donuk' : 'Donuk olmayan';
}

function profileToProductLine(profile: SupplierProfile): ProductLineKey {
  return profile === 'cold-chain' ? 'frozen-desserts' : 'barista-bakery-essentials';
}

type PanelTone = 'slate' | 'amber' | 'rose' | 'violet';

function CollapsiblePanel({
  title,
  description,
  tone = 'slate',
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  tone?: PanelTone;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const toneStyles: Record<PanelTone, { wrapper: string; title: string; description: string; button: string }> = {
    slate: {
      wrapper: 'border-slate-200 bg-white',
      title: 'text-slate-900',
      description: 'text-slate-500',
      button: 'border-slate-200 bg-slate-50 text-slate-700',
    },
    amber: {
      wrapper: 'border-amber-200 bg-amber-50/60',
      title: 'text-amber-900',
      description: 'text-amber-800',
      button: 'border-amber-300 bg-white text-amber-900',
    },
    rose: {
      wrapper: 'border-rose-200 bg-rose-50/40',
      title: 'text-rose-900',
      description: 'text-rose-800',
      button: 'border-rose-200 bg-white text-rose-800',
    },
    violet: {
      wrapper: 'border-violet-200 bg-violet-50/40',
      title: 'text-violet-900',
      description: 'text-violet-800',
      button: 'border-violet-300 bg-white text-violet-700',
    },
  };

  const styles = toneStyles[tone];

  return (
    <details open={defaultOpen} className={`group rounded-xl border p-4 ${styles.wrapper}`}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${styles.title}`}>{title}</p>
          {description ? <p className={`mt-1 text-xs ${styles.description}`}>{description}</p> : null}
        </div>
        <span className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${styles.button}`}>
          <span className="hidden sm:inline">Aç / Kapat</span>
          <FiChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>

      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}

function calculatePricing(params: {
  purchase: number;
  shippingPerBox: number;
  customsPct: number;
  operationalPct: number;
  taxPct: number;
  customerProfitPct: number;
  wholesaleProfitPct: number;
  resellerProfitPct: number;
  unitsPerBox: number;
  roundStep?: number;
  weightKg?: number;
  docsPerKg?: number;
  storageDaily?: number;
  stockDays?: number;
  wastePct?: number;
  standardLandedCost?: number;
}) {
  const purchase = Math.max(0, toNumber(params.purchase, 0));
  const shipping = Math.max(0, toNumber(params.shippingPerBox, 0));
  const customsRate = Math.max(0, toNumber(params.customsPct, 0)) / 100;
  const operationalRate = Math.max(0, toNumber(params.operationalPct, 0)) / 100;
  const taxRate = Math.max(0, toNumber(params.taxPct, 0)) / 100;
  const customerProfit = Math.max(0, toNumber(params.customerProfitPct, 0)) / 100;
  const wholesaleProfit = Math.max(0, toNumber(params.wholesaleProfitPct, 0)) / 100;
  const resellerProfit = Math.max(0, toNumber(params.resellerProfitPct, 0)) / 100;
  const unitCount = Math.max(1, Math.floor(toNumber(params.unitsPerBox, 1)));
  const roundStep = Math.max(0, toNumber(params.roundStep, 0));

  const weightKg = Math.max(0, toNumber(params.weightKg, 0));
  const docsPerKg = Math.max(0, toNumber(params.docsPerKg, 0));
  const storageDaily = Math.max(0, toNumber(params.storageDaily, 0));
  const stockDays = Math.max(0, toNumber(params.stockDays, 0));
  const wasteRate = Math.max(0, toNumber(params.wastePct, 0)) / 100;

  const costBeforeCustoms = purchase + shipping;
  const customsCost = costBeforeCustoms * customsRate;
  const preOperational = costBeforeCustoms + customsCost;
  const operationalCost = preOperational * operationalRate;

  const landedCost = preOperational + operationalCost;

  const resellerNet = roundToStep(landedCost * (1 + resellerProfit), roundStep);
  const wholesaleNet = roundToStep(landedCost * (1 + wholesaleProfit), roundStep);
  const customerNet = roundToStep(landedCost * (1 + customerProfit), roundStep);
  const customerTax = round2(customerNet * taxRate);
  const customerGross = roundToStep(customerNet + customerTax, roundStep);

  return {
    unitCount,
    shippingCost: round2(shipping),
    customsCost: round2(customsCost),
    docsCost: 0,
    storageCost: 0,
    wasteCost: 0,
    preOperational: round2(preOperational),
    operationalCost: round2(operationalCost),
    estimatedLandedCost: round2(landedCost),
    landedCost: round2(landedCost),
    resellerNet,
    wholesaleNet,
    customerNet,
    customerTax,
    customerGross,
    landedPerUnit: round2(landedCost / unitCount),
    resellerPerUnit: round2(resellerNet / unitCount),
    wholesalePerUnit: round2(wholesaleNet / unitCount),
    customerPerUnit: round2(customerNet / unitCount),
    manualLandedCostUsed: false,
  };
}

export default function SimpleSupplierCostPlatform({ locale, products, categories = [], suppliers = [], recentBatches = [], systemSettings }: Props) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [isPersisting, startPersisting] = useTransition();
  const [isImporting, startImporting] = useTransition();
  const [selectedProfile, setSelectedProfile] = useState<SupplierProfile>('cold-chain');
  const [focusedProductId, setFocusedProductId] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [productSearch, setProductSearch] = useState<string>('');
  const [importSupplierId, setImportSupplierId] = useState<string>('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [lastImportSummary, setLastImportSummary] = useState<string>('');
  const [productCostInputs, setProductCostInputs] = useState<Record<string, number>>(() => (
    Object.fromEntries(products.map((product) => [product.id, toNumber(product.distributor_alis_fiyati, 0)]))
  ));
  const [productProfileOverrides, setProductProfileOverrides] = useState<Record<string, SupplierProfile>>({});
  const [profileInputs, setProfileInputs] = useState<Record<SupplierProfile, { shippingPerBox: number; customsPct: number }>>(() => ({
    'cold-chain': {
      shippingPerBox: toNumber(systemSettings?.pricing_shipping_frozen_per_box, DEFAULT_FROZEN_SHIPPING_PER_BOX),
      customsPct: toNumber(systemSettings?.pricing_customs_frozen_percent, toNumber(systemSettings?.pricing_customs_percent, DEFAULT_FROZEN_CUSTOMS_PCT)),
    },
    'non-cold': {
      shippingPerBox: toNumber(systemSettings?.pricing_shipping_non_cold_per_box, DEFAULT_NON_COLD_SHIPPING_PER_BOX),
      customsPct: toNumber(systemSettings?.pricing_customs_non_cold_percent, toNumber(systemSettings?.pricing_customs_percent, DEFAULT_NON_COLD_CUSTOMS_PCT)),
    },
  }));
  const [operationalPct, setOperationalPct] = useState<number>(toNumberOrDefault(systemSettings?.pricing_operational_percent, 15));
  const [taxPct, setTaxPct] = useState<number>(toNumberOrDefault(systemSettings?.pricing_vat_rate, 7));
  const [roundStep, setRoundStep] = useState<number>(toNumberOrDefault(systemSettings?.pricing_round_step, 0));
  const [customerProfitPct, setCustomerProfitPct] = useState<number>(toNumberOrDefault(systemSettings?.pricing_tier3_margin_percent, toNumberOrDefault(systemSettings?.pricing_target_profit_percent, DEFAULT_CUSTOMER_PROFIT_PCT)));
  const [wholesaleProfitPct, setWholesaleProfitPct] = useState<number>(toNumberOrDefault(systemSettings?.pricing_tier2_margin_percent, DEFAULT_WHOLESALE_PROFIT_PCT));
  const [resellerProfitPct, setResellerProfitPct] = useState<number>(toNumberOrDefault(systemSettings?.pricing_tier1_margin_percent, toNumberOrDefault(systemSettings?.pricing_reseller_profit_percent, DEFAULT_RESELLER_PROFIT_PCT)));
  const boxDiscountPct = toNumber(systemSettings?.pricing_box_discount_percent, 0);
  const caseDiscountPct = toNumber(systemSettings?.pricing_case_discount_percent, 4);
  const palletDiscountPct = toNumber(systemSettings?.pricing_pallet_discount_percent, 8);
  const coldDocsPerKg = toNumber(systemSettings?.pricing_cold_docs_per_kg_eur, 0.18);
  const dryDocsPerKg = toNumber(systemSettings?.pricing_dry_docs_per_kg_eur, 0.02);
  const coldStorageDaily = toNumber(systemSettings?.pricing_storage_cold_daily_eur, 0.15);
  const dryStorageDaily = toNumber(systemSettings?.pricing_storage_dry_daily_eur, 0.01);
  const smallOrderMoqUnits = toNumber(systemSettings?.pricing_small_order_moq_units, 20);
  const smallOrderFeeEur = toNumber(systemSettings?.pricing_small_order_fee_eur, 25);
  const varianceAlertThreshold = toNumber(systemSettings?.pricing_variance_alert_threshold_percent, 5);

  const appLocale = (locale === 'de' || locale === 'en' || locale === 'tr' || locale === 'ar' ? locale : 'tr');
  const dedupedSuppliers = useMemo(() => dedupeSuppliers(suppliers), [suppliers]);
  const supplierNameById = useMemo(
    () => Object.fromEntries(suppliers.map((supplier) => [supplier.id, getCanonicalSupplierLabel(supplier.unvan)])) as Record<string, string>,
    [suppliers]
  );
  const supplierGroupById = useMemo(
    () => Object.fromEntries(suppliers.map((supplier) => [supplier.id, normalizeSupplierGroupKey(supplier.unvan) || supplier.id])) as Record<string, string>,
    [suppliers]
  );
  const productName = (product: ProductLite) => getLocalizedText(product.ad, locale, 'Ürün');
  const productSupplierLabel = (product: ProductLite) => {
    if (!product.tedarikci_id) return 'Kaynak belirtilmedi';
    return supplierNameById[product.tedarikci_id] || 'Kaynak belirtilmedi';
  };

  const rows = useMemo<PricingRow[]>(() => {
    const getStoredLine = (product: ProductLite): ProductLineKey => {
      if (isProductLineKey(product.urun_gami)) return product.urun_gami;
      return inferProductLineFromCategoryId(categories, product.kategori_id) || 'barista-bakery-essentials';
    };

    const getProductProfile = (product: ProductLite): SupplierProfile => {
      return productProfileOverrides[product.id] || inferSupplierProfileFromProductLine(getStoredLine(product));
    };

    return [...products]
      .sort((left, right) => getLocalizedText(left.ad, locale, 'Ürün').localeCompare(getLocalizedText(right.ad, locale, 'Ürün'), 'tr'))
      .map((product) => {
        const profile = getProductProfile(product);
        const line = productProfileOverrides[product.id]
          ? profileToProductLine(profile)
          : getStoredLine(product);
        const purchase = toNumber(productCostInputs[product.id], toNumber(product.distributor_alis_fiyati, 0));
        const unitsPerBox = inferUnitsPerBox(product.teknik_ozellikler);
        const logisticsClass = (product.lojistik_sinifi || String((product.teknik_ozellikler as Record<string, unknown> | null)?.lojistik_sinifi || '')).toLowerCase();
        const isColdLogistics = logisticsClass === 'cold-chain' || (logisticsClass !== 'dry-load' && profile === 'cold-chain');
        const weightKg = toNumber(product.birim_agirlik_kg, getNumericMetric(product.teknik_ozellikler, ['birim_agirlik_kg', 'agirlik_kg', 'weight_kg'], 0));
        const docsPerKg = isColdLogistics ? coldDocsPerKg : dryDocsPerKg;
        const storageDaily = toNumberOrDefault(product.gunluk_depolama_maliyeti_eur, isColdLogistics ? coldStorageDaily : dryStorageDaily);
        const stockDays = toNumberOrDefault(product.ortalama_stokta_kalma_suresi, getNumericMetric(product.teknik_ozellikler, ['ortalama_stokta_kalma_suresi', 'stok_gun'], DEFAULT_STOCK_DAYS));
        const wastePct = toNumber(product.fire_zayiat_orani_yuzde, getNumericMetric(product.teknik_ozellikler, ['fire_zayiat_orani_yuzde', 'fire_orani'], 0));
        const calculation = calculatePricing({
          purchase,
          shippingPerBox: profileInputs[profile].shippingPerBox,
          customsPct: toNumber(product.gumruk_vergi_orani_yuzde, profileInputs[profile].customsPct),
          operationalPct,
          taxPct: toNumber(product.almanya_kdv_orani, taxPct),
          customerProfitPct,
          wholesaleProfitPct,
          resellerProfitPct,
          unitsPerBox,
          weightKg,
          docsPerKg,
          storageDaily,
          stockDays,
          wastePct,
          standardLandedCost: toNumber(product.standart_inis_maliyeti_net, 0),
          roundStep,
        });

        return {
          product,
          profile,
          line,
          purchase,
          unitsPerBox,
          calculation,
        };
      });
  }, [products, locale, categories, productCostInputs, productProfileOverrides, profileInputs, operationalPct, taxPct, customerProfitPct, wholesaleProfitPct, resellerProfitPct, coldDocsPerKg, dryDocsPerKg, coldStorageDaily, dryStorageDaily, roundStep]);

  const visibleRows = useMemo(() => {
    const search = productSearch.trim().toLocaleLowerCase('tr');
    const selectedSupplierGroupKey = selectedSupplierId !== 'all' && selectedSupplierId !== 'unassigned'
      ? supplierGroupById[selectedSupplierId] || selectedSupplierId
      : selectedSupplierId;

    return rows.filter((row) => {
      if (row.profile !== selectedProfile) return false;

      const rowSupplierGroupKey = row.product.tedarikci_id
        ? supplierGroupById[row.product.tedarikci_id] || row.product.tedarikci_id
        : '';

      const matchesSupplier = selectedSupplierId === 'all'
        ? true
        : selectedSupplierId === 'unassigned'
          ? !row.product.tedarikci_id
          : Boolean(rowSupplierGroupKey && rowSupplierGroupKey === selectedSupplierGroupKey);

      if (!matchesSupplier) return false;
      if (!search) return true;

      const localizedName = getLocalizedText(row.product.ad, locale, 'Ürün').toLocaleLowerCase('tr');
      const stockCode = String(row.product.stok_kodu || '').toLocaleLowerCase('tr');
      const supplierName = String(row.product.tedarikci_id ? supplierNameById[row.product.tedarikci_id] || '' : '').toLocaleLowerCase('tr');

      return localizedName.includes(search) || stockCode.includes(search) || supplierName.includes(search);
    });
  }, [rows, selectedProfile, selectedSupplierId, productSearch, locale, supplierNameById, supplierGroupById]);

  const coldCount = rows.filter((row) => row.profile === 'cold-chain').length;
  const nonColdCount = rows.filter((row) => row.profile === 'non-cold').length;
  const readyRows = visibleRows.filter((row) => row.purchase > 0);

  useEffect(() => {
    if (!visibleRows.some((row) => row.product.id === focusedProductId)) {
      setFocusedProductId(visibleRows[0]?.product.id || '');
    }
  }, [visibleRows, focusedProductId]);

  const activeRow = visibleRows.find((row) => row.product.id === focusedProductId) || visibleRows[0] || null;
  const currentShipping = profileInputs[selectedProfile].shippingPerBox;
  const currentCustoms = profileInputs[selectedProfile].customsPct;
  const activePackaging = activeRow ? getPackagingMetrics(activeRow.product.teknik_ozellikler, activeRow.unitsPerBox) : null;
  const activeWholesalePrices = activeRow && activePackaging
    ? {
        reseller: buildLevelPrices(activeRow.calculation.resellerPerUnit, activePackaging, {
          box: boxDiscountPct,
          case: caseDiscountPct,
          pallet: palletDiscountPct,
        }),
        wholesale: buildLevelPrices(activeRow.calculation.wholesalePerUnit, activePackaging, {
          box: boxDiscountPct,
          case: caseDiscountPct,
          pallet: palletDiscountPct,
        }),
        customer: buildLevelPrices(activeRow.calculation.customerPerUnit, activePackaging, {
          box: boxDiscountPct,
          case: caseDiscountPct,
          pallet: palletDiscountPct,
        }),
      }
    : null;

  const alertRows = useMemo(
    () => [...rows]
      .filter((row) => row.product.karlilik_alarm_aktif || Math.abs(toNumber(row.product.son_maliyet_sapma_yuzde, 0)) >= varianceAlertThreshold)
      .sort((left, right) => Math.abs(toNumber(right.product.son_maliyet_sapma_yuzde, 0)) - Math.abs(toNumber(left.product.son_maliyet_sapma_yuzde, 0)))
      .slice(0, 8),
    [rows, varianceAlertThreshold]
  );

  const updateProfileInputs = (patch: Partial<{ shippingPerBox: number; customsPct: number }>) => {
    setProfileInputs((prev) => ({
      ...prev,
      [selectedProfile]: {
        ...prev[selectedProfile],
        ...patch,
      },
    }));
  };

  const persistDefaults = (payload: Record<string, number>, successMessage: string) => {
    startPersisting(async () => {
      const response = await savePricingDefaultsAction(payload, locale);
      if (response?.error) {
        toast.error(response.error);
        return;
      }
      toast.success(successMessage);
    });
  };

  const saveCurrentProfileDefaults = () => {
    persistDefaults(
      selectedProfile === 'cold-chain'
        ? {
            pricing_shipping_frozen_per_box: currentShipping,
            pricing_customs_frozen_percent: currentCustoms,
          }
        : {
            pricing_shipping_non_cold_per_box: currentShipping,
            pricing_customs_non_cold_percent: currentCustoms,
          },
      'Secili urun tipi icin varsayilanlar kaydedildi.'
    );
  };

  const saveMarginDefaults = () => {
    persistDefaults(
      {
        pricing_operational_percent: operationalPct,
        pricing_vat_rate: taxPct,
        pricing_tier1_margin_percent: resellerProfitPct,
        pricing_tier2_margin_percent: wholesaleProfitPct,
        pricing_tier3_margin_percent: customerProfitPct,
        pricing_target_profit_percent: customerProfitPct,
        pricing_reseller_profit_percent: resellerProfitPct,
        pricing_round_step: roundStep,
      },
      'Kar oranlari ve gider varsayimlari kaydedildi.'
    );
  };

  const buildSaveItem = (row: PricingRow) => ({
    urunId: row.product.id,
    urun_gami: profileToProductLine(row.profile),
    distributor_alis_fiyati: round2(row.purchase),
    satis_fiyati_alt_bayi: round2(row.calculation.resellerNet),
    satis_fiyati_toptanci: round2(row.calculation.wholesaleNet),
    satis_fiyati_musteri: round2(row.calculation.customerNet),
    // Save the hub's full-model landing cost as the standard baseline for TIR variance comparison
    standart_inis_maliyeti_net: round2(row.calculation.landedCost),
  });

  const handleApplySingle = (row: PricingRow) => {
    if (row.purchase <= 0) {
      toast.error('Once bu urun icin alis maliyeti girin.');
      return;
    }

    startSaving(async () => {
      const response = await saveProductPricesAction(buildSaveItem(row), locale);
      if (response?.error) {
        toast.error(response.error);
        return;
      }

      toast.success(`${productName(row.product)} icin fiyatlar guncellendi.`);
    });
  };

  const handleApplyVisible = () => {
    if (readyRows.length === 0) {
      toast.error('Bu listede alis maliyeti girilmis urun yok.');
      return;
    }

    startSaving(async () => {
      const response = await bulkSaveProductPricesAction(
        { items: readyRows.map((row) => buildSaveItem(row)) },
        locale
      );

      if (response?.error) {
        toast.error(response.error);
        return;
      }

      const skippedCount = visibleRows.length - readyRows.length;
      const summary = skippedCount > 0
        ? `${response?.updatedCount || 0} urun guncellendi, ${skippedCount} urun alis maliyeti olmadigi icin atlandi.`
        : `${response?.updatedCount || 0} urunun fiyati tek seferde guncellendi.`;

      toast.success(summary);
    });
  };

  const handleProfileChange = (row: PricingRow, nextProfile: SupplierProfile) => {
    const previousProfile = row.profile;

    setProductProfileOverrides((prev) => ({
      ...prev,
      [row.product.id]: nextProfile,
    }));

    startSaving(async () => {
      const response = await saveProductPricesAction(
        {
          urunId: row.product.id,
          urun_gami: profileToProductLine(nextProfile),
        },
        locale
      );

      if (response?.error) {
        setProductProfileOverrides((prev) => ({
          ...prev,
          [row.product.id]: previousProfile,
        }));
        toast.error(response.error);
        return;
      }

      toast.success(`${productName(row.product)} artik ${profileLabel(nextProfile).toLowerCase()} listesinde.`);
    });
  };

  const handleImportFile = () => {
    if (!importFile) {
      toast.error('Lutfen once CSV veya Excel dosyasi secin.');
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('default_profile', selectedProfile);
    if (importSupplierId) {
      formData.append('default_supplier_id', importSupplierId);
    }

    startImporting(async () => {
      const response = await importSupplierPriceListAction(formData, locale);
      if (response?.error) {
        toast.error(response.error);
        return;
      }

      if (response?.updatedProducts && response.updatedProducts.length > 0) {
        setProductCostInputs((prev) => {
          const next = { ...prev };
          response.updatedProducts?.forEach((item) => {
            next[item.urunId] = item.distributor_alis_fiyati;
          });
          return next;
        });

        setProductProfileOverrides((prev) => {
          const next = { ...prev };
          response.updatedProducts?.forEach((item) => {
            if (item.urun_gami === 'frozen-desserts') next[item.urunId] = 'cold-chain';
            if (item.urun_gami === 'barista-bakery-essentials') next[item.urunId] = 'non-cold';
          });
          return next;
        });
      }

      const summary = `${response?.updatedCount || 0} urun guncellendi, ${response?.createdCount || 0} yeni urun olustu, ${response?.notFoundCount || 0} satir eslesmedi.`;
      setLastImportSummary(summary);
      toast.success(summary);
      setImportFile(null);
      if (importSupplierId) {
        setSelectedSupplierId(importSupplierId);
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {/* ─── Üst araç çubuğu ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        {/* Profil toggle */}
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => setSelectedProfile('cold-chain')}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${selectedProfile === 'cold-chain' ? 'bg-white text-rose-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Donuk ({coldCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedProfile('non-cold')}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${selectedProfile === 'non-cold' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Kuru ({nonColdCount})
          </button>
        </div>

        <input
          type="search"
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          placeholder="Ürün ara..."
          className="w-52 rounded-md border border-slate-200 px-3 py-1.5 text-sm"
        />
        <select
          value={selectedSupplierId}
          onChange={(e) => setSelectedSupplierId(e.target.value)}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm"
        >
          <option value="all">Tüm tedarikçiler</option>
          <option value="unassigned">Kaynaksız</option>
          {dedupedSuppliers.map((s) => (
            <option key={s.id} value={s.id}>{getCanonicalSupplierLabel(s.unvan)}</option>
          ))}
        </select>
        {productSearch && (
          <button type="button" onClick={() => setProductSearch('')} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-600">✕</button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500">{visibleRows.length} ürün · {readyRows.length} hazır</span>
          <button
            type="button"
            onClick={handleApplyVisible}
            disabled={isSaving || readyRows.length === 0}
            className="rounded-md bg-indigo-700 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSaving ? 'Kaydediliyor...' : `Tümünü Uygula (${readyRows.length})`}
          </button>
        </div>
      </div>

      {/* ─── Hesaplama parametreleri (katlanabilir) ────────────────────── */}
      <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
            Hesaplama Parametreleri
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              Nakliye {money(currentShipping)}/kutu · Gümrük %{currentCustoms} · Alt bayi %{resellerProfitPct} · Müşteri %{customerProfitPct}
            </span>
          </div>
          <span className="text-xs text-slate-400 group-open:hidden">Aç</span>
          <span className="hidden text-xs text-slate-400 group-open:inline">Kapat</span>
        </summary>
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Nakliye/Kutu (€)</label>
              <input type="number" min={0} step="0.01" value={currentShipping}
                onChange={(e) => updateProfileInputs({ shippingPerBox: toNumber(e.target.value, 0) })}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Gümrük (%)</label>
              <input type="number" min={0} step="0.1" value={currentCustoms}
                onChange={(e) => updateProfileInputs({ customsPct: toNumber(e.target.value, 0) })}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Operasyonel (%)</label>
              <input type="number" min={0} step="0.1" value={operationalPct}
                onChange={(e) => setOperationalPct(toNumber(e.target.value, 0))}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">KDV (%)</label>
              <input type="number" min={0} step="0.1" value={taxPct}
                onChange={(e) => setTaxPct(toNumber(e.target.value, 0))}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Alt Bayi Marjı (%)</label>
              <input type="number" min={0} step="0.1" value={resellerProfitPct}
                onChange={(e) => setResellerProfitPct(toNumber(e.target.value, DEFAULT_RESELLER_PROFIT_PCT))}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Müşteri Marjı (%)</label>
              <input type="number" min={0} step="0.1" value={customerProfitPct}
                onChange={(e) => setCustomerProfitPct(toNumber(e.target.value, DEFAULT_CUSTOMER_PROFIT_PCT))}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Yuvarlama</label>
              <select value={roundStep} onChange={(e) => setRoundStep(toNumber(e.target.value, 0))}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm">
                <option value={0}>Yok</option>
                <option value={0.05}>0.05</option>
                <option value={0.1}>0.10</option>
                <option value={0.5}>0.50</option>
                <option value={1}>1.00</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button type="button" onClick={saveCurrentProfileDefaults} disabled={isPersisting}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-60">
                {selectedProfile === 'cold-chain' ? 'Donuk' : 'Kuru'} kaydet
              </button>
              <button type="button" onClick={saveMarginDefaults} disabled={isPersisting}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60">
                Genel kaydet
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Toptan fiyat otomatik: <strong>%{wholesaleProfitPct}</strong> · Hesap: alış + nakliye + gümrük + operasyon = net maliyet
          </p>
        </div>
      </details>

      {/* ─── Ürün tablosu ─────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {visibleRows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            {productSearch ? 'Arama kriterine uyan ürün bulunamadı.' : 'Bu listede henüz ürün yok.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Ürün</th>
                  <th className="px-3 py-2.5 w-32">Alış (€/kutu)</th>
                  <th className="px-3 py-2.5 text-right w-28">Net Maliyet</th>
                  <th className="px-3 py-2.5 text-right w-28 text-blue-700">Alt Bayi</th>
                  <th className="px-3 py-2.5 text-right w-28 text-violet-700">Toptan</th>
                  <th className="px-3 py-2.5 text-right w-28 text-emerald-700">Kafe</th>
                  <th className="px-3 py-2.5 text-right w-24">Mevcut</th>
                  <th className="px-3 py-2.5 w-28 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((row) => {
                  const hasChanged = Math.abs(toNumber(productCostInputs[row.product.id], row.purchase) - toNumber(row.product.distributor_alis_fiyati, 0)) > 0.001;
                  return (
                    <tr key={row.product.id} className={`hover:bg-slate-50/60 transition ${hasChanged ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-4 py-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-slate-900 leading-snug">{productName(row.product)}</span>
                          <div className="flex flex-wrap items-center gap-1 text-[11px]">
                            {row.product.stok_kodu && <span className="text-slate-400">{row.product.stok_kodu}</span>}
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500">{productSupplierLabel(row.product)}</span>
                            <span className={`rounded-full px-1.5 py-0.5 font-medium ${row.profile === 'cold-chain' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {row.profile === 'cold-chain' ? 'Donuk' : 'Kuru'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={productCostInputs[row.product.id] ?? row.purchase}
                          onChange={(e) => setProductCostInputs((prev) => ({ ...prev, [row.product.id]: toNumber(e.target.value, 0) }))}
                          className={`w-full rounded-md border px-2 py-1.5 text-sm text-right ${hasChanged ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-800">{money(row.calculation.landedCost)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-blue-800">{money(row.calculation.resellerNet)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-violet-800">{money(row.calculation.wholesaleNet)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-800">{money(row.calculation.customerNet)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-[11px] text-slate-400 leading-tight block">{money(toNumber(row.product.satis_fiyati_musteri, 0))}</span>
                        <span className="text-[11px] text-slate-300 leading-tight block">{money(toNumber(row.product.satis_fiyati_alt_bayi, 0))}</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleApplySingle(row)}
                            disabled={isSaving || row.purchase <= 0}
                            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                          >
                            Uygula
                          </button>
                          <Link
                            href={`/${locale}/admin/urun-yonetimi/urunler/${row.product.id}`}
                            className="rounded-md border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            ↗
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* ─────────────────────────────────────────────────────────────── */}
      {/* Yorum: Eski bloklar (4-col header, sticky aside, card grid) kaldırıldı */}
      {false && <div className="space-y-6">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
          <h2 className="text-2xl font-bold text-slate-900">Basit fiyatlandirma sayfasi</h2>
          <p className="mt-2 text-sm text-slate-600">
            Donuk veya kuru gidayi secin, parametreleri kaydedin ve listeden toplu uygulayin.
            Ozel durumlar icin urun detayi her zaman acik kalir.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-2.5 py-1 font-semibold ${selectedProfile === 'cold-chain' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {selectedProfile === 'cold-chain' ? 'Donuk gida modu' : 'Kuru gida modu'}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{visibleRows.length} urun gorunuyor</span>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 font-medium text-blue-800">{readyRows.length} urun hazir</span>
          </div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Alt bayi</p>
          <p className="mt-2 text-2xl font-bold text-blue-900">%{resellerProfitPct}</p>
          <p className="mt-1 text-xs text-blue-800">Dusuk marj, hizli fiyat kontrolu</p>
        </div>

        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Toptan</p>
          <p className="mt-2 text-2xl font-bold text-violet-900">%{wholesaleProfitPct}</p>
          <p className="mt-1 text-xs text-violet-800">Sistemde otomatik hesaplanir</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Kafe / Perakende</p>
          <p className="mt-2 text-2xl font-bold text-emerald-900">%{customerProfitPct}</p>
          <p className="mt-1 text-xs text-emerald-800">Ana musteri satis fiyati</p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[330px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4 self-start lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:pr-1">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Urun tipi</p>
            <p className="mt-1 text-xs text-slate-500">Bu varsayilanlar secili gida tipi icin kullanilir.</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedProfile('cold-chain')}
                className={`rounded-lg border px-3 py-3 text-left transition ${
                  selectedProfile === 'cold-chain'
                    ? 'border-rose-300 bg-rose-50 text-rose-900'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <p className="text-sm font-semibold">Donuk gida</p>
                <p className="text-xs opacity-80">{coldCount} urun</p>
              </button>
              <button
                type="button"
                onClick={() => setSelectedProfile('non-cold')}
                className={`rounded-lg border px-3 py-3 text-left transition ${
                  selectedProfile === 'non-cold'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <p className="text-sm font-semibold">Kuru gida</p>
                <p className="text-xs opacity-80">{nonColdCount} urun</p>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Hesaplama Parametreleri</h3>
            <p className="mt-1 text-xs text-slate-500">Sadece bu alanlar secili fiyat hesabinda kullanilir.</p>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">Maliyet kalemleri</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Nakliye/Kutu (€)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={currentShipping}
                      onChange={(e) => updateProfileInputs({ shippingPerBox: toNumber(e.target.value, 0) })}
                      className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Gumruk (%)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={currentCustoms}
                      onChange={(e) => updateProfileInputs({ customsPct: toNumber(e.target.value, 0) })}
                      className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Operasyonel Giderler (%)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={operationalPct}
                      onChange={(e) => setOperationalPct(toNumber(e.target.value, 0))}
                      className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-800">Satis kurallari</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Alt Bayi Kar Marji (%)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={resellerProfitPct}
                      onChange={(e) => setResellerProfitPct(toNumber(e.target.value, DEFAULT_RESELLER_PROFIT_PCT))}
                      className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Musteri Kar Marji (%)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={customerProfitPct}
                      onChange={(e) => setCustomerProfitPct(toNumber(e.target.value, DEFAULT_CUSTOMER_PROFIT_PCT))}
                      className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">KDV Orani (%)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={taxPct}
                      onChange={(e) => setTaxPct(toNumber(e.target.value, 0))}
                      className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Yuvarlama Adimi</label>
                    <select
                      value={roundStep}
                      onChange={(e) => setRoundStep(toNumber(e.target.value, 0))}
                      className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value={0}>Yok</option>
                      <option value={0.05}>0.05</option>
                      <option value={0.1}>0.10</option>
                      <option value={0.5}>0.50</option>
                      <option value={1}>1.00</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 p-2.5 text-xs text-violet-900">
                  Toptan fiyat otomatik olarak <strong>%{wholesaleProfitPct}</strong> marj ile hesaplanir.
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveCurrentProfileDefaults}
                disabled={isPersisting}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
              >
                {isPersisting ? 'Kaydediliyor...' : `${selectedProfile === 'cold-chain' ? 'Donuk' : 'Kuru'} varsayilanini kaydet`}
              </button>
              <button
                type="button"
                onClick={saveMarginDefaults}
                disabled={isPersisting}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {isPersisting ? 'Kaydediliyor...' : 'Genel oranlari kaydet'}
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Hesap: <strong>alis + nakliye + gumruk + operasyon</strong> = net maliyet. Renkler sayesinde hangi alanin neyi etkiledigi daha kolay takip edilir.
            </p>
          </div>

          {activeRow && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Secili urun ozeti</p>
              <p className="mt-1 text-base font-bold text-slate-900">{productName(activeRow.product)}</p>
              <p className="text-xs text-slate-500">{productSupplierLabel(activeRow.product)} • {activeRow.unitsPerBox} birim/kutu</p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Net maliyet</p>
                  <p className="font-semibold text-slate-900">{money(activeRow.calculation.landedCost)}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-xs text-blue-700">Alt bayi</p>
                  <p className="font-semibold text-blue-900">{money(activeRow.calculation.resellerNet)}</p>
                </div>
                <div className="rounded-lg bg-violet-50 p-3">
                  <p className="text-xs text-violet-700">Toptan</p>
                  <p className="font-semibold text-violet-900">{money(activeRow.calculation.wholesaleNet)}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700">Kafe / Perakende</p>
                  <p className="font-semibold text-emerald-900">{money(activeRow.calculation.customerNet)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleApplySingle(activeRow)}
                  disabled={isSaving}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isSaving ? 'Kaydediliyor...' : 'Sadece bu urune uygula'}
                </button>
                <Link
                  href={`/${locale}/admin/urun-yonetimi/urunler/${activeRow.product.id}`}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Urun detayi
                </Link>
              </div>
            </div>
          )}
        </aside>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedProfile === 'cold-chain' ? 'Donuk gida listesi' : 'Kuru gida listesi'}</h3>
                <p className="text-sm text-slate-500">
                  {visibleRows.length} urun gorunuyor • {readyRows.length} urunde alis maliyeti var
                </p>
                <p className="text-xs text-slate-400">Soldaki ayarlar sabit kalir, sag tarafta urunleri rahatca gezebilirsiniz.</p>
              </div>

              <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-2 sm:flex-row sm:flex-wrap sm:items-center">
                <input
                  type="search"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Urun adi veya stok kodu ara..."
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm sm:w-72"
                />
                <select
                  value={selectedSupplierId}
                  onChange={(event) => setSelectedSupplierId(event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm sm:w-60"
                >
                  <option value="all">Tum tedarikciler</option>
                  <option value="unassigned">Kaynagi belirtilmeyenler</option>
                  {dedupedSuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{getCanonicalSupplierLabel(supplier.unvan)}</option>
                  ))}
                </select>
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => setProductSearch('')}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  >
                    Temizle
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyVisible}
              disabled={isSaving || readyRows.length === 0}
              className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSaving ? 'Kaydediliyor...' : `Gorunen ${readyRows.length} urune uygula`}
            </button>
          </div>

          <div className="mt-4">
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              Parti ve siparişten stok işleme akışı tedarikçi sipariş sayfasına taşındı.
              Bu ekran sadece fiyat hesaplama ve toplu fiyat uygulama için sadeleştirildi.
            </div>

            {visibleRows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                {productSearch ? 'Arama kriterine uyan urun bulunamadi.' : 'Bu listede henuz urun yok.'}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {visibleRows.map((row) => {
                  const isFocused = activeRow?.product.id === row.product.id;
                  return (
                    <div
                      key={row.product.id}
                      onClick={() => setFocusedProductId(row.product.id)}
                      className={`cursor-pointer rounded-2xl border p-4 transition ${
                        isFocused
                          ? 'border-indigo-300 bg-indigo-50/40 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          <p className="font-semibold text-slate-900">{productName(row.product)}</p>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            {row.product.stok_kodu && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">Kod: {row.product.stok_kodu}</span>}
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">{productSupplierLabel(row.product)}</span>
                            <span className={`rounded-full px-2 py-0.5 ${row.profile === 'cold-chain' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              {row.profile === 'cold-chain' ? 'Donuk' : 'Kuru'}
                            </span>
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">Stok: {toNumber(row.product.stok_miktari, 0)}</span>
                          </div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isFocused ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'}`}>
                          {isFocused ? 'Secili' : 'Urun'}
                        </span>
                      </div>

                      <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600">
                        Mevcut: Alt bayi {money(toNumber(row.product.satis_fiyati_alt_bayi, 0))} • Toptan {money(toNumber(row.product.satis_fiyati_toptanci, 0))} • Kafe {money(toNumber(row.product.satis_fiyati_musteri, 0))}
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                          <label className="mb-1 block text-[11px] font-medium text-slate-600">Alis / kutu</label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={productCostInputs[row.product.id] ?? row.purchase}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => {
                              const value = toNumber(event.target.value, 0);
                              setProductCostInputs((prev) => ({
                                ...prev,
                                [row.product.id]: value,
                              }));
                            }}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="rounded-lg bg-slate-50 p-2.5">
                          <p className="text-[11px] text-slate-500">Net maliyet</p>
                          <p className="font-semibold text-slate-900">{money(row.calculation.landedCost)}</p>
                          <p className="text-[11px] text-slate-500">Vergili kafe {money(row.calculation.customerGross)}</p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                        <div className="rounded-lg bg-blue-50 px-2.5 py-2">
                          <p className="text-[11px] text-blue-700">Alt bayi</p>
                          <p className="font-semibold text-blue-900">{money(row.calculation.resellerNet)}</p>
                        </div>
                        <div className="rounded-lg bg-violet-50 px-2.5 py-2">
                          <p className="text-[11px] text-violet-700">Toptan</p>
                          <p className="font-semibold text-violet-900">{money(row.calculation.wholesaleNet)}</p>
                        </div>
                        <div className="rounded-lg bg-emerald-50 px-2.5 py-2">
                          <p className="text-[11px] text-emerald-700">Kafe</p>
                          <p className="font-semibold text-emerald-900">{money(row.calculation.customerNet)}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleApplySingle(row);
                          }}
                          disabled={isSaving}
                          className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-60"
                        >
                          Uygula
                        </button>
                        <Link
                          href={`/${locale}/admin/urun-yonetimi/urunler/${row.product.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700"
                        >
                          Detay
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
      </div>}
    </div>
  );
}
