'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiFile, FiFileText, FiMail, FiPlus, FiPrinter, FiSave, FiSend, FiTrash2 } from 'react-icons/fi';
import { toast } from 'sonner';
import {
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
  distributor_alis_fiyati: number;
  kutu_ici_adet: number | null;
  koli_ici_kutu_adet: number | null;
  palet_ici_koli_adet: number | null;
  tedarikci_id: string | null;
  aktif: boolean;
};

type SupplierRow = {
  id: string;
  unvan: string | null;
};

type UnitType = 'kutu' | 'koli' | 'palet';

type PlanItem = {
  id: string;
  productId: string;
  unitType: UnitType;
  quantity: number;
};

type SavedPlanRecord = {
  id: string;
  name: string;
  createdAt: string;
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

function unitMultiplier(product: ProductRow, unitType: UnitType): number {
  const boxesPerCase = Math.max(1, Number(product.koli_ici_kutu_adet || 1));
  const casesPerPallet = Math.max(1, Number(product.palet_ici_koli_adet || 1));

  if (unitType === 'koli') return boxesPerCase;
  if (unitType === 'palet') return boxesPerCase * casesPerPallet;
  return 1;
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
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const productsById = useMemo(() => {
    const map = new Map<string, ProductRow>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr');
    if (!selectedSupplierId) return [];
    return products
      .filter((p) => {
        if (p.tedarikci_id !== selectedSupplierId) return false;
        if (!q) return true;
        const name = getProductName(p.ad, locale).toLocaleLowerCase('tr');
        const code = String(p.stok_kodu || '').toLocaleLowerCase('tr');
        return name.includes(q) || code.includes(q);
      })
      .sort((a, b) => getProductName(a.ad, locale).localeCompare(getProductName(b.ad, locale), 'tr'));
  }, [products, locale, search, selectedSupplierId]);

  const selectedSupplierName = useMemo(() => {
    if (!selectedSupplierId) return 'Seçilmedi';
    return suppliers.find((s) => s.id === selectedSupplierId)?.unvan || 'Bilinmeyen Tedarikçi';
  }, [selectedSupplierId, suppliers]);

  const quickProducts = useMemo(() => filteredProducts.slice(0, 12), [filteredProducts]);

  const recentProducts = useMemo(() => {
    const seen = new Set<string>();
    const result: ProductRow[] = [];
    for (let i = items.length - 1; i >= 0 && result.length < 8; i -= 1) {
      const productId = items[i].productId;
      if (seen.has(productId)) continue;
      const product = productsById.get(productId);
      if (!product) continue;
      seen.add(productId);
      result.push(product);
    }
    return result;
  }, [items, productsById]);

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

    const mergeHistory = (remoteHistory: SavedPlanRecord[], localHistory: SavedPlanRecord[]) => {
      const mergedMap = new Map<string, SavedPlanRecord>();
      for (const r of [...remoteHistory, ...localHistory]) {
        const normalized: SavedPlanRecord = {
          ...r,
          status: r.status || 'sablon',
          sentAt: r.sentAt || null,
          receivedAt: r.receivedAt || null,
        };
        const key = normalized.id || `${normalized.name}-${normalized.createdAt}`;
        if (!mergedMap.has(key)) mergedMap.set(key, normalized);
      }

      return Array.from(mergedMap.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 200);
    };

    const loadStorage = async () => {
      const remote = await getSupplierOrderPlanStorageAction();
      const localDraft = parseLocalDraft();
      const localHistory = parseLocalHistory();

      // Cloud + local veriyi birleştirerek yükle (kayıp taslakları geri kazanmak için).
      if (mounted && remote.success) {
        const remoteDraft = remote.draft;
        const d = remoteDraft || localDraft;
        if (d) {
          if (d.draftName) setDraftName(d.draftName);
          if (d.selectedSupplierId) setSelectedSupplierId(d.selectedSupplierId);
          if (typeof d.search === 'string') setSearch(d.search);
          if (d.selectedProductId) setSelectedProductId(d.selectedProductId);
          if (d.selectedUnitType) setSelectedUnitType(d.selectedUnitType);
          if (typeof d.selectedQuantity === 'number') setSelectedQuantity(d.selectedQuantity);
          if (Array.isArray(d.items)) setItems(d.items);
          if (d.savedAt) setLastDraftSaveAt(d.savedAt);
        }

        const remoteHistory = Array.isArray(remote.history) ? remote.history : [];
        const merged = mergeHistory(remoteHistory, localHistory);
        setPlanHistory(merged);

        // Eğer local'de ek kayıt varsa buluta taşı
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

        if (merged.length > remoteHistory.length) {
          for (const rec of merged) {
            void saveSupplierOrderPlanSnapshotAction(rec);
          }
        }
      }

      if (mounted && !remote.success) {
        // Cloud okunamazsa local fallback
        if (localDraft) {
          if (localDraft.draftName) setDraftName(localDraft.draftName);
          if (localDraft.selectedSupplierId) setSelectedSupplierId(localDraft.selectedSupplierId);
          if (typeof localDraft.search === 'string') setSearch(localDraft.search);
          if (localDraft.selectedProductId) setSelectedProductId(localDraft.selectedProductId);
          if (localDraft.selectedUnitType) setSelectedUnitType(localDraft.selectedUnitType);
          if (typeof localDraft.selectedQuantity === 'number') setSelectedQuantity(localDraft.selectedQuantity);
          if (Array.isArray(localDraft.items)) setItems(localDraft.items);
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

        const purchaseBoxCost = Number(product.distributor_alis_fiyati || 0);
        const multiplier = unitMultiplier(product, item.unitType);
        const unitCost = purchaseBoxCost * multiplier;
        const lineTotal = unitCost * item.quantity;

        return {
          ...item,
          product,
          purchaseBoxCost,
          multiplier,
          unitCost,
          lineTotal,
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
        return acc;
      },
      { grandTotal: 0, totalLines: 0, totalUnits: 0 }
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
      const boxCost = Number(product.distributor_alis_fiyati || 0);
      const multiplier = unitMultiplier(product, item.unitType);
      return sum + boxCost * multiplier * item.quantity;
    }, 0);
  };

  const addItemByProduct = (productId: string, unitType = selectedUnitType, quantity = selectedQuantity) => {
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
        sentAt: status === 'gonderildi' ? nowIso : null,
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
          toast.success(
            status === 'gonderildi'
              ? 'Kayıt gönderildi olarak işaretlendi'
              : status === 'teslim_alindi'
                ? 'Kayıt teslim alındı olarak işaretlendi'
                : 'Kayıt şablon durumuna alındı'
          );
        }
      });
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

  const updateRow = (id: string, patch: Partial<Pick<PlanItem, 'unitType' | 'quantity'>>) => {
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

  const exportExcel = async () => {
    const XLSX = await import('xlsx');

    const rows = enrichedItems.map((row) => ({
      Tedarikci: selectedSupplierName,
      'Stok Kodu': row.product.stok_kodu || '-',
      'Urun Adi': getProductName(row.product.ad, locale),
      Birim: row.unitType,
      Miktar: row.quantity,
      'Birim Maliyet (EUR)': Number(row.unitCost.toFixed(2)),
      'Satir Toplami (EUR)': Number(row.lineTotal.toFixed(2)),
    }));

    rows.push({
      Tedarikci: '',
      'Stok Kodu': '',
      'Urun Adi': 'GENEL TOPLAM',
      Birim: '',
      Miktar: 0,
      'Birim Maliyet (EUR)': 0,
      'Satir Toplami (EUR)': Number(totals.grandTotal.toFixed(2)),
    });

    const ws = XLSX.utils.json_to_sheet(rows);
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
        { content: 'Urun Adi', styles: { halign: 'left' } },
        { content: 'Birim', styles: { halign: 'center' } },
        { content: 'Miktar', styles: { halign: 'right' } },
        { content: 'Birim Maliyet', styles: { halign: 'right' } },
        { content: 'Satir Toplami', styles: { halign: 'right' } },
      ]],
      body: enrichedItems.map((row) => [
        row.product.stok_kodu || '-',
        sp(getProductName(row.product.ad, locale)),
        row.unitType,
        String(row.quantity),
        formatCurrency(row.unitCost),
        formatCurrency(row.lineTotal),
      ]),
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 70, overflow: 'linebreak' },
        2: { cellWidth: 16, halign: 'center' },
        3: { cellWidth: 16, halign: 'right' },
        4: { cellWidth: 29, halign: 'right' },
        5: { cellWidth: 29, halign: 'right' },
      },
      styles: { fontSize: 8.5, cellPadding: 2.5, overflow: 'linebreak' },
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
        { content: 'Urun Adi', styles: { halign: 'left' } },
        { content: 'Birim', styles: { halign: 'center' } },
        { content: 'Miktar', styles: { halign: 'right' } },
      ]],
      body: enrichedItems.map((row) => [
        row.product.stok_kodu || '-',
        sp(getProductName(row.product.ad, locale)),
        row.unitType,
        String(row.quantity),
      ]),
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 98, overflow: 'linebreak' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
      },
      styles: { fontSize: 8.5, cellPadding: 2.5, overflow: 'linebreak' },
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

    doc.save(`tedarikci-talep-listesi-${sp(selectedSupplierName).replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const sendByEmail = () => {
    const subject = `Tedarikçi Sipariş Planı - ${selectedSupplierName}`;
    const lines = enrichedItems.map(
      (row, i) =>
        `${i + 1}) ${row.product.stok_kodu || '-'} | ${getProductName(row.product.ad, locale)} | ${row.quantity} ${row.unitType} | ${formatCurrency(row.lineTotal)}`
    );

    const body = [
      `Tedarikçi: ${selectedSupplierName}`,
      '',
      'Sipariş Kalemleri:',
      ...lines,
      '',
      `Toplam: ${formatCurrency(totals.grandTotal)}`,
      '',
      'Not: Bu liste planlama amaçlıdır, stok hareketi oluşturmaz.',
    ].join('\n');

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if (editingRecordId) {
      updateRecordStatus(editingRecordId, 'gonderildi');
    }
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
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ürün adı veya stok kodu"
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
                <option value="kutu">Kutu</option>
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
                    <p className="text-xs text-slate-500">Kutu alış: {formatCurrency(Number(product.distributor_alis_fiyati || 0))}</p>
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

          {/* Son eklenenler */}
          {recentProducts.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">Son eklenenler</p>
              <div className="flex flex-wrap gap-1.5">
                {recentProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addItemByProduct(product.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <FiPlus className="opacity-50" />
                    {product.stok_kodu ? `${product.stok_kodu} · ` : ''}{getProductName(product.ad, locale)}
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
                  <th className="px-4 py-2">Tarih</th>
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
                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{date}</td>
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
                              <button type="button" onClick={() => receiveOrderAndUpdateStock(record)}
                                className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100">
                                Teslim Al + Stoka İşle
                              </button>
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
          <img
            src="/logo.png"
            alt=""
            className="h-[760px] w-auto object-contain"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes('/Logo.jpg')) {
                target.src = '/Logo.jpg';
              }
            }}
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
              onClick={sendByEmail}
              disabled={enrichedItems.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiMail /> E-posta Taslağı
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
                <th className="rounded-tl-lg border-b border-gray-200 px-3 py-2">Stok Kodu</th>
                <th className="border-b border-gray-200 px-3 py-2">Ürün</th>
                <th className="border-b border-gray-200 px-3 py-2">Birim</th>
                <th className="border-b border-gray-200 px-3 py-2 text-right">Miktar</th>
                <th className="border-b border-gray-200 px-3 py-2 text-right">Birim Maliyet</th>
                <th className="border-b border-gray-200 px-3 py-2 text-right">Satır Toplamı</th>
                <th className="no-print rounded-tr-lg border-b border-gray-200 px-3 py-2 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {enrichedItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-gray-500">
                    Henüz ürün eklenmedi.
                  </td>
                </tr>
              )}
              {enrichedItems.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 align-top">
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">{row.product.stok_kodu || '-'}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-900">{getProductName(row.product.ad, locale)}</p>
                    <p className="text-xs text-gray-500">
                      Kutu alış: {formatCurrency(row.purchaseBoxCost)} · Çarpan: x{formatNumber(row.multiplier)}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.unitType}
                      onChange={(e) => updateRow(row.id, { unitType: e.target.value as UnitType })}
                      className="rounded-md border border-gray-300 px-2 py-1"
                    >
                      <option value="kutu">Kutu</option>
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
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(row.unitCost)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-primary">{formatCurrency(row.lineTotal)}</td>
                  <td className="no-print px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeItem(row.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700"
                    >
                      <FiTrash2 /> Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {enrichedItems.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={4} className="rounded-bl-lg px-3 py-3 text-sm text-gray-600">
                    {selectedSupplierName} · {totals.totalLines} kalem · {totals.totalUnits} toplam birim
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-medium text-gray-700">Genel Toplam</td>
                  <td className="px-3 py-3 text-right text-lg font-bold text-primary">{formatCurrency(totals.grandTotal)}</td>
                  <td className="rounded-br-lg px-3 py-3" />
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
