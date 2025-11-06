"use client";

import { useMemo, useState } from 'react';
import { Tables } from '@/lib/supabase/database.types';
import { saveProductPricesAction } from '@/app/actions/urun-fiyat-actions';

type ProductLite = Pick<Tables<'urunler'>, 'id' | 'ad' | 'distributor_alis_fiyati' | 'satis_fiyati_alt_bayi' | 'satis_fiyati_musteri'>;

export default function CalculatorClient({ products, locale }: { products: ProductLite[]; locale: string; }) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(products[0]?.id ?? null);
  const selected = useMemo(() => products.find(p => p.id === selectedId) || null, [products, selectedId]);

  const [purchase, setPurchase] = useState<number | ''>(selected?.distributor_alis_fiyati ?? '');
  const [overheadFixed, setOverheadFixed] = useState<number | ''>('');
  const [overheadPct, setOverheadPct] = useState<number | ''>('');
  const [marginPct, setMarginPct] = useState<number>(30);
  const [roundStep, setRoundStep] = useState<number>(0.1);
  const [applyToAltBayi, setApplyToAltBayi] = useState(true);
  const [applyToMusteri, setApplyToMusteri] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    const ohf = typeof overheadFixed === 'number' ? overheadFixed : parseFloat(`${overheadFixed}`);
    const ohp = typeof overheadPct === 'number' ? overheadPct : parseFloat(`${overheadPct}`);

    const validCost = Number.isFinite(cost) ? Math.max(0, cost) : 0;
    const validOhf = Number.isFinite(ohf) ? Math.max(0, ohf) : 0;
    const validOhp = Number.isFinite(ohp) ? Math.max(0, ohp) : 0;

    const baseCost = validCost + validOhf + validCost * (validOhp / 100);
    const margin = Math.min(95, Math.max(0, marginPct)) / 100; // clamp 0-95%
    const net = margin >= 0.999 ? baseCost : (baseCost / (1 - margin));

    const roundedNet = roundTo(net, roundStep);
    const gross = roundedNet * 1.07; // 7% VAT for DE

    return { baseCost, net: roundedNet, gross };
  }, [purchase, overheadFixed, overheadPct, marginPct, roundStep]);

  async function save() {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload: { urunId: string; satis_fiyati_alt_bayi?: number; satis_fiyati_musteri?: number } = { urunId: selected.id };
      if (applyToAltBayi) payload.satis_fiyati_alt_bayi = Number(calc.net.toFixed(2));
      if (applyToMusteri) payload.satis_fiyati_musteri = Number(calc.net.toFixed(2));

      if (!payload.satis_fiyati_alt_bayi && !payload.satis_fiyati_musteri) {
        setMessage('Kaydedilecek alan seçiniz.');
        setSaving(false);
        return;
      }

      const res = await saveProductPricesAction(payload, locale);
      if (res.success) {
        setMessage('Fiyat güncellendi.');
      } else {
        setMessage(res.error || 'Hata oluştu.');
      }
    } catch (e) {
      setMessage('Beklenmeyen hata.');
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
        <Field label="Gider (sabit, €)">
          <NumberInput value={overheadFixed} onChange={setOverheadFixed} step={0.01} />
        </Field>
        <Field label="Gider (% maliyetin)">
          <NumberInput value={overheadPct} onChange={setOverheadPct} step={0.1} />
        </Field>
        <Field label="Kâr marjı (%)">
          <NumberInput value={marginPct} onChange={v => setMarginPct(typeof v === 'number' ? v : 30)} step={0.5} />
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
      </div>

      {/* Results */}
      <div className="rounded-lg border p-4 bg-white">
        <div className="text-sm text-text-main/70 mb-2">Hesaplanan</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ResultTile title="Toplam Maliyet" value={`${calc.baseCost.toFixed(2)} €`} subtitle="(Alış + gider)" />
          <ResultTile title="Önerilen Net Fiyat" value={`${calc.net.toFixed(2)} €`} subtitle="KDV hariç" />
          <ResultTile title="KDV Dahil (7%)" value={`${calc.gross.toFixed(2)} €`} subtitle="Bilgilendirme" />
        </div>
      </div>

      {/* Apply & Save */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" checked={applyToAltBayi} onChange={e => setApplyToAltBayi(e.target.checked)} />
          <span className="text-sm text-text-main">Alt bayi fiyatını güncelle</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" checked={applyToMusteri} onChange={e => setApplyToMusteri(e.target.checked)} />
          <span className="text-sm text-text-main">Müşteri fiyatını güncelle</span>
        </label>
        <button className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-secondary hover:bg-black/80 disabled:opacity-50" onClick={save} disabled={saving || !selected}>
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
        {message && <span className="text-sm text-text-main ml-2">{message}</span>}
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
