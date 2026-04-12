'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiDownload, FiMail, FiPlus, FiPrinter, FiSave, FiTrash2 } from 'react-icons/fi';

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
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedUnitType, setSelectedUnitType] = useState<UnitType>('koli');
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [planHistory, setPlanHistory] = useState<SavedPlanRecord[]>([]);
  const [lastDraftSaveAt, setLastDraftSaveAt] = useState<string | null>(null);

  const productsById = useMemo(() => {
    const map = new Map<string, ProductRow>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr');
    return products
      .filter((p) => {
        if (selectedSupplierId !== 'all' && p.tedarikci_id !== selectedSupplierId) return false;
        if (!q) return true;
        const name = getProductName(p.ad, locale).toLocaleLowerCase('tr');
        const code = String(p.stok_kodu || '').toLocaleLowerCase('tr');
        return name.includes(q) || code.includes(q);
      })
      .sort((a, b) => getProductName(a.ad, locale).localeCompare(getProductName(b.ad, locale), 'tr'));
  }, [products, locale, search, selectedSupplierId]);

  const selectedSupplierName = useMemo(() => {
    if (selectedSupplierId === 'all') return 'Tüm Tedarikçiler';
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
    try {
      const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft) as {
          draftName?: string;
          selectedSupplierId?: string;
          search?: string;
          selectedProductId?: string;
          selectedUnitType?: UnitType;
          selectedQuantity?: number;
          items?: PlanItem[];
          savedAt?: string;
        };

        if (parsed.draftName) setDraftName(parsed.draftName);
        if (parsed.selectedSupplierId) setSelectedSupplierId(parsed.selectedSupplierId);
        if (typeof parsed.search === 'string') setSearch(parsed.search);
        if (parsed.selectedProductId) setSelectedProductId(parsed.selectedProductId);
        if (parsed.selectedUnitType) setSelectedUnitType(parsed.selectedUnitType);
        if (typeof parsed.selectedQuantity === 'number') setSelectedQuantity(parsed.selectedQuantity);
        if (Array.isArray(parsed.items)) setItems(parsed.items);
        if (parsed.savedAt) setLastDraftSaveAt(parsed.savedAt);
      }

      const rawHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (rawHistory) {
        const parsedHistory = JSON.parse(rawHistory) as SavedPlanRecord[];
        if (Array.isArray(parsedHistory)) setPlanHistory(parsedHistory);
      }
    } catch {
      // Ignore malformed local storage data and continue with clean defaults.
    }
  }, []);

  useEffect(() => {
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
  }, [draftName, selectedSupplierId, search, selectedProductId, selectedUnitType, selectedQuantity, items]);

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

  const recentSavedRecords = useMemo(() => {
    const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return planHistory.filter((record) => new Date(record.createdAt).getTime() >= threshold);
  }, [planHistory]);

  const olderSavedRecords = useMemo(() => {
    const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return planHistory.filter((record) => new Date(record.createdAt).getTime() < threshold);
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
    if (!productId) return;
    if (!Number.isFinite(quantity) || quantity <= 0) return;

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
    addItemByProduct(selectedProductId);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearItems = () => setItems([]);

  const saveSnapshot = () => {
    if (items.length === 0) return;

    const record: SavedPlanRecord = {
      id: crypto.randomUUID(),
      name: draftName.trim() || `Sipariş Planı ${new Date().toLocaleDateString('tr-TR')}`,
      createdAt: new Date().toISOString(),
      supplierId: selectedSupplierId,
      search,
      selectedUnitType,
      selectedQuantity,
      items,
    };

    const nextHistory = [record, ...planHistory].slice(0, 200);
    setPlanHistory(nextHistory);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
  };

  const loadSavedRecord = (record: SavedPlanRecord) => {
    setDraftName(record.name);
    setSelectedSupplierId(record.supplierId);
    setSearch(record.search);
    setSelectedProductId('');
    setSelectedUnitType(record.selectedUnitType);
    setSelectedQuantity(record.selectedQuantity);
    setItems(record.items);
  };

  const deleteSavedRecord = (recordId: string) => {
    const nextHistory = planHistory.filter((record) => record.id !== recordId);
    setPlanHistory(nextHistory);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
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

  const exportCsv = () => {
    const header = [
      'Tedarikçi',
      'Stok Kodu',
      'Ürün Adı',
      'Sipariş Birimi',
      'Miktar',
      'Birim Maliyet (EUR)',
      'Satır Toplamı (EUR)',
    ];

    const lines = enrichedItems.map((row) => [
      selectedSupplierName,
      row.product.stok_kodu || '',
      getProductName(row.product.ad, locale),
      row.unitType,
      String(row.quantity),
      row.unitCost.toFixed(2),
      row.lineTotal.toFixed(2),
    ]);

    lines.push(['', '', '', '', '', 'GENEL TOPLAM', totals.grandTotal.toFixed(2)]);

    const csv = [header, ...lines]
      .map((cols) => cols.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tedarikci-siparis-plani-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Tedarikçi</label>
            <select
              value={selectedSupplierId}
              onChange={(e) => {
                setSelectedSupplierId(e.target.value);
                setSelectedProductId('');
              }}
              className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 shadow-sm"
            >
              <option value="all">Tüm Tedarikçiler</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.unvan || 'İsimsiz tedarikçi'}
                </option>
              ))}
            </select>
          </div>

          <div className="xl:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Ürün ara (ad veya stok kodu)</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="örn. MM10000 veya Cheesecake"
              className="w-full rounded-lg border-2 border-orange-300 bg-white px-3 py-2 shadow-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Bulunan ürün</label>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 shadow-sm">
              {filteredProducts.length} kayıt bulundu
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Hızlı sonuçlar (ilk 12 ürün)</p>
            <p className="text-xs text-gray-600">Arama kutusundan filtrele, tek tıkla ekle</p>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-orange-200 bg-white shadow-sm">
            {quickProducts.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-gray-500">Filtreye uygun ürün bulunamadı.</div>
            ) : (
              <ul className="divide-y divide-orange-100">
                {quickProducts.map((product) => (
                  <li key={product.id} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-orange-50/60">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {product.stok_kodu ? `${product.stok_kodu} - ` : ''}
                        {getProductName(product.ad, locale)}
                        {!product.aktif ? ' (Pasif)' : ''}
                      </p>
                      <p className="text-xs text-gray-600">Kutu alış: {formatCurrency(Number(product.distributor_alis_fiyati || 0))}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          product.aktif ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {product.aktif ? 'Aktif' : 'Pasif'}
                      </span>
                      <button
                        type="button"
                        onClick={() => addItemByProduct(product.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-orange-300 bg-orange-100 px-2.5 py-1.5 text-xs font-semibold text-orange-800 hover:bg-orange-200"
                      >
                        <FiPlus /> Ekle
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">Taslak adı</label>
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="örn. Haftalık Pasta Siparişi"
              className="w-full rounded-lg border border-sky-300 bg-white px-3 py-2 shadow-sm"
            />
          </div>
          <button
            type="button"
            onClick={saveSnapshot}
            disabled={items.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiSave /> Kayıt Al
          </button>
        </div>

        <p className="mb-3 text-xs text-sky-800">
          Taslak otomatik kaydedilir. Son taslak kayıt zamanı: {lastDraftSaveAt ? formatDateTime(lastDraftSaveAt) : 'Henüz yok'}
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <h3 className="mb-2 text-sm font-semibold text-emerald-800">Yeni Kayıtlar (Son 7 Gün)</h3>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {recentSavedRecords.length === 0 ? (
                <p className="text-xs text-emerald-700">Henüz yeni kayıt yok.</p>
              ) : (
                recentSavedRecords.map((record) => {
                  const supplierName =
                    record.supplierId === 'all'
                      ? 'Tüm Tedarikçiler'
                      : suppliers.find((s) => s.id === record.supplierId)?.unvan || 'Bilinmeyen Tedarikçi';
                  return (
                    <div key={record.id} className="rounded-lg border border-emerald-200 bg-white p-2.5">
                      <p className="text-sm font-semibold text-gray-900">{record.name}</p>
                      <p className="text-xs text-gray-600">
                        {formatDateTime(record.createdAt)} · {supplierName}
                      </p>
                      <p className="text-xs text-gray-600">
                        {record.items.length} kalem · {formatCurrency(calculateRecordTotal(record))}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => loadSavedRecord(record)}
                          className="rounded-md border border-emerald-300 bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800"
                        >
                          Taslağa Yükle
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSavedRecord(record.id)}
                          className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <h3 className="mb-2 text-sm font-semibold text-amber-800">Eski Kayıtlar</h3>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {olderSavedRecords.length === 0 ? (
                <p className="text-xs text-amber-700">Eski kayıt bulunmuyor.</p>
              ) : (
                olderSavedRecords.map((record) => {
                  const supplierName =
                    record.supplierId === 'all'
                      ? 'Tüm Tedarikçiler'
                      : suppliers.find((s) => s.id === record.supplierId)?.unvan || 'Bilinmeyen Tedarikçi';
                  return (
                    <div key={record.id} className="rounded-lg border border-amber-200 bg-white p-2.5">
                      <p className="text-sm font-semibold text-gray-900">{record.name}</p>
                      <p className="text-xs text-gray-600">
                        {formatDateTime(record.createdAt)} · {supplierName}
                      </p>
                      <p className="text-xs text-gray-600">
                        {record.items.length} kalem · {formatCurrency(calculateRecordTotal(record))}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => loadSavedRecord(record)}
                          className="rounded-md border border-amber-300 bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800"
                        >
                          Taslağa Yükle
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSavedRecord(record.id)}
                          className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Sipariş Kalemi Ekle</h2>
        <div className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 md:grid-cols-12">
          <div className="md:col-span-6">
            <label className="mb-1 block text-sm font-medium text-gray-700">Ürün</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
            >
              <option value="">Ürün seçin</option>
              {filteredProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {(p.stok_kodu ? `${p.stok_kodu} - ` : '') + getProductName(p.ad, locale)}
                  {!p.aktif ? ' [Pasif]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Birim</label>
            <select
              value={selectedUnitType}
              onChange={(e) => setSelectedUnitType(e.target.value as UnitType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="kutu">Kutu</option>
              <option value="koli">Koli</option>
              <option value="palet">Palet</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Miktar</label>
            <input
              type="number"
              min={1}
              step={1}
              value={selectedQuantity}
              onChange={(e) => setSelectedQuantity(Number(e.target.value || 1))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
            />
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              type="button"
              onClick={addItem}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              <FiPlus /> Ekle
            </button>
          </div>
        </div>

        {selectedProduct && (
          <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
            Seçili ürün: <span className="font-semibold">{getProductName(selectedProduct.ad, locale)}</span>
            {selectedProduct.stok_kodu ? ` (${selectedProduct.stok_kodu})` : ''}
            {!selectedProduct.aktif ? ' · Pasif ürün' : ''}
          </div>
        )}

        {recentProducts.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Son eklenenlerden hızlı tekrar</p>
            <div className="flex flex-wrap gap-2">
              {recentProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addItemByProduct(product.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100"
                >
                  <FiPlus className="text-gray-500" />
                  {product.stok_kodu ? `${product.stok_kodu} · ` : ''}
                  {getProductName(product.ad, locale)}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Oluşturulan Sipariş Listesi</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportCsv}
              disabled={enrichedItems.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiDownload /> CSV İndir
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

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-700">
                <th className="rounded-tl-lg border-b border-gray-200 px-3 py-2">Stok Kodu</th>
                <th className="border-b border-gray-200 px-3 py-2">Ürün</th>
                <th className="border-b border-gray-200 px-3 py-2">Birim</th>
                <th className="border-b border-gray-200 px-3 py-2 text-right">Miktar</th>
                <th className="border-b border-gray-200 px-3 py-2 text-right">Birim Maliyet</th>
                <th className="border-b border-gray-200 px-3 py-2 text-right">Satır Toplamı</th>
                <th className="rounded-tr-lg border-b border-gray-200 px-3 py-2 text-right">İşlem</th>
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
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(row.unitCost)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-primary">{formatCurrency(row.lineTotal)}</td>
                  <td className="px-3 py-2 text-right">
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

        <p className="mt-3 text-xs text-gray-500">
          Bu modül planlama amaçlıdır. Ürün stok miktarları ve operasyon sipariş kayıtları üzerinde herhangi bir değişiklik
          yapmaz.
        </p>
      </section>
    </div>
  );
}
