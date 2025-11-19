'use client';

import { useEffect, useMemo, useState } from 'react';
import { Tables } from '@/lib/supabase/database.types';

// Basit hesaplayıcı: Kullanıcı dostu, tek ürün odaklı maliyet ve hedef fiyat hesaplama
// Not: Operasyonel (depolama/dağıtım/pazarlama) giderler hariç tutulmuştur.

type ProductLite = Pick<
  Tables<'urunler'>,
  'id' | 'ad' | 'distributor_alis_fiyati' | 'aktif' | 'satis_fiyati_musteri' | 'satis_fiyati_alt_bayi'
> & { stok_kodu?: string | null; teknik_ozellikler?: any | null };

interface Props {
  locale: string;
  products: ProductLite[];
  systemSettings?: Record<string, any>;
}

const PALLET_COST_EUR = 350; // sabit
const BOXES_PER_PALLET = 384; // sabit
const SHIPPING_PER_BOX_EUR = PALLET_COST_EUR / BOXES_PER_PALLET; // ≈0.91 €/kutu

function formatEuro(n: number | undefined) {
  if (!isFinite(n as number)) return '0.00 €';
  return `${(n as number).toFixed(2)} €`;
}

export default function BasitMaliyetHesaplayiciTab({ locale, products, systemSettings }: Props) {
  // Form state
  const [selectedId, setSelectedId] = useState<string>('manual');
  const [baseCurrency, setBaseCurrency] = useState<'TL' | 'EUR'>(
    (systemSettings?.pricing_default_base_currency as 'TL' | 'EUR') || 'EUR'
  );
  const [baseCostInput, setBaseCostInput] = useState<number>(0); // kutu bazında
  const [exchangeRate, setExchangeRate] = useState<number>(systemSettings?.pricing_exchange_rate ?? 35);
  const [slicesPerBox, setSlicesPerBox] = useState<number>(1);
  const [customsPct, setCustomsPct] = useState<number>(systemSettings?.pricing_customs_percent ?? 15);
  const [vatPct, setVatPct] = useState<number>(systemSettings?.pricing_vat_rate ?? 7);
  const [targetMarginPct, setTargetMarginPct] = useState<number>(30);

  // Seçilen ürün bilgisi
  const selectedProduct = useMemo(() => products.find(p => p.id === selectedId), [products, selectedId]);

  // Ürün seçimi değiştiğinde alanları doldur
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

  useEffect(() => {
    if (selectedProduct) {
      const unit = selectedProduct.distributor_alis_fiyati ?? 0; // varsayılan EUR
      setBaseCurrency('EUR');
      setBaseCostInput(Number(unit || 0));
      // teknik_ozellikler içinden dilim/porsiyon sayısını çek
      const slices = inferSliceCount((selectedProduct as any).teknik_ozellikler);
      setSlicesPerBox(slices);
    }
  }, [selectedProduct]);

  // İsim gösterimi
  const displayName = (p: ProductLite) => {
    const name = (p.ad as any)?.[locale] || (typeof p.ad === 'string' ? p.ad : 'Ürün');
    return name;
  };

  // Hesaplamalar
  const results = useMemo(() => {
    const slices = Math.max(1, Number(slicesPerBox) || 1);
    const customs = Math.max(0, Number(customsPct) || 0) / 100;
    const vat = Math.max(0, Number(vatPct) || 0) / 100;
    const margin = Math.max(0, Number(targetMarginPct) || 0) / 100;

    const baseCostEUR = baseCurrency === 'TL' ? (Number(baseCostInput) || 0) / (Number(exchangeRate) || 1) : (Number(baseCostInput) || 0);

    const baseSliceCostEUR = baseCostEUR / slices;
    const shippingPerSlice = SHIPPING_PER_BOX_EUR / slices;

    const costBeforeCustomsBox = baseCostEUR + SHIPPING_PER_BOX_EUR;
    const finalLandedCostBox = costBeforeCustomsBox * (1 + customs);
    const finalLandedCostSlice = finalLandedCostBox / slices;

    const customsCostPerSlice = (costBeforeCustomsBox * customs) / slices;

    const targetBoxExcl = finalLandedCostBox * (1 + margin);
    const targetSliceExcl = targetBoxExcl / slices;

    const targetProfitPerSlice = targetSliceExcl - finalLandedCostSlice;

    const targetSliceIncl = targetSliceExcl * (1 + vat);
    const vatPerSlice = targetSliceExcl * vat;

    return {
      baseSliceCostEUR,
      shippingPerSlice,
      customsCostPerSlice,
      vatPerSlice,
      targetProfitPerSlice,
      targetSliceIncl,
    };
  }, [baseCurrency, baseCostInput, exchangeRate, slicesPerBox, customsPct, vatPct, targetMarginPct]);

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-text-main">🧮 Basit Maliyet Hesaplayıcı</h2>
        <p className="text-sm text-text-main/70">Ürün maliyetini (kutu), nakliye ve gümrükle birlikte dilim/birim bazında hedef satış fiyatını hesaplayın.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Temel Maliyet Girişleri */}
        <div className="md:col-span-1 space-y-4 p-4 border rounded-lg bg-white">
          <h3 className="text-lg font-semibold text-text-main border-b pb-2">Temel Maliyet</h3>

          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Ürün Seçimi</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="manual">Manuel Giriş (Yeni/Liste Dışı)</option>
              <option value="" disabled>--- Ürün Listesi ---</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{displayName(p)}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-text-main">Distribütör Kutu Fiyatı</label>
              <div className="flex gap-3 text-sm font-semibold">
                <label className="inline-flex items-center gap-1">
                  <input type="radio" checked={baseCurrency==='TL'} onChange={() => setBaseCurrency('TL')} />
                  <span>₺ (TL)</span>
                </label>
                <label className="inline-flex items-center gap-1">
                  <input type="radio" checked={baseCurrency==='EUR'} onChange={() => setBaseCurrency('EUR')} />
                  <span>€ (EUR)</span>
                </label>
              </div>
            </div>
            <input
              type="number"
              step="0.01"
              value={Number.isFinite(baseCostInput) ? baseCostInput : 0}
              onChange={(e) => setBaseCostInput(parseFloat(e.target.value) || 0)}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-text-main/70 mt-1">Bu fiyat, fabrika çıkış (kutu) maliyeti olarak baz alınır.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Döviz Kuru (₺/€)</label>
            <input
              type="number"
              step="0.01"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-text-main/70 mt-1">1 € karşılığı Türk Lirası (operasyonel kur).</p>
          </div>

                    <div>
            <label className="block text-sm font-medium text-text-main mb-1">Kutu İçi Dilim/Birim Sayısı</label>
            <input
              type="number"
              min={1}
              step={1}
              value={slicesPerBox}
              onChange={(e) => setSlicesPerBox(parseInt(e.target.value) || 1)}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-text-main/70 mt-1">Seçili ürünün teknik özelliklerine göre otomatik doldurulur; gerekirse değiştirebilirsiniz.</p>
          </div>

          <div className="border-t pt-3">
            <p className="text-sm font-bold text-text-main">Dilim/Birim Başı Maliyet (Fabrika Çıkış)</p>
            <p className="text-xl font-extrabold text-text-main mt-1">{formatEuro(results.baseSliceCostEUR)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Dilim/Birim Başı Nakliye (€/dilim)</label>
            <div className="w-full p-2 border rounded-md bg-gray-50 font-semibold">{formatEuro(results.shippingPerSlice)}</div>
            <p className="text-xs text-text-main/70 mt-1">Sabit varsayım: 350€ palet / 384 kutu.</p>
          </div>
        </div>

        {/* 2. Ek Maliyet Giderleri */}
        <div className="md:col-span-1 space-y-4 p-4 border rounded-lg bg-white">
          <h3 className="text-lg font-semibold text-text-main border-b pb-2">Ek Maliyetler</h3>

          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Gümrük/İthalat Gideri (%)</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={customsPct}
              onChange={(e) => setCustomsPct(parseFloat(e.target.value) || 0)}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-text-main/70 mt-1">
              <span className="font-bold">Maliyet Etkisi (€/dilim): </span>
              <span className="font-bold">{formatEuro(results.customsCostPerSlice)}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Almanya KDV Oranı (%)</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={vatPct}
              onChange={(e) => setVatPct(parseFloat(e.target.value) || 0)}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-text-main/70 mt-1">
              <span className="font-bold">KDV Tutarı (€/dilim): </span>
              <span className="font-bold">{formatEuro(results.vatPerSlice)}</span>
            </p>
          </div>
        </div>

        {/* 3. Hedef Kâr */}
        <div className="md:col-span-1 space-y-4 p-4 border rounded-lg bg-white">
          <h3 className="text-lg font-semibold text-text-main border-b pb-2">Hedef Kâr</h3>

          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Hedef Satış Kâr Marjı (%)</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={targetMarginPct}
              onChange={(e) => setTargetMarginPct(parseFloat(e.target.value) || 0)}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-xs text-text-main/70 mt-1">
              <span className="font-bold">Hedef Kâr (€/dilim): </span>
              <span className="font-bold">{formatEuro(results.targetProfitPerSlice)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Sonuç Alanı */}
      <div className="mt-4 pt-4 border-t">
        <div className="bg-amber-100 text-amber-900 p-6 rounded-xl text-center border">
          <h3 className="text-xl font-semibold mb-2">Kafeye Hedeflenen Nihai Dilim/Birim Satış Fiyatı</h3>
          <p className="text-5xl font-extrabold">{formatEuro(results.targetSliceIncl)}</p>
          <p className="text-sm mt-2">(%Kâr Marjı ve %KDV Dahil)</p>
        </div>

        <div className="mt-3 p-3 bg-yellow-50 border text-yellow-900 rounded">
          <p className="text-sm font-medium">
            Not: Bu hesaplama, operasyonel giderleri (depolama, pazarlama, dağıtım vb.) içermez. İsterseniz bunları da ekleyebileceğimiz bir alan açabilirim.
          </p>
        </div>
      </div>
    </div>
  );
}
