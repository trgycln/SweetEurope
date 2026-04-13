'use client';

import { useEffect, useRef, useState } from 'react';
import { FiDownload, FiChevronDown, FiCheck } from 'react-icons/fi';

type SupplierOption = { id: string; unvan: string | null };
type KategoriOption = { id: string; ad: unknown; ust_kategori_id: string | null };

interface Props {
  locale: string;
  suppliers: SupplierOption[];
  kategoriler: KategoriOption[];
}

function getLocalizedName(ad: unknown, locale: string): string {
  if (!ad || typeof ad !== 'object') return typeof ad === 'string' ? ad : '';
  const obj = ad as Record<string, string>;
  return obj[locale] || obj.tr || obj.de || obj.en || '';
}

// ── Generic multi-select dropdown ────────────────────────────────────────

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  const allSelected = selected.size === 0;
  const displayText = allSelected
    ? `${label}: Tümü`
    : `${label}: ${selected.size} seçili`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <span className={selected.size > 0 ? 'font-semibold text-emerald-700' : ''}>{displayText}</span>
        <FiChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="max-h-60 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => onChange(new Set())}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50 ${allSelected ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
            >
              {allSelected && <FiCheck size={12} className="text-emerald-600 shrink-0" />}
              {!allSelected && <span className="w-3 shrink-0" />}
              Tümü
            </button>
            {options.map((opt) => {
              const checked = selected.has(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50 ${checked ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
                >
                  {checked ? <FiCheck size={12} className="text-emerald-600 shrink-0" /> : <span className="w-3 shrink-0" />}
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────

export default function UrunExcelExportPanel({ locale, suppliers, kategoriler }: Props) {
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<Set<string>>(new Set());
  const [selectedKategoriIds, setSelectedKategoriIds] = useState<Set<string>>(new Set());
  const [aktif, setAktif] = useState<'all' | '1' | '0'>('all');
  const [loading, setLoading] = useState(false);

  // Build top-level categories only for the dropdown (subcategories expand server-side)
  const topKategoriler = kategoriler.filter((k) => !k.ust_kategori_id);

  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: s.unvan || s.id,
  }));

  const kategoriOptions = topKategoriler.map((k) => ({
    value: k.id,
    label: getLocalizedName(k.ad, locale),
  }));

  const handleDownload = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ locale });
      if (selectedSupplierIds.size > 0) params.set('tedarikci_ids', [...selectedSupplierIds].join(','));
      if (selectedKategoriIds.size > 0) params.set('kategori_ids', [...selectedKategoriIds].join(','));
      if (aktif !== 'all') params.set('aktif', aktif);

      const url = `/api/admin/urun-export?${params.toString()}`;
      // Trigger download via hidden anchor
      const a = document.createElement('a');
      a.href = url;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      // Small delay so the download starts before we re-enable the button
      setTimeout(() => setLoading(false), 1500);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Tedarikçi */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">Tedarikçi</span>
        <MultiSelectDropdown
          label="Tedarikçi"
          options={supplierOptions}
          selected={selectedSupplierIds}
          onChange={setSelectedSupplierIds}
        />
      </div>

      {/* Kategoriler (top-level; subcategories auto-included on server) */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
          Kategori <span className="font-normal normal-case text-emerald-700">(alt kategoriler dahil)</span>
        </span>
        <MultiSelectDropdown
          label="Kategori"
          options={kategoriOptions}
          selected={selectedKategoriIds}
          onChange={setSelectedKategoriIds}
        />
      </div>

      {/* Durum */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">Durum</span>
        <div className="flex rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden text-sm">
          {([['all', 'Hepsi'], ['1', 'Aktif'], ['0', 'Pasif']] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setAktif(val)}
              className={`px-3 py-1.5 ${aktif === val ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* İndir */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-transparent select-none">.</span>
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
        >
          <FiDownload size={14} />
          {loading ? 'Hazırlanıyor...' : 'Excel İndir'}
        </button>
      </div>

      {/* Filtre özeti */}
      {(selectedSupplierIds.size > 0 || selectedKategoriIds.size > 0 || aktif !== 'all') && (
        <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1">
          <span className="font-semibold">Filtreli indirme:</span>
          {selectedSupplierIds.size > 0 && <span>{selectedSupplierIds.size} tedarikçi</span>}
          {selectedKategoriIds.size > 0 && <span>{selectedKategoriIds.size} ana kategori</span>}
          {aktif !== 'all' && <span>{aktif === '1' ? 'Aktif' : 'Pasif'}</span>}
          <button
            type="button"
            onClick={() => { setSelectedSupplierIds(new Set()); setSelectedKategoriIds(new Set()); setAktif('all'); }}
            className="ml-1 text-emerald-600 hover:text-emerald-900"
          >
            ✕ sıfırla
          </button>
        </div>
      )}
    </div>
  );
}
