'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { FiChevronDown, FiChevronRight, FiSave, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'sonner';
import Link from 'next/link';
import { bulkSaveProductPricesAction, saveProductPricesAction } from '@/app/actions/urun-fiyat-actions';
import { savePricingDefaultsAction } from '@/app/actions/system-settings-actions';
import {
  inferProductLineFromCategoryId,
  inferSupplierProfileFromProductLine,
  isProductLineKey,
  type ProductLineKey,
} from '@/lib/product-lines';
import { dedupeSuppliers, getCanonicalSupplierLabel, normalizeSupplierGroupKey } from '@/lib/supplier-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  referans_fiyat?: number | null;
  tedarikci_url?: string | null;
  koli_ici_adet?: number | null;
  palet_ici_adet?: number | null;
};

type SupplierProfile = 'cold-chain' | 'non-cold';

type PricingRow = {
  product: ProductLite;
  profile: SupplierProfile;
  line: ProductLineKey;
  purchase: number;
  calculation: ReturnType<typeof calculatePricing>;
};

type TierOverride = { value: string; isManual: boolean };

interface Props {
  locale: string;
  products: ProductLite[];
  categories?: Array<{ id: string; ad: Record<string, string> | string | null; slug?: string | null; ust_kategori_id?: string | null; urun_gami?: string | null }>;
  companies?: Array<{ id: string; unvan: string }>;
  suppliers?: Array<{ id: string; unvan: string | null }>;
  recentBatches?: any[];
  systemSettings?: Record<string, unknown>;
}

// ─── Tier config ──────────────────────────────────────────────────────────────

const TIERS = [
  { key: 'altBayi',   label: '1 Palet',     color: 'blue',   dbField: 'satis_fiyati_alt_bayi'  },
  { key: 'koliBazli', label: '1 Koli',      color: 'violet', dbField: 'satis_fiyati_musteri'   },
  { key: 'cokKoli',   label: '5 Koli+',     color: 'emerald',dbField: 'satis_fiyati_toptanci'  },
] as const;

type TierKey = typeof TIERS[number]['key'] | 'palet';

const TIER_COLOR: Record<TierKey, { header: string; input: string; inputOverride: string; text: string }> = {
  altBayi:   { header: 'text-blue-700',   input: 'border-slate-200 bg-slate-50 text-slate-500',   inputOverride: 'border-blue-400 bg-blue-50 text-blue-900',   text: 'text-blue-800' },
  koliBazli: { header: 'text-violet-700', input: 'border-slate-200 bg-slate-50 text-slate-500',   inputOverride: 'border-violet-400 bg-violet-50 text-violet-900', text: 'text-violet-800' },
  cokKoli:   { header: 'text-emerald-700',input: 'border-slate-200 bg-slate-50 text-slate-500',   inputOverride: 'border-emerald-400 bg-emerald-50 text-emerald-900', text: 'text-emerald-800' },
  palet:     { header: 'text-orange-600', input: 'border-slate-200 bg-slate-50 text-slate-500',   inputOverride: 'border-orange-400 bg-orange-50 text-orange-900', text: 'text-orange-700' },
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_FROZEN_SHIPPING_PER_BOX = 350 / 384;
const DEFAULT_NON_COLD_SHIPPING_PER_BOX = 0.45;
const DEFAULT_FROZEN_CUSTOMS_PCT = 15;
const DEFAULT_NON_COLD_CUSTOMS_PCT = 9;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function money(v: number) {
  if (!Number.isFinite(v)) return '—';
  return `${v.toFixed(2)} €`;
}

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toNumOrDef(v: unknown, fallback: number): number {
  if (v === null || v === undefined) return fallback;
  return toNum(v, fallback);
}

function r2(v: number) { return Math.round(toNum(v, 0) * 100) / 100; }

function roundToStep(v: number, step: number) {
  if (!step || step <= 0) return r2(v);
  return r2(Math.round(v / step) * step);
}

function getLocalizedText(raw: unknown, locale: string, fallback = 'Ürün') {
  if (typeof raw === 'string' && raw.trim()) return raw;
  const loc = (raw as any)?.[locale];
  if (typeof loc === 'string' && loc.trim()) return loc;
  if (raw && typeof raw === 'object') {
    const first = Object.values(raw as object).find((v) => typeof v === 'string' && (v as string).trim());
    if (typeof first === 'string') return first;
  }
  return fallback;
}

function normalizeSearch(str: string): string {
  return str
    .toLowerCase()
    .replace(/ç/g, 'c').replace(/Ç/g, 'c')
    .replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
    .replace(/ı/g, 'i').replace(/İ/g, 'i')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o')
    .replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/â/g, 'a').replace(/î/g, 'i')
    .replace(/û/g, 'u');
}

function searchMatch(query: string, product: ProductLite, locale: string): boolean {
  if (!query.trim()) return true;
  const q = normalizeSearch(query);

  if (normalizeSearch(product.stok_kodu || '').includes(q)) return true;

  const ad = product.ad;
  if (ad && typeof ad === 'object') {
    for (const val of Object.values(ad)) {
      if (val && normalizeSearch(String(val)).includes(q)) return true;
    }
  } else if (typeof ad === 'string' && normalizeSearch(ad).includes(q)) return true;

  return false;
}

function profileToProductLine(profile: SupplierProfile): ProductLineKey {
  return profile === 'cold-chain' ? 'frozen-desserts' : 'barista-bakery-essentials';
}

// ─── Price calculation ────────────────────────────────────────────────────────

function calculatePricing(params: {
  purchase: number;
  shippingPerBox: number;
  customsPct: number;
  operationalPct: number;
  taxPct: number;
  altBayiPct: number;
  koliBazliPct: number;
  cokKoliPct: number;
  paletPct: number;
  roundStep?: number;
}) {
  const purchase = Math.max(0, toNum(params.purchase, 0));
  const shipping = Math.max(0, toNum(params.shippingPerBox, 0));
  const customs = Math.max(0, toNum(params.customsPct, 0)) / 100;
  const operational = Math.max(0, toNum(params.operationalPct, 0)) / 100;
  const taxRate = Math.max(0, toNum(params.taxPct, 0)) / 100;
  const step = Math.max(0, toNum(params.roundStep, 0));

  const beforeCustoms = purchase + shipping;
  const afterCustoms = beforeCustoms * (1 + customs);
  const landedCost = afterCustoms * (1 + operational);

  // Sale Price (KDV hariç) = Net Cost × (1 + Mod%)
  const altBayiNet   = roundToStep(landedCost * (1 + params.altBayiPct   / 100), step);
  const koliBazliNet = roundToStep(landedCost * (1 + params.koliBazliPct / 100), step);
  const cokKoliNet   = roundToStep(landedCost * (1 + params.cokKoliPct   / 100), step);
  const paletNet     = roundToStep(landedCost * (1 + params.paletPct     / 100), step);

  // Legacy aliases
  const resellerNet  = altBayiNet;
  const wholesaleNet = cokKoliNet;
  const customerNet  = koliBazliNet;

  return {
    landedCost: r2(landedCost),
    altBayiNet, koliBazliNet, cokKoliNet, paletNet,
    resellerNet, wholesaleNet, customerNet,
    customerGross: r2(koliBazliNet * (1 + taxRate)),
    resellerPerUnit: r2(altBayiNet),
    wholesalePerUnit: r2(cokKoliNet),
    customerPerUnit: r2(koliBazliNet),
    altBayiPerUnit: r2(altBayiNet),
    koliBazliPerUnit: r2(koliBazliNet),
    cokKoliPerUnit: r2(cokKoliNet),
    paletPerUnit: r2(paletNet),
    unitCount: 1,
    shippingCost: r2(shipping),
    customsCost: r2(beforeCustoms * customs),
    preOperational: r2(afterCustoms),
    operationalCost: r2(afterCustoms * operational),
    estimatedLandedCost: r2(landedCost),
    docsCost: 0, storageCost: 0, wasteCost: 0,
    koliBazliTax: r2(koliBazliNet * taxRate),
    koliBazliGross: r2(koliBazliNet * (1 + taxRate)),
    manualLandedCostUsed: false,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SimpleSupplierCostPlatform({
  locale, products, categories = [], suppliers = [], systemSettings,
}: Props) {
  const [isPersisting, startPersisting] = useTransition();
  const [selectedProfile, setSelectedProfile] = useState<SupplierProfile>('cold-chain');
  const [selectedSupplierId, setSelectedSupplierId] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [selectedAnaKatId, setSelectedAnaKatId] = useState('all');
  const [productProfileOverrides, setProductProfileOverrides] = useState<Record<string, SupplierProfile>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());

  // Per-row tier price overrides: cells are auto-calculated by default.
  // isManual=true marks user-edited values that survive "Tümünü Uygula" recalculation.
  const [overrides, setOverrides] = useState<Record<string, Partial<Record<TierKey, TierOverride>>>>({});

  // Profile-specific params (shipping + customs)
  const [profileInputs, setProfileInputs] = useState<Record<SupplierProfile, { shippingPerBox: number; customsPct: number }>>(() => ({
    'cold-chain': {
      shippingPerBox: toNum(systemSettings?.pricing_shipping_frozen_per_box, DEFAULT_FROZEN_SHIPPING_PER_BOX),
      customsPct: toNum(systemSettings?.pricing_customs_frozen_percent ?? systemSettings?.pricing_customs_percent, DEFAULT_FROZEN_CUSTOMS_PCT),
    },
    'non-cold': {
      shippingPerBox: toNum(systemSettings?.pricing_shipping_non_cold_per_box, DEFAULT_NON_COLD_SHIPPING_PER_BOX),
      customsPct: toNum(systemSettings?.pricing_customs_non_cold_percent ?? systemSettings?.pricing_customs_percent, DEFAULT_NON_COLD_CUSTOMS_PCT),
    },
  }));

  const [operationalPct, setOperationalPct] = useState(() => toNumOrDef(systemSettings?.pricing_operational_percent, 15));
  const [taxPct, setTaxPct] = useState(() => toNumOrDef(systemSettings?.pricing_vat_rate, 7));
  const [roundStep, setRoundStep] = useState(() => toNumOrDef(systemSettings?.pricing_round_step, 0));

  const [altBayiPct,   setAltBayiPct]   = useState(() => toNumOrDef(systemSettings?.pricing_alt_bayi_margin   ?? systemSettings?.pricing_tier1_margin_percent ?? systemSettings?.pricing_reseller_profit_percent, 5));
  const [koliBazliPct, setKoliBazliPct] = useState(() => toNumOrDef(systemSettings?.pricing_koli_bazli_margin ?? systemSettings?.pricing_tier3_margin_percent, 50));
  const [cokKoliPct,   setCokKoliPct]   = useState(() => toNumOrDef(systemSettings?.pricing_cok_koli_margin   ?? systemSettings?.pricing_tier2_margin_percent, 30));
  const [paletPct,     setPaletPct]     = useState(() => toNumOrDef(systemSettings?.pricing_palet_margin, 15));

  const [altBayiMinKoli,   setAltBayiMinKoli]   = useState(() => toNumOrDef(systemSettings?.pricing_alt_bayi_min_koli, 1));
  const [koliBazliMinKoli, setKoliBazliMinKoli] = useState(() => toNumOrDef(systemSettings?.pricing_koli_bazli_min_koli, 1));
  const [cokKoliMinKoli,   setCokKoliMinKoli]   = useState(() => toNumOrDef(systemSettings?.pricing_cok_koli_min_koli, 5));

  // TIR auto-calc
  const [tirToplam, setTirToplam] = useState('');
  const [tirKutu,   setTirKutu]   = useState('');
  useEffect(() => {
    const t = parseFloat(tirToplam), k = parseFloat(tirKutu);
    if (t > 0 && k > 0) {
      const perBox = r2(t / k);
      setProfileInputs(prev => ({ ...prev, [selectedProfile]: { ...prev[selectedProfile], shippingPerBox: perBox } }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tirToplam, tirKutu, selectedProfile]);

  const dedupedSuppliers = useMemo(() => dedupeSuppliers(suppliers), [suppliers]);
  const supplierNameById = useMemo(
    () => Object.fromEntries(suppliers.map(s => [s.id, getCanonicalSupplierLabel(s.unvan)])) as Record<string, string>,
    [suppliers]
  );
  const supplierGroupById = useMemo(
    () => Object.fromEntries(suppliers.map(s => [s.id, normalizeSupplierGroupKey(s.unvan) || s.id])) as Record<string, string>,
    [suppliers]
  );

  const pName = (p: ProductLite) => getLocalizedText(p.ad, locale, 'Ürün');
  const currentShipping = profileInputs[selectedProfile].shippingPerBox;
  const currentCustoms  = profileInputs[selectedProfile].customsPct;

  // ── Rows calculation ────────────────────────────────────────────────────────
  const rows = useMemo<PricingRow[]>(() => {
    return [...products]
      .sort((a, b) => pName(a).localeCompare(pName(b), 'tr'))
      .map(product => {
        const storedLine: ProductLineKey = isProductLineKey(product.urun_gami)
          ? product.urun_gami
          : (inferProductLineFromCategoryId(categories, product.kategori_id) || 'barista-bakery-essentials');
        const profile: SupplierProfile = productProfileOverrides[product.id]
          || inferSupplierProfileFromProductLine(storedLine);
        const line: ProductLineKey = productProfileOverrides[product.id]
          ? profileToProductLine(profile)
          : storedLine;
        const purchase = toNum(product.distributor_alis_fiyati, 0);

        const calculation = calculatePricing({
          purchase,
          shippingPerBox: profileInputs[profile].shippingPerBox,
          customsPct: toNumOrDef(product.gumruk_vergi_orani_yuzde, profileInputs[profile].customsPct),
          operationalPct,
          taxPct: toNumOrDef(product.almanya_kdv_orani, taxPct),
          altBayiPct,
          koliBazliPct,
          cokKoliPct,
          paletPct,
          roundStep,
        });
        return { product, profile, line, purchase, calculation };
      });
  }, [products, locale, categories, productProfileOverrides, profileInputs, operationalPct, taxPct, altBayiPct, koliBazliPct, cokKoliPct, paletPct, roundStep]);

  const categoryScope = useMemo(() => {
    if (selectedCategoryId === 'all') return null;
    const scope = new Set([selectedCategoryId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const cat of categories) {
        if (cat.ust_kategori_id && scope.has(cat.ust_kategori_id) && !scope.has(cat.id)) {
          scope.add(cat.id); changed = true;
        }
      }
    }
    return scope;
  }, [selectedCategoryId, categories]);

  const visibleRows = useMemo(() => {
    const supplierGroup = selectedSupplierId !== 'all' ? (supplierGroupById[selectedSupplierId] || selectedSupplierId) : 'all';
    return rows.filter(row => {
      if (row.profile !== selectedProfile) return false;
      if (categoryScope && !categoryScope.has(row.product.kategori_id ?? '')) return false;
      if (selectedSupplierId !== 'all') {
        const rg = row.product.tedarikci_id ? (supplierGroupById[row.product.tedarikci_id] || row.product.tedarikci_id) : '';
        if (!rg || rg !== supplierGroup) return false;
      }
      return searchMatch(productSearch, row.product, locale);
    });
  }, [rows, selectedProfile, selectedSupplierId, productSearch, supplierGroupById, categoryScope, locale]);

  const coldCount    = rows.filter(r => r.profile === 'cold-chain').length;
  const nonColdCount = rows.filter(r => r.profile === 'non-cold').length;
  const readyRows    = visibleRows.filter(r => r.purchase > 0);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const setOverride = (id: string, tier: TierKey, val: string) => {
    setOverrides(prev => ({
      ...prev,
      [id]: { ...prev[id], [tier]: { value: val, isManual: true } },
    }));
  };

  const clearOverride = (id: string, tier: TierKey) => {
    setOverrides(prev => {
      const entry = { ...(prev[id] ?? {}) };
      delete entry[tier];
      if (Object.keys(entry).length === 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: entry };
    });
  };

  const hasManualOverride = (id: string, tier: TierKey): boolean => {
    const ov = overrides[id]?.[tier];
    return ov?.isManual === true && ov.value !== '';
  };

  const resolvedTierPrice = (row: PricingRow, tier: TierKey): number => {
    const ov = overrides[row.product.id]?.[tier];
    if (ov?.isManual && ov.value !== '') {
      const n = parseFloat(ov.value);
      if (Number.isFinite(n) && n > 0) return r2(n);
    }
    return row.calculation[`${tier}Net`] as number;
  };

  // ── Save handlers ────────────────────────────────────────────────────────────
  const handleSaveRow = async (row: PricingRow) => {
    if (row.purchase <= 0) { toast.error('Alış fiyatı girilmemiş ürün kaydedilemez.'); return; }
    const invalidTiers = TIERS.filter(tier => resolvedTierPrice(row, tier.key) <= row.calculation.landedCost);
    if (invalidTiers.length > 0) {
      toast.error(`Satış fiyatı Net Mal. altında: ${invalidTiers.map(t => t.label).join(', ')}. Lütfen düzeltin.`);
      return;
    }
    setSavingRows(prev => new Set([...prev, row.product.id]));
    try {
      const res = await saveProductPricesAction({
        urunId: row.product.id,
        urun_gami: profileToProductLine(row.profile),
        satis_fiyati_alt_bayi:  r2(resolvedTierPrice(row, 'altBayi')),
        satis_fiyati_musteri:   r2(resolvedTierPrice(row, 'koliBazli')),
        satis_fiyati_toptanci:  r2(resolvedTierPrice(row, 'cokKoli')),
        standart_inis_maliyeti_net: row.calculation.landedCost,
      }, locale);
      if (res?.error) toast.error(res.error);
      else toast.success(`${pName(row.product)} kaydedildi.`);
    } finally {
      setSavingRows(prev => { const s = new Set(prev); s.delete(row.product.id); return s; });
    }
  };

  const [isBulkSaving, startBulkSaving] = useTransition();
  const handleApplyAll = () => {
    if (readyRows.length === 0) { toast.error('Alış fiyatı olan ürün yok.'); return; }
    const belowCostRows = readyRows.filter(row =>
      TIERS.some(tier => resolvedTierPrice(row, tier.key) <= row.calculation.landedCost)
    );
    if (belowCostRows.length > 0) {
      toast.error(`${belowCostRows.length} üründe satış fiyatı Net Mal. altında. Kaydetmeden önce fiyatları düzeltin.`);
      return;
    }
    startBulkSaving(async () => {
      const items = readyRows.map(row => ({
        urunId: row.product.id,
        urun_gami: profileToProductLine(row.profile),
        satis_fiyati_alt_bayi:  r2(resolvedTierPrice(row, 'altBayi')),
        satis_fiyati_musteri:   r2(resolvedTierPrice(row, 'koliBazli')),
        satis_fiyati_toptanci:  r2(resolvedTierPrice(row, 'cokKoli')),
        standart_inis_maliyeti_net: row.calculation.landedCost,
      }));
      const res = await bulkSaveProductPricesAction({ items }, locale);
      if (res?.error) toast.error(res.error);
      else toast.success(`${res?.updatedCount ?? 0} ürün güncellendi.`);
    });
  };

  const updateProfileInputs = (patch: Partial<{ shippingPerBox: number; customsPct: number }>) => {
    setProfileInputs(prev => ({ ...prev, [selectedProfile]: { ...prev[selectedProfile], ...patch } }));
  };

  const saveCurrentProfileDefaults = () => {
    startPersisting(async () => {
      const payload = selectedProfile === 'cold-chain'
        ? { pricing_shipping_frozen_per_box: currentShipping, pricing_customs_frozen_percent: currentCustoms }
        : { pricing_shipping_non_cold_per_box: currentShipping, pricing_customs_non_cold_percent: currentCustoms };
      const res = await savePricingDefaultsAction(payload as any, locale);
      if (res?.error) toast.error(res.error);
      else toast.success('Lojistik parametreler kaydedildi.');
    });
  };

  const saveMarginDefaults = () => {
    startPersisting(async () => {
      const payload: Record<string, number> = {
        pricing_operational_percent: operationalPct,
        pricing_vat_rate: taxPct,
        pricing_round_step: roundStep,
        pricing_alt_bayi_margin: altBayiPct,
        pricing_koli_bazli_margin: koliBazliPct,
        pricing_cok_koli_margin: cokKoliPct,
        pricing_palet_margin: paletPct,
        pricing_alt_bayi_min_koli: altBayiMinKoli,
        pricing_koli_bazli_min_koli: koliBazliMinKoli,
        pricing_cok_koli_min_koli: cokKoliMinKoli,
        pricing_tier1_margin_percent: altBayiPct,
        pricing_tier2_margin_percent: cokKoliPct,
        pricing_tier3_margin_percent: koliBazliPct,
        pricing_reseller_profit_percent: altBayiPct,
      };
      const res = await savePricingDefaultsAction(payload, locale);
      if (res?.error) toast.error(res.error);
      else toast.success('Fiyat marjları ve min. sipariş miktarları kaydedildi.');
    });
  };

  // ─── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">

      {/* ── Parameters (collapsible) ─────────────────────────────────────── */}
      <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2.5">
          <span className="text-sm font-semibold text-slate-700">Hesaplama Parametreleri</span>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
            Nakliye {money(currentShipping)}/kutu · G%{currentCustoms} · Op%{operationalPct}
            &nbsp;·&nbsp;Alt Bayi %{altBayiPct} · Koli %{koliBazliPct} · 5 Koli+ %{cokKoliPct} · Palet %{paletPct}
          </span>
          <FiChevronDown className="ml-auto h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
        </summary>

        <div className="border-t border-slate-100 px-4 pb-5 pt-4 space-y-5">

          {/* TIR calculator */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 whitespace-nowrap">TIR →</span>
            <input type="number" min={0} step="1" placeholder="TIR toplam €"
              value={tirToplam} onChange={e => setTirToplam(e.target.value)}
              className="w-32 rounded border border-amber-300 bg-white px-2 py-1 text-xs" />
            <span className="text-slate-400 text-xs">÷</span>
            <input type="number" min={1} step="1" placeholder="kutu sayısı"
              value={tirKutu} onChange={e => setTirKutu(e.target.value)}
              className="w-24 rounded border border-amber-300 bg-white px-2 py-1 text-xs" />
            {(() => {
              const t = parseFloat(tirToplam), k = parseFloat(tirKutu);
              const v = (t > 0 && k > 0) ? r2(t / k) : null;
              return v !== null ? <span className="text-xs font-semibold text-amber-800">= <strong>{money(v)}</strong>/kutu</span> : null;
            })()}
          </div>

          {/* Lojistik & Maliyet */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Lojistik &amp; Maliyet Parametreleri</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Nakliye/Kutu (€)</label>
                <input type="number" min={0} step="0.01" value={currentShipping}
                  onChange={e => updateProfileInputs({ shippingPerBox: toNum(e.target.value, 0) })}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Gümrük (%)</label>
                <input type="number" min={0} step="0.1" value={currentCustoms}
                  onChange={e => updateProfileInputs({ customsPct: toNum(e.target.value, 0) })}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Operasyonel (%)</label>
                <input type="number" min={0} step="0.1" value={operationalPct}
                  onChange={e => setOperationalPct(toNum(e.target.value, 0))}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">KDV (%)</label>
                <input type="number" min={0} step="0.1" value={taxPct}
                  onChange={e => setTaxPct(toNum(e.target.value, 0))}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Yuvarlama</label>
                <select value={roundStep} onChange={e => setRoundStep(toNum(e.target.value, 0))}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                  <option value={0}>Yok</option>
                  <option value={0.05}>0.05</option>
                  <option value={0.1}>0.10</option>
                  <option value={0.5}>0.50</option>
                  <option value={1}>1.00</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={saveCurrentProfileDefaults} disabled={isPersisting}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50">
                {selectedProfile === 'cold-chain' ? '❄️ Donuk kaydet' : '📦 Kuru kaydet'}
              </button>
            </div>
          </div>

          {/* Fiyat kademeleri */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Fiyat Kademeleri &amp; Min. Sipariş</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* Koli Bazlı -> 1 Koli */}
              <div className="rounded-lg border border-violet-100 bg-violet-50/40 p-3 space-y-2">
                <p className="text-[11px] font-bold text-violet-800">1 Koli</p>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Marj (%)</label>
                  <input type="number" min={0} step="0.1" value={koliBazliPct}
                    onChange={e => setKoliBazliPct(toNum(e.target.value, 50))}
                    className="w-full rounded border border-violet-200 px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Min. sipariş (koli)</label>
                  <input type="number" min={1} step="1" value={koliBazliMinKoli}
                    onChange={e => setKoliBazliMinKoli(toNum(e.target.value, 1))}
                    className="w-full rounded border border-violet-200 px-2 py-1 text-sm" />
                </div>
              </div>
              {/* 5 Koli+ */}
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3 space-y-2">
                <p className="text-[11px] font-bold text-emerald-800">5 Koli+</p>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Marj (%)</label>
                  <input type="number" min={0} step="0.1" value={cokKoliPct}
                    onChange={e => setCokKoliPct(toNum(e.target.value, 30))}
                    className="w-full rounded border border-emerald-200 px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Min. sipariş (koli)</label>
                  <input type="number" min={1} step="1" value={cokKoliMinKoli}
                    onChange={e => setCokKoliMinKoli(toNum(e.target.value, 5))}
                    className="w-full rounded border border-emerald-200 px-2 py-1 text-sm" />
                </div>
              </div>
              {/* Alt Bayi -> 1 Palet */}
              <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 space-y-2">
                <p className="text-[11px] font-bold text-blue-800">1 Palet</p>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Marj (%)</label>
                  <input type="number" min={0} step="0.1" value={altBayiPct}
                    onChange={e => setAltBayiPct(toNum(e.target.value, 5))}
                    className="w-full rounded border border-blue-200 px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Min. sipariş (koli)</label>
                  <input type="number" min={1} step="1" value={altBayiMinKoli}
                    onChange={e => setAltBayiMinKoli(toNum(e.target.value, 1))}
                    className="w-full rounded border border-blue-200 px-2 py-1 text-sm" />
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={saveMarginDefaults} disabled={isPersisting}
                className="rounded-md bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                {isPersisting ? 'Kaydediliyor…' : 'Genel Kaydet'}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Formül: (Alış + Nakliye) × (1 + Gümrük%) × (1 + Operasyonel%) = Net Maliyet → × (1 + Marj%) = Satış Fiyatı (KDV hariç)
          </p>
        </div>
      </details>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        {/* Cold / Kuru tabs */}
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button type="button" onClick={() => setSelectedProfile('cold-chain')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${selectedProfile === 'cold-chain' ? 'bg-white text-rose-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            ❄️ Donuk <span className="opacity-60">({coldCount})</span>
          </button>
          <button type="button" onClick={() => setSelectedProfile('non-cold')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${selectedProfile === 'non-cold' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            📦 Kuru <span className="opacity-60">({nonColdCount})</span>
          </button>
        </div>

        <input type="search" value={productSearch} onChange={e => setProductSearch(e.target.value)}
          placeholder="Ürün / kod ara…"
          className="w-44 rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />

        <select value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)}
          className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm max-w-[160px]">
          <option value="all">Tüm tedarikçiler</option>
          {dedupedSuppliers.map(s => (
            <option key={s.id} value={s.id}>{getCanonicalSupplierLabel(s.unvan)}</option>
          ))}
        </select>

        {/* Ana kategori */}
        <select
          value={selectedAnaKatId}
          onChange={e => {
            setSelectedAnaKatId(e.target.value);
            setSelectedCategoryId(e.target.value);
          }}
          className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm max-w-[160px]">
          <option value="all">Tüm kategoriler</option>
          {categories
            .filter(c => !c.ust_kategori_id)
            .map(c => {
              const label = typeof c.ad === 'string' ? c.ad : (c.ad as any)?.tr || (c.ad as any)?.de || 'Kategori';
              return <option key={c.id} value={c.id}>{label}</option>;
            })}
        </select>

        {/* Alt kategori — sadece ana kategori seçiliyse görünür */}
        {selectedAnaKatId !== 'all' && (() => {
          const altKats = categories.filter(c => c.ust_kategori_id === selectedAnaKatId);
          if (altKats.length === 0) return null;
          const getLabel = (cat: typeof categories[0]) =>
            typeof cat.ad === 'string' ? cat.ad : (cat.ad as any)?.tr || (cat.ad as any)?.de || 'Alt Kategori';
          return (
            <select
              value={selectedCategoryId}
              onChange={e => setSelectedCategoryId(e.target.value)}
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm max-w-[160px]">
              <option value={selectedAnaKatId}>Tüm alt kategoriler</option>
              {altKats.map(alt => (
                <option key={alt.id} value={alt.id}>{getLabel(alt)}</option>
              ))}
            </select>
          );
        })()}

        {(productSearch || selectedSupplierId !== 'all' || selectedCategoryId !== 'all') && (
          <button type="button" onClick={() => { setProductSearch(''); setSelectedSupplierId('all'); setSelectedCategoryId('all'); setSelectedAnaKatId('all'); }}
            className="rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700">
            ✕ Temizle
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400">{visibleRows.length} ürün · {readyRows.length} hazır</span>
          <button type="button" onClick={handleApplyAll} disabled={isBulkSaving || readyRows.length === 0}
            className="rounded-md bg-indigo-700 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50 flex items-center gap-1.5">
            {isBulkSaving ? <FiRefreshCw className="animate-spin w-3.5 h-3.5" /> : null}
            {isBulkSaving ? 'Kaydediliyor…' : `Tümünü Uygula (${readyRows.length})`}
          </button>
        </div>
      </div>

      {/* ── Product Table (desktop) ─────────────────────────────────────────── */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {visibleRows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            {productSearch ? 'Arama kriterine uyan ürün bulunamadı.' : 'Bu listede henüz ürün yok.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 min-w-[220px]">Ürün</th>
                  <th className="px-3 py-2.5 text-right w-28 text-slate-600">Alış/Kutu</th>
                  <th className="px-3 py-2.5 text-right w-28 text-slate-600">Net Mal.</th>
                  <th className={`px-3 py-2.5 text-right w-32 ${TIER_COLOR.altBayi.header}`}>
                    <div>Alt Bayi</div>
                    <div className="font-normal normal-case text-[10px] opacity-70">%{altBayiPct} · min {altBayiMinKoli} koli</div>
                  </th>
                  <th className={`px-3 py-2.5 text-right w-32 ${TIER_COLOR.koliBazli.header}`}>
                    <div>Koli Bazlı</div>
                    <div className="font-normal normal-case text-[10px] opacity-70">%{koliBazliPct} · min {koliBazliMinKoli} koli</div>
                  </th>
                  <th className={`px-3 py-2.5 text-right w-32 ${TIER_COLOR.cokKoli.header}`}>
                    <div>5 Koli+</div>
                    <div className="font-normal normal-case text-[10px] opacity-70">%{cokKoliPct} · min {cokKoliMinKoli} koli</div>
                  </th>
                  <th className={`px-3 py-2.5 text-right w-32 ${TIER_COLOR.palet.header}`}>
                    <div>Palet</div>
                    <div className="font-normal normal-case text-[10px] opacity-70">%{paletPct} · ürün paletine göre</div>
                  </th>
                  <th className="px-3 py-2.5 w-28 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map(row => {
                  const isSaving = savingRows.has(row.product.id);
                  const isExpanded = expandedRows.has(row.product.id);
                  const noPurchase = row.purchase <= 0;
                  const paletKoliAdedi = toNum(row.product.palet_ici_adet, 0) || toNum(row.product.koli_ici_adet, 0);

                  return (
                    <React.Fragment key={row.product.id}>
                      <tr className={`hover:bg-slate-50/60 transition ${noPurchase ? 'opacity-50' : ''}`}>
                        {/* Ürün */}
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-slate-900 leading-snug text-sm truncate max-w-[200px]" title={pName(row.product)}>
                            <Link href={`/${locale ?? 'tr'}/admin/urun-yonetimi/urunler/${row.product.id}`} className="hover:text-indigo-600 hover:underline">
                              {pName(row.product)}
                            </Link>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {row.product.stok_kodu && (
                              <span className="font-mono text-[10px] text-slate-400">{row.product.stok_kodu}</span>
                            )}
                            <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium ${row.profile === 'cold-chain' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {row.profile === 'cold-chain' ? '❄️' : '📦'}
                            </span>
                          </div>
                        </td>

                        {/* Alış — read-only */}
                        <td className="px-3 py-2.5 text-right">
                          {noPurchase
                            ? <span className="text-[11px] text-slate-300 italic">girilmemiş</span>
                            : <span className="font-mono text-sm text-slate-600">{money(row.purchase)}</span>
                          }
                        </td>

                        {/* Net Maliyet — read-only */}
                        <td className="px-3 py-2.5 text-right">
                          {noPurchase
                            ? <span className="text-[11px] text-slate-300">—</span>
                            : <span className="font-mono text-sm font-semibold text-slate-700">{money(row.calculation.landedCost)}</span>
                          }
                        </td>

                        {/* 4 Tier editable inputs */}
                        {TIERS.map(tier => {
                          const auto = row.calculation[`${tier.key}Net`] as number;
                          const hasOv = hasManualOverride(row.product.id, tier.key);
                          const resolvedPrice = resolvedTierPrice(row, tier.key);
                          const belowCost = !noPurchase && resolvedPrice <= row.calculation.landedCost;
                          const colors = TIER_COLOR[tier.key];
                          return (
                            <td key={tier.key} className="px-2 py-2">
                              <div className="relative group">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  placeholder={noPurchase ? '—' : auto.toFixed(2)}
                                  value={overrides[row.product.id]?.[tier.key]?.value ?? ''}
                                  onChange={e => setOverride(row.product.id, tier.key, e.target.value)}
                                  disabled={noPurchase}
                                  className={`w-full rounded-md border px-2 py-1.5 text-sm text-right font-mono transition disabled:cursor-not-allowed
                                    ${belowCost ? 'border-red-500 bg-red-50 text-red-700' : hasOv ? colors.inputOverride : colors.input}
                                    focus:outline-none focus:ring-1 focus:ring-offset-0`}
                                  style={!hasOv && !belowCost ? { fontStyle: 'italic' } : {}}
                                />
                                {hasOv && !noPurchase && (
                                  <>
                                    <span
                                      className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-orange-400 pointer-events-none"
                                      title="Manuel değer — otomatik hesaplamadan bağımsız"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => clearOverride(row.product.id, tier.key)}
                                      className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 flex h-4 w-4 items-center justify-center rounded-full bg-slate-500 text-white text-[10px] shadow hover:bg-slate-700 transition"
                                      title="Hesaplanan fiyata sıfırla"
                                    >
                                      ↺
                                    </button>
                                  </>
                                )}
                                {belowCost && (
                                  <span className="absolute -bottom-4 left-0 right-0 text-[9px] text-red-500 text-center leading-none whitespace-nowrap">
                                    ⚠ maliyet altı
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Actions */}
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveRow(row)}
                              disabled={isSaving || noPurchase}
                              className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                            >
                              {isSaving ? <FiRefreshCw className="animate-spin w-3 h-3" /> : <FiSave className="w-3 h-3" />}
                              Kaydet
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpandedRows(prev => { const s = new Set(prev); s.has(row.product.id) ? s.delete(row.product.id) : s.add(row.product.id); return s; })}
                              className="rounded-md border border-slate-200 p-1.5 text-slate-400 hover:text-slate-700 transition"
                              title="Detay"
                            >
                              {isExpanded ? <FiChevronDown className="w-3.5 h-3.5" /> : <FiChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={8} className="px-6 py-3">
                            <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                              {paletKoliAdedi > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-orange-700">Palet:</span>
                                  <span>1 palet = {paletKoliAdedi} koli</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-slate-500">Net Maliyet:</span>
                                <span>{money(row.calculation.landedCost)}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-slate-500">Formül:</span>
                                <span>({money(row.purchase)} + {money(row.calculation.shippingCost)}) × {(1 + currentCustoms / 100).toFixed(3)} × {(1 + operationalPct / 100).toFixed(3)}</span>
                              </div>
                              {TIERS.some(tier => hasManualOverride(row.product.id, tier.key)) && (
                                <button
                                  type="button"
                                  onClick={() => setOverrides(prev => { const n = { ...prev }; delete n[row.product.id]; return n; })}
                                  className="text-red-500 hover:text-red-700 font-medium"
                                >
                                  Manuel fiyatları temizle
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Mobile card layout ──────────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {visibleRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            {productSearch ? 'Arama kriterine uyan ürün bulunamadı.' : 'Bu listede henüz ürün yok.'}
          </div>
        ) : visibleRows.map(row => {
          const isSaving = savingRows.has(row.product.id);
          const noPurchase = row.purchase <= 0;
          return (
            <div key={row.product.id} className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ${noPurchase ? 'opacity-60' : ''}`}>
              {/* Card header */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-start justify-between gap-2">
                <div>
                  <Link href={`/${locale ?? 'tr'}/admin/urun-yonetimi/urunler/${row.product.id}`} className="font-semibold text-slate-900 text-sm leading-snug hover:text-indigo-600 hover:underline">
                    {pName(row.product)}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    {row.product.stok_kodu && <span className="font-mono text-[11px] text-slate-400">{row.product.stok_kodu}</span>}
                    <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium ${row.profile === 'cold-chain' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {row.profile === 'cold-chain' ? '❄️ Donuk' : '📦 Kuru'}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-slate-400">Alış</div>
                  <div className="font-mono text-sm font-semibold text-slate-700">{noPurchase ? '—' : money(row.purchase)}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Net Mal.</div>
                  <div className="font-mono text-xs text-slate-600">{noPurchase ? '—' : money(row.calculation.landedCost)}</div>
                </div>
              </div>

              {/* Card body — 2×2 tier inputs */}
              <div className="grid grid-cols-2 gap-2 px-4 py-3">
                {TIERS.map(tier => {
                  const auto = row.calculation[`${tier.key}Net`] as number;
                  const hasOv = hasManualOverride(row.product.id, tier.key);
                  const resolvedPrice = resolvedTierPrice(row, tier.key);
                  const belowCost = !noPurchase && resolvedPrice <= row.calculation.landedCost;
                  const colors = TIER_COLOR[tier.key];
                  return (
                    <div key={tier.key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          <label className={`text-[11px] font-semibold ${colors.header}`}>{tier.label}</label>
                          {hasOv && <span className="h-1.5 w-1.5 rounded-full bg-orange-400" title="Manuel değer" />}
                        </div>
                        {hasOv && (
                          <button type="button" onClick={() => clearOverride(row.product.id, tier.key)}
                            className="text-[10px] text-slate-400 hover:text-red-500 leading-none" title="Sıfırla">
                            ↺
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder={noPurchase ? '—' : auto.toFixed(2)}
                        value={overrides[row.product.id]?.[tier.key]?.value ?? ''}
                        onChange={e => setOverride(row.product.id, tier.key, e.target.value)}
                        disabled={noPurchase}
                        className={`w-full rounded-md border px-2 py-2 text-sm text-right font-mono
                          ${belowCost ? 'border-red-500 bg-red-50 text-red-700' : hasOv ? colors.inputOverride : colors.input}
                          focus:outline-none focus:ring-1`}
                        style={!hasOv && !belowCost ? { fontStyle: 'italic' } : {}}
                      />
                      {belowCost && <p className="text-[10px] text-red-500 mt-0.5">⚠ maliyet altı</p>}
                    </div>
                  );
                })}
              </div>

              {/* Card footer */}
              <div className="px-4 pb-3">
                <button
                  type="button"
                  onClick={() => handleSaveRow(row)}
                  disabled={isSaving || noPurchase}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {isSaving ? <FiRefreshCw className="animate-spin w-4 h-4" /> : <FiSave className="w-4 h-4" />}
                  {isSaving ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
