"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { FiDownload, FiUploadCloud } from 'react-icons/fi';
import { toast } from 'sonner';
import { importSupplierPriceListAction } from '@/app/actions/supplier-price-import-actions';
import { dedupeSuppliers, getCanonicalSupplierLabel } from '@/lib/supplier-utils';

type SupplierOption = {
  id: string;
  unvan: string | null;
};

interface Props {
  locale: string;
  suppliers: SupplierOption[];
}

export default function UrunExcelImportPanel({ locale, suppliers }: Props) {
  const router = useRouter();
  const [selectedProfile, setSelectedProfile] = useState<'cold-chain' | 'non-cold'>('cold-chain');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [lastSummary, setLastSummary] = useState('');
  const [isPending, startTransition] = useTransition();

  const dedupedSuppliers = useMemo(() => dedupeSuppliers(suppliers || []), [suppliers]);

  const handleImport = () => {
    if (!file) {
      toast.error('Lutfen once bir Excel veya CSV dosyasi secin.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('default_profile', selectedProfile);
    if (selectedSupplierId) {
      formData.append('default_supplier_id', selectedSupplierId);
    }

    startTransition(async () => {
      const response = await importSupplierPriceListAction(formData, locale);

      if (response?.error) {
        toast.error(response.error);
        return;
      }

      const summaryParts = [
        `${response?.updatedCount || 0} urun guncellendi`,
        `${response?.createdCount || 0} yeni urun eklendi`,
      ];

      if (response?.notFoundCount) {
        summaryParts.push(`${response.notFoundCount} satir eslesemedi`);
      }

      if (response?.skippedCount) {
        summaryParts.push(`${response.skippedCount} satir atlandi`);
      }

      const detailedReasons = (response?.skipReasons || []).slice(0, 20);
      const unmatchedRows = (response?.unmatched || []).slice(0, 20).map((item) => `Kontrol et: ${item}`);
      const detailLines = detailedReasons.length || unmatchedRows.length
        ? ['Ilk problemli satirlar:', ...detailedReasons, ...unmatchedRows]
        : [];
      const summary = [summaryParts.join(' • '), ...detailLines].filter(Boolean).join('\n');
      const nothingImported = (response?.updatedCount || 0) === 0 && (response?.createdCount || 0) === 0;

      setLastSummary(summary);
      setFile(null);
      if (nothingImported) {
        toast.error(summaryParts.join(' • '));
      } else {
        toast.success(summaryParts.join(' • '));
      }
      router.refresh();
    });
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Excel / CSV ile urun ekle-guncelle</h2>
          <p className="mt-1 text-sm text-slate-600">
            Fiyatlandirma sayfasindaki import modulu artik burada. Dosya ile yeni urun ekleyebilir veya mevcut urunlerin alis fiyatlarini topluca guncelleyebilirsiniz.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/templates/toptanci-urun-import-sablonu.xlsx"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-900"
          >
            <FiDownload size={14} /> XLSX sablonu
          </Link>
          <Link
            href="/templates/toptanci-urun-import-sablonu.csv"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          >
            <FiDownload size={14} /> CSV sablonu
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[220px_260px_minmax(0,1fr)_200px]">
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <p className="mb-2 text-xs font-semibold text-slate-700">Urun tipi</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedProfile('cold-chain')}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                selectedProfile === 'cold-chain'
                  ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-300'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              Donuk
            </button>
            <button
              type="button"
              onClick={() => setSelectedProfile('non-cold')}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                selectedProfile === 'non-cold'
                  ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              Kuru
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Tedarikci / marka</label>
          <select
            value={selectedSupplierId}
            onChange={(event) => setSelectedSupplierId(event.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Genel eslestirme kullan</option>
            {dedupedSuppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {getCanonicalSupplierLabel(supplier.unvan)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-500">
            Emin degilseniz bunu bos birakin. Sistem once stok kodu / urun adi ile genel eslestirme dener.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Dosya sec</label>
          <input
            type="file"
            accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Taninan alanlar: <code>Urun Kodu</code>, <code>urun_adi_tr/de/en/ar</code>, <code>aciklama_tr/de/en/ar</code>, <code>Distributor Alis Fiyati</code>, <code>Kutu Ici</code>, <code>Tedarikci</code>, <code>Kategori</code>.
          </p>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleImport}
            disabled={!file || isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm disabled:opacity-60"
          >
            <FiUploadCloud size={16} />
            {isPending ? 'Aktariliyor...' : 'Dosyayi ice aktar'}
          </button>
        </div>
      </div>

      {lastSummary && (
        <div className="mt-3 max-h-80 overflow-auto whitespace-pre-line rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {lastSummary}
        </div>
      )}
    </div>
  );
}
