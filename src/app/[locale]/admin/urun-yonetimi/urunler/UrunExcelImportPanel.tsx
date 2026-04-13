"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { FiDownload, FiUploadCloud, FiChevronDown } from 'react-icons/fi';
import { toast } from 'sonner';
import { importSupplierPriceListAction } from '@/app/actions/supplier-price-import-actions';
import { dedupeSuppliers, getCanonicalSupplierLabel } from '@/lib/supplier-utils';

type SupplierOption = { id: string; unvan: string | null };
interface Props { locale: string; suppliers: SupplierOption[]; }

const COLUMN_GUIDE = [
  { col: 'Urun Kodu / Stok Kodu', desc: 'Ürünü eşleştirmek için birincil anahtar. Zorunlu değil ama önerilir.', tag: 'Eşleştirme' },
  { col: 'urun_adi_tr / urun_adi_de / urun_adi_en / urun_adi_ar', desc: 'Dil bazlı isimler. Boş bırakılan diller eski değerini korur.', tag: 'İsim' },
  { col: 'aciklama_tr / aciklama_de / aciklama_en / aciklama_ar', desc: 'Dil bazlı açıklamalar. Boş bırakılan diller eski değerini korur.', tag: 'Açıklama' },
  { col: 'Distributor Alis Fiyati', desc: 'Alış fiyatı (EUR). Belirtilirse satış fiyatları otomatik hesaplanır.', tag: 'Fiyat' },
  { col: 'satis_fiyati_musteri', desc: 'Kafe/tüketici satış fiyatını doğrudan gir. Alış fiyatından hesaplamak yerine kullanılır.', tag: 'Fiyat' },
  { col: 'satis_fiyati_alt_bayi', desc: 'Alt bayi satış fiyatını doğrudan gir.', tag: 'Fiyat' },
  { col: 'stok_miktari', desc: 'Mevcut stok miktarını doğrudan günceller.', tag: 'Stok' },
  { col: 'aktif', desc: '1/true/evet = aktif, 0/false/hayir = pasif. Boş bırakılırsa değişmez.', tag: 'Durum' },
  { col: 'Kutu Ici', desc: 'Bir kutudaki birim sayısı (adet/dilim). Fiyat seviyesi tespitinde kullanılır.', tag: 'Paketleme' },
  { col: 'Tedarikci', desc: 'Tedarikçi adı veya marka. Otomatik eşleştirilir, boş ise değişmez.', tag: 'Tedarikçi' },
  { col: 'Kategori / Alt Kategori', desc: 'Kategori adı. Sistem fuzzy eşleştirme yapar; eşleşme bulunamazsa mevcut kategori korunur.', tag: 'Kategori' },
];

const TAG_COLORS: Record<string, string> = {
  'Eşleştirme': 'bg-violet-100 text-violet-800',
  'İsim': 'bg-sky-100 text-sky-800',
  'Açıklama': 'bg-sky-100 text-sky-800',
  'Fiyat': 'bg-emerald-100 text-emerald-800',
  'Stok': 'bg-amber-100 text-amber-800',
  'Durum': 'bg-slate-100 text-slate-700',
  'Paketleme': 'bg-rose-100 text-rose-800',
  'Tedarikçi': 'bg-orange-100 text-orange-800',
  'Kategori': 'bg-indigo-100 text-indigo-800',
};

export default function UrunExcelImportPanel({ locale, suppliers }: Props) {
  const router = useRouter();
  const [selectedProfile, setSelectedProfile] = useState<'cold-chain' | 'non-cold'>('non-cold');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [lastResult, setLastResult] = useState<{ summary: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showGuide, setShowGuide] = useState(false);

  const dedupedSuppliers = useMemo(() => dedupeSuppliers(suppliers || []), [suppliers]);

  const handleImport = () => {
    if (!file) { toast.error('Lütfen önce bir dosya seçin.'); return; }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('default_profile', selectedProfile);
    if (selectedSupplierId) formData.append('default_supplier_id', selectedSupplierId);

    startTransition(async () => {
      const response = await importSupplierPriceListAction(formData, locale);

      if (response?.error) {
        toast.error(response.error);
        setLastResult({ summary: response.error, ok: false });
        return;
      }

      const parts = [];
      if (response?.createdCount) parts.push(`${response.createdCount} yeni ürün oluşturuldu`);
      if (response?.updatedCount) parts.push(`${response.updatedCount} ürün güncellendi`);
      if (response?.skippedCount) parts.push(`${response.skippedCount} satır atlandı`);
      if (response?.notFoundCount) parts.push(`${response.notFoundCount} satır eşleşmedi`);

      const detailLines: string[] = [];
      const reasons = (response?.skipReasons || []).slice(0, 15);
      const unmatched = (response?.unmatched || []).slice(0, 10);
      if (reasons.length) detailLines.push('── Atlanan satırlar ──', ...reasons);
      if (unmatched.length) detailLines.push('── Eşleşmeyen satırlar ──', ...unmatched);

      const summary = [parts.join(' · '), ...detailLines].filter(Boolean).join('\n');
      const nothingDone = (response?.updatedCount || 0) === 0 && (response?.createdCount || 0) === 0;

      setLastResult({ summary, ok: !nothingDone });
      setFile(null);
      if (nothingDone) {
        toast.error(parts.join(' · ') || 'Hiçbir ürün işlenemedi');
      } else {
        toast.success(parts.join(' · '));
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {/* Kural özeti */}
      <div className="grid gap-2 sm:grid-cols-3 text-xs">
        <div className="flex items-start gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2">
          <span className="mt-0.5 text-emerald-600 font-bold text-base leading-none">↑</span>
          <div><p className="font-semibold text-slate-800">Yeni ürün oluşturulur</p><p className="text-slate-500 mt-0.5">Eşleşme bulunamazsa ve zorunlu alanlar doluysa otomatik eklenir.</p></div>
        </div>
        <div className="flex items-start gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2">
          <span className="mt-0.5 text-amber-500 font-bold text-base leading-none">✎</span>
          <div><p className="font-semibold text-slate-800">Mevcut ürün güncellenir</p><p className="text-slate-500 mt-0.5">Stok kodu veya isme göre eşleşirse sadece dolu alanlar yazılır.</p></div>
        </div>
        <div className="flex items-start gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2">
          <span className="mt-0.5 text-blue-500 font-bold text-base leading-none">◻</span>
          <div><p className="font-semibold text-slate-800">Boş alan = eski değer</p><p className="text-slate-500 mt-0.5">Dosyada boş bırakılan sütun veritabanındaki mevcut değeri silmez.</p></div>
        </div>
      </div>

      {/* Kontroller */}
      <div className="grid gap-3 sm:grid-cols-[180px_240px_minmax(0,1fr)_auto]">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-700">Varsayılan ürün tipi</p>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 w-full">
            {(['non-cold', 'cold-chain'] as const).map((p) => (
              <button key={p} type="button" onClick={() => setSelectedProfile(p)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${selectedProfile === p ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
                {p === 'cold-chain' ? 'Donuk' : 'Kuru'}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-slate-400">Dosyada tip sütunu varsa otomatik algılanır</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Varsayılan tedarikçi</label>
          <select value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm">
            <option value="">Dosyadan otomatik al</option>
            {dedupedSuppliers.map((s) => (
              <option key={s.id} value={s.id}>{getCanonicalSupplierLabel(s.unvan)}</option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-slate-400">Tedarikçi sütunu yoksa bu kullanılır</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Excel veya CSV dosyası</label>
          <input type="file"
            accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm" />
          {file && <p className="mt-1 text-[10px] text-emerald-700">Seçilen: {file.name}</p>}
        </div>

        <div className="flex flex-col gap-2 pt-5">
          <button type="button" onClick={handleImport} disabled={!file || isPending}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50">
            <FiUploadCloud size={15} />
            {isPending ? 'İşleniyor...' : 'İçe Aktar'}
          </button>
          <div className="flex gap-1.5">
            <Link href="/templates/toptanci-urun-import-sablonu.xlsx" target="_blank"
              className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600">
              <FiDownload size={11} /> XLSX
            </Link>
            <Link href="/templates/toptanci-urun-import-sablonu.csv" target="_blank"
              className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600">
              <FiDownload size={11} /> CSV
            </Link>
          </div>
        </div>
      </div>

      {/* Sütun rehberi (katlanabilir) */}
      <div>
        <button type="button" onClick={() => setShowGuide(v => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700">
          <FiChevronDown className={`transition-transform ${showGuide ? 'rotate-180' : ''}`} size={13} />
          Desteklenen sütunlar rehberi
        </button>
        {showGuide && (
          <div className="mt-2 overflow-x-auto rounded-lg border border-slate-100">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 w-64">Sütun adı</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">Açıklama</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 w-24">Tür</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {COLUMN_GUIDE.map((row) => (
                  <tr key={row.col} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-mono text-slate-700">{row.col}</td>
                    <td className="px-3 py-2 text-slate-500">{row.desc}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TAG_COLORS[row.tag] || 'bg-slate-100 text-slate-600'}`}>
                        {row.tag}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sonuç */}
      {lastResult && (
        <div className={`max-h-56 overflow-auto whitespace-pre-line rounded-lg border px-3 py-2.5 text-xs ${
          lastResult.ok
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-red-200 bg-red-50 text-red-900'
        }`}>
          {lastResult.summary}
        </div>
      )}
    </div>
  );
}
