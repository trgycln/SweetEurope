'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

interface UrunFiltreProps {
  kategoriler: Array<{ id: string; ad: any; ust_kategori_id?: string | null }>;
  locale: string;
  labels: {
    searchPlaceholder: string;
    searchButton: string;
    filterLabel: string;
    allCategories: string;
    allStatuses: string;
    allStocks: string;
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
    };
  };
}

export function UrunFiltre({ kategoriler, locale, labels }: UrunFiltreProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const selectedCategory = searchParams.get('kategori') || '';
  const selectedStatus = searchParams.get('durum') || '';
  const selectedStok = searchParams.get('stok') || '';

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) { params.set(key, value); } else { params.delete(key); }
    params.delete('page');
    startTransition(() => { router.push(`${pathname}?${params.toString()}`); });
  };

  const clearFilters = () => {
    setSearchQuery('');
    startTransition(() => { router.push(pathname); });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters('q', searchQuery);
  };

  const hasActiveFilters = searchQuery || selectedCategory || selectedStatus || selectedStok;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form onSubmit={handleSearch} className="flex items-center gap-1">
        <div className="relative">
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="w-52 pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>
        <button type="submit" disabled={isPending}
          className="px-3 py-1.5 bg-slate-900 text-white rounded-md text-sm font-medium disabled:opacity-50">
          {labels.searchButton}
        </button>
      </form>

      <select value={selectedCategory} onChange={(e) => updateFilters('kategori', e.target.value)}
        className="rounded-md border border-slate-200 px-2 py-1.5 text-sm" disabled={isPending}>
        <option value="">{labels.allCategories}</option>
        {kategoriler.filter(k => !k.ust_kategori_id).map(k => (
          <option key={k.id} value={k.id}>{k.ad?.[locale] || k.ad?.de || '?'}</option>
        ))}
      </select>

      <select value={selectedStatus} onChange={(e) => updateFilters('durum', e.target.value)}
        className="rounded-md border border-slate-200 px-2 py-1.5 text-sm" disabled={isPending}>
        <option value="">{labels.allStatuses}</option>
        <option value="aktif">{labels.statusActiveLabel}</option>
        <option value="pasif">{labels.statusInactiveLabel}</option>
      </select>

      <select value={selectedStok} onChange={(e) => updateFilters('stok', e.target.value)}
        className="rounded-md border border-slate-200 px-2 py-1.5 text-sm" disabled={isPending}>
        <option value="">{labels.allStocks}</option>
        <option value="kritisch">{labels.stockCriticalLabel}</option>
        <option value="aufgebraucht">{labels.stockOutLabel}</option>
        <option value="ausreichend">{labels.stockSufficientLabel}</option>
      </select>

      {hasActiveFilters && (
        <button onClick={clearFilters} disabled={isPending}
          className="flex items-center gap-1 px-2 py-1.5 text-sm text-slate-600 hover:text-red-600 rounded-md border border-slate-200 hover:border-red-200">
          <FiX className="w-3.5 h-3.5" />
          {labels.clearFilters}
        </button>
      )}
      {isPending && <span className="text-xs text-slate-400 ml-1">yükleniyor...</span>}
    </div>
  );
}
