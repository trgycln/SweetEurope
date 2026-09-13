'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { FiSearch, FiX, FiLoader } from 'react-icons/fi';
import { CategoryFilterSelect } from '@/components/categories/CategoryFilterSelect';

interface UrunFiltreProps {
  kategoriler: Array<{ id: string; ad: any; ust_kategori_id?: string | null }>;
  tedarikciler: Array<{ id: string; unvan: string | null }>;
  urunGamiOptions: string[];
  locale: string;
  featuredCount?: number;
  bestsellerCount?: number;
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
    allShowcase?: string;
    showcaseFeatured?: string;
    showcaseBestseller?: string;
    showcaseBoth?: string;
    showcaseStandard?: string;
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
      showcasePrefix?: string;
    };
  };
}

export function UrunFiltre({
  kategoriler,
  tedarikciler,
  urunGamiOptions,
  locale,
  featuredCount,
  bestsellerCount,
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
  const selectedVitrin = searchParams.get('vitrin') || '';

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
  const isOnerilenSelected = selectedVitrin === 'onerilen' || selectedVitrin === 'featured';
  const isBestsellerSelected = selectedVitrin === 'bestseller';
  const isVitrinSelected = selectedVitrin === 'vitrin' || selectedVitrin === 'hepsi' || selectedVitrin === 'all_showcase';

  if (selectedVitrin) {
    let vitrinLabel = selectedVitrin;
    if (isOnerilenSelected) vitrinLabel = `⭐ ${labels.showcaseFeatured || 'Önerilen Ürünler'}`;
    else if (isBestsellerSelected) vitrinLabel = `🏆 ${labels.showcaseBestseller || 'Bestseller'}`;
    else if (isVitrinSelected) vitrinLabel = `⭐+🏆 ${labels.showcaseBoth || 'Önerilen & Bestseller'}`;
    else if (selectedVitrin === 'standart') vitrinLabel = `⚪ ${labels.showcaseStandard || 'Standart'}`;
    activeChips.push({
      key: 'vitrin',
      label: `${labels.active.showcasePrefix || 'Vitrin:'} ${vitrinLabel}`,
      value: selectedVitrin,
    });
  }

  const hasActiveFilters = activeChips.length > 0;

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Quick Showcase Pills / Hızlı Vitrin Sekmeleri */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
          {labels.active.showcasePrefix || 'Vitrin:'}
        </span>
        <button
          type="button"
          onClick={() => updateFilters('vitrin', '')}
          disabled={isPending}
          className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
            !selectedVitrin
              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          Tüm Ürünler
        </button>

        <button
          type="button"
          onClick={() => updateFilters('vitrin', isOnerilenSelected ? '' : 'onerilen')}
          disabled={isPending}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
            isOnerilenSelected
              ? 'bg-amber-500 text-white border-amber-500 shadow-2xs ring-2 ring-amber-200 font-bold'
              : 'bg-amber-50/80 text-amber-900 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
          }`}
        >
          <span>⭐</span>
          <span>{labels.showcaseFeatured || 'Önerilen Ürünler'}</span>
          {featuredCount !== undefined && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              isOnerilenSelected ? 'bg-amber-600 text-white' : 'bg-amber-200/90 text-amber-900'
            }`}>
              {featuredCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => updateFilters('vitrin', isBestsellerSelected ? '' : 'bestseller')}
          disabled={isPending}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
            isBestsellerSelected
              ? 'bg-orange-500 text-white border-orange-500 shadow-2xs ring-2 ring-orange-200 font-bold'
              : 'bg-orange-50/80 text-orange-900 border-orange-200 hover:bg-orange-100 hover:border-orange-300'
          }`}
        >
          <span>🏆</span>
          <span>{labels.showcaseBestseller || 'Bestseller'}</span>
          {bestsellerCount !== undefined && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              isBestsellerSelected ? 'bg-orange-600 text-white' : 'bg-orange-200/90 text-orange-900'
            }`}>
              {bestsellerCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => updateFilters('vitrin', isVitrinSelected ? '' : 'vitrin')}
          disabled={isPending}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
            isVitrinSelected
              ? 'bg-violet-600 text-white border-violet-600 shadow-2xs font-bold'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <span>⭐+🏆</span>
          <span>{labels.showcaseBoth || 'Önerilen & Bestseller'}</span>
        </button>
      </div>

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

        {/* Vitrin Dropdown */}
        <select
          value={isOnerilenSelected ? 'onerilen' : isBestsellerSelected ? 'bestseller' : isVitrinSelected ? 'vitrin' : selectedVitrin}
          onChange={(e) => updateFilters('vitrin', e.target.value)}
          className={`rounded-md border px-2 py-1.5 text-sm font-medium transition ${
            selectedVitrin ? 'border-amber-400 bg-amber-50/60 text-amber-950 font-semibold' : 'border-slate-200'
          }`}
          disabled={isPending}
        >
          <option value="">{labels.allShowcase || 'Vitrin Durumu (Tümü)'}</option>
          <option value="onerilen">⭐ {labels.showcaseFeatured || 'Önerilen Ürünler (Empfohlen)'} {featuredCount !== undefined ? `(${featuredCount})` : ''}</option>
          <option value="bestseller">🏆 {labels.showcaseBestseller || 'Bestseller (Çok Satanlar)'} {bestsellerCount !== undefined ? `(${bestsellerCount})` : ''}</option>
          <option value="vitrin">⭐+🏆 {labels.showcaseBoth || 'Önerilen veya Bestseller'}</option>
          <option value="standart">⚪ {labels.showcaseStandard || 'Standart (İşaretsiz)'}</option>
        </select>

        {/* Kategori — Unified CategoryFilterSelect */}
        <CategoryFilterSelect
          categories={kategoriler}
          value={selectedCategory}
          onChange={(val) => updateFilters('kategori', val)}
          locale={locale}
          allCategoriesLabel={labels.allCategories}
          disabled={isPending}
          showCounts={false}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
        />

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
            .filter((g) => typeof g === 'string' && g.trim().length > 0 && !['barista', 'dondurma', 'pastaci', 'icecek'].includes(g))
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
