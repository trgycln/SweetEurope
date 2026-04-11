'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { parse as parseCsv } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { dedupeSuppliers, normalizeSupplierGroupKey } from '@/lib/supplier-utils';
import { slugify } from '@/lib/utils';
import type { TablesInsert, TablesUpdate } from '@/lib/supabase/database.types';

type SupplierProfile = 'cold-chain' | 'non-cold';
type PurchaseLevel = 'adet' | 'kutu' | 'koli' | 'palet';
type AppLocale = 'tr' | 'de' | 'en' | 'ar';

type ExistingProduct = {
  id: string;
  stok_kodu: string | null;
  ad: Record<string, string> | string | null;
  aciklamalar?: Record<string, string> | string | null;
  distributor_alis_fiyati: number | null;
  tedarikci_id: string | null;
  urun_gami: string | null;
  teknik_ozellikler: Record<string, unknown> | null;
  kategori_id: string;
  slug: string | null;
};

type CategoryRow = {
  id: string;
  ad: Record<string, string> | string | null;
  slug: string | null;
  ust_kategori_id: string | null;
  urun_gami: string | null;
};

type ParsedImportRow = {
  rowNumber: number;
  stockCode: string | null;
  productName: string | null;
  supplierName: string | null;
  localizedNames: Partial<Record<AppLocale, string>>;
  localizedDescriptions: Partial<Record<AppLocale, string>>;
  mainCategory: string | null;
  subCategory: string | null;
  purchasePrice: number | null;
  purchaseLevel: PurchaseLevel;
  unitsPerBox: number | null;
  boxesPerCase: number | null;
  casesPerPallet: number | null;
  profile: SupplierProfile;
};

type SupplierRow = {
  id: string;
  unvan: string | null;
};

type UpdatedProductSummary = {
  urunId: string;
  distributor_alis_fiyati: number;
  urun_gami: string | null;
};

type ResolvedSupplierMatch = {
  supplierId: string | null;
  supplierGroupKey: string | null;
};

export type SupplierPriceImportResult = {
  success?: boolean;
  error?: string;
  updatedCount?: number;
  createdCount?: number;
  matchedCount?: number;
  skippedCount?: number;
  notFoundCount?: number;
  unmatched?: string[];
  skipReasons?: string[];
  updatedProducts?: UpdatedProductSummary[];
};

const DEFAULT_FROZEN_SHIPPING_PER_BOX = 350 / 384;
const DEFAULT_NON_COLD_SHIPPING_PER_BOX = 0.45;
const DEFAULT_FROZEN_CUSTOMS_PCT = 15;
const DEFAULT_NON_COLD_CUSTOMS_PCT = 9;
const DEFAULT_TIER1_MARGIN_PCT = 15;
const DEFAULT_TIER2_MARGIN_PCT = 35;
const DEFAULT_TIER3_MARGIN_PCT = 60;
const DEFAULT_OPERATIONAL_PCT = 10;

const STOCK_CODE_HEADERS = ['urunkodu', 'stokkodu', 'sku', 'stockcode', 'productcode', 'kod', 'code'];
const PRODUCT_NAME_HEADERS = ['urunadi', 'urunismi', 'productname', 'name', 'urun'];
const PRODUCT_NAME_TR_HEADERS = ['urunaditr', 'adtr', 'nametr'];
const PRODUCT_NAME_DE_HEADERS = ['urunadide', 'adde', 'namede'];
const PRODUCT_NAME_EN_HEADERS = ['urunadien', 'aden', 'nameen'];
const PRODUCT_NAME_AR_HEADERS = ['urunadiar', 'adar', 'namear'];
const DESCRIPTION_TR_HEADERS = ['aciklamatr', 'urunbilgitr', 'descriptiontr', 'desctr'];
const DESCRIPTION_DE_HEADERS = ['aciklamade', 'urunbilgide', 'descriptionde', 'descde'];
const DESCRIPTION_EN_HEADERS = ['aciklamaen', 'urunbilgien', 'descriptionen', 'descen'];
const DESCRIPTION_AR_HEADERS = ['aciklamaar', 'urunbilgiar', 'descriptionar', 'descar'];
const MAIN_CATEGORY_HEADERS = ['kategori', 'anategori', 'maincategory', 'category'];
const SUB_CATEGORY_HEADERS = ['altkategori', 'subcategory', 'subcat'];
const SUPPLIER_HEADERS = ['tedarikci', 'tedarikciadi', 'supplier', 'suppliername', 'marka', 'brand'];
const PURCHASE_HEADERS = ['distributoralisfiyati', 'alisfiyati', 'maliyet', 'maliyetfiyati', 'factoryprice', 'purchaseprice', 'netalis'];
const BOX_PRICE_HEADERS = ['distributorfiyatikutu', 'kutufiyati', 'boxprice', 'kutuprice'];
const UNIT_PRICE_HEADERS = ['dilimfiyati', 'birimfiyati', 'adetfiyati', 'portionprice', 'sliceprice', 'unitprice'];
const UNITS_HEADERS = ['kutuici', 'kutuiciadet', 'dilimsayisi', 'porsiyonsayisi', 'slicecount', 'unitperbox', 'adet'];
const CASE_BOX_HEADERS = ['koliicikutu', 'koliicikutuadet', 'boxespercase', 'caseboxcount'];
const PALLET_CASE_HEADERS = ['paleticikoli', 'paleticikoliadet', 'casesperpallet', 'palletcasecount'];
const TYPE_HEADERS = ['uruntipi', 'urungrubu', 'urungami', 'producttype', 'tip'];
const PURCHASE_LEVEL_HEADERS = ['alisfiyatseviyesi', 'fiyatseviyesi', 'purchaselevel', 'pricelevel'];
const CATEGORY_STOP_WORDS = new Set(['ve', 'ile', 'the', 'and', 'urun', 'urunler', 'kategori', 'main', 'sub', 'ana', 'alt']);
const CATEGORY_ALIAS_SLUGS: Record<string, string[]> = {
  purevepastalar: ['bakery-fillings', 'sauces-and-ingredients'],
  purevepastalari: ['bakery-fillings', 'sauces-and-ingredients'],
  prevepastalar: ['bakery-fillings', 'sauces-and-ingredients'],
  prevepastalari: ['bakery-fillings', 'sauces-and-ingredients'],
  pureepastes: ['bakery-fillings', 'sauces-and-ingredients'],
  pureesandpastes: ['bakery-fillings', 'sauces-and-ingredients'],
  meyvepureleri: ['bakery-fillings', 'drink-bases'],
  pastaneicdolgulari: ['bakery-fillings'],
  bakeryfillings: ['bakery-fillings'],
  ozelsoslar: ['specialty-sauces', 'cafe-bar-sauces'],
  specialtysauces: ['specialty-sauces', 'cafe-bar-sauces'],
  cafebarsoslari: ['cafe-bar-sauces', 'specialty-sauces', 'sauces-and-ingredients'],
  cafebarsosu: ['cafe-bar-sauces', 'specialty-sauces', 'sauces-and-ingredients'],
  cafebarsauces: ['cafe-bar-sauces', 'specialty-sauces', 'sauces-and-ingredients'],
  barsoslari: ['cafe-bar-sauces', 'specialty-sauces', 'sauces-and-ingredients'],
  icecekbazlari: ['drink-bases', 'cocktail-mixes'],
  drinkbases: ['drink-bases', 'cocktail-mixes'],
  kokteylmiksleri: ['cocktail-mixes', 'drink-bases', 'drinks'],
  kokteylmixleri: ['cocktail-mixes', 'drink-bases', 'drinks'],
  cocktailmixes: ['cocktail-mixes', 'drink-bases', 'drinks'],
  kahvesuruplari: ['coffee-syrups', 'coffee'],
  coffeesyrups: ['coffee-syrups', 'coffee'],
  pastalarvekekler: ['cakes-and-tarts'],
  cakesandtarts: ['cakes-and-tarts'],
};

function normalizeKey(value: unknown): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeText(value: unknown): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .trim();
}

function tokenizeCategoryText(value: unknown): string[] {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim().replace(/(lari|leri|lar|ler|si|su)$/g, ''))
    .filter((token) => token.length > 1 && !CATEGORY_STOP_WORDS.has(token));
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function moneyToNumber(value: unknown): number | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  let normalized = raw.replace(/[€$£₺]/g, '').replace(/\s/g, '');
  if (normalized.includes(',') && normalized.includes('.')) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = normalized.replace(/,/g, '');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInteger(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(String(value).replace(/[^0-9]/g, ''));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function valueOrNull(value: string | null | undefined): string | null {
  return value && value.trim().length > 0 ? value.trim() : null;
}

function profileToProductLine(profile: SupplierProfile): 'frozen-desserts' | 'barista-bakery-essentials' {
  return profile === 'cold-chain' ? 'frozen-desserts' : 'barista-bakery-essentials';
}

function detectProfile(rawValue: unknown, fallback: SupplierProfile): SupplierProfile {
  const value = normalizeText(rawValue);
  if (!value) return fallback;

  if (value.includes('donuk') || value.includes('frozen') || value.includes('cold') || value.includes('soguk')) {
    return 'cold-chain';
  }

  if (value.includes('ambient') || value.includes('noncold') || value.includes('donukolmayan') || value.includes('kahve') || value.includes('barista')) {
    return 'non-cold';
  }

  return fallback;
}

function detectPurchaseLevel(rawValue: unknown, fallback: PurchaseLevel): PurchaseLevel {
  const value = normalizeText(rawValue);
  if (!value) return fallback;
  if (value.includes('palet') || value.includes('pallet')) return 'palet';
  if (value.includes('koli') || value.includes('case')) return 'koli';
  if (value.includes('adet') || value.includes('tekil') || value.includes('unit') || value.includes('slice')) return 'adet';
  return 'kutu';
}

function findColumnIndex(headerRow: string[], aliases: string[]): number | null {
  for (let index = 0; index < headerRow.length; index += 1) {
    const normalized = normalizeKey(headerRow[index]);
    if (aliases.some((alias) => normalized.includes(alias))) {
      return index;
    }
  }
  return null;
}

function findHeaderRow(rows: string[][]): number {
  return rows.findIndex((row) => {
    const normalized = row.map((cell) => normalizeKey(cell));
    const hasCode = normalized.some((cell) => STOCK_CODE_HEADERS.some((alias) => cell.includes(alias)));
    const hasName = normalized.some((cell) => [...PRODUCT_NAME_HEADERS, ...PRODUCT_NAME_TR_HEADERS].some((alias) => cell.includes(alias)));
    const hasPrice = normalized.some((cell) => [...PURCHASE_HEADERS, ...BOX_PRICE_HEADERS, ...UNIT_PRICE_HEADERS].some((alias) => cell.includes(alias)));
    return (hasCode || hasName) && hasPrice;
  });
}

async function readSpreadsheetRows(file: File): Promise<string[][]> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer' });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) return [];

    return (XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
      header: 1,
      defval: '',
      raw: false,
    }) as Array<Array<string | number | boolean | null>>).map((row) => row.map((cell) => String(cell ?? '')));
  }

  const text = await file.text();
  return parseCsv(text, {
    bom: true,
    delimiter: [',', ';', '\t'],
    relaxColumnCount: true,
    skipEmptyLines: true,
  }) as string[][];
}

function buildParsedRows(rows: string[][], fallbackProfile: SupplierProfile): ParsedImportRow[] {
  const headerIndex = findHeaderRow(rows);
  if (headerIndex === -1) {
    throw new Error('Baslik satiri bulunamadi. Lutfen sablon kolonlarini kullanin.');
  }

  const header = rows[headerIndex].map((cell) => String(cell || ''));
  const indexes = {
    stockCode: findColumnIndex(header, STOCK_CODE_HEADERS),
    productName: findColumnIndex(header, PRODUCT_NAME_HEADERS),
    productNameTr: findColumnIndex(header, PRODUCT_NAME_TR_HEADERS),
    productNameDe: findColumnIndex(header, PRODUCT_NAME_DE_HEADERS),
    productNameEn: findColumnIndex(header, PRODUCT_NAME_EN_HEADERS),
    productNameAr: findColumnIndex(header, PRODUCT_NAME_AR_HEADERS),
    descriptionTr: findColumnIndex(header, DESCRIPTION_TR_HEADERS),
    descriptionDe: findColumnIndex(header, DESCRIPTION_DE_HEADERS),
    descriptionEn: findColumnIndex(header, DESCRIPTION_EN_HEADERS),
    descriptionAr: findColumnIndex(header, DESCRIPTION_AR_HEADERS),
    mainCategory: findColumnIndex(header, MAIN_CATEGORY_HEADERS),
    subCategory: findColumnIndex(header, SUB_CATEGORY_HEADERS),
    supplier: findColumnIndex(header, SUPPLIER_HEADERS),
    purchase: findColumnIndex(header, PURCHASE_HEADERS),
    boxPrice: findColumnIndex(header, BOX_PRICE_HEADERS),
    unitPrice: findColumnIndex(header, UNIT_PRICE_HEADERS),
    units: findColumnIndex(header, UNITS_HEADERS),
    boxesPerCase: findColumnIndex(header, CASE_BOX_HEADERS),
    casesPerPallet: findColumnIndex(header, PALLET_CASE_HEADERS),
    type: findColumnIndex(header, TYPE_HEADERS),
    purchaseLevel: findColumnIndex(header, PURCHASE_LEVEL_HEADERS),
  };

  if (indexes.stockCode == null && indexes.productName == null && indexes.productNameTr == null) {
    throw new Error('En az bir tanima kolonu gerekli: Urun Kodu/Stok Kodu veya Ürün Adı.');
  }

  if (indexes.purchase == null && indexes.boxPrice == null && indexes.unitPrice == null) {
    throw new Error('Fiyat kolonu bulunamadi. Alis fiyati veya kutu fiyatı kolonu gerekli.');
  }

  const parsedRows: ParsedImportRow[] = [];

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    const localizedNames: Partial<Record<AppLocale, string>> = {
      tr: indexes.productNameTr != null ? valueOrNull(String(row[indexes.productNameTr] || '')) : null,
      de: indexes.productNameDe != null ? valueOrNull(String(row[indexes.productNameDe] || '')) : null,
      en: indexes.productNameEn != null ? valueOrNull(String(row[indexes.productNameEn] || '')) : null,
      ar: indexes.productNameAr != null ? valueOrNull(String(row[indexes.productNameAr] || '')) : null,
    };
    const localizedDescriptions: Partial<Record<AppLocale, string>> = {
      tr: indexes.descriptionTr != null ? valueOrNull(String(row[indexes.descriptionTr] || '')) : null,
      de: indexes.descriptionDe != null ? valueOrNull(String(row[indexes.descriptionDe] || '')) : null,
      en: indexes.descriptionEn != null ? valueOrNull(String(row[indexes.descriptionEn] || '')) : null,
      ar: indexes.descriptionAr != null ? valueOrNull(String(row[indexes.descriptionAr] || '')) : null,
    };

    const stockCode = indexes.stockCode != null ? valueOrNull(String(row[indexes.stockCode] || '')) : null;
    const genericName = indexes.productName != null ? valueOrNull(String(row[indexes.productName] || '')) : null;
    const productName = localizedNames.tr || localizedNames.de || localizedNames.en || localizedNames.ar || genericName;

    if (!stockCode && !productName) continue;

    const unitsPerBox = indexes.units != null ? toInteger(row[indexes.units]) : null;
    const boxesPerCase = indexes.boxesPerCase != null ? toInteger(row[indexes.boxesPerCase]) : null;
    const casesPerPallet = indexes.casesPerPallet != null ? toInteger(row[indexes.casesPerPallet]) : null;

    const directPurchase = indexes.purchase != null ? moneyToNumber(row[indexes.purchase]) : null;
    const boxPrice = indexes.boxPrice != null ? moneyToNumber(row[indexes.boxPrice]) : null;
    const unitPrice = indexes.unitPrice != null ? moneyToNumber(row[indexes.unitPrice]) : null;

    let purchasePrice = directPurchase;
    let purchaseLevel = detectPurchaseLevel(indexes.purchaseLevel != null ? row[indexes.purchaseLevel] : '', 'kutu');

    if (purchasePrice == null && boxPrice != null) {
      purchasePrice = boxPrice;
      purchaseLevel = 'kutu';
    }

    if (purchasePrice == null && unitPrice != null) {
      purchasePrice = unitPrice;
      purchaseLevel = 'adet';
    }

    parsedRows.push({
      rowNumber: index + 1,
      stockCode,
      productName,
      supplierName: indexes.supplier != null ? valueOrNull(String(row[indexes.supplier] || '')) : null,
      localizedNames,
      localizedDescriptions,
      mainCategory: indexes.mainCategory != null ? valueOrNull(String(row[indexes.mainCategory] || '')) : null,
      subCategory: indexes.subCategory != null ? valueOrNull(String(row[indexes.subCategory] || '')) : null,
      purchasePrice,
      purchaseLevel,
      unitsPerBox,
      boxesPerCase,
      casesPerPallet,
      profile: detectProfile(indexes.type != null ? row[indexes.type] : '', fallbackProfile),
    });
  }

  return parsedRows;
}

function getNameCandidates(raw: Record<string, string> | string | null): string[] {
  if (typeof raw === 'string') return [raw];
  if (raw && typeof raw === 'object') return Object.values(raw).filter((value): value is string => typeof value === 'string');
  return [];
}

function parseNumberSetting(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePackaging(row: ParsedImportRow) {
  const unitsPerBox = Math.max(1, row.unitsPerBox ?? 1);
  const boxesPerCase = Math.max(1, row.boxesPerCase ?? 1);
  const casesPerPallet = Math.max(1, row.casesPerPallet ?? 1);

  return {
    unitsPerBox,
    boxesPerCase,
    casesPerPallet,
    unitsPerCase: unitsPerBox * boxesPerCase,
    unitsPerPallet: unitsPerBox * boxesPerCase * casesPerPallet,
    boxesPerPallet: boxesPerCase * casesPerPallet,
  };
}

function normalizePurchaseToBoxPrice(row: ParsedImportRow): number | null {
  if (row.purchasePrice == null) return null;
  const packaging = normalizePackaging(row);

  switch (row.purchaseLevel) {
    case 'adet':
      return Number((row.purchasePrice * packaging.unitsPerBox).toFixed(2));
    case 'koli':
      return Number((row.purchasePrice / packaging.boxesPerCase).toFixed(2));
    case 'palet':
      return Number((row.purchasePrice / packaging.boxesPerPallet).toFixed(2));
    case 'kutu':
    default:
      return Number(row.purchasePrice.toFixed(2));
  }
}

function mergePackagingIntoSpecs(existing: Record<string, unknown> | null, row: ParsedImportRow) {
  const packaging = normalizePackaging(row);
  const next = existing && typeof existing === 'object' ? { ...existing } : {};

  next.kutu_ici_adet = packaging.unitsPerBox;
  next.koli_ici_kutu_adet = packaging.boxesPerCase;
  next.palet_ici_koli_adet = packaging.casesPerPallet;
  next.koli_ici_adet = packaging.unitsPerCase;
  next.palet_ici_kutu_adet = packaging.boxesPerPallet;
  next.palet_ici_adet = packaging.unitsPerPallet;
  next.dilim_sayisi = packaging.unitsPerBox;
  next.porsiyon_sayisi = packaging.unitsPerBox;
  next.slice_count = packaging.unitsPerBox;
  next.alis_fiyat_seviyesi = row.purchaseLevel;

  return next;
}

function calculateNetSales(purchasePricePerBox: number, profile: SupplierProfile, settings: Record<string, unknown>) {
  const shippingPerBox = profile === 'cold-chain'
    ? parseNumberSetting(settings.pricing_shipping_frozen_per_box, DEFAULT_FROZEN_SHIPPING_PER_BOX)
    : parseNumberSetting(settings.pricing_shipping_non_cold_per_box, DEFAULT_NON_COLD_SHIPPING_PER_BOX);

  const customsPct = profile === 'cold-chain'
    ? parseNumberSetting(settings.pricing_customs_frozen_percent, parseNumberSetting(settings.pricing_customs_percent, DEFAULT_FROZEN_CUSTOMS_PCT))
    : parseNumberSetting(settings.pricing_customs_non_cold_percent, parseNumberSetting(settings.pricing_customs_percent, DEFAULT_NON_COLD_CUSTOMS_PCT));

  const operationalPct = parseNumberSetting(settings.pricing_operational_percent, DEFAULT_OPERATIONAL_PCT);
  const tier1MarginPct = parseNumberSetting(settings.pricing_tier1_margin_percent, parseNumberSetting(settings.pricing_reseller_profit_percent, DEFAULT_TIER1_MARGIN_PCT));
  const tier2MarginPct = parseNumberSetting(settings.pricing_tier2_margin_percent,  DEFAULT_TIER2_MARGIN_PCT);
  const tier3MarginPct = parseNumberSetting(settings.pricing_tier3_margin_percent, parseNumberSetting(settings.pricing_target_profit_percent, DEFAULT_TIER3_MARGIN_PCT));

  const beforeCustoms = purchasePricePerBox + shippingPerBox;
  const afterCustoms = beforeCustoms * (1 + customsPct / 100);
  const landedCost = afterCustoms * (1 + operationalPct / 100);

  return {
    tier1Net: Number((landedCost * (1 + tier1MarginPct / 100)).toFixed(2)),
    tier2Net: Number((landedCost * (1 + tier2MarginPct / 100)).toFixed(2)),
    tier3Net: Number((landedCost * (1 + tier3MarginPct / 100)).toFixed(2)),
  };
}

function buildLocalizedNameJson(row: ParsedImportRow) {
  const fallback = row.productName || row.stockCode || `Urun ${row.rowNumber}`;
  return {
    tr: row.localizedNames.tr || fallback,
    de: row.localizedNames.de || fallback,
    en: row.localizedNames.en || fallback,
    ar: row.localizedNames.ar || fallback,
  };
}

function buildLocalizedDescriptionJson(row: ParsedImportRow) {
  return {
    tr: row.localizedDescriptions.tr || '',
    de: row.localizedDescriptions.de || '',
    en: row.localizedDescriptions.en || '',
    ar: row.localizedDescriptions.ar || '',
  };
}

function buildMergedName(existing: ExistingProduct, row: ParsedImportRow) {
  const current = typeof existing.ad === 'string'
    ? { tr: existing.ad, de: existing.ad, en: existing.ad, ar: '' }
    : { tr: '', de: '', en: '', ar: '', ...(existing.ad || {}) };

  const merged = {
    ...current,
    ...Object.fromEntries(Object.entries(row.localizedNames).filter(([, value]) => Boolean(value))),
  };

  return JSON.stringify(merged) !== JSON.stringify(current) ? merged : null;
}

function buildMergedDescriptions(existing: ExistingProduct, row: ParsedImportRow) {
  const current = typeof existing.aciklamalar === 'string'
    ? { tr: existing.aciklamalar, de: '', en: '', ar: '' }
    : { tr: '', de: '', en: '', ar: '', ...(existing.aciklamalar || {}) };

  const merged = {
    ...current,
    ...Object.fromEntries(Object.entries(row.localizedDescriptions).filter(([, value]) => Boolean(value))),
  };

  return JSON.stringify(merged) !== JSON.stringify(current) ? merged : null;
}

function buildCategorySearchTexts(category: CategoryRow): string[] {
  return [category.slug || '', ...getNameCandidates(category.ad)].filter(Boolean);
}

function scoreCategoryMatch(category: CategoryRow, value: string | null, preferredProductLine?: string | null): number {
  if (!value) return 0;
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) return 0;

  const aliasMatches = CATEGORY_ALIAS_SLUGS[normalizedValue] || [];
  if (category.slug && aliasMatches.includes(category.slug)) {
    return 96;
  }

  let bestScore = 0;
  for (const candidateText of buildCategorySearchTexts(category)) {
    const normalizedCandidate = normalizeText(candidateText);
    if (!normalizedCandidate) continue;

    if (normalizedCandidate === normalizedValue) {
      return preferredProductLine && category.urun_gami === preferredProductLine ? 100 : 98;
    }

    if (normalizedCandidate.includes(normalizedValue) || normalizedValue.includes(normalizedCandidate)) {
      bestScore = Math.max(bestScore, 82);
    }

    const valueTokens = tokenizeCategoryText(value);
    const candidateTokens = tokenizeCategoryText(candidateText);
    if (!valueTokens.length || !candidateTokens.length) continue;

    const sharedCount = valueTokens.filter((token) => (
      candidateTokens.some((candidateToken) => candidateToken === token || candidateToken.includes(token) || token.includes(candidateToken))
    )).length;

    if (!sharedCount) continue;

    const coverageScore = (sharedCount / valueTokens.length) * 60;
    const specificityScore = (sharedCount / candidateTokens.length) * 20;
    const rawScore = Math.round(coverageScore + specificityScore + Math.min(sharedCount * 6, 18));
    bestScore = Math.max(bestScore, rawScore);
  }

  if (preferredProductLine && category.urun_gami === preferredProductLine && bestScore >= 40) {
    bestScore += 6;
  }

  return bestScore;
}

function categoryMatches(category: CategoryRow, value: string | null, preferredProductLine?: string | null): boolean {
  return scoreCategoryMatch(category, value, preferredProductLine) >= 60;
}

function findBestCategoryMatch(
  value: string | null,
  categories: CategoryRow[],
  options?: {
    parentId?: string | null;
    preferredProductLine?: string | null;
  },
): CategoryRow | null {
  if (!value) return null;

  const filteredCategories = categories.filter((category) => (
    !options?.parentId || category.ust_kategori_id === options.parentId || category.id === options.parentId
  ));

  const ranked = filteredCategories
    .map((category) => ({
      category,
      score: scoreCategoryMatch(category, value, options?.preferredProductLine),
    }))
    .filter((entry) => entry.score >= 45)
    .sort((a, b) => b.score - a.score || Number(Boolean(a.category.ust_kategori_id)) - Number(Boolean(b.category.ust_kategori_id)));

  return ranked[0]?.category || null;
}

function resolveCategoryId(row: ParsedImportRow, categories: CategoryRow[]): string | null {
  const preferredProductLine = profileToProductLine(row.profile);
  const topLevelCategories = categories.filter((category) => !category.ust_kategori_id);

  const mainMatch = row.mainCategory
    ? findBestCategoryMatch(row.mainCategory, topLevelCategories, { preferredProductLine })
      || findBestCategoryMatch(row.mainCategory, categories, { preferredProductLine })
    : null;

  if (row.subCategory) {
    const subMatch = findBestCategoryMatch(row.subCategory, categories, {
      parentId: mainMatch?.id || null,
      preferredProductLine,
    }) || findBestCategoryMatch(row.subCategory, categories, { preferredProductLine });

    if (subMatch) return subMatch.id;
  }

  return mainMatch?.id || null;
}

function resolveSupplierMatch(rowSupplierName: string | null, defaultSupplierId: string | null, suppliers: SupplierRow[]): ResolvedSupplierMatch {
  const canonicalSuppliers = dedupeSuppliers(suppliers);
  const preferredName = valueOrNull(rowSupplierName);

  if (preferredName) {
    const normalized = normalizeText(preferredName);
    const normalizedGroup = normalizeSupplierGroupKey(preferredName) || null;
    const matched = canonicalSuppliers.find((supplier) => {
      const supplierName = normalizeText(supplier.unvan || '');
      const supplierGroup = normalizeSupplierGroupKey(supplier.unvan);
      return supplierGroup === normalizedGroup || supplierName === normalized || supplierName.includes(normalized) || normalized.includes(supplierName);
    });
    if (matched) {
      return {
        supplierId: matched.id,
        supplierGroupKey: normalizeSupplierGroupKey(matched.unvan) || normalizedGroup || matched.id,
      };
    }

    return {
      supplierId: null,
      supplierGroupKey: normalizedGroup,
    };
  }

  if (!defaultSupplierId) {
    return { supplierId: null, supplierGroupKey: null };
  }

  const defaultSupplier = suppliers.find((supplier) => supplier.id === defaultSupplierId);
  if (!defaultSupplier) {
    return { supplierId: defaultSupplierId, supplierGroupKey: defaultSupplierId };
  }

  const defaultGroup = normalizeSupplierGroupKey(defaultSupplier.unvan) || defaultSupplier.id;
  const canonicalMatch = canonicalSuppliers.find((supplier) => (normalizeSupplierGroupKey(supplier.unvan) || supplier.id) === defaultGroup);

  return {
    supplierId: canonicalMatch?.id || defaultSupplierId,
    supplierGroupKey: defaultGroup,
  };
}

function isUnsupportedColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = `${error.message || ''}`;
  return error.code === 'PGRST204'
    || error.code === '42703'
    || message.includes('urun_gami')
    || message.includes('kutu_ici_adet')
    || message.includes('koli_ici_kutu_adet')
    || message.includes('palet_ici_koli_adet')
    || message.includes('alis_fiyat_seviyesi')
    || message.includes('palet_ici_kutu_adet')
    || message.includes('palet_ici_adet')
    || message.includes('koli_ici_adet')
    || message.includes('satis_fiyati_toptanci');
}

function isDuplicateRecordError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = `${error.message || ''}`.toLowerCase();
  return error.code === '23505' || message.includes('duplicate') || message.includes('already exists') || message.includes('unique');
}

function formatImportRowLabel(row: ParsedImportRow) {
  const identifier = row.stockCode || row.productName || 'Tanimsiz urun';
  return `Satir ${row.rowNumber}: ${identifier}`;
}

function stripUnsupportedProductFields(data: TablesUpdate<'urunler'> | TablesInsert<'urunler'>) {
  const {
    urun_gami,
    kutu_ici_adet,
    koli_ici_kutu_adet,
    palet_ici_koli_adet,
    koli_ici_adet,
    palet_ici_kutu_adet,
    palet_ici_adet,
    alis_fiyat_seviyesi,
    satis_fiyati_toptanci,
    ...fallbackData
  } = data;

  return fallbackData;
}

function buildProductPayload(row: ParsedImportRow, settings: Record<string, unknown>, categoryId?: string | null, supplierId?: string | null): TablesInsert<'urunler'> {
  const pricePerBox = normalizePurchaseToBoxPrice(row) ?? 0;
  const pricing = calculateNetSales(pricePerBox, row.profile, settings);
  const specs = mergePackagingIntoSpecs(null, row);
  const packaging = normalizePackaging(row);
  const displayName = row.productName || row.stockCode || `urun-${row.rowNumber}`;

  return {
    ad: buildLocalizedNameJson(row),
    aciklamalar: buildLocalizedDescriptionJson(row),
    aktif: true,
    distributor_alis_fiyati: pricePerBox,
    satis_fiyati_alt_bayi: pricing.tier1Net,
    satis_fiyati_toptanci: pricing.tier2Net,
    satis_fiyati_musteri: pricing.tier3Net,
    kategori_id: categoryId || '',
    tedarikci_id: supplierId || null,
    stok_kodu: row.stockCode,
    slug: slugify(`${displayName}-${row.stockCode || Date.now()}`),
    stok_miktari: 0,
    stok_esigi: 0,
    teknik_ozellikler: specs,
    urun_gami: profileToProductLine(row.profile),
    kutu_ici_adet: packaging.unitsPerBox,
    koli_ici_kutu_adet: packaging.boxesPerCase,
    palet_ici_koli_adet: packaging.casesPerPallet,
    alis_fiyat_seviyesi: row.purchaseLevel,
  };
}

export async function importSupplierPriceListAction(formData: FormData, locale = 'tr'): Promise<SupplierPriceImportResult> {
  try {
    const file = formData.get('file');
    const defaultProfile = detectProfile(formData.get('default_profile'), 'non-cold');
    const defaultSupplierId = valueOrNull(String(formData.get('default_supplier_id') || ''));

    if (!(file instanceof File)) {
      return { error: 'Lutfen bir dosya secin.' };
    }

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Oturum bulunamadi.' };

    const { data: profile } = await supabase
      .from('profiller')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.rol !== 'Yönetici' && profile?.rol !== 'Ekip Üyesi') {
      return { error: 'Bu islem icin yetki gerekiyor.' };
    }

    const rows = await readSpreadsheetRows(file);
    const parsedRows = buildParsedRows(rows, defaultProfile);

    if (parsedRows.length === 0) {
      return { error: 'Dosyada islenecek satir bulunamadi.' };
    }

    const { data: systemSettingsRows } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value');

    const settings: Record<string, unknown> = {};
    for (const row of systemSettingsRows || []) {
      try {
        settings[row.setting_key] = JSON.parse(row.setting_value);
      } catch {
        settings[row.setting_key] = row.setting_value;
      }
    }

    let [productQuery, categoryQuery, supplierQuery] = await Promise.all([
      supabase
        .from('urunler')
        .select('id, stok_kodu, ad, aciklamalar, distributor_alis_fiyati, tedarikci_id, urun_gami, teknik_ozellikler, kategori_id, slug')
        .range(0, 3999),
      supabase
        .from('kategoriler')
        .select('id, ad, slug, ust_kategori_id, urun_gami')
        .range(0, 3999),
      supabase
        .from('tedarikciler')
        .select('id, unvan')
        .range(0, 999),
    ]);

    const productSchemaNeedsFallback = Boolean(productQuery.error && isUnsupportedColumnError(productQuery.error));
    const categorySchemaNeedsFallback = Boolean(categoryQuery.error && isUnsupportedColumnError(categoryQuery.error));
    const dbSupportsExtendedProductColumns = !productSchemaNeedsFallback;

    if (productSchemaNeedsFallback) {
      productQuery = await supabase
        .from('urunler')
        .select('id, stok_kodu, ad, aciklamalar, distributor_alis_fiyati, tedarikci_id, teknik_ozellikler, kategori_id, slug')
        .range(0, 3999);
    }

    if (categorySchemaNeedsFallback) {
      categoryQuery = await supabase
        .from('kategoriler')
        .select('id, ad, slug, ust_kategori_id')
        .range(0, 3999);
    }

    if (productQuery.error || !productQuery.data) {
      return { error: 'Urun listesi okunamadi.' };
    }

    if (categoryQuery.error || !categoryQuery.data) {
      return { error: 'Kategori listesi okunamadi.' };
    }

    const products = (productQuery.data as Array<Partial<ExistingProduct>>).map((product) => ({
      ...product,
      urun_gami: product.urun_gami ?? null,
    })) as ExistingProduct[];
    const categories = (categoryQuery.data as Array<Partial<CategoryRow>>).map((category) => ({
      ...category,
      urun_gami: category.urun_gami ?? null,
    })) as CategoryRow[];
    const suppliers = ((supplierQuery.data || []) as Array<Partial<SupplierRow>>).map((supplier) => ({
      id: String(supplier.id || ''),
      unvan: supplier.unvan ?? null,
    })).filter((supplier) => supplier.id);
    const byCode = new Map<string, ExistingProduct>();
    const byName = new Map<string, ExistingProduct>();
    const byUnassignedCode = new Map<string, ExistingProduct>();
    const byUnassignedName = new Map<string, ExistingProduct>();
    const bySupplierCode = new Map<string, ExistingProduct>();
    const bySupplierName = new Map<string, ExistingProduct>();
    const bySupplierGroupCode = new Map<string, ExistingProduct>();
    const bySupplierGroupName = new Map<string, ExistingProduct>();
    const supplierGroupById = Object.fromEntries(
      suppliers.map((supplier) => [supplier.id, normalizeSupplierGroupKey(supplier.unvan) || supplier.id])
    ) as Record<string, string>;

    for (const product of products) {
      if (product.stok_kodu) {
        const normalizedCode = normalizeText(product.stok_kodu);
        byCode.set(normalizedCode, product);
        if (!product.tedarikci_id) {
          byUnassignedCode.set(normalizedCode, product);
        } else {
          bySupplierCode.set(`${product.tedarikci_id}::${normalizedCode}`, product);
          const supplierGroupKey = supplierGroupById[product.tedarikci_id] || product.tedarikci_id;
          if (!bySupplierGroupCode.has(`${supplierGroupKey}::${normalizedCode}`)) {
            bySupplierGroupCode.set(`${supplierGroupKey}::${normalizedCode}`, product);
          }
        }
      }

      for (const name of getNameCandidates(product.ad)) {
        const key = normalizeText(name);
        if (!key) continue;
        if (!byName.has(key)) {
          byName.set(key, product);
        }
        if (!product.tedarikci_id) {
          if (!byUnassignedName.has(key)) {
            byUnassignedName.set(key, product);
          }
        } else {
          if (!bySupplierName.has(`${product.tedarikci_id}::${key}`)) {
            bySupplierName.set(`${product.tedarikci_id}::${key}`, product);
          }
          const supplierGroupKey = supplierGroupById[product.tedarikci_id] || product.tedarikci_id;
          if (!bySupplierGroupName.has(`${supplierGroupKey}::${key}`)) {
            bySupplierGroupName.set(`${supplierGroupKey}::${key}`, product);
          }
        }
      }
    }

    let matchedCount = 0;
    let updatedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;
    const unmatched: string[] = [];
    const skipReasons: string[] = [];
    const updatedProducts: UpdatedProductSummary[] = [];

    for (const row of parsedRows) {
      const rowLabel = formatImportRowLabel(row);
      const codeKey = row.stockCode ? normalizeText(row.stockCode) : '';
      const nameKey = row.productName ? normalizeText(row.productName) : '';
      const { supplierId: resolvedSupplierId, supplierGroupKey } = resolveSupplierMatch(row.supplierName, defaultSupplierId, suppliers);
      let matchedProduct = (resolvedSupplierId
        ? (codeKey ? bySupplierCode.get(`${resolvedSupplierId}::${codeKey}`) : null)
          || (nameKey ? bySupplierName.get(`${resolvedSupplierId}::${nameKey}`) : null)
        : null)
        || (supplierGroupKey
          ? (codeKey ? bySupplierGroupCode.get(`${supplierGroupKey}::${codeKey}`) : null)
            || (nameKey ? bySupplierGroupName.get(`${supplierGroupKey}::${nameKey}`) : null)
          : null)
        || (codeKey ? byCode.get(codeKey) : null)
        || (nameKey ? byName.get(nameKey) : null)
        || (codeKey ? byUnassignedCode.get(codeKey) : null)
        || (nameKey ? byUnassignedName.get(nameKey) : null)
        || null;
      const resolvedCategoryId = resolveCategoryId(row, categories);
      const pricePerBox = normalizePurchaseToBoxPrice(row);
      const pricing = pricePerBox != null ? calculateNetSales(pricePerBox, row.profile, settings) : null;

      if (!matchedProduct) {
        if (!resolvedCategoryId || !row.productName || pricePerBox == null) {
          notFoundCount += 1;
          unmatched.push(rowLabel);

          const reasons: string[] = [];
          if (!row.productName) reasons.push('urun adi eksik');
          if (!resolvedCategoryId) reasons.push(`kategori eslesmedi (${row.mainCategory || '-'} / ${row.subCategory || '-'})`);
          if (pricePerBox == null) reasons.push('alis fiyati okunamadi');
          if (reasons.length > 0) {
            skipReasons.push(`${rowLabel}: ${reasons.join(', ')}`);
          }
          continue;
        }

        const insertData = buildProductPayload(row, settings, resolvedCategoryId, resolvedSupplierId);
        const compatibleInsertData = dbSupportsExtendedProductColumns
          ? insertData
          : stripUnsupportedProductFields(insertData) as TablesInsert<'urunler'>;

        let insertResult = await supabase
          .from('urunler')
          .insert(compatibleInsertData)
          .select('id, distributor_alis_fiyati')
          .single();

        if (insertResult.error && isUnsupportedColumnError(insertResult.error)) {
          insertResult = await supabase
            .from('urunler')
            .insert(stripUnsupportedProductFields(insertData) as TablesInsert<'urunler'>)
            .select('id, distributor_alis_fiyati')
            .single();
        }

        if (insertResult.error && isDuplicateRecordError(insertResult.error)) {
          matchedProduct = (codeKey ? byCode.get(codeKey) : null)
            || (nameKey ? byName.get(nameKey) : null)
            || null;
        }

        if (!matchedProduct) {
          if (insertResult.error || !insertResult.data) {
            skippedCount += 1;
            unmatched.push(`${rowLabel} (yeni urun olusturulamadi)`);
            if (insertResult.error?.message) {
              skipReasons.push(`${rowLabel}: ${insertResult.error.message}`);
            }
            continue;
          }

          createdCount += 1;
          updatedProducts.push({
            urunId: insertResult.data.id,
            distributor_alis_fiyati: Number((insertResult.data.distributor_alis_fiyati ?? 0).toFixed(2)),
            urun_gami: profileToProductLine(row.profile),
          });
          continue;
        }
      }

      const mergedSpecs = mergePackagingIntoSpecs(matchedProduct?.teknik_ozellikler || null, row);
      matchedCount += 1;
      const updateData: TablesUpdate<'urunler'> = {
        urun_gami: profileToProductLine(row.profile),
        teknik_ozellikler: mergedSpecs,
        alis_fiyat_seviyesi: row.purchaseLevel,
        kutu_ici_adet: normalizePackaging(row).unitsPerBox,
        koli_ici_kutu_adet: normalizePackaging(row).boxesPerCase,
        palet_ici_koli_adet: normalizePackaging(row).casesPerPallet,
      };

      if (resolvedSupplierId && !matchedProduct.tedarikci_id) {
        updateData.tedarikci_id = resolvedSupplierId;
      }

      if (resolvedCategoryId && resolvedCategoryId !== matchedProduct.kategori_id) {
        updateData.kategori_id = resolvedCategoryId;
      }

      if (row.stockCode && !matchedProduct.stok_kodu) {
        updateData.stok_kodu = row.stockCode;
      }

      const mergedName = buildMergedName(matchedProduct, row);
      if (mergedName) {
        updateData.ad = mergedName;
      }

      const mergedDescriptions = buildMergedDescriptions(matchedProduct, row);
      if (mergedDescriptions) {
        updateData.aciklamalar = mergedDescriptions;
      }

      if (pricePerBox != null && pricing) {
        updateData.distributor_alis_fiyati = pricePerBox;
        updateData.satis_fiyati_alt_bayi = pricing.tier1Net;
        updateData.satis_fiyati_toptanci = pricing.tier2Net;
        updateData.satis_fiyati_musteri = pricing.tier3Net;
      }

      const effectiveUpdateData = dbSupportsExtendedProductColumns
        ? updateData
        : stripUnsupportedProductFields(updateData) as TablesUpdate<'urunler'>;
      const hasOnlyNoopTypeUpdate = Object.keys(effectiveUpdateData).length === 0
        || (Object.keys(effectiveUpdateData).length === 1 && effectiveUpdateData.urun_gami === matchedProduct.urun_gami);
      if (hasOnlyNoopTypeUpdate) {
        skippedCount += 1;
        skipReasons.push(`${rowLabel}: guncelleme icin fiyat veya yeni alan bulunamadi`);
        continue;
      }

      let { error } = await supabase
        .from('urunler')
        .update(effectiveUpdateData)
        .eq('id', matchedProduct.id);

      if (error && isUnsupportedColumnError(error)) {
        ({ error } = await supabase
          .from('urunler')
          .update(stripUnsupportedProductFields(updateData) as TablesUpdate<'urunler'>)
          .eq('id', matchedProduct.id));
      }

      if (error) {
        skippedCount += 1;
        unmatched.push(`${rowLabel} (guncellenemedi)`);
        if (error.message) {
          skipReasons.push(`${rowLabel}: ${error.message}`);
        }
        continue;
      }

      updatedCount += 1;
      updatedProducts.push({
        urunId: matchedProduct.id,
        distributor_alis_fiyati: Number((effectiveUpdateData.distributor_alis_fiyati ?? matchedProduct.distributor_alis_fiyati ?? 0).toFixed(2)),
        urun_gami: effectiveUpdateData.urun_gami ?? matchedProduct.urun_gami,
      });
    }

    revalidatePath(`/${locale}/admin/urun-yonetimi/fiyatlandirma-hub`);
    revalidatePath(`/${locale}/admin/urun-yonetimi/urunler`);

    return {
      success: true,
      updatedCount,
      createdCount,
      matchedCount,
      skippedCount,
      notFoundCount,
      unmatched: unmatched.slice(0, 50),
      skipReasons: skipReasons.slice(0, 50),
      updatedProducts,
    };
  } catch (error) {
    console.error('importSupplierPriceListAction error:', error);
    return {
      error: error instanceof Error ? error.message : 'Dosya ice aktarilirken beklenmeyen bir hata oldu.',
    };
  }
}
