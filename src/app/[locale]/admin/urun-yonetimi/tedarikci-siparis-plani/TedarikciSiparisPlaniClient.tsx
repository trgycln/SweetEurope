'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { FiFile, FiFileText, FiPlus, FiPrinter, FiSave, FiSend, FiTrash2, FiChevronUp, FiChevronDown, FiMenu } from 'react-icons/fi';
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

const formatNumber = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 2,
  }).format(value);

function getProductName(ad: ProductRow['ad'], locale: string): string {
  if (!ad) return 'Adsız Ürün';
  if (typeof ad === 'string') return ad;
  return ad[locale] || ad.tr || ad.de || ad.en || ad.ar || Object.values(ad)[0] || 'Adsız Ürün';
}

/**
 * Tedarikçi sipariş listesi + çıktılar için ürün adı.
 * İngilizce öncelikli (tedarikçi tipik olarak Türk; İngilizce ortak dil).
 * Fallback: en → de → tr → ar → ilk uygun değer.
 */
function getProductNameEn(ad: ProductRow['ad']): string {
  if (!ad) return 'Unnamed Product';
  if (typeof ad === 'string') return ad;
  return ad.en || ad.de || ad.tr || ad.ar || Object.values(ad)[0] || 'Unnamed Product';
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
      .sort((a, b) => getProductName(a.ad, locale).localeCompare(getProductName(b.ad, locale), 'tr'));
  }, [products, locale, search, selectedSupplierId]);

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

        const stdPricePerPiece = Number(product.distributor_alis_fiyati || 0); // standart adet fiyatı
        const realPricePerPiece = item.fiyat_duzenlendi && item.gercek_alis_fiyati != null
          ? Number(item.gercek_alis_fiyati)
          : stdPricePerPiece;
        const multiplier  = unitMultiplier(product, item.unitType); // seçili birimdeki toplam adet
        const unitCost    = realPricePerPiece * multiplier;          // gerçek birim maliyet
        const stdUnitCost = stdPricePerPiece  * multiplier;          // standart birim maliyet (tooltip için)
        const lineTotal   = unitCost * item.quantity;

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
          gercek_alis_fiyati: Math.round(real * 10000) / 10000,
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
        'Birim Maliyet (EUR)': Number(row.unitCost.toFixed(2)),
        'Satir Toplami (EUR)': Number(row.lineTotal.toFixed(2)),
      };
    });

    rows.push({
      Tedarikci: '',
      'Stok Kodu': '',
      'Barkod (EAN/GTIN)': '',
      'Urun Adi': 'GENEL TOPLAM',
      Birim: '',
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

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const mL = 14;
    const mR = 14;

    // jsPDF/Helvetica does not support Turkish chars; replace with ASCII equivalents.
    const sp = (t: string) =>
      t.replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
       .replace(/ş/g, 's').replace(/Ş/g, 'S')
       .replace(/ı/g, 'i').replace(/İ/g, 'I')
       .replace(/ü/g, 'u').replace(/Ü/g, 'U')
       .replace(/ö/g, 'o').replace(/Ö/g, 'O')
       .replace(/ç/g, 'c').replace(/Ç/g, 'C')
       .replace(/â/g, 'a').replace(/·/g, '-');

    // Load watermark logo once, draw on every page via didDrawPage.
    let logoDataUrl: string | null = null;
    let logoType: 'PNG' | 'JPEG' = 'PNG';
    try {
      let r = await fetch('/logo.png?v=1', { cache: 'no-store' });
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
      const pw = d.internal.pageSize.getWidth();
      const ph = d.internal.pageSize.getHeight();
      const anyD = d as any;
      try { if (typeof anyD.GState === 'function') anyD.setGState(new anyD.GState({ opacity: 0.05 })); } catch { /* no-op */ }
      d.addImage(logoDataUrl, logoType, (pw - 130) / 2, (ph - 130) / 2, 130, 130);
      try { if (typeof anyD.GState === 'function') anyD.setGState(new anyD.GState({ opacity: 1 })); } catch { /* no-op */ }
    };

    const today = new Date().toLocaleDateString('tr-TR');
    const docNo = `${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${draftName.slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '')}`;

    // ── Page-1 header ────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(20, 20, 20);
    doc.text(COMPANY_NAME, mL, 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Satin Alma / Siparis Formu', pageW - mR, 17, { align: 'right' });

    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.5);
    doc.line(mL, 20, pageW - mR, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);
    const infoY = 26;
    doc.text(`Gonderen  : ${COMPANY_NAME}`,  mL, infoY);
    doc.text(`E-posta   : ${COMPANY_EMAIL}`, mL, infoY + 5);
    doc.text(`Konum     : ${COMPANY_LOCATION}`, mL, infoY + 10);
    doc.text(`Tedarikci : ${sp(selectedSupplierName)}`, pageW - mR, infoY,      { align: 'right' });
    doc.text(`Tarih     : ${today}`,                    pageW - mR, infoY + 5,  { align: 'right' });
    doc.text(`Belge No  : ${docNo}`,                    pageW - mR, infoY + 10, { align: 'right' });

    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.3);
    doc.line(mL, infoY + 14, pageW - mR, infoY + 14);

    // Watermark on page 1 (drawn before table so it sits behind content)
    drawWatermark(doc);

    autoTable(doc, {
      startY: infoY + 18,
      margin: { left: mL, right: mR },
      head: [[
        { content: 'Stok Kodu', styles: { halign: 'left' } },
        { content: 'Barkod', styles: { halign: 'left' } },
        { content: 'Urun Adi', styles: { halign: 'left' } },
        { content: 'Birim', styles: { halign: 'center' } },
        { content: 'Miktar', styles: { halign: 'right' } },
        { content: 'Palet', styles: { halign: 'right' } },
        { content: 'Agirlik', styles: { halign: 'right' } },
        { content: 'B. Maliyet', styles: { halign: 'right' } },
        { content: 'Toplam', styles: { halign: 'right' } },
      ]],
      body: enrichedItems.map((row) => {
        const pallets = calcPallets(row.product, row.unitType, row.quantity);
        const kg = calcWeightKg(row.product, row.unitType, row.quantity);
        return [
          row.product.stok_kodu || '-',
          row.product.ean_gtin || '-',
          sp(getProductNameEn(row.product.ad)),
          row.unitType,
          String(row.quantity),
          pallets > 0 ? formatPalletsPlain(pallets).replace(' palet', '') : '-',
          kg > 0 ? formatWeight(kg) : '-',
          formatCurrency(row.unitCost),
          formatCurrency(row.lineTotal),
        ];
      }),
      columnStyles: {
        0: { cellWidth: 18 },                                  // Stok Kodu
        1: { cellWidth: 28, overflow: 'linebreak' },           // Barkod (EAN-13 sığsın, kısaltma yok)
        2: { cellWidth: 38, overflow: 'linebreak' },           // Urun Adi
        3: { cellWidth: 14, halign: 'center' },                // Birim
        4: { cellWidth: 14, halign: 'right' },                 // Miktar
        5: { cellWidth: 14, halign: 'right' },                 // Palet
        6: { cellWidth: 16, halign: 'right' },                 // Agirlik
        7: { cellWidth: 20, halign: 'right' },                 // B. Maliyet
        8: { cellWidth: 20, halign: 'right' },                 // Toplam
      },
      styles: { fontSize: 8.5, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) drawWatermark(doc);
        const ph = doc.internal.pageSize.getHeight();
        doc.setDrawColor(160, 160, 160);
        doc.setLineWidth(0.2);
        doc.line(mL, ph - 11, pageW - mR, ph - 11);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(130, 130, 130);
        doc.text('Lutfen urun, miktar ve fiyat teyidi ile geri donus saglayiniz.', mL, ph - 7);
        doc.text(`Sayfa ${data.pageNumber}`, pageW - mR, ph - 7, { align: 'right' });
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || infoY + 18;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text(`Genel Toplam : ${formatCurrency(totals.grandTotal)}`, pageW - mR, finalY + 8, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`${totals.totalLines} kalem  /  ${totals.totalUnits} toplam birim`, mL, finalY + 8);

    const pdfPaletStr = totals.totalPallets < 0.01
      ? '-'
      : totals.totalPallets % 1 === 0
        ? `${totals.totalPallets.toFixed(0)} palet`
        : `~${totals.totalPallets.toFixed(2)} palet`;
    const pdfAgirlikStr = totals.totalWeightKg <= 0
      ? '-'
      : totals.totalWeightKg >= 1000
        ? `${(totals.totalWeightKg / 1000).toFixed(2)} t`
        : `${totals.totalWeightKg.toFixed(1)} kg`;
    doc.text(`Toplam Palet: ${pdfPaletStr}`, mL, finalY + 14);
    doc.text(`Toplam Agirlik: ${pdfAgirlikStr}`, mL, finalY + 20);

    doc.save(`elysonsweets-siparis-formu-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportSupplierPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const mL = 14;
    const mR = 14;

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
      let r = await fetch('/logo.png?v=1', { cache: 'no-store' });
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
      const pw = d.internal.pageSize.getWidth();
      const ph = d.internal.pageSize.getHeight();
      const anyD = d as any;
      try { if (typeof anyD.GState === 'function') anyD.setGState(new anyD.GState({ opacity: 0.05 })); } catch { /* no-op */ }
      d.addImage(logoDataUrl, logoType, (pw - 130) / 2, (ph - 130) / 2, 130, 130);
      try { if (typeof anyD.GState === 'function') anyD.setGState(new anyD.GState({ opacity: 1 })); } catch { /* no-op */ }
    };

    const today = new Date().toLocaleDateString('tr-TR');
    const docNo = `${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-TL`;

    // ── Page-1 header ────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(20, 20, 20);
    doc.text(COMPANY_NAME, mL, 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Urun Talep Listesi', pageW - mR, 17, { align: 'right' });

    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.5);
    doc.line(mL, 20, pageW - mR, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);
    const infoY = 26;
    doc.text(`Gonderen  : ${COMPANY_NAME}`,  mL, infoY);
    doc.text(`E-posta   : ${COMPANY_EMAIL}`, mL, infoY + 5);
    doc.text(`Konum     : ${COMPANY_LOCATION}`, mL, infoY + 10);
    doc.text(`Tedarikci : ${sp(selectedSupplierName)}`, pageW - mR, infoY,      { align: 'right' });
    doc.text(`Tarih     : ${today}`,                    pageW - mR, infoY + 5,  { align: 'right' });
    doc.text(`Belge No  : ${docNo}`,                    pageW - mR, infoY + 10, { align: 'right' });

    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.3);
    doc.line(mL, infoY + 14, pageW - mR, infoY + 14);

    drawWatermark(doc);

    autoTable(doc, {
      startY: infoY + 18,
      margin: { left: mL, right: mR },
      head: [[
        { content: 'Stok Kodu', styles: { halign: 'left' } },
        { content: 'Barkod', styles: { halign: 'left' } },
        { content: 'Urun Adi', styles: { halign: 'left' } },
        { content: 'Birim', styles: { halign: 'center' } },
        { content: 'Miktar', styles: { halign: 'right' } },
        { content: 'Palet', styles: { halign: 'right' } },
        { content: 'Agirlik', styles: { halign: 'right' } },
      ]],
      body: enrichedItems.map((row) => {
        const pallets = calcPallets(row.product, row.unitType, row.quantity);
        const kg = calcWeightKg(row.product, row.unitType, row.quantity);
        return [
          row.product.stok_kodu || '-',
          row.product.ean_gtin || '-',
          sp(getProductNameEn(row.product.ad)),
          row.unitType,
          String(row.quantity),
          pallets > 0 ? formatPalletsPlain(pallets).replace(' palet', '') : '-',
          kg > 0 ? formatWeight(kg) : '-',
        ];
      }),
      columnStyles: {
        0: { cellWidth: 20 },                                  // Stok Kodu
        1: { cellWidth: 30, overflow: 'linebreak' },           // Barkod (EAN-13 sığsın)
        2: { cellWidth: 58, overflow: 'linebreak' },           // Urun Adi
        3: { cellWidth: 18, halign: 'center' },                // Birim
        4: { cellWidth: 18, halign: 'right' },                 // Miktar
        5: { cellWidth: 18, halign: 'right' },                 // Palet
        6: { cellWidth: 20, halign: 'right' },                 // Agirlik
      },
      styles: { fontSize: 8.5, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) drawWatermark(doc);
        const ph = doc.internal.pageSize.getHeight();
        doc.setDrawColor(160, 160, 160);
        doc.setLineWidth(0.2);
        doc.line(mL, ph - 11, pageW - mR, ph - 11);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(130, 130, 130);
        doc.text('Lutfen miktar onaylayarak geri donus saglayiniz.', mL, ph - 7);
        doc.text(`Sayfa ${data.pageNumber}`, pageW - mR, ph - 7, { align: 'right' });
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || infoY + 18;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`${totals.totalLines} kalem  /  ${totals.totalUnits} toplam birim`, mL, finalY + 8);

    const spPaletStr = totals.totalPallets < 0.01
      ? '-'
      : totals.totalPallets % 1 === 0
        ? `${totals.totalPallets.toFixed(0)} palet`
        : `~${totals.totalPallets.toFixed(2)} palet`;
    const spAgirlikStr = totals.totalWeightKg <= 0
      ? '-'
      : totals.totalWeightKg >= 1000
        ? `${(totals.totalWeightKg / 1000).toFixed(2)} t`
        : `${totals.totalWeightKg.toFixed(1)} kg`;
    doc.text(`Toplam Palet: ${spPaletStr}`, mL, finalY + 14);
    doc.text(`Toplam Agirlik: ${spAgirlikStr}`, mL, finalY + 20);

    doc.save(`tedarikci-talep-listesi-${sp(selectedSupplierName).replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
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
              <label className="mb-1 block text-xs font-medium text-slate-600">Ürün seç</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                disabled={!selectedSupplierId}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
              >
                <option value="">Listeden seç</option>
                {filteredProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {(p.stok_kodu ? `${p.stok_kodu} - ` : '') + getProductName(p.ad, locale)}{!p.aktif ? ' [Pasif]' : ''}
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
                      {product.stok_kodu ? `${product.stok_kodu} – ` : ''}{getProductName(product.ad, locale)}
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
                    {product.stok_kodu ? `${product.stok_kodu} · ` : ''}{getProductName(product.ad, locale)}
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
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-gray-200 pb-2">
              <p className="text-2xl font-extrabold tracking-wide text-gray-900">{COMPANY_NAME}</p>
              <p className="text-sm font-semibold text-gray-700">Satın Alma Sipariş Formu</p>
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

        <div className="relative z-10 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-700">
                <th className="rounded-tl-lg border-b border-gray-200 px-2 py-2 w-12 text-center">#</th>
                <th className="border-b border-gray-200 px-3 py-2">Stok Kodu</th>
                <th className="border-b border-gray-200 px-3 py-2">Ürün</th>
                <th className="border-b border-gray-200 px-3 py-2">Birim</th>
                <th className="border-b border-gray-200 px-3 py-2 text-right">Miktar</th>
                <th className="border-b border-gray-200 px-3 py-2 text-right">Palet</th>
                <th className="border-b border-gray-200 px-3 py-2 text-right">Ağırlık</th>
                <th className="border-b border-gray-200 px-3 py-2 text-right">Birim Maliyet</th>
                <th className="border-b border-gray-200 px-3 py-2 text-right">Satır Toplamı</th>
                <th className="no-print rounded-tr-lg border-b border-gray-200 px-3 py-2 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {enrichedItems.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-gray-500">
                    Henüz ürün eklenmedi.
                  </td>
                </tr>
              )}
              {enrichedItems.map((row, index) => (
                <tr key={row.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, row.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, row.id)}
                  onDragEnd={handleDragEnd}
                  className={`border-b border-gray-100 align-top transition-colors ${row.isModified ? 'bg-orange-50' : ''} ${draggedItemId === row.id ? 'opacity-50 bg-gray-100' : ''}`}>
                  <td className="px-2 py-2 text-gray-400">
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="no-print cursor-move hover:text-gray-600" title="Sürükle bırak ile taşı">
                        <FiMenu size={16} />
                      </span>
                      <span className="text-xs font-semibold text-gray-500 w-4 text-center">{index + 1}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">{row.product.stok_kodu || '-'}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/${locale}/admin/urun-yonetimi/urunler/${row.product.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-900 hover:text-accent hover:underline transition-colors no-print"
                      title="Ürün kartına git (yeni sekmede)"
                    >
                      {getProductNameEn(row.product.ad)}
                    </Link>
                    <span className="print-only font-medium text-gray-900">{getProductNameEn(row.product.ad)}</span>
                    <p className="text-xs text-gray-500">
                      Adet: {formatCurrency(row.purchaseBoxCost)} · Çarpan: x{formatNumber(row.multiplier)}
                      {row.isModified && (
                        <span className="ml-1 text-orange-600 font-semibold">· Düzenlenmiş</span>
                      )}
                    </p>
                    {row.isModified && row.indirim_aciklamasi && (
                      <p className="text-xs text-orange-500 mt-0.5">{row.indirim_aciklamasi}</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.unitType}
                      onChange={(e) => updateRow(row.id, { unitType: e.target.value as UnitType })}
                      className="rounded-md border border-gray-300 px-2 py-1"
                    >
                      <option value="adet">Adet</option>
                      <option value="koli">Koli</option>
                      <option value="palet">Palet</option>
                    </select>
                    <span className="print-only text-sm font-medium text-gray-800">{row.unitType}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={row.quantity}
                      onChange={(e) => updateRow(row.id, { quantity: Number(e.target.value || 1) })}
                      className="w-20 rounded-md border border-gray-300 px-2 py-1 text-right"
                    />
                    <span className="print-only text-sm font-medium text-gray-800">{row.quantity}</span>
                  </td>
                  {/* Palet sütunu */}
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {(() => {
                      const pallets = calcPallets(row.product, row.unitType, row.quantity);
                      const paletPerUrun = Number(row.product.palet_ici_adet || 0);
                      return (
                        <div>
                          <p className={`text-sm font-semibold ${pallets > 0 ? 'text-indigo-700' : 'text-gray-400'}`}>
                            {formatPalletsPlain(pallets)}
                          </p>
                          {paletPerUrun > 0 && pallets > 0 && (
                            <p className="text-[10px] text-slate-400">1 palet = {paletPerUrun} koli</p>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  {/* Ağırlık sütunu */}
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {(() => {
                      const kg = calcWeightKg(row.product, row.unitType, row.quantity);
                      const unitKg = Number(row.product.birim_agirlik_kg || 0);
                      return (
                        <div>
                          <p className={`text-sm font-semibold ${kg > 0 ? 'text-slate-700' : 'text-gray-400'}`}>
                            {formatWeight(kg)}
                          </p>
                          {unitKg > 0 && (
                            <p className="text-[10px] text-slate-400">{unitKg.toFixed(2)} kg/adet</p>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  {/* Birim Maliyet — düzenlenebilir */}
                  <td className="px-3 py-2 text-right">
                    <div className="no-print flex items-center justify-end gap-1">
                      <div className="relative group">
                        <input
                          type="number"
                          min={0}
                          step={0.0001}
                          value={row.isModified && row.gercek_alis_fiyati != null
                            ? row.gercek_alis_fiyati
                            : row.purchaseBoxCost}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!Number.isFinite(val) || val < 0) return;
                            const isChanged = Math.abs(val - row.purchaseBoxCost) > 0.00001;
                            updateRow(row.id, {
                              gercek_alis_fiyati: isChanged ? val : null,
                              fiyat_duzenlendi: isChanged,
                              indirim_aciklamasi: isChanged ? 'Manuel düzenleme' : null,
                            });
                          }}
                          className={`w-24 rounded-md border px-2 py-1 text-right text-sm font-medium transition-colors ${
                            row.isModified
                              ? 'border-orange-400 bg-orange-100 text-orange-800'
                              : 'border-gray-300 bg-white text-gray-800'
                          }`}
                          title={row.isModified ? `Standart: ${formatCurrency(row.stdUnitCost)}` : 'Standart fiyat'}
                        />
                        {row.isModified && (
                          <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            Standart: {formatCurrency(row.stdUnitCost)}
                          </span>
                        )}
                      </div>
                      {row.isModified && (
                        <button type="button"
                          onClick={() => resetRowPrice(row.id)}
                          title="Standart fiyata sıfırla"
                          className="rounded p-1 text-orange-500 hover:bg-orange-100 hover:text-orange-700 text-sm leading-none">
                          ↺
                        </button>
                      )}
                    </div>
                    <span className="print-only text-sm font-medium text-gray-800">{formatCurrency(row.unitCost)}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-primary">{formatCurrency(row.lineTotal)}</td>
                  <td className="no-print px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => moveItem(row.id, 'up')}
                        disabled={index === 0}
                        title="Yukarı taşı"
                        className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <FiChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(row.id, 'down')}
                        disabled={index === enrichedItems.length - 1}
                        title="Aşağı taşı"
                        className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <FiChevronDown size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(row.id)}
                        title="Sil"
                        className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      >
                        <FiTrash2 /> <span className="hidden sm:inline">Sil</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {enrichedItems.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={7} className="px-3 py-3 text-sm text-gray-600">
                    {selectedSupplierName} · {totals.totalLines} kalem · {totals.totalUnits} toplam birim
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-medium text-gray-700">Genel Toplam</td>
                  <td className="px-3 py-3 text-right text-lg font-bold text-primary">{formatCurrency(totals.grandTotal)}</td>
                  <td className="px-3 py-3" />
                </tr>
                {/* Palet + Ağırlık özeti satırı */}
                <tr className="bg-indigo-50 border-t-2 border-indigo-200">
                  <td colSpan={10} className="rounded-b-lg px-3 py-3">
                    <div className="flex flex-wrap items-start gap-x-8 gap-y-2">
                      {/* Palet */}
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏭</span>
                        <div>
                          <span className="text-sm font-bold text-indigo-900">Toplam Palet: </span>
                          <span className="text-lg font-extrabold text-indigo-700">
                            {totals.totalPallets < 0.01 ? '—' : totals.totalPallets % 1 === 0
                              ? `${totals.totalPallets.toFixed(0)} palet`
                              : `~${totals.totalPallets.toFixed(2)} palet`}
                          </span>
                        </div>
                      </div>
                      {/* Toplam ağırlık */}
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚖️</span>
                        <div>
                          <span className="text-sm font-bold text-indigo-900">Toplam Ağırlık: </span>
                          <span className="text-lg font-extrabold text-indigo-700">
                            {totals.totalWeightKg <= 0
                              ? <span className="text-slate-400 text-sm font-normal">(ürünlerde birim_agirlik_kg girilmemiş)</span>
                              : formatWeight(totals.totalWeightKg)}
                          </span>
                        </div>
                      </div>
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

      <style jsx global>{`
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

          @page {
            size: A4 portrait;
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  );
}
