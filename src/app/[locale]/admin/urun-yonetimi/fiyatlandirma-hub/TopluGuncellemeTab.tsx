'use client';

import { useMemo, useState } from 'react';
import { Tables } from '@/lib/supabase/database.types';
import { calculateAdminPrice, PricingParams, formatPrice } from '@/lib/admin-pricing';
import { bulkSaveProductPricesAction, bulkCreatePriceChangeRequestsAction } from '@/app/actions/urun-fiyat-actions';

// stok_kodu alanı tiplerde mevcut olduğu için onu ekliyoruz; yoksa optional olarak genişletiyoruz.
// teknik_ozellikler içinden dilim/porsiyon bilgisini okuyacağız
type ProductLite = Pick<Tables<'urunler'>, 'id' | 'ad' | 'kategori_id' | 'distributor_alis_fiyati' | 'satis_fiyati_alt_bayi' | 'satis_fiyati_musteri' | 'aktif'> & { stok_kodu?: string | null; teknik_ozellikler?: any | null };

interface Props {
  locale: string;
  products: ProductLite[];
  kategoriler: any[];
  systemSettings: Record<string, any>;
  kurallar: any[];
  istisnalar: any[];
}

export default function TopluGuncellemeTab({
  locale,
  products,
  kategoriler,
  systemSettings,
  kurallar,
  istisnalar,
}: Props) {
  // Pricing parameters (from system settings as defaults)
  const [shippingPerBox, setShippingPerBox] = useState<number>(systemSettings.pricing_shipping_per_box ?? 0.56);
  const [customsPct, setCustomsPct] = useState<number>(systemSettings.pricing_customs_percent ?? 7);
  const [storageCost, setStorageCost] = useState<number>(systemSettings.pricing_storage_per_box ?? 0.08);
    // Operasyonel giderler: yüzde olarak uygulanır (ör. %10)
  // Operasyon tutarı kutu alış fiyatı (unitBoxCost) üzerinden hesaplanır.
  const [operationalPct, setOperationalPct] = useState<number>(systemSettings.pricing_operational_percent ?? 10);
  // Alt bayi marjı varsayılanı %5
  const [dealerMarginPct, setDealerMarginPct] = useState<number>(systemSettings.pricing_dealer_margin_default ?? 5);
  // Müşteri marjı varsayılanı %30
  const [distributorMarginPct, setDistributorMarginPct] = useState<number>(systemSettings.pricing_distributor_margin ?? 30);
  const [roundStep, setRoundStep] = useState<number>(systemSettings.pricing_round_step ?? 0.1);
  const [vatRatePct, setVatRatePct] = useState<number>(systemSettings.pricing_vat_rate ?? 7);
  
    // Ürün başına dinamik dilim/birim sayısı: teknik_ozellikler içinden okunur (yoksa 1)
  function inferSliceCount(tek?: any): number {
    if (!tek || typeof tek !== 'object') return 1;
    const candidates = ['dilim', 'dilim_sayisi', 'dilimSayisi', 'porsiyon', 'porsiyon_sayisi', 'portion', 'portions', 'slice', 'slices', 'slice_count'];
    for (const key of Object.keys(tek)) {
      const low = key.toLowerCase();
      if (candidates.some(k => low.includes(k))) {
        const val = (tek as any)[key];
        if (typeof val === 'number' && isFinite(val) && val > 0) return Math.floor(val);
        if (typeof val === 'string') {
          const m = val.match(/(\d{1,3})/);
          if (m) {
            const n = parseInt(m[1], 10);
            if (n > 0) return n;
          }
        }
      }
    }
    return 1;
  }

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  // Removed değişim filtresi (showOnlyChanged)

  // Selection and overrides
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Map<string, { altBayi?: number; musteri?: number }>>(new Map());

  // UI state
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [applyToAltBayi, setApplyToAltBayi] = useState(true);
  const [applyToMusteri, setApplyToMusteri] = useState(true);

  // Apply filters
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Search (by name or product code)
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      filtered = filtered.filter(p => {
        const name = (p.ad as any)?.[locale] || (typeof p.ad === 'string' ? p.ad : '');
        const code = p.stok_kodu ? String(p.stok_kodu).toLowerCase() : '';
        return name.toLowerCase().includes(term) || code.includes(term);
      });
    }

    // Category
    if (categoryFilter) {
      filtered = filtered.filter(p => p.kategori_id === categoryFilter);
    }

    return filtered;
  }, [products, search, categoryFilter, locale]);

  // Basit hesaplama mantığı (HTML hesaplayıcıdan)
  const productPrices = useMemo(() => {
    return filteredProducts.map(product => {
      const override = overrides.get(product.id);
      
      // Fabrika çıkış fiyatı (kutu) - veritabanından
      const unitBoxCost = Number(product.distributor_alis_fiyati) || 0;
      
      // Debug: İlk ürünü konsola yazdır
      if (filteredProducts.indexOf(product) === 0) {
        console.log('🔍 İlk ürün debug:', {
          ad: product.ad,
          distributor_alis_fiyati: product.distributor_alis_fiyati,
          unitBoxCost,
          shippingPerBox,
          customsPct,
          operationalPct,
          distributorMarginPct,
          dealerMarginPct,
          vatRatePct
        });
      }
      
            // Nakliye maliyeti (kutu ve dilim)
      const shippingBox = shippingPerBox;
      const slices = inferSliceCount((product as any).teknik_ozellikler);
      const shippingSlice = slices > 1 ? shippingBox / slices : shippingBox;
      
      // Gümrük (kutu bazında hesapla)
      const customsBox = (unitBoxCost + shippingBox) * (customsPct / 100);
      
            // Operasyonel gider (kutu) = Alış fiyatı x %Operasyon
      const operationalBox = unitBoxCost * (operationalPct / 100);
      
      // Nihai maliyet (Landed Cost) = Alış + Nakliye + Gümrük + Operasyonel
            const landedCostBox = unitBoxCost + shippingBox + customsBox + operationalBox;
      const landedCostSlice = slices > 1 ? landedCostBox / slices : landedCostBox;
      
      // Müşteri satış fiyatı (net: maliyet + marj)
            const musteriNetBox = landedCostBox * (1 + distributorMarginPct / 100);
      const musteriNetSlice = slices > 1 ? musteriNetBox / slices : musteriNetBox;
      
      // Alt Bayi satış fiyatı (net)
  // Alt Bayi satış fiyatı (net: maliyet + %5 kar)
  const rawAltBayiNetBox = landedCostBox * 1.05;
    const altBayiNetBox = override?.altBayi ?? rawAltBayiNetBox;
  const altBayiNetSlice = slices > 1 ? altBayiNetBox / slices : altBayiNetBox;
      
      // KDV tutarı (müşteri satış üzerinden)
            const kdvBox = musteriNetBox * (vatRatePct / 100);
      const kdvSlice = slices > 1 ? kdvBox / slices : kdvBox;

      return {
        product,
        unitBoxCost,
        shippingBox,
        shippingSlice,
        customsBox,
        operationalBox,
        landedCostBox,
        musteriNetBox: override?.musteri ?? musteriNetBox,
        musteriNetSlice: slices > 0 ? (override?.musteri ?? musteriNetBox) / slices : 0,
        altBayiNetBox,
        altBayiNetSlice,
        kdvBox,
        kdvSlice,
        hasOverride: overrides.has(product.id),
        isExcluded: excludedIds.has(product.id),
        isSelected: selectedIds.has(product.id),
      };
    });
  }, [filteredProducts, shippingPerBox, customsPct, operationalPct, distributorMarginPct, dealerMarginPct, vatRatePct, overrides, excludedIds, selectedIds]);

  // Display list (no değişim filtresi artık)
  const displayedProducts = productPrices;

  // Selection helpers
  const toggleSelectAll = () => {
    if (selectedIds.size === displayedProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedProducts.map(p => p.product.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleExclude = (id: string) => {
    const newSet = new Set(excludedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExcludedIds(newSet);
  };

  // Stats
  const selectedCount = selectedIds.size;
  const selectedProducts = displayedProducts.filter(p => selectedIds.has(p.product.id) && !excludedIds.has(p.product.id));
  // Ortalama fark hesapları kaldırıldı

  const displayName = (p: ProductLite) => {
    const name = (p.ad as any)?.[locale] || (typeof p.ad === 'string' ? p.ad : '');
    return name;
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '-';
    const cat = kategoriler.find(k => k.id === categoryId);
    if (!cat) return '-';
    const name = (cat.ad as any)?.[locale] || (typeof cat.ad === 'string' ? cat.ad : '');
    return name;
  };

  // Diff renk mantığı kaldırıldı

  // Bulk apply handler
  async function handleBulkApply() {
    setSaving(true);
    setMessage(null);
    try {
      const items = selectedProducts.map(p => ({
        urunId: p.product.id,
        satis_fiyati_alt_bayi: applyToAltBayi ? p.altBayiNetBox : undefined,
        satis_fiyati_musteri: applyToMusteri ? p.musteriNetBox : undefined,
      }));

      const result = await bulkSaveProductPricesAction({ items }, locale);
      
      if (result.success) {
        const msg = { type: 'success' as const, text: `${result.updatedCount} ürün başarıyla güncellendi.` };
        setMessage(msg);
        setTimeout(() => setMessage(null), 5000);
  setSelectedIds(new Set());
        window.location.reload();
      } else {
        const msg = { type: 'error' as const, text: result.error || 'Hata oluştu.' };
        setMessage(msg);
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (e) {
      const msg = { type: 'error' as const, text: 'Beklenmeyen hata.' };
      setMessage(msg);
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  }

  // Bulk create requests handler
  async function handleBulkRequest() {
    setSaving(true);
    setMessage(null);
    try {
      const items = selectedProducts.map(p => ({
        urunId: p.product.id,
        proposed_alt_bayi: applyToAltBayi ? p.altBayiNetBox : undefined,
        proposed_musteri: applyToMusteri ? p.musteriNetBox : undefined,
      }));

      const notes = `Toplu talep: ${selectedProducts.length} ürün | Parametreler: Nakliye=${shippingPerBox}€, Gümrük=${customsPct}%, Marj(Dist)=${distributorMarginPct}%, Marj(AltBayi)=${dealerMarginPct}%`;

      const result = await bulkCreatePriceChangeRequestsAction({ items, notes }, locale);
      
      if (result.success) {
        const msg = { type: 'success' as const, text: `${result.createdCount} fiyat talebi oluşturuldu.` };
        setMessage(msg);
        setTimeout(() => setMessage(null), 5000);
  setSelectedIds(new Set());
      } else {
        const msg = { type: 'error' as const, text: result.error || 'Hata oluştu.' };
        setMessage(msg);
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (e) {
      const msg = { type: 'error' as const, text: 'Beklenmeyen hata.' };
      setMessage(msg);
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Parameter Panel */}
      <div className="bg-gray-50 rounded-lg border p-4">
        <h3 className="font-semibold text-lg mb-3">Hesaplama Parametreleri</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-600 block mb-1">Nakliye/Kutu (€)</label>
            <input type="number" step="0.01" value={shippingPerBox} onChange={e => setShippingPerBox(parseFloat(e.target.value))} className="w-full border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Gümrük (%)</label>
            <input type="number" step="0.1" value={customsPct} onChange={e => setCustomsPct(parseFloat(e.target.value))} className="w-full border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Operasyonel Giderler (%)</label>
            <input type="number" step="0.1" value={operationalPct} onChange={e => setOperationalPct(parseFloat(e.target.value))} className="w-full border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Müşteri Kar Marjı (%)</label>
            <input type="number" step="0.1" value={distributorMarginPct} onChange={e => setDistributorMarginPct(parseFloat(e.target.value))} className="w-full border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Alt Bayi Kar Marjı (%)</label>
            <input type="number" step="0.5" value={dealerMarginPct} onChange={e => setDealerMarginPct(parseFloat(e.target.value))} className="w-full border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">KDV Oranı (%)</label>
            <input type="number" step="0.1" value={vatRatePct} onChange={e => setVatRatePct(parseFloat(e.target.value))} className="w-full border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Yuvarlama Adımı</label>
            <select value={roundStep} onChange={e => setRoundStep(parseFloat(e.target.value))} className="w-full border rounded px-2 py-1 text-sm">
              <option value={0}>Yok</option>
              <option value={0.05}>0.05</option>
              <option value={0.1}>0.10</option>
              <option value={0.5}>0.50</option>
              <option value={1}>1.00</option>
            </select>
          </div>
        </div>
                <p className="text-xs text-gray-500 mt-2">
          ℹ️ Dilim fiyatları, ürünün teknik özelliklerindeki dilim/porsiyon sayısına göre hesaplanır (mono ürünler 1 parça kabul edilir). Ürün alış fiyatı veritabanındaki <code className="bg-gray-100 px-1 rounded">distributor_alis_fiyati</code> değeridir.
        </p>
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-lg mb-3">Filtreler</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-600 block mb-1">Ara (Ad veya Kod)</label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ürün adı veya stok kodu..."
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Kategori</label>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="">Tüm Kategoriler</option>
              {kategoriler.filter(k => !k.ust_kategori_id).map(k => (
                <option key={k.id} value={k.id}>{getCategoryName(k.id)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end" />
        </div>
        <div className="mt-3 text-sm text-gray-600">
          <span className="font-medium">{displayedProducts.length}</span> ürün gösteriliyor
          {/* değişim filtresi kaldırıldı */}
        </div>
      </div>

      {/* Grid - Sadeleştirilmiş Sütunlar */}
      <div className="bg-white rounded-lg border overflow-x-auto" style={{ maxHeight: '600px', overflowY: 'auto' }}>
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white shadow">
            <tr>
              <th className="px-3 py-2 text-left">
                <input type="checkbox" checked={selectedIds.size === displayedProducts.length && displayedProducts.length > 0} onChange={toggleSelectAll} className="h-4 w-4" />
              </th>
              <th className="px-3 py-2 text-left">Ürün</th>
              <th className="px-3 py-2 text-right">Ürün Alış<br/>(Kutu)</th>
              <th className="px-3 py-2 text-right">Müşteri Satış<br/>(Kutu)</th>
              <th className="px-3 py-2 text-right">Müşteri Satış<br/>(Dilim)</th>
              <th className="px-3 py-2 text-right">Alt Bayi Satış<br/>(Kutu)</th>
              <th className="px-3 py-2 text-right">Alt Bayi Satış<br/>(Dilim)</th>
              <th className="px-3 py-2 text-right">Nakliye<br/>(Kutu)</th>
              <th className="px-3 py-2 text-right">Nakliye<br/>(Dilim)</th>
              <th className="px-3 py-2 text-right">KDV<br/>(Kutu)</th>
              <th className="px-3 py-2 text-right">Gümrük<br/>(Kutu)</th>
              <th className="px-3 py-2 text-right">Operasyonel<br/>(Kutu)</th>
              <th className="px-3 py-2 text-center">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {displayedProducts.length === 0 && (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center text-gray-500">
                  Gösterilecek ürün yok. Filtreleri değiştirin.
                </td>
              </tr>
            )}
            {displayedProducts.map(({ product, unitBoxCost, shippingBox, shippingSlice, customsBox, operationalBox, musteriNetBox, musteriNetSlice, altBayiNetBox, altBayiNetSlice, kdvBox, hasOverride, isExcluded, isSelected }) => (
              <tr key={product.id} className={`border-t ${!product.aktif ? 'bg-gray-100 opacity-70' : isExcluded ? 'bg-gray-100 opacity-50' : isSelected ? 'bg-blue-50' : ''}`}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(product.id)} className="h-4 w-4" />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      {displayName(product)}
                      {!product.aktif && <span className="text-xs bg-gray-300 text-gray-700 px-1 rounded" title="Pasif ürün">PASİF</span>}
                      {hasOverride && <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded" title="Manuel override">✏️</span>}
                      {isExcluded && <span className="text-xs bg-red-100 text-red-700 px-1 rounded" title="Hariç tutuldu">🚫</span>}
                    </div>
                    {product.stok_kodu && (
                      <div className="text-[10px] mt-1 tracking-wide text-gray-500 flex items-center gap-1">
                        <code className="px-1 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono">{product.stok_kodu}</code>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(product.stok_kodu!)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Kodu kopyala"
                        >
                          ⧉
                        </button>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">{formatPrice(unitBoxCost)} €</td>
                <td className="px-3 py-2 text-right font-semibold text-blue-600">{formatPrice(musteriNetBox)} €</td>
                <td className="px-3 py-2 text-right font-semibold text-blue-600">{formatPrice(musteriNetSlice)} €</td>
                <td className="px-3 py-2 text-right font-semibold text-green-600">{formatPrice(altBayiNetBox)} €</td>
                <td className="px-3 py-2 text-right font-semibold text-green-600">{formatPrice(altBayiNetSlice)} €</td>
                <td className="px-3 py-2 text-right">{formatPrice(shippingBox)} €</td>
                <td className="px-3 py-2 text-right">{formatPrice(shippingSlice)} €</td>
                <td className="px-3 py-2 text-right">{formatPrice(kdvBox)} €</td>
                <td className="px-3 py-2 text-right">{formatPrice(customsBox)} €</td>
                <td className="px-3 py-2 text-right">{formatPrice(operationalBox)} €</td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => toggleExclude(product.id)} className="text-xs px-2 py-1 rounded hover:bg-gray-200" title={isExcluded ? "İstisnadan çıkar" : "İstisnaya al"}>
                    {isExcluded ? '✓' : '🚫'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Actions */}
      {selectedCount > 0 && (
        <div className="bg-primary/10 border border-primary rounded-lg p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-primary">
                {selectedProducts.length} ürün seçili
              </div>
              <div className="flex items-center gap-4 mt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={applyToAltBayi} onChange={e => setApplyToAltBayi(e.target.checked)} className="h-4 w-4" />
                  <span>Alt bayi fiyatını güncelle</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={applyToMusteri} onChange={e => setApplyToMusteri(e.target.checked)} className="h-4 w-4" />
                  <span>Müşteri fiyatını güncelle</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPreview(!showPreview)} className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium">
                {showPreview ? 'Önizlemeyi Kapat' : 'Önizle'}
              </button>
              <button onClick={handleBulkApply} disabled={saving || (!applyToAltBayi && !applyToMusteri)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Uygulanıyor...' : 'Seçiliye Uygula'}
              </button>
              <button onClick={handleBulkRequest} disabled={saving || (!applyToAltBayi && !applyToMusteri)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Gönderiliyor...' : 'Onaya Gönder'}
              </button>
            </div>
            {/* Preview Modal */}
            {showPreview && (
              <div className="mt-4 bg-white border rounded p-4">
                <h4 className="font-semibold mb-2">Önizleme: Uygulanacak Değişiklikler</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• Toplam ürün: {selectedProducts.length}</p>
                  <p>• Alt bayi güncellenecek: {applyToAltBayi ? 'Evet' : 'Hayır'}</p>
                  <p>• Distribütör güncellenecek: {applyToMusteri ? 'Evet' : 'Hayır'}</p>
                  <p>• KDV: %{vatRatePct}</p>
                </div>
              </div>
            )}

            {/* Message Toast */}
            {message && (
              <div className={`mt-4 p-3 rounded-md text-sm ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {message.type === 'success' ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  {message.text}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Side Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <h4 className="font-medium text-blue-900 mb-1">📊 Aktif Kurallar</h4>
          <p className="text-blue-700">{kurallar.filter((k: any) => k.aktif).length} kural tanımlı</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded p-3">
          <h4 className="font-medium text-purple-900 mb-1">🏷️ İstisnalar</h4>
          <p className="text-purple-700">{istisnalar.length} özel fiyat tanımlı</p>
        </div>
      </div>
    </div>
  );
}
