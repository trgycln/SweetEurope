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
  { col: 'stok_kodu', desc: 'Birincil eşleştirme anahtarı. Aynı kod yeniden yüklenirse güncelleme yapılır, yoksa yeni ürün oluşturulur.', tag: 'Eşleştirme' },
  { col: 'urun_adi_de / urun_adi_tr / urun_adi_en', desc: 'Dil bazlı isimler. Boş bırakılan dil eski değerini korur.', tag: 'İsim' },
  { col: 'aciklama_de / aciklama_tr', desc: 'Dil bazlı açıklamalar. Boş bırakılırsa eski değer korunur.', tag: 'Açıklama' },
  { col: 'distributoralisfiyati', desc: 'Alış fiyatı €/adet. Belirtilirse satış fiyatları otomatik hesaplanır.', tag: 'Fiyat' },
  { col: 'alis_fiyat_seviyesi', desc: 'adet / koli / palet. Alış fiyatının hangi birime ait olduğunu belirtir.', tag: 'Fiyat' },
  { col: 'satis_fiyati_musteri', desc: 'Satış fiyatını manuel gir. Boşsa alış fiyatından otomatik hesaplanır.', tag: 'Fiyat' },
  { col: 'koli_ici_adet', desc: '1 kolide kaç adet ürün var. FO mantığı: koli_ici_adet × palet_ici_koli = palet başına toplam.', tag: 'Ambalaj' },
  { col: 'paleticikoli', desc: '1 paletteki koli sayısı.', tag: 'Ambalaj' },
  { col: 'ean_gtin', desc: 'EAN-13 barkod numarası. Almanya B2B sistemleri için zorunlu.', tag: 'Lojistik' },
  { col: 'haltbarkeit_monate', desc: 'Raf ömrü (ay). FO ürünleri için zorunlu bilgi.', tag: 'Lojistik' },
  { col: 'mindest_bestellmenge / mindest_bestellmenge_einheit', desc: 'Minimum sipariş miktarı ve birimi (Kiste, Palette, Stk.).', tag: 'Lojistik' },
  { col: 'hersteller_name / hersteller_land', desc: 'Üretici firma adı ve ülkesi.', tag: 'Lojistik' },
  { col: 'herkunftsland_de', desc: 'Menşei ülke Almanca. Almanya LMIV gereği.', tag: 'Lojistik' },
  { col: 'vegan / glutenfrei / laktosefrei / bio / ohne_zucker / katkisiz / koruyucusuz / pompa_uyumlu / halal', desc: '1 = Evet, 0 = Hayır. Boş bırakılırsa eski değer korunur.', tag: 'Özellik' },
  { col: 'inhaltsstoffe_de / inhaltsstoffe_tr', desc: 'İçindekiler listesi. Almancası LMIV (AB gıda etiketi mevzuatı) gereği zorunlu.', tag: 'Besin' },
  { col: 'naehrwert_energie_kj / kcal / fett / kohlenhydrate / zucker / eiweiss / salz', desc: '100g başına besin değerleri. Almanya B2B için zorunlu.', tag: 'Besin' },
  { col: 'stok_miktari', desc: 'Mevcut stok miktarını doğrudan günceller. Boşsa değişmez.', tag: 'Stok' },
  { col: 'aktif', desc: '1 = aktif, 0 = pasif. Boşsa değişmez.', tag: 'Durum' },
  { col: 'tedarikci', desc: 'Tedarikçi adı. Sistem fuzzy eşleştirme yapar.', tag: 'Tedarikçi' },
  { col: 'kategori / alt_kategori', desc: 'Kategori adı. Fuzzy eşleştirme yapar; bulunamazsa mevcut kategori korunur.', tag: 'Kategori' },
];

const TAG_COLORS: Record<string, string> = {
  'Eşleştirme': 'bg-violet-100 text-violet-800',
  'İsim': 'bg-sky-100 text-sky-800',
  'Açıklama': 'bg-sky-100 text-sky-800',
  'Fiyat': 'bg-emerald-100 text-emerald-800',
  'Stok': 'bg-amber-100 text-amber-800',
  'Durum': 'bg-slate-100 text-slate-700',
  'Ambalaj': 'bg-rose-100 text-rose-800',
  'Lojistik': 'bg-orange-100 text-orange-800',
  'Özellik': 'bg-teal-100 text-teal-800',
  'Besin': 'bg-purple-100 text-purple-800',
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
            <Link href="/api/admin/fo-import-sablon" target="_blank"
              className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800"
              title="FO ürünleri için hazır şablon (örnek verilerle + açıklama sayfası)">
              <FiDownload size={11} /> XLSX Şablon
            </Link>
            <Link href="/templates/fo-urun-import-sablonu.csv" target="_blank"
              className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600">
              <FiDownload size={11} /> CSV Şablon
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
