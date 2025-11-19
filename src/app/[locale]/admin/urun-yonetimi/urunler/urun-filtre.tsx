'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { FiSearch, FiFilter, FiX } from 'react-icons/fi';

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
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // Reset to page 1 when filters change
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

  const hasActiveFilters = searchQuery || selectedCategory || selectedStatus || selectedStok;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium disabled:opacity-50"
        >
          {labels.searchButton}
        </button>
      </form>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <FiFilter className="w-4 h-4" />
          <span className="text-sm">{labels.filterLabel}</span>
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => updateFilters('kategori', e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm"
          disabled={isPending}
        >
          <option value="">{labels.allCategories}</option>
          {kategoriler
            .filter(k => !k.ust_kategori_id)
            .map(k => (
              <option key={k.id} value={k.id}>
                {k.ad?.[locale] || k.ad?.de || 'Unbekannt'}
              </option>
            ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => updateFilters('durum', e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm"
          disabled={isPending}
        >
          <option value="">{labels.allStatuses}</option>
          <option value="aktif">{labels.statusActiveLabel}</option>
          <option value="pasif">{labels.statusInactiveLabel}</option>
        </select>

        {/* Stock Filter */}
        <select
          value={selectedStok}
          onChange={(e) => updateFilters('stok', e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm"
          disabled={isPending}
        >
          <option value="">{labels.allStocks}</option>
          <option value="kritisch">{labels.stockCriticalLabel}</option>
          <option value="aufgebraucht">{labels.stockOutLabel}</option>
          <option value="ausreichend">{labels.stockSufficientLabel}</option>
        </select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            disabled={isPending}
          >
            <FiX className="w-4 h-4" />
            {labels.clearFilters}
          </button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          {searchQuery && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent rounded-full text-sm">
              {labels.active.searchPrefix} "{searchQuery}"
            </span>
          )}
          {selectedCategory && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
              {labels.active.categoryFiltered}
            </span>
          )}
          {selectedStatus && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
              {labels.active.statusPrefix} {selectedStatus === 'aktif' ? labels.statusActiveLabel : labels.statusInactiveLabel}
            </span>
          )}
          {selectedStok && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm">
              {labels.active.stockPrefix} {selectedStok === 'kritisch' ? labels.stockCriticalLabel : selectedStok === 'aufgebraucht' ? labels.stockOutLabel : labels.stockSufficientLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
