'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { FiFile, FiFileText, FiPlus, FiPrinter, FiSave, FiSend, FiTrash2, FiChevronUp, FiChevronDown, FiMenu, FiSearch, FiArrowUp, FiArrowDown, FiCopy, FiCheck } from 'react-icons/fi';
import { toast } from 'sonner';
import {
  confirmOrderCreateGiderAndLogAction,
  deleteSupplierOrderPlanSnapshotAction,
  getSupplierOrderPlanStorageAction,
  receiveSupplierOrderAndUpdateStockAction,
  saveSupplierOrderPlanDraftAction,
  saveSupplierOrderPlanSnapshotAction,
} from './actions';

type ProductRow = {
  id: string;
  ad: Record<string, string> | string | null;
  stok_kodu: string | null;
  ean_gtin: string | null;
  distributor_alis_fiyati: number;
  koli_ici_adet: number | null;    // 1 kolide kaç adet
  palet_ici_adet: number | null;   // 1 palette toplam kaç adet
  birim_agirlik_kg: number | null; // 1 adet ürünün ağırlığı (kg)
  tedarikci_id: string | null;
  aktif: boolean;
};

type SupplierRow = {
  id: string;
  unvan: string | null;
};

type UnitType = 'adet' | 'koli' | 'palet';

type PlanItem = {
  id: string;
  productId: string;
  unitType: UnitType;
  quantity: number;
  gercek_alis_fiyati?: number | null;  // satıra özel gerçek birim fiyat (adet başına)
  fiyat_duzenlendi?: boolean;           // true → gercek_alis_fiyati kullan
  indirim_aciklamasi?: string | null;  // örn: "%20 + %8 çift kademeli"
};

type SavedPlanRecord = {
  id: string;
  name: string;
  createdAt: string;
  createdBy?: string | null;
  status?: 'sablon' | 'gonderildi' | 'teslim_alindi';
  sentAt?: string | null;
  receivedAt?: string | null;
  supplierId: string;
  search: string;
  selectedUnitType: UnitType;
  selectedQuantity: number;
  items: PlanItem[];
};

interface Props {
  locale: string;
  products: ProductRow[];
  suppliers: SupplierRow[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);

const formatUnitCost = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 2,
  }).format(value);

function getProductLocalizedName(ad: ProductRow['ad'], lang: 'en' | 'tr' | 'de' | 'ar' = 'en'): string {
  if (!ad) return 'Unnamed Product';
  if (typeof ad === 'string') return ad;
  return ad[lang] || ad.en || ad.tr || ad.de || ad.ar || Object.values(ad)[0] || 'Unnamed Product';
}

function getProductName(ad: ProductRow['ad'], locale: string = 'en'): string {
  if (!ad) return 'Unnamed Product';
  if (typeof ad === 'string') return ad;
  // Tedarikçi sipariş planı için varsayılan olarak İngilizce öncelikli
  return ad.en || ad.tr || ad.de || ad[locale] || ad.ar || Object.values(ad)[0] || 'Unnamed Product';
}

/**
 * Tedarikçi sipariş listesi + çıktılar için ürün adı.
 * İngilizce öncelikli (tedarikçi faturaları ve proformalar İngilizce ortak dil).
 * Fallback: en → tr → de → ar → ilk uygun değer.
 */
function getProductNameEn(ad: ProductRow['ad']): string {
  if (!ad) return 'Unnamed Product';
  if (typeof ad === 'string') return ad;
  return ad.en || ad.tr || ad.de || ad.ar || Object.values(ad)[0] || 'Unnamed Product';
}

/** Türkçe/Almanca karakterleri ASCII'ye düşürür — arama karşılaştırması için */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g').replace(/[ıİ]/g, 'i')
    .replace(/[şŞ]/g, 's').replace(/[öÖ]/g, 'o').replace(/[üÜ]/g, 'u')
    .replace(/[âÂ]/g, 'a').replace(/[äÄ]/g, 'a').replace(/[ß]/g, 'ss');
}

/** Ürünün tüm dillerdeki adlarını normalize ederek tek bir arama metni oluşturur */
function productSearchText(ad: ProductRow['ad'], stok_kodu: string | null, ean: string | null): string {
  const names = ad && typeof ad === 'object'
    ? Object.values(ad as Record<string, string>).filter(Boolean)
    : [String(ad || '')];
  return normalize([...names, stok_kodu || '', ean || ''].join(' '));
}

/**
 * Seçili birime göre toplam adet hesaplar.
 * distributor_alis_fiyati adet başına olduğu için fiyat × adet = satır maliyeti.
 */
function unitMultiplier(product: ProductRow, unitType: UnitType): number {
  const piecesPerCase   = Math.max(1, Number(product.koli_ici_adet  || 1)); // adet/koli
  const piecesPerPallet = Math.max(1, Number(product.palet_ici_adet || 1)); // adet/palet

  if (unitType === 'adet')  return 1;
  if (unitType === 'koli')  return piecesPerCase;
  if (unitType === 'palet') return piecesPerPallet;
  return 1;
}

/**
 * Bir sipariş satırının kaç palet ettiğini hesaplar.
 * palet_ici_adet = 1 paletteki KOLİ sayısı (adet değil).
 * Hesap: toplam koli / koli_per_palet = palet sayısı.
 * Sonuç kesirli olabilir (örn. 0.5 palet = yarım palet).
 */
function calcPallets(product: ProductRow, unitType: UnitType, quantity: number): number {
  const casesPerPallet = Number(product.palet_ici_adet || 0);   // palet başına koli
  const piecesPerCase  = Math.max(1, Number(product.koli_ici_adet || 1)); // koli başına adet
  if (casesPerPallet <= 0) return 0;

  // Seçili birime göre toplam KOLİ sayısını bul
  let totalCases: number;
  if      (unitType === 'palet') totalCases = quantity * casesPerPallet;
  else if (unitType === 'koli')  totalCases = quantity;
  else                           totalCases = quantity / piecesPerCase; // 'adet' → koli

  return totalCases / casesPerPallet;
}

function formatPallets(pallets: number): string {
  if (pallets <= 0) return '—';
  if (pallets < 0.1) return `~${(pallets * 100).toFixed(0)}%`;
  if (pallets < 1) return `~${pallets.toFixed(2)} palet`;
  return `${pallets % 1 === 0 ? pallets.toFixed(0) : pallets.toFixed(2)} palet`;
}

/**
 * Bir sipariş satırının toplam kg ağırlığını hesaplar.
 * birim_agirlik_kg girilmemişse 0 döner.
 */
function calcWeightKg(product: ProductRow, unitType: UnitType, quantity: number): number {
  const unitKg = Number(product.birim_agirlik_kg || 0);
  if (unitKg <= 0) return 0;
  const totalPieces = quantity * unitMultiplier(product, unitType);
  return totalPieces * unitKg;
}

function formatWeight(kg: number): string {
  if (kg <= 0) return '—';
  if (kg >= 1000) {
    const t = kg / 1000;
    return t % 1 === 0 ? `${t.toFixed(0)} t` : `${t.toFixed(2)} t`;
  }
  return `${Math.round(kg)} kg`;
}

/** Sade palet metni: sayı + 'palet' (UI sütunu için, ~ ve % olmadan) */
function formatPalletsPlain(pallets: number): string {
  if (pallets <= 0) return '—';
  return `${pallets % 1 === 0 ? pallets.toFixed(0) : pallets.toFixed(2)} palet`;
}

/** Eski 'kutu' draftlarını yeni 'adet' birimine normalize et. */
function normalizeUnit(u: any): UnitType {
  if (u === 'kutu') return 'adet';
  if (u === 'adet' || u === 'koli' || u === 'palet') return u;
  return 'koli';
}

const DRAFT_STORAGE_KEY = 'tedarikci-siparis-plani:draft:v1';
const HISTORY_STORAGE_KEY = 'tedarikci-siparis-plani:history:v1';
const COMPANY_NAME = 'ElysonSweets GmbH';
const COMPANY_EMAIL = 'info@elysonsweets.de';
const COMPANY_LOCATION = 'Koln, Deutschland';

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function TedarikciSiparisPlaniClient({ locale, products, suppliers }: Props) {
  const [draftName, setDraftName] = useState('Sipariş Taslağı');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedUnitType, setSelectedUnitType] = useState<UnitType>('koli');
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [planHistory, setPlanHistory] = useState<SavedPlanRecord[]>([]);
  const [lastDraftSaveAt, setLastDraftSaveAt] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [editingRecordId,    setEditingRecordId]    = useState<string | null>(null);
  const [draggedItemId,      setDraggedItemId]      = useState<string | null>(null);
  const [productDisplayLang, setProductDisplayLang] = useState<'en' | 'tr' | 'de' | 'ar'>('en');
  const [tableFilter,        setTableFilter]        = useState('');
  const [tablePageSize,      setTablePageSize]      = useState<number>(0); // 0: Tümü
  const [tableCurrentPage,   setTableCurrentPage]   = useState(1);
  const [dragHandleActiveRowId, setDragHandleActiveRowId] = useState<string | null>(null);
  const [copiedBarcode,         setCopiedBarcode]         = useState<string | null>(null);

  // ── Toplu indirim state ──────────────────────────────────────────────────
  const [bulkDiscMode,      setBulkDiscMode]      = useState<'single' | 'double'>('single');
  const [bulkDisc1,         setBulkDisc1]         = useState('');
  const [bulkDisc2,         setBulkDisc2]         = useState('');
  const [activeBulkBanner,  setActiveBulkBanner]  = useState<string | null>(null); // açıklama metni

  const productsById = useMemo(() => {
    const map = new Map<string, ProductRow>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const raw     = search.trim();
    const q       = normalize(raw);           // normalize: ç→c, ğ→g, vb.
    if (!selectedSupplierId) return [];

    // 13 haneli sayı → EAN/barkod araması (tedarikçi filtresi uygulanmaz)
    const isBarcode = /^\d{13}$/.test(raw);

    return products
      .filter((p) => {
        if (!isBarcode && p.tedarikci_id !== selectedSupplierId) return false;
        if (!q) return true;
        if (isBarcode) return String(p.ean_gtin || '') === raw;
        // Tüm diller + stok kodu normalize edilmiş metin içinde ara
        const haystack = productSearchText(p.ad, p.stok_kodu, p.ean_gtin);
        return haystack.includes(q);
      })
      .sort((a, b) =>
        getProductLocalizedName(a.ad, productDisplayLang).localeCompare(
          getProductLocalizedName(b.ad, productDisplayLang),
          productDisplayLang === 'tr' ? 'tr' : 'en'
        )
      );
  }, [products, search, selectedSupplierId, productDisplayLang]);

  const selectedSupplierName = useMemo(() => {
    if (!selectedSupplierId) return 'Seçilmedi';
    return suppliers.find((s) => s.id === selectedSupplierId)?.unvan || 'Bilinmeyen Tedarikçi';
  }, [selectedSupplierId, suppliers]);

  const quickProducts = useMemo(() => filteredProducts.slice(0, 12), [filteredProducts]);

  const frequentProducts = useMemo(() => {
    // Score products from confirmed (teslim_alindi) + sent (gonderildi) records
    // filtered to the current supplier. Score = appearances * 10 + total units ordered.
    const scoreMap = new Map<string, { freq: number; units: number }>();

    for (const record of planHistory) {
      const status = record.status || 'sablon';
      if (status !== 'teslim_alindi' && status !== 'gonderildi') continue;
      if (selectedSupplierId && record.supplierId !== selectedSupplierId) continue;
      for (const item of record.items) {
        const existing = scoreMap.get(item.productId) ?? { freq: 0, units: 0 };
        const product = productsById.get(item.productId);
        const multiplier = product ? unitMultiplier(product, item.unitType) : 1;
        scoreMap.set(item.productId, {
          freq: existing.freq + 1,
          units: existing.units + item.quantity * multiplier,
        });
      }
    }

    // Also give a small boost for products in the current draft (most-recently touched)
    const currentIds = new Set(items.map((i) => i.productId));

    return Array.from(scoreMap.entries())
      .map(([productId, { freq, units }]) => ({
        product: productsById.get(productId),
        score: freq * 10 + Math.log1p(units) + (currentIds.has(productId) ? 0 : 0),
        freq,
      }))
      .filter((entry): entry is { product: ProductRow; score: number; freq: number } => Boolean(entry.product))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((entry) => ({ product: entry.product, freq: entry.freq }));
  }, [planHistory, selectedSupplierId, productsById, items]);

  const selectedProduct = selectedProductId ? productsById.get(selectedProductId) || null : null;

  useEffect(() => {
    let mounted = true;

    const parseLocalDraft = () => {
      try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as {
          draftName?: string;
          selectedSupplierId?: string;
          search?: string;
          selectedProductId?: string;
          selectedUnitType?: UnitType;
          selectedQuantity?: number;
          items?: PlanItem[];
          savedAt?: string;
        };
      } catch {
        return null;
      }
    };

    const parseLocalHistory = () => {
      try {
        const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (!raw) return [] as SavedPlanRecord[];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as SavedPlanRecord[]) : [];
      } catch {
        return [] as SavedPlanRecord[];
      }
    };

    const loadStorage = async () => {
      const remote = await getSupplierOrderPlanStorageAction();
      const localDraft = parseLocalDraft();

      if (mounted && remote.success) {
        const remoteDraft = remote.draft;
        const d = remoteDraft || localDraft;
        if (d) {
          if (d.draftName) setDraftName(d.draftName);
          if (d.selectedSupplierId) setSelectedSupplierId(d.selectedSupplierId);
          if (typeof d.search === 'string') setSearch(d.search);
          if (d.selectedProductId) setSelectedProductId(d.selectedProductId);
          if (d.selectedUnitType) setSelectedUnitType(normalizeUnit(d.selectedUnitType));
          if (typeof d.selectedQuantity === 'number') setSelectedQuantity(d.selectedQuantity);
          if (Array.isArray(d.items)) setItems(d.items.map(it => ({ ...it, unitType: normalizeUnit(it.unitType) })));
          if (d.savedAt) setLastDraftSaveAt(d.savedAt);
        }

        // Remote kayıt tek kaynak doğrusudur — localStorage ile birleştirme yapılmaz.
        // Bu sayede bir yöneticinin sildiği kayıt diğer yöneticinin localStorage'ından geri dönmez.
        const remoteHistory = Array.isArray(remote.history) ? remote.history : [];
        setPlanHistory(remoteHistory);
        try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(remoteHistory)); } catch {}

        if (localDraft && !remoteDraft) {
          void saveSupplierOrderPlanDraftAction({
            draftName: localDraft.draftName || 'Sipariş Taslağı',
            selectedSupplierId: localDraft.selectedSupplierId === 'all' ? '' : localDraft.selectedSupplierId || '',
            search: localDraft.search || '',
            selectedProductId: localDraft.selectedProductId || '',
            selectedUnitType: localDraft.selectedUnitType || 'koli',
            selectedQuantity: localDraft.selectedQuantity || 1,
            items: Array.isArray(localDraft.items) ? localDraft.items : [],
            savedAt: localDraft.savedAt || new Date().toISOString(),
          });
        }
      }

      if (mounted && !remote.success) {
        // Cloud okunamazsa local fallback
        const localHistory = parseLocalHistory();
        if (localDraft) {
          if (localDraft.draftName) setDraftName(localDraft.draftName);
          if (localDraft.selectedSupplierId) setSelectedSupplierId(localDraft.selectedSupplierId);
          if (typeof localDraft.search === 'string') setSearch(localDraft.search);
          if (localDraft.selectedProductId) setSelectedProductId(localDraft.selectedProductId);
          if (localDraft.selectedUnitType) setSelectedUnitType(normalizeUnit(localDraft.selectedUnitType));
          if (typeof localDraft.selectedQuantity === 'number') setSelectedQuantity(localDraft.selectedQuantity);
          if (Array.isArray(localDraft.items)) setItems(localDraft.items.map(it => ({ ...it, unitType: normalizeUnit(it.unitType) })));
          if (localDraft.savedAt) setLastDraftSaveAt(localDraft.savedAt);
        }
        if (localHistory.length > 0) setPlanHistory(localHistory);
      }

      if (mounted) setStorageReady(true);
    };

    loadStorage();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!storageReady) return;

    const payload = {
      draftName,
      selectedSupplierId,
      search,
      selectedProductId,
      selectedUnitType,
      selectedQuantity,
      items,
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
      setLastDraftSaveAt(payload.savedAt);
    } catch {
      // Local storage quota errors should not block core workflow.
    }

    const timer = setTimeout(() => {
      void saveSupplierOrderPlanDraftAction(payload);
    }, 500);

    return () => clearTimeout(timer);
  }, [storageReady, draftName, selectedSupplierId, search, selectedProductId, selectedUnitType, selectedQuantity, items]);

  const enrichedItems = useMemo(() => {
    return items
      .map((item) => {
        const product = productsById.get(item.productId);
        if (!product) return null;

        const stdPricePerPiece = Math.round(Number(product.distributor_alis_fiyati || 0) * 1000) / 1000; // standart adet fiyatı
        const rawRealPrice = item.fiyat_duzenlendi && item.gercek_alis_fiyati != null
          ? Number(item.gercek_alis_fiyati)
          : stdPricePerPiece;
        const realPricePerPiece = Math.round(rawRealPrice * 1000) / 1000;
        const multiplier  = unitMultiplier(product, item.unitType); // seçili birimdeki toplam adet
        const unitCost    = Math.round(realPricePerPiece * multiplier * 1000) / 1000; // gerçek birim maliyet (3 basamak)
        const stdUnitCost = Math.round(stdPricePerPiece  * multiplier * 1000) / 1000; // standart birim maliyet (tooltip için)
        const lineTotal   = Math.round(unitCost * item.quantity * 100) / 100;

        return {
          ...item,
          product,
          purchaseBoxCost: stdPricePerPiece,  // standart adet fiyatı (tooltip/sıfırlama için)
          realPricePerPiece,
          multiplier,
          unitCost,
          stdUnitCost,
          lineTotal,
          isModified: item.fiyat_duzenlendi === true,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [items, productsById]);

  const totals = useMemo(() => {
    return enrichedItems.reduce(
      (acc, row) => {
        acc.grandTotal += row.lineTotal;
        acc.totalLines += 1;
        acc.totalUnits += row.quantity;
        acc.totalPallets += calcPallets(row.product, row.unitType, row.quantity);
        // Toplam ağırlık: sipariş edilen toplam adet × birim ağırlık
        const unitKg = Number(row.product.birim_agirlik_kg || 0);
        if (unitKg > 0) {
          const totalPieces = row.quantity * unitMultiplier(row.product, row.unitType);
          acc.totalWeightKg += totalPieces * unitKg;
        }
        return acc;
      },
      { grandTotal: 0, totalLines: 0, totalUnits: 0, totalPallets: 0, totalWeightKg: 0 }
    );
  }, [enrichedItems]);

  // Tablo içi canlı arama / filtreleme
  const filteredTableItems = useMemo(() => {
    if (!tableFilter.trim()) return enrichedItems;
    const q = normalize(tableFilter.trim());
    return enrichedItems.filter((row) => {
      const haystack = productSearchText(row.product.ad, row.product.stok_kodu, row.product.ean_gtin);
      return haystack.includes(q);
    });
  }, [enrichedItems, tableFilter]);

  // Tablo sayfalama (pagination)
  const displayedTableItems = useMemo(() => {
    if (tablePageSize <= 0) return filteredTableItems;
    const start = (tableCurrentPage - 1) * tablePageSize;
    return filteredTableItems.slice(start, start + tablePageSize);
  }, [filteredTableItems, tablePageSize, tableCurrentPage]);

  const totalTablePages = useMemo(() => {
    if (tablePageSize <= 0) return 1;
    return Math.max(1, Math.ceil(filteredTableItems.length / tablePageSize));
  }, [filteredTableItems.length, tablePageSize]);

  const templateRecords = useMemo(() => {
    return planHistory
      .filter((record) => (record.status || 'sablon') === 'sablon')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [planHistory]);

  const sentRecords = useMemo(() => {
    return planHistory
      .filter((record) => (record.status || 'sablon') === 'gonderildi')
      .sort((a, b) => new Date(b.sentAt || b.createdAt).getTime() - new Date(a.sentAt || a.createdAt).getTime());
  }, [planHistory]);

  const receivedRecords = useMemo(() => {
    return planHistory
      .filter((record) => (record.status || 'sablon') === 'teslim_alindi')
      .sort((a, b) => new Date(b.receivedAt || b.createdAt).getTime() - new Date(a.receivedAt || a.createdAt).getTime());
  }, [planHistory]);

  const calculateRecordTotal = (record: SavedPlanRecord) => {
    return record.items.reduce((sum, item) => {
      const product = productsById.get(item.productId);
      if (!product) return sum;
      const stdPrice  = Number(product.distributor_alis_fiyati || 0);
      const realPrice = item.fiyat_duzenlendi && item.gercek_alis_fiyati != null
        ? Number(item.gercek_alis_fiyati)
        : stdPrice;
      const multiplier = unitMultiplier(product, item.unitType);
      return sum + realPrice * multiplier * item.quantity;
    }, 0);
  };

  const addItemByProduct = (productId: string, unitType: UnitType = 'koli', quantity = selectedQuantity) => {
    if (!selectedSupplierId) {
      toast.warning('Önce tedarikçi seçmelisiniz.');
      return;
    }
    if (!productId) return;
    if (!Number.isFinite(quantity) || quantity <= 0) return;

    const alreadyExists = items.some((item) => item.productId === productId);
    if (alreadyExists) {
      toast.warning('Bu ürün zaten listeye eklendi. Miktarı satırdan artırabilirsiniz.');
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        id: `${productId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        productId,
        unitType,
        quantity: Math.max(1, Math.floor(quantity)),
      },
    ]);
  };

  const addItem = () => {
    if (!selectedSupplierId) {
      toast.warning('Önce tedarikçi seçmelisiniz.');
      return;
    }
    addItemByProduct(selectedProductId);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const moveItem = (id: string, direction: 'up' | 'down') => {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;
      
      const newItems = [...prev];
      if (direction === 'up' && index > 0) {
        [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      } else if (direction === 'down' && index < newItems.length - 1) {
        [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      }
      return newItems;
    });
  };

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId) {
      setDraggedItemId(null);
      return;
    }

    setItems((prev) => {
      const draggedIndex = prev.findIndex((i) => i.id === draggedItemId);
      const targetIndex = prev.findIndex((i) => i.id === targetId);
      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const newItems = [...prev];
      const [draggedItem] = newItems.splice(draggedIndex, 1);
      newItems.splice(targetIndex, 0, draggedItem);
      return newItems;
    });

    setDraggedItemId(null);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
  };

  const clearItems = () => setItems([]);

  const scrollToTop = () => {
    const main = document.querySelector('main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    const el = document.getElementById('table-summary-row');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else {
      const main = document.querySelector('main');
      if (main) main.scrollTo({ top: main.scrollHeight, behavior: 'smooth' });
      else window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  };

  const copyToClipboard = async (text: string, label = 'Barkod') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBarcode(text);
      toast.success(`${label} panoya kopyalandı: ${text}`);
      setTimeout(() => setCopiedBarcode(null), 2000);
    } catch {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopiedBarcode(text);
        toast.success(`${label} panoya kopyalandı: ${text}`);
        setTimeout(() => setCopiedBarcode(null), 2000);
      } catch {
        toast.error('Kopyalama başarısız oldu.');
      }
    }
  };

  const saveSnapshot = () => {
    if (items.length === 0) return;

    const existing = editingRecordId ? planHistory.find((r) => r.id === editingRecordId) : null;
    const isEditingSentRecord = existing?.status === 'gonderildi';

    const record: SavedPlanRecord = {
      id: isEditingSentRecord ? crypto.randomUUID() : editingRecordId || crypto.randomUUID(),
      name: draftName.trim() || `Sipariş Planı ${new Date().toLocaleDateString('tr-TR')}`,
      createdAt: isEditingSentRecord ? new Date().toISOString() : existing?.createdAt || new Date().toISOString(),
      status: 'sablon',
      sentAt: null,
      supplierId: selectedSupplierId,
      search,
      selectedUnitType,
      selectedQuantity,
      items,
    };

    const nextHistory = (() => {
      const i = planHistory.findIndex((r) => r.id === record.id);
      if (i >= 0) {
        const cloned = [...planHistory];
        cloned[i] = record;
        return cloned;
      }
      return [record, ...planHistory].slice(0, 200);
    })();

    setPlanHistory(nextHistory);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));

    void saveSupplierOrderPlanSnapshotAction(record).then((res) => {
      if (res.success) {
        setPlanHistory(res.history);
        try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(res.history)); } catch {}
        if (isEditingSentRecord) {
          setEditingRecordId(null);
          toast.success('Gönderilen kayıttan yeni şablon oluşturuldu');
        } else {
          toast.success(editingRecordId ? 'Şablon güncellendi' : 'Yeni şablon kaydedildi');
        }
      }
    });
  };

  const loadSavedRecord = (record: SavedPlanRecord) => {
    setDraftName(record.name);
    setSelectedSupplierId(record.supplierId);
    setSearch(record.search);
    setSelectedProductId('');
    setSelectedUnitType(record.selectedUnitType);
    setSelectedQuantity(record.selectedQuantity);
    setItems(record.items);
    setEditingRecordId(record.id);
    toast.success('Şablon düzenleme için yüklendi');
  };

  const deleteSavedRecord = (recordId: string) => {
    const nextHistory = planHistory.filter((record) => record.id !== recordId);
    setPlanHistory(nextHistory);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
    if (editingRecordId === recordId) setEditingRecordId(null);

    void deleteSupplierOrderPlanSnapshotAction(recordId).then((res) => {
      if (res.success) {
        setPlanHistory(res.history);
        try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(res.history)); } catch {}
        toast.success('Şablon silindi');
      }
    });
  };

  const updateRecordStatus = (recordId: string, status: 'sablon' | 'gonderildi' | 'teslim_alindi') => {
    const nowIso = new Date().toISOString();
    const nextHistory = planHistory.map((record) => {
      if (record.id !== recordId) return record;
      return {
        ...record,
        status,
        sentAt:     status === 'gonderildi'    ? nowIso : (record.sentAt ?? null),
        receivedAt: status === 'teslim_alindi' ? nowIso : null,
      };
    });

    setPlanHistory(nextHistory);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));

    const target = nextHistory.find((r) => r.id === recordId);
    if (target) {
      void saveSupplierOrderPlanSnapshotAction(target).then((res) => {
        if (res.success) {
          setPlanHistory(res.history);
          try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(res.history)); } catch {}
          toast.success(
            status === 'gonderildi'
              ? 'Kayıt gönderildi olarak işaretlendi'
              : status === 'teslim_alindi'
                ? 'Kayıt teslim alındı olarak işaretlendi'
                : 'Kayıt şablon durumuna alındı'
          );
        }
      });

      // Gönderildi → gider + fiyat logu oluştur
      if (status === 'gonderildi') {
        const supName = suppliers.find((s) => s.id === target.supplierId)?.unvan || 'Tedarikçi';
        void confirmOrderCreateGiderAndLogAction(recordId, supName).then((r) => {
          if (!r.success) console.warn('Gider/fiyat log hatası:', r.message);
        });
      }
    }
  };

  const receiveOrderAndUpdateStock = (record: SavedPlanRecord) => {
    const confirmed = window.confirm(
      'Bu kaydı teslim alındı olarak onaylarsanız listedeki miktarlar ürün stoklarına eklenecek. Devam edilsin mi?'
    );
    if (!confirmed) return;

    void receiveSupplierOrderAndUpdateStockAction(record.id).then((res) => {
      if (!res.success) {
        toast.error(res.message || 'Stok güncelleme sırasında hata oluştu');
        return;
      }

      setPlanHistory(res.history);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(res.history));

      const lineCount = res.updatedLines || 0;
      const stockAdded = res.totalStockAdded || 0;
      toast.success(`Teslim alındı. ${lineCount} ürün satırı işlendi, stoklara ${formatNumber(stockAdded)} birim eklendi.`);
    });
  };

  const copyRecordAsTemplate = (record: SavedPlanRecord) => {
    setDraftName(`${record.name} - Kopya`);
    setSelectedSupplierId(record.supplierId);
    setSearch(record.search);
    setSelectedProductId('');
    setSelectedUnitType(record.selectedUnitType);
    setSelectedQuantity(record.selectedQuantity);
    setItems(record.items);
    setEditingRecordId(null);
    toast.success('Gönderilen kayıt kopyalandı. Yeni şablon olarak kaydedebilirsiniz.');
  };

  const updateRow = (id: string, patch: Partial<Pick<PlanItem, 'unitType' | 'quantity' | 'gercek_alis_fiyati' | 'fiyat_duzenlendi' | 'indirim_aciklamasi'>>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          ...patch,
          quantity: patch.quantity != null ? Math.max(1, Math.floor(patch.quantity)) : item.quantity,
        };
      })
    );
  };

  // Satır fiyatını standart değere sıfırla
  const resetRowPrice = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id !== id ? item : { ...item, fiyat_duzenlendi: false, gercek_alis_fiyati: null, indirim_aciklamasi: null }
      )
    );
  };

  // Toplu indirim uygula
  const applyBulkDiscount = () => {
    const r1 = parseFloat(bulkDisc1.replace(',', '.'));
    if (!Number.isFinite(r1) || r1 <= 0 || r1 >= 100) { toast.warning('Geçerli bir indirim oranı girin (0–100).'); return; }
    let r2 = 0;
    if (bulkDiscMode === 'double') {
      r2 = parseFloat(bulkDisc2.replace(',', '.'));
      if (!Number.isFinite(r2) || r2 < 0 || r2 >= 100) { toast.warning('İkinci oran için geçerli bir değer girin.'); return; }
    }
    const desc = bulkDiscMode === 'double'
      ? `%${r1} + %${r2} çift kademeli indirim`
      : `%${r1} indirim`;

    setItems((prev) =>
      prev.map((item) => {
        const prod = productsById.get(item.productId);
        if (!prod) return item;
        const std = Number(prod.distributor_alis_fiyati || 0);
        let real = std * (1 - r1 / 100);
        if (bulkDiscMode === 'double') real = real * (1 - r2 / 100);
        return {
          ...item,
          fiyat_duzenlendi: true,
          gercek_alis_fiyati: Math.round(real * 1000) / 1000,
          indirim_aciklamasi: desc,
        };
      })
    );
    setActiveBulkBanner(desc);
    toast.success('Toplu indirim uygulandı.');
  };

  // Tüm fiyat düzenlemelerini sıfırla
  const resetAllPrices = () => {
    setItems((prev) => prev.map((item) => ({
      ...item, fiyat_duzenlendi: false, gercek_alis_fiyati: null, indirim_aciklamasi: null,
    })));
    setActiveBulkBanner(null);
    toast.success('Tüm fiyatlar standart değerlere sıfırlandı.');
  };

  const exportExcel = async () => {
    const XLSX = await import('xlsx');

    const rows = enrichedItems.map((row) => {
      const pallets = calcPallets(row.product, row.unitType, row.quantity);
      const kg = calcWeightKg(row.product, row.unitType, row.quantity);
      return {
        Tedarikci: selectedSupplierName,
        'Stok Kodu': row.product.stok_kodu || '-',
        'Barkod (EAN/GTIN)': row.product.ean_gtin || '',
        'Urun Adi': getProductNameEn(row.product.ad),
        Birim: row.unitType,
        Miktar: row.quantity,
        Palet: pallets > 0 ? Number(pallets.toFixed(2)) : 0,
        'Agirlik (kg)': kg > 0 ? Number(kg.toFixed(2)) : 0,
        'Birim Maliyet (EUR)': Number(row.unitCost.toFixed(3)),
        'Satir Toplami (EUR)': Number(row.lineTotal.toFixed(2)),
      };
    });

    rows.push({
      Tedarikci: '',
      'Stok Kodu': '',
      'Barkod (EAN/GTIN)': '',
      'Urun Adi': 'GENEL TOPLAM',
      Birim: '' as any,
      Miktar: 0,
      Palet: Number((totals.totalPallets || 0).toFixed(2)),
      'Agirlik (kg)': Number((totals.totalWeightKg || 0).toFixed(2)),
      'Birim Maliyet (EUR)': 0,
      'Satir Toplami (EUR)': Number(totals.grandTotal.toFixed(2)),
    });

    const paletStr = totals.totalPallets < 0.01
      ? '—'
      : totals.totalPallets % 1 === 0
        ? `${totals.totalPallets.toFixed(0)} palet`
        : `~${totals.totalPallets.toFixed(2)} palet`;
    const agirlikStr = totals.totalWeightKg <= 0
      ? '—'
      : totals.totalWeightKg >= 1000
        ? `${(totals.totalWeightKg / 1000).toFixed(2)} t`
        : `${totals.totalWeightKg.toFixed(1)} kg`;

    const extraRows: Record<string, string | number>[] = [
      { Tedarikci: '', 'Stok Kodu': '', 'Barkod (EAN/GTIN)': '', 'Urun Adi': 'Toplam Palet', Birim: '', Miktar: '', Palet: '', 'Agirlik (kg)': '', 'Birim Maliyet (EUR)': '', 'Satir Toplami (EUR)': paletStr },
      { Tedarikci: '', 'Stok Kodu': '', 'Barkod (EAN/GTIN)': '', 'Urun Adi': 'Toplam Agirlik', Birim: '', Miktar: '', Palet: '', 'Agirlik (kg)': '', 'Birim Maliyet (EUR)': '', 'Satir Toplami (EUR)': agirlikStr },
    ];
    (rows as Record<string, string | number>[]).push(...extraRows);

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 22 }, // Tedarikci
      { wch: 14 }, // Stok Kodu
      { wch: 18 }, // Barkod
      { wch: 45 }, // Urun Adi
      { wch: 8  }, // Birim
      { wch: 8  }, // Miktar
      { wch: 10 }, // Palet
      { wch: 12 }, // Agirlik (kg)
      { wch: 18 }, // Birim Maliyet
      { wch: 18 }, // Satir Toplami
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Siparis Formu');
    XLSX.writeFile(wb, `elysonsweets-siparis-formu-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    // Yatay A4 format: 297mm x 210mm
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();  // 297
    const pageH = doc.internal.pageSize.getHeight(); // 210
    const mL = 10;
    const mR = 10;

    const sp = (t: string) =>
      t.replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
       .replace(/ş/g, 's').replace(/Ş/g, 'S')
       .replace(/ı/g, 'i').replace(/İ/g, 'I')
       .replace(/ü/g, 'u').replace(/Ü/g, 'U')
       .replace(/ö/g, 'o').replace(/Ö/g, 'O')
       .replace(/ç/g, 'c').replace(/Ç/g, 'C')
       .replace(/â/g, 'a').replace(/·/g, '-');

    // Logo yükleme
    let logoDataUrl: string | null = null;
    let logoType: 'PNG' | 'JPEG' = 'PNG';
    try {
      let r = await fetch('/logo_arka_plansiz_hazir.png?v=1', { cache: 'no-store' });
      if (!r.ok) r = await fetch('/logo.png?v=1', { cache: 'no-store' });
      if (!r.ok) { r = await fetch('/Logo.jpg?v=1', { cache: 'no-store' }); logoType = 'JPEG'; }
      if (r.ok) {
        const blob = await r.blob();
        logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result));
          reader.readAsDataURL(blob);
        });
      }
    } catch { /* no-op */ }

    // Her sayfaya filigran basma
    const drawWatermark = (d: typeof doc) => {
      if (!logoDataUrl) return;
      const anyD = d as any;
      try { if (typeof anyD.GState === 'function') anyD.setGState(new anyD.GState({ opacity: 0.06 })); } catch { /* no-op */ }
      d.addImage(logoDataUrl, logoType, (pageW - 100) / 2, (pageH - 100) / 2, 100, 100);
      try { if (typeof anyD.GState === 'function') anyD.setGState(new anyD.GState({ opacity: 1 })); } catch { /* no-op */ }
    };

    const docNo = `${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${draftName.slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '')}`;

    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, logoType, mL, 7, 20, 20);
      } catch { /* no-op */ }
    }

    const brandX = logoDataUrl ? mL + 23 : mL;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(COMPANY_NAME, brandX, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('Wholesale, Import & Export', brandX, 16.5);
    doc.text('Wilhelm-Ruppert-Str. 38 / F8, 51147 Koln, Germany', brandX, 20.5);
    doc.text('Tel: +49 157 58837093 · Email: ' + COMPANY_EMAIL, brandX, 24.5);

    // Sağ Üst: Kurumsal Belge Bilgi Kartı (Tamamen İngilizce)
    const cardX = pageW - mR - 106;
    const cardY = 6;
    const cardW = 106;
    const cardH = 22;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(cardX, cardY, cardW, cardH, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, cardY, cardW, cardH, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('COMMERCIAL PURCHASE ORDER', cardX + 4, cardY + 5.5);

    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text('Doc No:', cardX + 4, cardY + 10.5);
    doc.setFont('helvetica', 'normal');
    doc.text(docNo, cardX + 30, cardY + 10.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Order Date:', cardX + 4, cardY + 14.8);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('en-GB'), cardX + 30, cardY + 14.8);

    doc.setFont('helvetica', 'bold');
    doc.text('Supplier:', cardX + 4, cardY + 19);
    doc.setFont('helvetica', 'normal');
    doc.text(sp(selectedSupplierName).slice(0, 36), cardX + 30, cardY + 19);

    // İlk sayfa filigranı
    drawWatermark(doc);

    // Temiz sayı formatlama fonksiyonları (tam sayılarda .00 olmadan)
    const fmtKg = (val: number) => {
      if (val <= 0) return '-';
      return val % 1 === 0 ? val.toFixed(0) : parseFloat(val.toFixed(2)).toString();
    };
    const fmtPallet = (val: number) => {
      if (val <= 0) return '-';
      return val % 1 === 0 ? val.toFixed(0) : parseFloat(val.toFixed(2)).toString();
    };

    // ── Tablo Gövdesi (14 Sütun, 277mm toplam, Sütunlar Kendi İçinde Ortalı) ───
    autoTable(doc, {
      startY: 31,
      margin: { left: mL, right: mR },
      head: [[
        { content: '#', styles: { halign: 'center' } },
        { content: 'SKU / Code', styles: { halign: 'center' } },
        { content: 'Barcode (EAN)', styles: { halign: 'center' } },
        { content: 'Product Description', styles: { halign: 'left' } },
        { content: 'Unit', styles: { halign: 'center' } },
        { content: 'Box', styles: { halign: 'center' } },
        { content: 'Pack', styles: { halign: 'center' } },
        { content: 'Total Pcs', styles: { halign: 'center' } },
        { content: 'Unit (kg)', styles: { halign: 'center' } },
        { content: 'Total (kg)', styles: { halign: 'center' } },
        { content: 'Pallets', styles: { halign: 'center' } },
        { content: 'List Price', styles: { halign: 'center' } },
        { content: 'Net Price', styles: { halign: 'center' } },
        { content: 'Total EUR', styles: { halign: 'center' } },
      ]],
      body: enrichedItems.map((row, index) => {
        const pallets = calcPallets(row.product, row.unitType, row.quantity);
        const piecesPerCase = Math.max(1, Number(row.product.koli_ici_adet || 1));
        const totalPieces = row.quantity * unitMultiplier(row.product, row.unitType);
        const unitKg = Number(row.product.birim_agirlik_kg || 0);
        const totalKg = unitKg > 0 ? totalPieces * unitKg : 0;
        const boxCount = row.unitType === 'koli' ? row.quantity : Math.round(totalPieces / piecesPerCase);

        const stdUnitCost = row.purchaseBoxCost;
        const netUnitCost = row.realPricePerPiece;

        return [
          String(index + 1),
          row.product.stok_kodu || '-',
          row.product.ean_gtin || '-',
          sp(getProductLocalizedName(row.product.ad, 'en')),
          row.unitType === 'koli' ? 'Box' : row.unitType === 'adet' ? 'Pcs' : 'Pallet',
          String(boxCount),
          `x${piecesPerCase}`,
          String(totalPieces),
          fmtKg(unitKg),
          fmtKg(totalKg),
          fmtPallet(pallets),
          formatUnitCost(stdUnitCost),
          formatUnitCost(netUnitCost),
          formatCurrency(row.lineTotal),
        ];
      }),
      columnStyles: {
        0:  { cellWidth: 7,  halign: 'center' },                          // #
        1:  { cellWidth: 26, halign: 'center', fontSize: 6.8 },          // SKU (Genişletildi, tek satır)
        2:  { cellWidth: 26, halign: 'center', fontSize: 6.8 },          // Barkod
        3:  { cellWidth: 69, halign: 'left',   overflow: 'linebreak' },   // Description
        4:  { cellWidth: 10, halign: 'center' },                          // Unit
        5:  { cellWidth: 11, halign: 'center' },                          // Box
        6:  { cellWidth: 10, halign: 'center' },                          // Pack
        7:  { cellWidth: 14, halign: 'center' },                          // Total Pcs
        8:  { cellWidth: 14, halign: 'center' },                          // Unit (kg)
        9:  { cellWidth: 15, halign: 'center' },                          // Total (kg)
        10: { cellWidth: 14, halign: 'center' },                          // Pallets
        11: { cellWidth: 18, halign: 'center' },                          // List Price
        12: { cellWidth: 18, halign: 'center' },                          // Net Price
        13: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },       // Total EUR
      },
      styles: {
        fontSize: 6.8,
        cellPadding: { top: 0.95, bottom: 0.95, left: 1.0, right: 1.0 },
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
        textColor: [30, 41, 59],
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [15, 23, 42], // Koyu kurumsal lacivert
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7.2,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // Mikro kontrast çift renk (zebra)
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) drawWatermark(doc);
        const ph = doc.internal.pageSize.getHeight();

        // Footer
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(mL, ph - 8, pageW - mR, ph - 8);

        doc.setFontSize(6.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('ElysonSweets GmbH · Wilhelm-Ruppert-Str. 38 / F8, 51147 Koln, Germany · Tel: +49 157 58837093 · info@elysonsweets.de', mL, ph - 4.5);
        doc.text(`Page ${data.pageNumber} of ${doc.getNumberOfPages()}`, pageW - mR, ph - 4.5, { align: 'right' });
      },
    });

    // ── Tablo Sonu: Kurumsal Özet ve Onay Kutusu (Aynı Sayfaya Sığdırma Garantili) ──
    const finalY = (doc as any).lastAutoTable?.finalY || 35;
    const boxH = 20.5;
    const maxBottom = pageH - 10; // Footer öncesi güvenli limit (200mm)
    let sumY = finalY + 2.5;

    // Eğer son sayfada 21 mm bile yer kalmamışsa yeni sayfaya geç
    if (sumY + boxH > maxBottom) {
      doc.addPage('a4', 'landscape');
      drawWatermark(doc);
      sumY = 15;
    }

    // Sol: Teslimat Notu ve Yetkili Onay Alanı
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(mL, sumY, 150, boxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text('Delivery & Shipping Address:', mL + 3, sumY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('ElysonSweets GmbH, Wilhelm-Ruppert-Str. 38 / F8, 51147 Koln, Germany', mL + 42, sumY + 4.5);
    doc.text('Please confirm item specifications, pricing, and dispatch schedule.', mL + 3, sumY + 9);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Authorized Signature & Stamp: _____________________________________', mL + 3, sumY + 16);

    // Sağ: Toplamlar Kartı
    const sumCardX = pageW - mR - 115;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(sumCardX, sumY, 115, boxH, 1.5, 1.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(sumCardX, sumY, 115, boxH, 1.5, 1.5, 'S');

    const totalBoxesCalc = enrichedItems.reduce((s, r) => s + (r.unitType === 'koli' ? r.quantity : Math.round(r.quantity * unitMultiplier(r.product, r.unitType) / Math.max(1, Number(r.product.koli_ici_adet || 1)))), 0);
    const totalPcsCalc = enrichedItems.reduce((s, r) => s + r.quantity * unitMultiplier(r.product, r.unitType), 0);
    const totalWeightStr = totals.totalWeightKg <= 0 ? '-' : `${fmtKg(totals.totalWeightKg)} kg`;
    const totalPalletsStr = totals.totalPallets < 0.01 ? '-' : `${fmtPallet(totals.totalPallets)} Pallets`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);

    doc.text('Total Items / Pcs:', sumCardX + 4, sumY + 4.5);
    doc.text(`${totals.totalLines} Items · ${totalBoxesCalc.toLocaleString('en-US')} Boxes (${totalPcsCalc.toLocaleString('en-US')} Pcs)`, sumCardX + 34, sumY + 4.5);

    doc.text('Net Weight / Pallets:', sumCardX + 4, sumY + 9);
    doc.text(`${totalWeightStr}  /  ${totalPalletsStr}`, sumCardX + 34, sumY + 9);

    // Genel Toplam Vurgusu (Temiz, ferah ve yüksek kontrastlı tasarım)
    doc.setFillColor(238, 242, 255); // indigo-50
    doc.roundedRect(sumCardX + 2, sumY + 12, 111, 7.5, 1.2, 1.2, 'F');
    doc.setDrawColor(199, 210, 254); // indigo-200 sınır
    doc.setLineWidth(0.3);
    doc.roundedRect(sumCardX + 2, sumY + 12, 111, 7.5, 1.2, 1.2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(30, 27, 75); // Koyu lacivert başlık
    doc.text('GRAND TOTAL (EUR):', sumCardX + 5, sumY + 17);

    doc.setFontSize(9.5);
    doc.setTextColor(30, 64, 175); // Net koyu mavi tutar
    doc.text(formatCurrency(totals.grandTotal), sumCardX + 108, sumY + 17, { align: 'right' });

    doc.save(`elysonsweets-purchase-order-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportSupplierPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    // Yatay A4 format: 297mm x 210mm
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();  // 297
    const pageH = doc.internal.pageSize.getHeight(); // 210
    const mL = 10;
    const mR = 10;

    const sp = (t: string) =>
      t.replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
       .replace(/ş/g, 's').replace(/Ş/g, 'S')
       .replace(/ı/g, 'i').replace(/İ/g, 'I')
       .replace(/ü/g, 'u').replace(/Ü/g, 'U')
       .replace(/ö/g, 'o').replace(/Ö/g, 'O')
       .replace(/ç/g, 'c').replace(/Ç/g, 'C')
       .replace(/â/g, 'a').replace(/·/g, '-');

    let logoDataUrl: string | null = null;
    let logoType: 'PNG' | 'JPEG' = 'PNG';
    try {
      let r = await fetch('/logo_arka_plansiz_hazir.png?v=1', { cache: 'no-store' });
      if (!r.ok) r = await fetch('/logo.png?v=1', { cache: 'no-store' });
      if (!r.ok) { r = await fetch('/Logo.jpg?v=1', { cache: 'no-store' }); logoType = 'JPEG'; }
      if (r.ok) {
        const blob = await r.blob();
        logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result));
          reader.readAsDataURL(blob);
        });
      }
    } catch { /* no-op */ }

    const drawWatermark = (d: typeof doc) => {
      if (!logoDataUrl) return;
      const anyD = d as any;
      try { if (typeof anyD.GState === 'function') anyD.setGState(new anyD.GState({ opacity: 0.06 })); } catch { /* no-op */ }
      d.addImage(logoDataUrl, logoType, (pageW - 100) / 2, (pageH - 100) / 2, 100, 100);
      try { if (typeof anyD.GState === 'function') anyD.setGState(new anyD.GState({ opacity: 1 })); } catch { /* no-op */ }
    };

    const todayEn = new Date().toLocaleDateString('en-GB');
    const docNo = `${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-SPEC`;

    // ── Header (Sol: Logo + Firma, Sağ: Kurumsal Belge Kartı) ───────────
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, logoType, mL, 7, 20, 20);
      } catch { /* no-op */ }
    }

    const brandX = logoDataUrl ? mL + 23 : mL;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(COMPANY_NAME, brandX, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Wholesale, Import & Export', brandX, 16.5);
    doc.text('Wilhelm-Ruppert-Str. 38 / F8, 51147 Koln, Germany', brandX, 20.5);
    doc.text('Tel: +49 157 58837093 · Email: ' + COMPANY_EMAIL, brandX, 24.5);

    // Sağ Üst: Lojistik / Tedarikçi Belge Kartı (Tamamen İngilizce)
    const cardX = pageW - mR - 106;
    const cardY = 6;
    const cardW = 106;
    const cardH = 22;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(cardX, cardY, cardW, cardH, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, cardY, cardW, cardH, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('PACKING & SUPPLY SPECIFICATION', cardX + 4, cardY + 5.5);

    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text('Doc No:', cardX + 4, cardY + 10.5);
    doc.setFont('helvetica', 'normal');
    doc.text(docNo, cardX + 30, cardY + 10.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Date:', cardX + 4, cardY + 14.8);
    doc.setFont('helvetica', 'normal');
    doc.text(todayEn, cardX + 30, cardY + 14.8);

    doc.setFont('helvetica', 'bold');
    doc.text('Supplier:', cardX + 4, cardY + 19);
    doc.setFont('helvetica', 'normal');
    doc.text(sp(selectedSupplierName).slice(0, 36), cardX + 30, cardY + 19);

    drawWatermark(doc);

    const fmtKg = (val: number) => {
      if (val <= 0) return '-';
      return val % 1 === 0 ? val.toFixed(0) : parseFloat(val.toFixed(2)).toString();
    };
    const fmtPallet = (val: number) => {
      if (val <= 0) return '-';
      return val % 1 === 0 ? val.toFixed(0) : parseFloat(val.toFixed(2)).toString();
    };

    // ── Tablo Gövdesi (Fiyatsız - 12 Sütun, 277mm, Ortalı Sütunlar) ─────────
    autoTable(doc, {
      startY: 31,
      margin: { left: mL, right: mR },
      head: [[
        { content: '#', styles: { halign: 'center' } },
        { content: 'SKU / Code', styles: { halign: 'center' } },
        { content: 'Barcode (EAN-13)', styles: { halign: 'center' } },
        { content: 'Product Description', styles: { halign: 'left' } },
        { content: 'Unit', styles: { halign: 'center' } },
        { content: 'Boxes', styles: { halign: 'center' } },
        { content: 'Pack', styles: { halign: 'center' } },
        { content: 'Total Pcs', styles: { halign: 'center' } },
        { content: 'Unit (kg)', styles: { halign: 'center' } },
        { content: 'Total (kg)', styles: { halign: 'center' } },
        { content: 'Pallets', styles: { halign: 'center' } },
        { content: 'Check', styles: { halign: 'center' } },
      ]],
      body: enrichedItems.map((row, index) => {
        const pallets = calcPallets(row.product, row.unitType, row.quantity);
        const piecesPerCase = Math.max(1, Number(row.product.koli_ici_adet || 1));
        const totalPieces = row.quantity * unitMultiplier(row.product, row.unitType);
        const unitKg = Number(row.product.birim_agirlik_kg || 0);
        const totalKg = unitKg > 0 ? totalPieces * unitKg : 0;
        const boxCount = row.unitType === 'koli' ? row.quantity : Math.round(totalPieces / piecesPerCase);

        return [
          String(index + 1),
          row.product.stok_kodu || '-',
          row.product.ean_gtin || '-',
          sp(getProductLocalizedName(row.product.ad, 'en')),
          row.unitType === 'koli' ? 'Box' : row.unitType === 'adet' ? 'Pcs' : 'Pallet',
          String(boxCount),
          `x${piecesPerCase}`,
          String(totalPieces),
          fmtKg(unitKg),
          fmtKg(totalKg),
          fmtPallet(pallets),
          '[   ]', // Depo ve yükleme teyit kutusu
        ];
      }),
      columnStyles: {
        0:  { cellWidth: 8,   halign: 'center' },                          // #
        1:  { cellWidth: 26,  halign: 'center', fontSize: 6.8 },          // SKU (Tek satır)
        2:  { cellWidth: 28,  halign: 'center', fontSize: 6.8 },          // Barkod
        3:  { cellWidth: 85,  halign: 'left',   overflow: 'linebreak' },   // Description
        4:  { cellWidth: 12,  halign: 'center' },                          // Unit
        5:  { cellWidth: 16,  halign: 'center' },                          // Boxes
        6:  { cellWidth: 12,  halign: 'center' },                          // Pack
        7:  { cellWidth: 18,  halign: 'center' },                          // Total Pcs
        8:  { cellWidth: 18,  halign: 'center' },                          // Unit (kg)
        9:  { cellWidth: 18,  halign: 'center' },                          // Total (kg)
        10: { cellWidth: 18,  halign: 'center' },                          // Pallets
        11: { cellWidth: 18,  halign: 'center' },                          // Check
      },
      styles: {
        fontSize: 6.8,
        cellPadding: { top: 0.95, bottom: 0.95, left: 1.0, right: 1.0 },
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
        textColor: [30, 41, 59],
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7.2,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) drawWatermark(doc);
        const ph = doc.internal.pageSize.getHeight();

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(mL, ph - 8, pageW - mR, ph - 8);

        doc.setFontSize(6.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('ElysonSweets GmbH · Wilhelm-Ruppert-Str. 38 / F8, 51147 Koln, Germany · Logistics & Cargo Specification', mL, ph - 4.5);
        doc.text(`Page ${data.pageNumber} of ${doc.getNumberOfPages()}`, pageW - mR, ph - 4.5, { align: 'right' });
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 35;
    const boxH = 20.5;
    const maxBottom = pageH - 10;
    let sumY = finalY + 2.5;

    if (sumY + boxH > maxBottom) {
      doc.addPage('a4', 'landscape');
      drawWatermark(doc);
      sumY = 15;
    }

    // Sol: Sevkiyat ve Depo Onay Notu (Tamamen İngilizce)
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(mL, sumY, 150, boxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text('Logistics & Warehouse Verification:', mL + 3, sumY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('All goods must be complete, undamaged, and comply with EU pallet packaging standards.', mL + 3, sumY + 9);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Warehouse Inspector: ____________________________   Signature: ______________', mL + 3, sumY + 16);

    // Sağ: Lojistik Özet Kartı
    const sumCardX = pageW - mR - 115;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(sumCardX, sumY, 115, boxH, 1.5, 1.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(sumCardX, sumY, 115, boxH, 1.5, 1.5, 'S');

    const totalBoxesCalc = enrichedItems.reduce((s, r) => s + (r.unitType === 'koli' ? r.quantity : Math.round(r.quantity * unitMultiplier(r.product, r.unitType) / Math.max(1, Number(r.product.koli_ici_adet || 1)))), 0);
    const totalPcsCalc = enrichedItems.reduce((s, r) => s + r.quantity * unitMultiplier(r.product, r.unitType), 0);
    const totalWeightStr = totals.totalWeightKg <= 0 ? '-' : `${fmtKg(totals.totalWeightKg)} kg`;
    const totalPalletsStr = totals.totalPallets < 0.01 ? '-' : `${fmtPallet(totals.totalPallets)} Pallets`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);

    doc.text('Total Items / Pcs:', sumCardX + 4, sumY + 4.5);
    doc.text(`${totals.totalLines} Items · ${totalBoxesCalc.toLocaleString('en-US')} Boxes (${totalPcsCalc.toLocaleString('en-US')} Pcs)`, sumCardX + 34, sumY + 4.5);

    doc.text('Total Net Weight / Pallets:', sumCardX + 4, sumY + 10);
    doc.text(`${totalWeightStr}  /  ${totalPalletsStr}`, sumCardX + 34, sumY + 10);

    doc.save(`elysonsweets-supply-specification-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-5">
      {/* ─── Üst çubuk: tedarikçi + sipariş adı + kaydet ─────────────── */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="min-w-48 w-56">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Tedarikçi
            <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">Zorunlu</span>
          </label>
          <select
            value={selectedSupplierId}
            onChange={(e) => { setSelectedSupplierId(e.target.value); setSelectedProductId(''); setSearch(''); }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Tedarikçi seçin</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.unvan || 'İsimsiz tedarikçi'}</option>
            ))}
          </select>
        </div>

        <div className="min-w-56 flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Sipariş adı</label>
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="örn. Haftalık Pasta Siparişi"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={saveSnapshot}
            disabled={items.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <FiSave /> {editingRecordId ? 'Şablonu Güncelle' : 'Şablon Kaydet'}
          </button>
          {editingRecordId && (
            <button
              type="button"
              onClick={() => setEditingRecordId(null)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Düzenlemeyi Kapat
            </button>
          )}
        </div>

        <p className="w-full text-xs text-slate-400">
          Taslak otomatik kaydedilir · Son kayıt: {lastDraftSaveAt ? formatDateTime(lastDraftSaveAt) : 'Henüz yok'}
        </p>
      </div>

      {/* ─── Ürün arama + hızlı ekle ──────────────────────────────────── */}
      <details open className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-slate-800">Ürün Ekle</span>
          <span className="text-xs text-slate-400 group-open:hidden">Aç</span>
          <span className="hidden text-xs text-slate-400 group-open:inline">Kapat</span>
        </summary>

        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
          {/* Arama + dropdown satırı */}
          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-4">
              <label className="mb-1 block text-xs font-medium text-slate-600">Hızlı arama</label>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  // 13 haneli barkod girilince otomatik ilk ürünü seç
                  if (/^\d{13}$/.test(e.target.value.trim())) {
                    const found = products.find((p) => p.ean_gtin === e.target.value.trim());
                    if (found) { setSelectedProductId(found.id); toast.info('Barkod ile ürün bulundu: ' + getProductName(found.ad, locale)); }
                  }
                }}
                placeholder="Ürün adı, stok kodu veya EAN barkod (13 hane)"
                disabled={!selectedSupplierId}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
              />
              {!selectedSupplierId && <p className="mt-1 text-xs text-amber-600">Önce tedarikçi seçin.</p>}
            </div>

            <div className="md:col-span-4">
              <label className="mb-1 block text-xs font-medium text-slate-600">Ürün seç (İngilizce)</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                disabled={!selectedSupplierId}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
              >
                <option value="">Listeden seç</option>
                {filteredProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {(p.stok_kodu ? `${p.stok_kodu} - ` : '') + getProductNameEn(p.ad)}{!p.aktif ? ' [Pasif]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Birim</label>
              <select
                value={selectedUnitType}
                onChange={(e) => setSelectedUnitType(e.target.value as UnitType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="adet">Adet</option>
                <option value="koli">Koli</option>
                <option value="palet">Palet</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">Miktar</label>
              <input
                type="number"
                min={1}
                step={1}
                value={selectedQuantity}
                onChange={(e) => setSelectedQuantity(Number(e.target.value || 1))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-1 flex items-end">
              <button
                type="button"
                onClick={addItem}
                disabled={!selectedSupplierId || !selectedProductId}
                className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <FiPlus /> Ekle
              </button>
            </div>
          </div>

          {/* Hızlı sonuçlar */}
          {search.trim().length > 0 && quickProducts.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50">
              {quickProducts.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-white">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {product.stok_kodu ? `${product.stok_kodu} – ` : ''}{getProductNameEn(product.ad)}
                      {!product.aktif ? <span className="ml-1 text-xs text-rose-500">(Pasif)</span> : null}
                    </p>
                    <p className="text-xs text-slate-500">Adet: {formatCurrency(Number(product.distributor_alis_fiyati || 0))} · Koli: {formatCurrency(Number(product.distributor_alis_fiyati || 0) * Math.max(1, Number(product.koli_ici_adet || 1)))}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addItemByProduct(product.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <FiPlus /> Ekle
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Sık sipariş edilenler */}
          {frequentProducts.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">
                Sık sipariş edilenler
                <span className="ml-1.5 text-[10px] text-slate-400">(onaylanan geçmiş siparişlere göre)</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {frequentProducts.map(({ product, freq }) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addItemByProduct(product.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <FiPlus className="opacity-50" />
                    {product.stok_kodu ? `${product.stok_kodu} · ` : ''}{getProductNameEn(product.ad)}
                    <span className="ml-0.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{freq}×</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </details>

      {/* ─── Geçmiş kayıtlar — birleşik tablo ────────────────────────── */}
      {planHistory.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Geçmiş Kayıtlar</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2">Durum</th>
                  <th className="px-4 py-2">Sipariş Adı</th>
                  <th className="px-4 py-2">Tedarikçi</th>
                  <th className="px-4 py-2">Tarih / Oluşturan</th>
                  <th className="px-4 py-2 text-right">Kalem · Toplam</th>
                  <th className="px-4 py-2 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {planHistory
                  .slice()
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((record) => {
                    const status = record.status || 'sablon';
                    const supplierName = record.supplierId === 'all'
                      ? 'Tüm Tedarikçiler'
                      : suppliers.find((s) => s.id === record.supplierId)?.unvan || '—';

                    const statusBadge = {
                      sablon: <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">Şablon</span>,
                      gonderildi: <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Gönderildi</span>,
                      teslim_alindi: <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Teslim Alındı</span>,
                    }[status];

                    const date = status === 'teslim_alindi' && record.receivedAt
                      ? formatDateTime(record.receivedAt)
                      : status === 'gonderildi' && record.sentAt
                        ? formatDateTime(record.sentAt)
                        : formatDateTime(record.createdAt);

                    return (
                      <tr key={record.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2">{statusBadge}</td>
                        <td className="px-4 py-2 font-medium text-slate-900">{record.name}</td>
                        <td className="px-4 py-2 text-slate-500">{supplierName}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className="text-slate-500">{date}</span>
                          {record.createdBy && (
                            <span className="ml-1.5 text-xs text-slate-400">· {record.createdBy}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-700 whitespace-nowrap">
                          {record.items.length} kalem · {formatCurrency(calculateRecordTotal(record))}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {status === 'sablon' && (
                              <>
                                <button type="button" onClick={() => loadSavedRecord(record)}
                                  className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100">
                                  Yükle
                                </button>
                                <button type="button" onClick={() => updateRecordStatus(record.id, 'gonderildi')}
                                  className="rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100">
                                  Gönderildi
                                </button>
                              </>
                            )}
                            {status === 'gonderildi' && (
                              <>
                                <Link
                                  href={`/${locale}/admin/urun-yonetimi/tir-girisi?planId=${record.id}`}
                                  className="rounded border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-100">
                                  🚛 TIR Girişi Yap
                                </Link>
                                <button type="button" onClick={() => receiveOrderAndUpdateStock(record)}
                                  className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100">
                                  Teslim Al + Stoka İşle
                                </button>
                              </>
                            )}
                            {(status === 'gonderildi' || status === 'teslim_alindi') && (
                              <button type="button" onClick={() => copyRecordAsTemplate(record)}
                                className="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                                Kopyala
                              </button>
                            )}
                            <button type="button" onClick={() => deleteSavedRecord(record.id)}
                              className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Aktif sipariş listesi (yazdırılabilir) ───────────────────── */}
      <section id="print-order-list" className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="form-watermark" aria-hidden="true">
          <Image
            src="/logo.png"
            alt=""
            width={600}
            height={760}
            className="h-[760px] w-auto object-contain"
            priority
          />
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="no-print text-base font-semibold text-slate-900">Aktif Sipariş Listesi</h2>
          <div className="no-print flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportPdf}
              disabled={enrichedItems.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiFileText /> PDF İndir
            </button>
            <button
              type="button"
              onClick={exportExcel}
              disabled={enrichedItems.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiFile /> Excel İndir
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={enrichedItems.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiPrinter /> Yazdır
            </button>
            <button
              type="button"
              onClick={exportSupplierPdf}
              disabled={enrichedItems.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiSend /> Tedarikçiye Gönder (Fiyatsız PDF)
            </button>
            <button
              type="button"
              onClick={clearItems}
              disabled={enrichedItems.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiTrash2 /> Temizle
            </button>
          </div>
        </div>

        {/* ── Toplu Fiyat Düzenle paneli ── */}
        <div className="no-print mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Toplu Fiyat Düzenle</span>
            <div className="flex rounded-lg border border-slate-300 overflow-hidden text-xs">
              <button type="button"
                onClick={() => setBulkDiscMode('single')}
                className={`px-3 py-1.5 font-semibold transition-colors ${bulkDiscMode === 'single' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
                % indirim
              </button>
              <button type="button"
                onClick={() => setBulkDiscMode('double')}
                className={`px-3 py-1.5 font-semibold transition-colors border-l border-slate-300 ${bulkDiscMode === 'double' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
                % + % kademeli
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">%</span>
              <input type="number" min={0} max={99} step={0.5}
                value={bulkDisc1} onChange={(e) => setBulkDisc1(e.target.value)}
                placeholder="örn. 20"
                className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-right" />
              {bulkDiscMode === 'double' && (
                <>
                  <span className="text-xs text-slate-400 font-bold">+</span>
                  <span className="text-xs text-slate-500">%</span>
                  <input type="number" min={0} max={99} step={0.5}
                    value={bulkDisc2} onChange={(e) => setBulkDisc2(e.target.value)}
                    placeholder="örn. 8"
                    className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-right" />
                </>
              )}
            </div>
            {bulkDiscMode === 'double' && bulkDisc1 && bulkDisc2 && (
              <span className="text-xs text-slate-500 font-mono">
                örn. €{(3.82 * (1 - parseFloat(bulkDisc1||'0')/100) * (1 - parseFloat(bulkDisc2||'0')/100)).toFixed(2)}
              </span>
            )}
            <button type="button" onClick={applyBulkDiscount}
              disabled={items.length === 0}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50">
              Uygula
            </button>
            <button type="button" onClick={resetAllPrices}
              disabled={items.length === 0}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50">
              Tüm Listeyi Sıfırla
            </button>
          </div>
          {activeBulkBanner && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
              <span className="font-bold">ℹ</span>
              Toplu indirim uygulandı · {activeBulkBanner}
              <button type="button" onClick={resetAllPrices} className="ml-auto text-blue-500 hover:text-blue-700 underline">Geri al</button>
            </div>
          )}
        </div>

        <div className="relative z-10 mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 print:border-0 print:bg-white print:p-0">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
              <div>
                <p className="text-2xl font-extrabold tracking-wide text-gray-900">{COMPANY_NAME}</p>
                <p className="text-xs text-gray-500">Satın Alma Sipariş Formu</p>
              </div>

              {/* Dil Seçici Buton Grubu */}
              <div className="no-print flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-xs text-gray-500 font-medium px-2 flex items-center gap-1">
                  🌐 İsim Dili:
                </span>
                {[
                  { code: 'en', label: '🇬🇧 EN', title: 'İngilizce (Varsayılan)' },
                  { code: 'tr', label: '🇹🇷 TR', title: 'Türkçe' },
                  { code: 'de', label: '🇩🇪 DE', title: 'Almanca' },
                  { code: 'ar', label: '🇸🇦 AR', title: 'Arapça' },
                ].map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    title={l.title}
                    onClick={() => setProductDisplayLang(l.code as any)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      productDisplayLang === l.code
                        ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
              <div className="space-y-1">
                <p><span className="font-semibold">Gönderen Firma:</span> {COMPANY_NAME}</p>
                <p><span className="font-semibold">E-posta:</span> {COMPANY_EMAIL}</p>
                <p><span className="font-semibold">Konum:</span> {COMPANY_LOCATION}</p>
              </div>
              <div className="space-y-1 sm:text-right">
                <p><span className="font-semibold">Tedarikçi Firma:</span> {selectedSupplierName}</p>
                <p><span className="font-semibold">Belge Tarihi:</span> {new Date().toLocaleDateString('tr-TR')}</p>
                <p><span className="font-semibold">Belge No:</span> {new Date().toISOString().slice(0, 10).replaceAll('-', '')}-{draftName.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Hızlı Filtre, Sayfalama ve Gezinme Araç Çubuğu ───────────────── */}
        <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/90 p-2.5 shadow-xs">
          <div className="flex flex-1 items-center gap-2.5 min-w-[280px] max-w-lg">
            <div className="relative w-full">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                value={tableFilter}
                onChange={(e) => {
                  setTableFilter(e.target.value);
                  setTableCurrentPage(1);
                }}
                placeholder="Listede hızlı ara (Ürün adı, kod veya barkod)..."
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
              />
              {tableFilter && (
                <button
                  type="button"
                  onClick={() => setTableFilter('')}
                  title="Aramayı temizle"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
            <span className="shrink-0 text-xs font-semibold text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              {filteredTableItems.length} / {enrichedItems.length} ürün
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Sayfa Boyutu */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Görünüm:</span>
              <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs text-xs">
                {[
                  { value: 0, label: `Tümü (${enrichedItems.length})` },
                  { value: 25, label: '25' },
                  { value: 50, label: '50' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setTablePageSize(opt.value);
                      setTableCurrentPage(1);
                    }}
                    className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                      tablePageSize === opt.value
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hızlı Atlama Kısayolları */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <button
                type="button"
                onClick={scrollToTop}
                title="Sayfa Başına Çık"
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1 shadow-2xs transition-colors"
              >
                <FiArrowUp size={13} /> Başa
              </button>
              <button
                type="button"
                onClick={scrollToBottom}
                title="Toplamlara / Listenin Sonuna İn"
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1 shadow-2xs transition-colors"
              >
                <FiArrowDown size={13} /> Sona
              </button>
            </div>
          </div>
        </div>

        {/* Tablo Konteyneri: max-h kısıtlaması kaldırıldı; sayfa akıcı kayar, çift dikey scroll ve yatay taşma engellenir */}
        <div className="relative z-10 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs custom-scrollbar">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-20 bg-slate-900 text-white shadow-sm">
              <tr className="text-left">
                <th className="border-b border-slate-800 px-2 py-2.5 w-12 text-center text-xs font-semibold uppercase tracking-wider text-slate-300">#</th>
                <th className="border-b border-slate-800 px-2.5 py-2.5 w-24 text-xs font-semibold uppercase tracking-wider text-slate-300 whitespace-nowrap">Stok Kodu</th>
                <th className="border-b border-slate-800 px-3 py-2.5 min-w-[190px] text-xs font-semibold uppercase tracking-wider text-slate-300">Ürün Tanımı</th>
                <th className="border-b border-slate-800 px-2 py-2.5 w-20 text-center text-xs font-semibold uppercase tracking-wider text-slate-300 whitespace-nowrap">Birim</th>
                <th className="border-b border-slate-800 px-2 py-2.5 w-20 text-right text-xs font-semibold uppercase tracking-wider text-slate-300 whitespace-nowrap">Miktar</th>
                <th className="border-b border-slate-800 px-2 py-2.5 w-16 text-right text-xs font-semibold uppercase tracking-wider text-slate-300 whitespace-nowrap">Palet</th>
                <th className="border-b border-slate-800 px-2 py-2.5 w-20 text-right text-xs font-semibold uppercase tracking-wider text-slate-300 whitespace-nowrap">Ağırlık</th>
                <th className="border-b border-slate-800 px-2.5 py-2.5 w-28 text-right text-xs font-semibold uppercase tracking-wider text-slate-300 whitespace-nowrap">Birim Maliyet</th>
                <th className="border-b border-slate-800 px-3 py-2.5 w-24 text-right text-xs font-semibold uppercase tracking-wider text-slate-300 whitespace-nowrap">Satır Toplamı</th>
                <th className="no-print border-b border-slate-800 px-2.5 py-2.5 w-24 text-right text-xs font-semibold uppercase tracking-wider text-slate-300 whitespace-nowrap">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {displayedTableItems.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-slate-500">
                    {tableFilter ? `"${tableFilter}" aramasıyla eşleşen ürün bulunamadı.` : 'Henüz ürün eklenmedi.'}
                  </td>
                </tr>
              )}
              {displayedTableItems.map((row, index) => {
                const actualIndex = tablePageSize > 0 ? (tableCurrentPage - 1) * tablePageSize + index : index;
                const isRowDraggable = dragHandleActiveRowId === row.id;
                return (
                  <tr key={row.id}
                    draggable={isRowDraggable}
                    onDragStart={(e) => handleDragStart(e, row.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, row.id)}
                    onDragEnd={() => {
                      handleDragEnd();
                      setDragHandleActiveRowId(null);
                    }}
                    className={`border-b border-slate-100 align-middle transition-colors ${row.isModified ? 'bg-orange-50/70' : 'even:bg-slate-50/60'} hover:bg-blue-50/50 ${draggedItemId === row.id ? 'opacity-50 bg-gray-100' : ''}`}>
                    <td className="px-2 py-2 text-gray-400">
                      <div className="flex items-center justify-center gap-1">
                        <span
                          className="no-print cursor-grab active:cursor-grabbing hover:text-slate-900 text-slate-400 p-1 rounded hover:bg-slate-200/70 transition-colors"
                          title="Sürükle bırak ile sıralamayı değiştir"
                          onMouseEnter={() => setDragHandleActiveRowId(row.id)}
                          onMouseLeave={() => {
                            if (!draggedItemId) setDragHandleActiveRowId(null);
                          }}
                        >
                          <FiMenu size={13} />
                        </span>
                        <span className="text-xs font-semibold text-slate-600 w-5 text-center select-none">{actualIndex + 1}</span>
                      </div>
                    </td>
                    <td className="px-2.5 py-2 font-mono text-[11px] text-slate-600 whitespace-nowrap select-all">
                      {row.product.stok_kodu ? (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(row.product.stok_kodu!, 'Stok kodu')}
                          title="Stok kodunu kopyalamak için tıkla (veya seçip Ctrl+C)"
                          className="group/code hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>{row.product.stok_kodu}</span>
                          <FiCopy size={9} className="opacity-0 group-hover/code:opacity-70 text-slate-400 transition-opacity no-print" />
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col min-w-0">
                        <Link
                          href={`/${locale}/admin/urun-yonetimi/urunler/${row.product.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-xs text-slate-900 hover:text-primary hover:underline transition-colors no-print line-clamp-2"
                          title="Ürün kartına git (yeni sekmede)"
                        >
                          {getProductLocalizedName(row.product.ad, productDisplayLang)}
                        </Link>
                        <span className="print-only font-semibold text-slate-900">{getProductLocalizedName(row.product.ad, productDisplayLang)}</span>

                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                          {typeof row.product.ad === 'object' && (
                            productDisplayLang === 'en' ? (
                              row.product.ad?.tr ? <span className="text-slate-400 truncate max-w-[220px]">TR: {row.product.ad.tr}</span> : null
                            ) : (
                              row.product.ad?.en ? <span className="text-slate-400 truncate max-w-[220px]">EN: {row.product.ad.en}</span> : null
                            )
                          )}
                          {row.product.ean_gtin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(row.product.ean_gtin!, 'Barkod');
                              }}
                              title="Barkodu kopyalamak için tıkla (veya seçip Ctrl+C)"
                              className="group/barcode inline-flex items-center gap-1 font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 px-1.5 py-0.5 rounded text-[9.5px] font-medium border border-slate-200 select-all cursor-pointer transition-colors"
                            >
                              <span>{row.product.ean_gtin}</span>
                              {copiedBarcode === row.product.ean_gtin ? (
                                <FiCheck size={10} className="text-emerald-600 shrink-0" />
                              ) : (
                                <FiCopy size={9} className="text-slate-400 group-hover/barcode:text-slate-700 transition-colors shrink-0 no-print" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <select
                        value={row.unitType}
                        onChange={(e) => updateRow(row.id, { unitType: e.target.value as UnitType })}
                        className="rounded-md border border-slate-300 px-1.5 py-1 text-xs bg-white text-slate-800 font-medium focus:ring-1 focus:ring-primary focus:border-primary"
                      >
                        <option value="adet">Adet</option>
                        <option value="koli">Koli</option>
                        <option value="palet">Palet</option>
                      </select>
                      <span className="print-only text-xs font-medium text-gray-800">{row.unitType}</span>
                    </td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={row.quantity}
                        onChange={(e) => updateRow(row.id, { quantity: Number(e.target.value || 1) })}
                        className="w-16 rounded-md border border-slate-300 px-1.5 py-1 text-right text-xs font-bold text-slate-800 bg-white focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                      <span className="print-only text-xs font-medium text-gray-800">{row.quantity}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">x{formatNumber(row.multiplier)} ad</p>
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-slate-700 whitespace-nowrap text-xs">
                      {formatPalletsPlain(calcPallets(row.product, row.unitType, row.quantity))}
                    </td>
                    <td className="px-2 py-2 text-right whitespace-nowrap text-xs">
                      {(() => {
                        const totalKg = calcWeightKg(row.product, row.unitType, row.quantity);
                        const unitKg = Number(row.product.birim_agirlik_kg || 0);
                        return (
                          <div>
                            <span className="font-semibold text-slate-800">{formatWeight(totalKg)}</span>
                            {unitKg > 0 && (
                              <p className="text-[10px] text-slate-400 mt-0.5">{unitKg.toFixed(2)} kg/ad</p>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-2.5 py-2 text-right whitespace-nowrap">
                      <div className="no-print flex items-center justify-end gap-1">
                        <div className="relative group">
                          <input
                            type="number"
                            min={0}
                            step={0.001}
                            value={row.isModified && row.gercek_alis_fiyati != null
                              ? Number(row.gercek_alis_fiyati).toFixed(3)
                              : Number(row.purchaseBoxCost).toFixed(3)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!Number.isFinite(val) || val < 0) return;
                              const roundedVal = Math.round(val * 1000) / 1000;
                              const isChanged = Math.abs(roundedVal - row.purchaseBoxCost) > 0.0005;
                              updateRow(row.id, {
                                gercek_alis_fiyati: isChanged ? roundedVal : null,
                                fiyat_duzenlendi: isChanged,
                                indirim_aciklamasi: isChanged ? 'Manuel düzenleme' : null,
                              });
                            }}
                            className={`w-20 rounded-md border px-1.5 py-1 text-right text-xs font-semibold transition-colors ${
                              row.isModified
                                ? 'border-orange-400 bg-orange-100/80 text-orange-800 focus:ring-orange-400'
                                : 'border-slate-300 bg-white text-slate-800 focus:ring-primary'
                            }`}
                            title={row.isModified ? `Standart: ${formatUnitCost(row.stdUnitCost)}` : 'Standart fiyat'}
                          />
                          {row.isModified && (
                            <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
                              Standart: {formatUnitCost(row.stdUnitCost)}
                            </span>
                          )}
                        </div>
                        {row.isModified && (
                          <button type="button"
                            onClick={() => resetRowPrice(row.id)}
                            title="Standart fiyata sıfırla"
                            className="rounded p-1 text-orange-500 hover:bg-orange-100 hover:text-orange-700 text-xs leading-none transition-colors">
                            ↺
                          </button>
                        )}
                      </div>
                      <span className="print-only text-xs font-medium text-gray-800">{formatUnitCost(row.unitCost)}</span>
                      {row.isModified && row.indirim_aciklamasi && (
                        <p className="text-[9.5px] font-medium text-orange-600 mt-0.5 leading-tight truncate max-w-[125px] ml-auto" title={row.indirim_aciklamasi}>
                          {row.indirim_aciklamasi}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-primary text-xs whitespace-nowrap">{formatCurrency(row.lineTotal)}</td>
                    <td className="no-print px-2.5 py-2 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => moveItem(row.id, 'up')}
                          disabled={actualIndex === 0}
                          title="Yukarı taşı"
                          className="inline-flex items-center justify-center rounded border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <FiChevronUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(row.id, 'down')}
                          disabled={actualIndex === enrichedItems.length - 1}
                          title="Aşağı taşı"
                          className="inline-flex items-center justify-center rounded border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <FiChevronDown size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(row.id)}
                          title="Sil"
                          className="inline-flex items-center rounded border border-rose-200 bg-rose-50/50 p-1 text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {enrichedItems.length > 0 && (
              <tfoot id="table-summary-row">
                <tr className="bg-slate-100/90 font-semibold border-t-2 border-slate-300">
                  <td colSpan={7} className="px-3 py-2.5 text-xs text-slate-700">
                    <span className="font-bold text-slate-900">{selectedSupplierName}</span> · {totals.totalLines} kalem · {totals.totalUnits} toplam koli/birim
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-700">Genel Toplam</td>
                  <td className="px-3 py-2.5 text-right text-base font-extrabold text-primary">{formatCurrency(totals.grandTotal)}</td>
                  <td className="px-3 py-2.5" />
                </tr>
                {/* Palet + Ağırlık özeti satırı */}
                <tr className="bg-indigo-50/90 border-t border-indigo-200">
                  <td colSpan={10} className="rounded-b-lg px-4 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-6">
                        {/* Palet */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">🏭</span>
                          <span className="text-xs font-bold text-indigo-900">Toplam Palet: </span>
                          <span className="text-sm font-extrabold text-indigo-700">
                            {totals.totalPallets < 0.01 ? '—' : totals.totalPallets % 1 === 0
                              ? `${totals.totalPallets.toFixed(0)} palet`
                              : `~${totals.totalPallets.toFixed(2)} palet`}
                          </span>
                        </div>
                        {/* Toplam ağırlık */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">⚖️</span>
                          <span className="text-xs font-bold text-indigo-900">Toplam Ağırlık: </span>
                          <span className="text-sm font-extrabold text-indigo-700">
                            {totals.totalWeightKg <= 0
                              ? <span className="text-slate-400 text-xs font-normal">(ürünlerde birim_agirlik_kg girilmemiş)</span>
                              : formatWeight(totals.totalWeightKg)}
                          </span>
                        </div>
                      </div>

                      {/* Sayfalama Butonları (Pagination bar) */}
                      {tablePageSize > 0 && totalTablePages > 1 && (
                        <div className="no-print flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setTableCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={tableCurrentPage === 1}
                            className="px-2 py-1 text-xs rounded border border-slate-300 bg-white font-medium disabled:opacity-40 hover:bg-slate-50"
                          >
                            Önceki
                          </button>
                          {Array.from({ length: totalTablePages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              type="button"
                              onClick={() => setTableCurrentPage(page)}
                              className={`h-6 w-6 rounded text-xs font-bold transition-all ${
                                tableCurrentPage === page
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setTableCurrentPage((p) => Math.min(totalTablePages, p + 1))}
                            disabled={tableCurrentPage === totalTablePages}
                            className="px-2 py-1 text-xs rounded border border-slate-300 bg-white font-medium disabled:opacity-40 hover:bg-slate-50"
                          >
                            Sonraki
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <p className="relative z-10 mt-4 text-xs text-gray-600">
          Lütfen ürün, miktar ve fiyat teyidi ile geri dönüş sağlayınız.
        </p>
      </section>

      {/* ─── Yapışkan Alt Özet ve Hızlı Aksiyon Çubuğu (Floating Sticky Summary Bar) ─── */}
      {enrichedItems.length > 0 && (
        <div className="no-print sticky bottom-3 z-30 rounded-2xl border border-slate-200/90 bg-white/95 p-3 sm:px-5 sm:py-3 shadow-xl backdrop-blur-md transition-all">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Metrik Rozetleri */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-800">
                <span>📦</span>
                <span>{totals.totalLines} Kalem</span>
                <span className="text-slate-400 font-normal">({totals.totalUnits} koli/birim)</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-900 border border-indigo-100">
                <span>🏭</span>
                <span>{totals.totalPallets < 0.01 ? '—' : totals.totalPallets % 1 === 0 ? `${totals.totalPallets.toFixed(0)} palet` : `~${totals.totalPallets.toFixed(2)} palet`}</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-900 border border-emerald-100">
                <span>⚖️</span>
                <span>{totals.totalWeightKg <= 0 ? '—' : formatWeight(totals.totalWeightKg)}</span>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-1 border border-amber-300">
                <span className="text-xs font-bold uppercase tracking-wide text-amber-900">Toplam:</span>
                <span className="text-base font-extrabold text-primary">{formatCurrency(totals.grandTotal)}</span>
              </div>
            </div>

            {/* Hızlı Aksiyonlar */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportSupplierPdf}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors"
                title="Tedarikçiye Gönderilecek Fiyatsız PDF"
              >
                <FiSend size={13} />
                <span>Tedarikçiye Gönder</span>
              </button>
              <button
                type="button"
                onClick={exportPdf}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-xs transition-colors"
                title="Fiyatlı PDF İndir"
              >
                <FiFileText size={13} />
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button
                type="button"
                onClick={scrollToTop}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 shadow-xs transition-colors"
                title="Sayfa Başına Çık"
              >
                <FiArrowUp size={13} />
                <span className="hidden sm:inline">Başa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .form-watermark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.06;
          transform: rotate(-14deg) scale(1.05);
          pointer-events: none;
          z-index: 0;
        }

        .print-only {
          display: none;
        }

        @media print {
          body * {
            visibility: hidden !important;
          }

          #print-order-list,
          #print-order-list * {
            visibility: visible !important;
          }

          #print-order-list {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: 0 !important;
            box-shadow: none !important;
            background: #fff !important;
            padding: 0 !important;
          }

          .form-watermark {
            opacity: 0.07 !important;
          }

          .no-print {
            display: none !important;
          }

          #print-order-list select,
          #print-order-list input,
          #print-order-list button {
            display: none !important;
          }

          #print-order-list .print-only {
            display: inline !important;
          }

          #print-order-list table {
            font-size: 10.5px !important;
          }

          #print-order-list th,
          #print-order-list td {
            padding: 3px 5px !important;
          }

          @page {
            size: A4 landscape;
            margin: 8mm;
          }
        }
      `}</style>
    </div>
  );
}
