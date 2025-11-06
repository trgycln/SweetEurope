"use client";

import { useMemo, useState } from 'react';
import { Tables } from '@/lib/supabase/database.types';
import { saveProductPricesAction, createPriceChangeRequestAction } from '@/app/actions/urun-fiyat-actions';
import { updateSystemSettingAction } from '@/app/actions/system-settings-actions';

type ProductLite = Pick<Tables<'urunler'>, 'id' | 'ad' | 'distributor_alis_fiyati' | 'satis_fiyati_alt_bayi' | 'satis_fiyati_musteri'>;

// Helper to format numeric inputs that may be empty strings
function fmtNum(n: number | '' | null | undefined) {
  if (n === '' || n == null || !Number.isFinite(Number(n))) return '—';
  return String(n);
}

export default function CalculatorClient({ products, locale, systemSettings }: { 
  products: ProductLite[]; 
  locale: string; 
  systemSettings: Record<string, any>;
}) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(products[0]?.id ?? null);
  const selected = useMemo(() => products.find(p => p.id === selectedId) || null, [products, selectedId]);

  const [purchase, setPurchase] = useState<number | ''>(selected?.distributor_alis_fiyati ?? '');
  const [shippingPerBox, setShippingPerBox] = useState<number | ''>(systemSettings.pricing_shipping_per_box ?? 0.56);
  const [customsPct, setCustomsPct] = useState<number | ''>(systemSettings.pricing_customs_percent ?? 7);
  const [storageCost, setStorageCost] = useState<number | ''>(systemSettings.pricing_storage_per_box ?? 0.08);
  const [operationalPct, setOperationalPct] = useState<number | ''>(systemSettings.pricing_operational_percent ?? 10);
  const [dealerMarginPct, setDealerMarginPct] = useState<number>(systemSettings.pricing_dealer_margin_default ?? 20);
  const [distributorMarginPct, setDistributorMarginPct] = useState<number | ''>(systemSettings.pricing_distributor_margin ?? 25);
  const [roundStep, setRoundStep] = useState<number>(systemSettings.pricing_round_step ?? 0.1);
  const [applyToAltBayi, setApplyToAltBayi] = useState(true);
  const [applyToMusteri, setApplyToMusteri] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [slicesPerBox, setSlicesPerBox] = useState<number | ''>('');
  const [notes, setNotes] = useState<string>('');

  // Sync purchase when selection changes
  useMemo(() => {
    if (selected) {
      setPurchase(selected.distributor_alis_fiyati ?? '');
    }
    setMessage(null);
  }, [selectedId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(p => {
      const name = (p.ad as any)?.[locale] || (typeof p.ad === 'string' ? p.ad : '');
      return `${name}`.toLowerCase().includes(term);
    });
  }, [products, search, locale]);

  const displayName = (p: ProductLite | null) => {
    if (!p) return '';
    const name = (p.ad as any)?.[locale] || (typeof p.ad === 'string' ? p.ad : '');
    return name;
  };

  const calc = useMemo(() => {
    const cost = typeof purchase === 'number' ? purchase : parseFloat(`${purchase}`);
    const ship = typeof shippingPerBox === 'number' ? shippingPerBox : parseFloat(`${shippingPerBox}`);
    const cst = typeof customsPct === 'number' ? customsPct : parseFloat(`${customsPct}`);
    const storage = typeof storageCost === 'number' ? storageCost : parseFloat(`${storageCost}`);
    const opr = typeof operationalPct === 'number' ? operationalPct : parseFloat(`${operationalPct}`);

    const validCost = Number.isFinite(cost) ? Math.max(0, cost) : 0;
    const validShip = Number.isFinite(ship) ? Math.max(0, ship) : 0;
    const validCst = Number.isFinite(cst) ? Math.max(0, cst) : 0;
    const validStorage = Number.isFinite(storage) ? Math.max(0, storage) : 0;
    const validOpr = Number.isFinite(opr) ? Math.max(0, opr) : 0;

    const baseCost = validCost
      + validShip
      + validCost * (validCst / 100)
      + validStorage
      + validCost * (validOpr / 100);
    
    // Excel sistemi: maliyet → distribütör fiyatı (bizim satış fiyatımız)
    const distMargin = typeof distributorMarginPct === 'number' ? distributorMarginPct : parseFloat(`${distributorMarginPct}`);
    const validDistMargin = Number.isFinite(distMargin) ? Math.min(95, Math.max(0, distMargin)) : 25;
    const distributorMargin = validDistMargin / 100;
    const distributorPrice = baseCost * (1 + distributorMargin);
    
    // Alt bayi fiyatı: distribütör fiyatından alt bayi marjı ile
    const dealerMargin = Math.min(95, Math.max(0, dealerMarginPct)) / 100;
    const dealerNet = distributorPrice / (1 - dealerMargin);

    const distributorRounded = roundTo(distributorPrice, roundStep);
    const dealerRounded = roundTo(dealerNet, roundStep);

    const distributorGross = distributorRounded * 1.07; // 7% VAT
    const dealerGross = dealerRounded * 1.07;

    const spl = Number.isFinite(slicesPerBox as any) ? Number(slicesPerBox) : 0;
    const perSlice = (price: number) => (spl > 0 ? price / spl : undefined);

    return {
      baseCost,
      distributor: { net: distributorRounded, gross: distributorGross, perSliceNet: perSlice(distributorRounded), perSliceGross: perSlice(distributorGross) },
      dealer: { net: dealerRounded, gross: dealerGross, perSliceNet: perSlice(dealerRounded), perSliceGross: perSlice(dealerGross) }
    };
  }, [purchase, shippingPerBox, customsPct, storageCost, operationalPct, distributorMarginPct, dealerMarginPct, roundStep, slicesPerBox]);

  async function saveDirect() {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload: { urunId: string; satis_fiyati_alt_bayi?: number; satis_fiyati_musteri?: number } = { urunId: selected.id };
      if (applyToAltBayi) payload.satis_fiyati_alt_bayi = Number(calc.dealer.net.toFixed(2));
      if (applyToMusteri) payload.satis_fiyati_musteri = Number(calc.distributor.net.toFixed(2));

      if (!payload.satis_fiyati_alt_bayi && !payload.satis_fiyati_musteri) {
        const msg = { type: 'error' as const, text: 'Kaydedilecek alan seçiniz.' };
        setMessage(msg);
        setTimeout(() => setMessage(null), 5000);
        setSaving(false);
        return;
      }

      const res = await saveProductPricesAction(payload, locale);
      if (res.success) {
        const msg = { type: 'success' as const, text: 'Fiyat güncellendi.' };
        setMessage(msg);
        setTimeout(() => setMessage(null), 3000);
      } else {
        const msg = { type: 'error' as const, text: res.error || 'Hata oluştu.' };
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

  async function submitForApproval() {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload: any = {
        urunId: selected.id,
        proposed_alt_bayi: applyToAltBayi ? Number(calc.dealer.net.toFixed(2)) : null,
        proposed_musteri: applyToMusteri ? Number(calc.distributor.net.toFixed(2)) : null,
      };
      
      // Build notes summary
      const noteParts: string[] = [];
      if (notes) noteParts.push(notes);
      noteParts.push(`Maliyet=${fmtNum(purchase)}€`);
      noteParts.push(`Nakliye=${fmtNum(shippingPerBox)}€`);
      noteParts.push(`Gumruk%=${fmtNum(customsPct)}%`);
      noteParts.push(`Depolama=${fmtNum(storageCost)}€`);
      noteParts.push(`Operasyonel%=${fmtNum(operationalPct)}%`);
      noteParts.push(`Dilim/Kutu=${fmtNum(slicesPerBox)}`);
      noteParts.push(`Marj(Dist)=${fmtNum(distributorMarginPct)}%`);
      noteParts.push(`Marj(AltBayi)=${dealerMarginPct}%`);
      payload.notes = noteParts.join(' | ');
      
      const res = await createPriceChangeRequestAction(payload, locale);
      if (res.success) {
        const msg = { type: 'success' as const, text: 'Talep gönderildi (onay bekliyor).' };
        setMessage(msg);
        setTimeout(() => setMessage(null), 3000);
      } else {
        const msg = { type: 'error' as const, text: res.error || 'Hata oluştu.' };
        setMessage(msg);
        setTimeout(() => setMessage(null), 5000);
      }
    } catch {
      const msg = { type: 'error' as const, text: 'Beklenmeyen hata.' };
      setMessage(msg);
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  }

  async function saveAsDefaults() {
    setSaving(true);
    setMessage(null);
    try {
      await Promise.all([
        updateSystemSettingAction('pricing_shipping_per_box', String(fmtNum(shippingPerBox) || '0.56'), locale),
        updateSystemSettingAction('pricing_customs_percent', String(fmtNum(customsPct) || '7'), locale),
        updateSystemSettingAction('pricing_storage_per_box', String(fmtNum(storageCost) || '0.08'), locale),
        updateSystemSettingAction('pricing_operational_percent', String(fmtNum(operationalPct) || '10'), locale),
        updateSystemSettingAction('pricing_distributor_margin', String(fmtNum(distributorMarginPct) || '25'), locale),
        updateSystemSettingAction('pricing_dealer_margin_default', String(dealerMarginPct || 20), locale),
        updateSystemSettingAction('pricing_round_step', String(roundStep || 0.1), locale),
      ]);
      const msg = { type: 'success' as const, text: 'Mevcut değerler varsayılan olarak kaydedildi.' };
      setMessage(msg);
      setTimeout(() => setMessage(null), 3000);
    } catch {
      const msg = { type: 'error' as const, text: 'Varsayılanlar kaydedilirken hata oluştu.' };
      setMessage(msg);
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Product selector */}
      <div className="grid gap-3">
        <label className="text-sm font-medium text-text-main">Ürün Seç</label>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ara..."
            className="w-60 rounded-md border border-gray-300 px-3 py-2 bg-white text-text-main focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <select
            className="flex-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white text-text-main focus:outline-none focus:ring-2 focus:ring-accent"
            value={selectedId ?? ''}
            onChange={e => setSelectedId(e.target.value || null)}
          >
            {filtered.map(p => (
              <option key={p.id} value={p.id}>
                {displayName(p)}
              </option>
            ))}
          </select>
        </div>
        {selected && (
          <div className="text-xs text-text-main/70">
            Mevcut fiyatlar — Alt bayi: {fmt(selected.satis_fiyati_alt_bayi)} €, Müşteri: {fmt(selected.satis_fiyati_musteri)} € (net)
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Alış maliyeti (€)">
          <NumberInput value={purchase} onChange={setPurchase} step={0.01} />
        </Field>
        <Field label="Kutu başı nakliye maliyeti (€)">
          <NumberInput value={shippingPerBox} onChange={setShippingPerBox} step={0.01} />
        </Field>
        <Field label="Gümrük vergisi (%)">
          <NumberInput value={customsPct} onChange={setCustomsPct} step={0.1} />
        </Field>
        <Field label="Depolama maliyeti (€/kutu)">
          <NumberInput value={storageCost} onChange={setStorageCost} step={0.01} />
        </Field>
        <Field label="Operasyonel giderler (%)">
          <NumberInput value={operationalPct} onChange={setOperationalPct} step={0.1} />
        </Field>
        <Field label="Distribütör marjı (%) - Bizim kârımız">
          <NumberInput value={distributorMarginPct} onChange={setDistributorMarginPct} step={0.1} />
        </Field>
        <Field label="Alt bayi kâr marjı (%)">
          <NumberInput value={dealerMarginPct} onChange={v => setDealerMarginPct(typeof v === 'number' ? v : 20)} step={0.5} />
        </Field>
        <Field label="Yuvarlama adımı">
          <select className="block w-full rounded-md border border-gray-300 px-3 py-2 bg-white text-text-main focus:outline-none focus:ring-2 focus:ring-accent" value={roundStep} onChange={e => setRoundStep(parseFloat(e.target.value))}>
            <option value={0}>Yok</option>
            <option value={0.05}>0.05</option>
            <option value={0.1}>0.10</option>
            <option value={0.5}>0.50</option>
            <option value={1}>1.00</option>
          </select>
        </Field>
        <Field label="Kutu iç dilim adedi (opsiyonel)">
          <NumberInput value={slicesPerBox} onChange={setSlicesPerBox} step={1} />
        </Field>
      </div>

      {/* Results */}
      <div className="rounded-lg border p-4 bg-white">
        <div className="text-sm text-text-main/70 mb-2">Hesaplanan (Kutu bazında)</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ResultTile title="Toplam Maliyet" value={`${calc.baseCost.toFixed(2)} €`} subtitle="(Alış + nakliye + gümrük + depo + operasyonel)" />
          <ResultTile title="Distribütör Fiyat (Net)" value={`${calc.distributor.net.toFixed(2)} €`} subtitle={`Bizim satış fiyatımız (%${fmtNum(distributorMarginPct)} marj)`} />
          <ResultTile title="Alt Bayi Net" value={`${calc.dealer.net.toFixed(2)} €`} subtitle="KDV hariç" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <div />
          <ResultTile title="Distribütör Brüt (+7%)" value={`${calc.distributor.gross.toFixed(2)} €`} />
          <ResultTile title="Alt Bayi Brüt (+7%)" value={`${calc.dealer.gross.toFixed(2)} €`} />
        </div>
        {calc.distributor.perSliceNet !== undefined && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <div />
            <ResultTile title="Dilim Net (Distribütör)" value={`${calc.distributor.perSliceNet!.toFixed(4)} €`} />
            <ResultTile title="Dilim Net (Alt Bayi)" value={`${calc.dealer.perSliceNet!.toFixed(4)} €`} />
          </div>
        )}
      </div>

      {/* Apply & Save */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" checked={applyToAltBayi} onChange={e => setApplyToAltBayi(e.target.checked)} />
          <span className="text-sm text-text-main">Alt bayi fiyatını güncelle</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" checked={applyToMusteri} onChange={e => setApplyToMusteri(e.target.checked)} />
          <span className="text-sm text-text-main">Distribütör fiyatını güncelle</span>
        </label>
        <button className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-secondary hover:bg-black/80 disabled:opacity-50" onClick={saveDirect} disabled={saving || !selected}>
          {saving ? 'Kaydediliyor...' : 'Yönetici hızlı uygula'}
        </button>
        <button className="inline-flex items-center rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-50" onClick={saveAsDefaults} disabled={saving}>
          📝 Varsayılan yap
        </button>
      </div>

      {/* Toast Notification */}
      {message && (
        <div 
          className={`mt-4 p-3 rounded-md text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
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

      {/* Notes and submit for approval */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
        <textarea
          className="block w-full rounded-md border border-gray-300 px-3 py-2 bg-white text-text-main focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="Notlar (opsiyonel)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button className="inline-flex items-center rounded-md bg-accent px-4 py-2 text-primary hover:bg-[#B88E5E] disabled:opacity-50" onClick={submitForApproval} disabled={saving || !selected}>
          {saving ? 'Gönderiliyor...' : 'Onaya gönder'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="w-full">
      <div className="mb-1"><span className="text-sm font-medium text-text-main">{label}</span></div>
      {children}
    </label>
  );
}

function NumberInput({ value, onChange, step = 1 }: { value: number | ''; onChange: (v: number | '') => void; step?: number; }) {
  return (
    <input
      className="block w-full rounded-md border border-gray-300 px-3 py-2 bg-white text-text-main focus:outline-none focus:ring-2 focus:ring-accent"
      type="number"
      step={step}
      value={value}
      onChange={e => {
        const v = e.target.value;
        if (v === '') onChange('');
        else onChange(parseFloat(v));
      }}
    />
  );
}

function ResultTile({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-md border p-3 bg-white">
      <div className="text-sm text-text-main/70">{title}</div>
      <div className="text-xl font-semibold text-text-main">{value}</div>
      {subtitle && <div className="text-xs text-text-main/60">{subtitle}</div>}
    </div>
  );
}

function roundTo(v: number, step: number): number {
  if (!step || step <= 0) return v;
  const inv = 1 / step;
  return Math.round(v * inv) / inv;
}

function fmt(n?: number | null) {
  if (n == null) return '-';
  return Number(n).toFixed(2);
}
