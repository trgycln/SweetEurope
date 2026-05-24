'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { FiSearch, FiX, FiLoader } from 'react-icons/fi';

interface UrunFiltreProps {
  kategoriler: Array<{ id: string; ad: any; ust_kategori_id?: string | null }>;
  tedarikciler: Array<{ id: string; unvan: string | null }>;
  urunGamiOptions: string[];
  locale: string;
  labels: {
    searchPlaceholder: string;
    searchButton: string;
    filterLabel: string;
    allCategories: string;
    allStatuses: string;
    allStocks: string;
    allSuppliers: string;
    allProductLines: string;
    allLogistics: string;
    allFeatures: string;
    statusActiveLabel: string;
    statusInactiveLabel: string;
    stockCriticalLabel: string;
    stockOutLabel: string;
    stockSufficientLabel: string;
    clearFilters: string;
    active: {
      searchPrefix: string;
      categoryFiltered: string;
      statusPrefix: string;
      stockPrefix: string;
      supplierPrefix: string;
      productLinePrefix: string;
      logisticsPrefix: string;
      featurePrefix: string;
    };
  };
}

export function UrunFiltre({
  kategoriler,
  tedarikciler,
  urunGamiOptions,
  locale,
  labels,
}: UrunFiltreProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const selectedCategory = searchParams.get('kategori') || '';
  const selectedStatus = searchParams.get('durum') || '';
  const selectedStok = searchParams.get('stok') || '';
  const selectedTedarikci = searchParams.get('tedarikci') || '';
  const selectedUrunGami = searchParams.get('urun_gami') || '';
  const selectedLojistik = searchParams.get('lojistik') || '';
  const selectedOzellik = searchParams.get('ozellik') || '';

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    startTransition(() => {
      router.push(pathname);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters('q', searchQuery);
  };

  // Build active filter chips
  const activeChips: Array<{ key: string; label: string; value: string }> = [];
  if (searchQuery)
    activeChips.push({
      key: 'q',
      label: `${labels.active.searchPrefix} ${searchQuery}`,
      value: searchQuery,
    });
  if (selectedCategory) {
    // Build full path for the chip label
    const buildPath = (id: string): string => {
      const parts: string[] = [];
      let cur = kategoriler.find((k) => k.id === id);
      let guard = 0;
      while (cur && guard++ < 10) {
        parts.unshift(cur.ad?.[locale] || cur.ad?.de || '?');
        cur = cur.ust_kategori_id ? kategoriler.find((k) => k.id === cur!.ust_kategori_id) : undefined;
      }
      return parts.join(' / ') || id;
    };
    activeChips.push({
      key: 'kategori',
      label: `${labels.active.categoryFiltered}: ${buildPath(selectedCategory)}`,
      value: selectedCategory,
    });
  }
  if (selectedStatus)
    activeChips.push({
      key: 'durum',
      label: `${labels.active.statusPrefix} ${
        selectedStatus === 'aktif'
          ? labels.statusActiveLabel
          : labels.statusInactiveLabel
      }`,
      value: selectedStatus,
    });
  if (selectedStok) {
    let stokLabel = selectedStok;
    if (selectedStok === 'kritisch') stokLabel = labels.stockCriticalLabel;
    else if (selectedStok === 'aufgebraucht')
      stokLabel = labels.stockOutLabel;
    else if (selectedStok === 'ausreichend')
      stokLabel = labels.stockSufficientLabel;
    activeChips.push({
      key: 'stok',
      label: `${labels.active.stockPrefix} ${stokLabel}`,
      value: selectedStok,
    });
  }
  if (selectedTedarikci) {
    const supplierName =
      tedarikciler.find((t) => t.id === selectedTedarikci)?.unvan ||
      selectedTedarikci;
    activeChips.push({
      key: 'tedarikci',
      label: `${labels.active.supplierPrefix} ${supplierName}`,
      value: selectedTedarikci,
    });
  }
  if (selectedUrunGami) {
    const gamDisplayLabels: Record<string, string> = {
      barista: 'Barista & Bar',
      dondurma: 'Eis & Gelato',
      pastaci: 'Konditorei & Bäckerei',
      icecek: 'Getränke',
    };
    activeChips.push({
      key: 'urun_gami',
      label: `${labels.active.productLinePrefix} ${gamDisplayLabels[selectedUrunGami] ?? selectedUrunGami}`,
      value: selectedUrunGami,
    });
  }
  if (selectedLojistik) {
    let logLabel = selectedLojistik;
    if (selectedLojistik === 'tiefkühl') logLabel = 'Tiefkühl';
    else if (selectedLojistik === 'standart') logLabel = 'Standart';
    activeChips.push({
      key: 'lojistik',
      label: `${labels.active.logisticsPrefix} ${logLabel}`,
      value: selectedLojistik,
    });
  }
  if (selectedOzellik) {
    let featureLabel = selectedOzellik;
    if (selectedOzellik === 'vegan') featureLabel = 'Vegan';
    else if (selectedOzellik === 'glutenfrei') featureLabel = 'Glutensiz';
    else if (selectedOzellik === 'laktosefrei') featureLabel = 'Laktozsuz';
    else if (selectedOzellik === 'bio') featureLabel = 'Bio / Organik';
    else if (selectedOzellik === 'ohne_zucker') featureLabel = 'Şekersiz';
    activeChips.push({
      key: 'ozellik',
      label: `${labels.active.featurePrefix} ${featureLabel}`,
      value: selectedOzellik,
    });
  }

  const hasActiveFilters = activeChips.length > 0;

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Row 1: all filter controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-1">
          <div className="relative">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={labels.searchPlaceholder}
              className="w-52 pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              disabled={isPending}
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="px-3 py-1.5 bg-slate-900 text-white rounded-md text-sm font-medium disabled:opacity-50 flex items-center gap-1"
          >
            {isPending ? (
              <FiLoader className="animate-spin w-4 h-4" />
            ) : (
              labels.searchButton
            )}
          </button>
        </form>

        {/* Kategori — depth-first tree order */}
        <select
          value={selectedCategory}
          onChange={(e) => updateFilters('kategori', e.target.value)}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
          disabled={isPending}
        >
          <option value="">{labels.allCategories}</option>
          {(() => {
            const opts: React.ReactElement[] = [];
            const walk = (parentId: string | null, depth: number) => {
              kategoriler
                .filter((k) => (k.ust_kategori_id ?? null) === parentId)
                .forEach((k) => {
                  const name = k.ad?.[locale] || k.ad?.de || '?';
                  const indent = depth > 0 ? '  '.repeat(depth * 2) + '└ ' : '';
                  opts.push(
                    <option key={k.id} value={k.id}>
                      {indent}{name}
                    </option>
                  );
                  walk(k.id, depth + 1);
                });
            };
            walk(null, 0);
            return opts;
          })()}
        </select>

        {/* Durum */}
        <select
          value={selectedStatus}
          onChange={(e) => updateFilters('durum', e.target.value)}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
          disabled={isPending}
        >
          <option value="">{labels.allStatuses}</option>
          <option value="aktif">{labels.statusActiveLabel}</option>
          <option value="pasif">{labels.statusInactiveLabel}</option>
        </select>

        {/* Stok */}
        <select
          value={selectedStok}
          onChange={(e) => updateFilters('stok', e.target.value)}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
          disabled={isPending}
        >
          <option value="">{labels.allStocks}</option>
          <option value="kritisch">{labels.stockCriticalLabel}</option>
          <option value="aufgebraucht">{labels.stockOutLabel}</option>
          <option value="ausreichend">{labels.stockSufficientLabel}</option>
        </select>

        {/* Tedarikçi */}
        <select
          value={selectedTedarikci}
          onChange={(e) => updateFilters('tedarikci', e.target.value)}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
          disabled={isPending}
        >
          <option value="">{labels.allSuppliers}</option>
          {tedarikciler.map((t) => (
            <option key={t.id} value={t.id}>
              {t.unvan || t.id}
            </option>
          ))}
        </select>

        {/* Ürün Gamı */}
        <select
          value={selectedUrunGami}
          onChange={(e) => updateFilters('urun_gami', e.target.value)}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
          disabled={isPending}
        >
          <option value="">{labels.allProductLines}</option>
          <option value="barista">Barista &amp; Bar</option>
          <option value="dondurma">Eis &amp; Gelato</option>
          <option value="pastaci">Konditorei &amp; Bäckerei</option>
          <option value="icecek">Getränke</option>
          {urunGamiOptions
            .filter((g) => !['barista', 'dondurma', 'pastaci', 'icecek'].includes(g))
            .map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
        </select>

        {/* Lojistik Sınıfı */}
        <select
          value={selectedLojistik}
          onChange={(e) => updateFilters('lojistik', e.target.value)}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
          disabled={isPending}
        >
          <option value="">{labels.allLogistics}</option>
          <option value="tiefkühl">Tiefkühl</option>
          <option value="standart">Standart</option>
        </select>

        {/* Özellik */}
        <select
          value={selectedOzellik}
          onChange={(e) => updateFilters('ozellik', e.target.value)}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
          disabled={isPending}
        >
          <option value="">{labels.allFeatures}</option>
          <option value="vegan">Vegan</option>
          <option value="glutenfrei">Glutensiz</option>
          <option value="laktosefrei">Laktozsuz</option>
          <option value="bio">Bio / Organik</option>
          <option value="ohne_zucker">Şekersiz</option>
        </select>

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            disabled={isPending}
            className="flex items-center gap-1 px-2 py-1.5 text-sm text-slate-600 hover:text-red-600 rounded-md border border-slate-200 hover:border-red-200"
          >
            <FiX className="w-3.5 h-3.5" />
            {labels.clearFilters}
          </button>
        )}
      </div>

      {/* Row 2: active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium"
            >
              {chip.label}
              <button
                onClick={() => updateFilters(chip.key, '')}
                className="hover:text-red-500 ml-0.5"
                disabled={isPending}
                type="button"
              >
                <FiX className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
