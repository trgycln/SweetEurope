'use client';

import React, { useEffect, useState } from 'react';
import { FiLoader } from 'react-icons/fi';
import { formatCurrency } from '@/lib/utils';

interface FirmaPrice {
    firmaId: string;
    firmaUnvan: string;
    fiyat: number;
    isFiyatistisna: boolean;
}

interface AltBayiPrice {
    bayiId: string;
    bayiAd: string;
    fiyat: number;
    isFiyatistisna: boolean;
}

interface Product {
    urunId: string;
    urunAd: any;
    kategoriId: string;
    kategoriAd: string;
    baseFiyat: number;
    firmalaPrices: FirmaPrice[];
    altBayiPrices: AltBayiPrice[];
}

export default function PriceMatrixClient({ locale }: { locale: string }) {
    const [data, setData] = useState<{
        products: Product[];
        firms: any[];
        altBayiler: any[];
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'bestPrice' | 'avgPrice'>('bestPrice');
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [categories, setCategories] = useState<any[]>([]);
    const [productSearch, setProductSearch] = useState<string>('');
    const [selectedFirms, setSelectedFirms] = useState<string[]>([]);
    const [selectedAltBayiler, setSelectedAltBayiler] = useState<string[]>([]);
    const [minPrice, setMinPrice] = useState<number | ''>('');
    const [maxPrice, setMaxPrice] = useState<number | ''>('');
    const [showAnomalies, setShowAnomalies] = useState<boolean>(false);

    useEffect(() => {
        fetchPriceMatrix();
    }, []);

    const fetchPriceMatrix = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/urun-yonetimi/fiyat-matrisi');
            if (!response.ok) {
                throw new Error('Fiyat matrisi yüklenemedi');
            }
            const result = await response.json();
            setData(result);

            // Extract unique categories and normalize to strings
            const catSet = new Set<string>();
            result.products.forEach((p: Product) => {
                if (p.kategoriAd) {
                    const catName = typeof p.kategoriAd === 'object' 
                        ? (p.kategoriAd[locale] || p.kategoriAd.tr || p.kategoriAd.en)
                        : p.kategoriAd;
                    if (catName) {
                        catSet.add(catName);
                    }
                }
            });
            const cats = Array.from(catSet).sort();
            setCategories(cats);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
            console.error('Error fetching price matrix:', err);
        } finally {
            setLoading(false);
        }
    };

    const getProductName = (ad: any) => {
        if (typeof ad === 'object') {
            return ad[locale] || ad.tr || ad.en || JSON.stringify(ad);
        }
        return ad;
    };

    let sortedProducts = data?.products || [];

    // Filter by category
    if (categoryFilter) {
        sortedProducts = sortedProducts.filter(p => {
            const catName = typeof p.kategoriAd === 'object' 
                ? (p.kategoriAd[locale] || p.kategoriAd.tr || p.kategoriAd.en)
                : p.kategoriAd;
            return catName === categoryFilter;
        });
    }

    // Filter by product search (name or code)
    if (productSearch) {
        const searchLower = productSearch.toLowerCase();
        sortedProducts = sortedProducts.filter(p => {
            const name = getProductName(p.urunAd).toLowerCase();
            const id = p.urunId.toLowerCase();
            return name.includes(searchLower) || id.includes(searchLower);
        });
    }

    // Filter by price range
    if (minPrice !== '' || maxPrice !== '') {
        sortedProducts = sortedProducts.filter(p => {
            const allPrices = [...p.firmalaPrices, ...p.altBayiPrices];
            if (allPrices.length === 0) return true;
            const bestPrice = Math.min(...allPrices.map(pr => pr.fiyat));
            if (minPrice !== '' && bestPrice < minPrice) return false;
            if (maxPrice !== '' && bestPrice > maxPrice) return false;
            return true;
        });
    }

    // Filter by selected firms/alt bayiler (only show these columns)
    let visibleFirms = data?.firms || [];
    let visibleAltBayiler = data?.altBayiler || [];
    
    if (selectedFirms.length > 0) {
        visibleFirms = visibleFirms.filter(f => selectedFirms.includes(f.id));
    }
    if (selectedAltBayiler.length > 0) {
        visibleAltBayiler = visibleAltBayiler.filter(b => selectedAltBayiler.includes(b.id));
    }

    // Sort - allPrices includes both firms and altBayiler
    if (sortBy === 'bestPrice') {
        sortedProducts = [...sortedProducts].sort((a, b) => {
            const allA = [...a.firmalaPrices, ...a.altBayiPrices];
            const allB = [...b.firmalaPrices, ...b.altBayiPrices];
            const bestA = allA.length > 0 ? Math.min(...allA.map(p => p.fiyat)) : Infinity;
            const bestB = allB.length > 0 ? Math.min(...allB.map(p => p.fiyat)) : Infinity;
            return bestA - bestB;
        });
    } else if (sortBy === 'avgPrice') {
        sortedProducts = [...sortedProducts].sort((a, b) => {
            const allA = [...a.firmalaPrices, ...a.altBayiPrices];
            const allB = [...b.firmalaPrices, ...b.altBayiPrices];
            const avgA = allA.length > 0 ? allA.reduce((sum, p) => sum + p.fiyat, 0) / allA.length : 0;
            const avgB = allB.length > 0 ? allB.reduce((sum, p) => sum + p.fiyat, 0) / allB.length : 0;
            return avgA - avgB;
        });
    }

    // Calculate statistics for filtered products
    const stats = {
        productCount: sortedProducts.length,
        avgPrice: (() => {
            if (sortedProducts.length === 0) return 0;
            let totalPrice = 0;
            let totalCount = 0;
            sortedProducts.forEach(p => {
                const all = [...p.firmalaPrices, ...p.altBayiPrices];
                if (all.length > 0) {
                    const best = Math.min(...all.map(pr => pr.fiyat));
                    totalPrice += best;
                    totalCount++;
                }
            });
            return totalCount > 0 ? totalPrice / totalCount : 0;
        })(),
        minPrice: (() => {
            if (sortedProducts.length === 0) return 0;
            let minVal = Infinity;
            sortedProducts.forEach(p => {
                const all = [...p.firmalaPrices, ...p.altBayiPrices];
                if (all.length > 0) {
                    const best = Math.min(...all.map(pr => pr.fiyat));
                    minVal = Math.min(minVal, best);
                }
            });
            return minVal === Infinity ? 0 : minVal;
        })(),
        maxPrice: (() => {
            if (sortedProducts.length === 0) return 0;
            let maxVal = 0;
            sortedProducts.forEach(p => {
                const all = [...p.firmalaPrices, ...p.altBayiPrices];
                if (all.length > 0) {
                    const best = Math.min(...all.map(pr => pr.fiyat));
                    maxVal = Math.max(maxVal, best);
                }
            });
            return maxVal;
        })(),
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <FiLoader className="animate-spin text-primary mb-2" size={32} />
                <p className="text-gray-600">Fiyat matrisi yükleniyor...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-semibold">Hata</p>
                <p className="text-red-700 text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                {/* Row 1: Basic Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Kategori Filtresi
                        </label>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                            <option value="">Tümü</option>
                            {categories.map((cat, idx) => (
                                <option key={`cat-${idx}`} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ürün Arama (Ad/Kod)
                        </label>
                        <input
                            type="text"
                            list="ürün-listesi"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Ürün adı veya kodunu yazın..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                        <datalist id="ürün-listesi">
                            {data?.products.map((p) => {
                                const name = getProductName(p.urunAd);
                                return (
                                    <option key={p.urunId} value={name} />
                                );
                            })}
                        </datalist>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Min Fiyat (₺)
                        </label>
                        <input
                            type="number"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            placeholder="Min fiyat"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Fiyat (₺)
                        </label>
                        <input
                            type="number"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            placeholder="Max fiyat"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                    </div>
                </div>

                {/* Row 2: Advanced Filters */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sıralama
                        </label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                            <option value="bestPrice">En İyi Fiyat (Düşükten Yükseğe)</option>
                            <option value="avgPrice">Ortalama Fiyat (Düşükten Yükseğe)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={showAnomalies}
                                onChange={(e) => setShowAnomalies(e.target.checked)}
                                className="rounded"
                            />
                            Anomalileri Vurgula
                        </label>
                        <p className="text-xs text-gray-500">En düşük/yüksek fiyatları göster</p>
                    </div>

                    <div className="flex items-end gap-2">
                        <button
                            onClick={fetchPriceMatrix}
                            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors flex-1"
                        >
                            Yenile
                        </button>
                        <button
                            onClick={() => {
                                setCategoryFilter('');
                                setProductSearch('');
                                setSelectedFirms([]);
                                setSelectedAltBayiler([]);
                                setMinPrice('');
                                setMaxPrice('');
                                setShowAnomalies(false);
                            }}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                        >
                            Sıfırla
                        </button>
                    </div>
                </div>

                {/* Row 3: Firma Selection */}
                {data?.firms && data.firms.length > 0 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Firmalar ({selectedFirms.length} seçili)
                        </label>
                        <select
                            multiple
                            value={selectedFirms}
                            onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, option => option.value);
                                setSelectedFirms(selected);
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-24"
                            size={Math.min(6, data.firms.length)}
                        >
                            {data.firms.map((firma) => (
                                <option key={firma.id} value={firma.id}>
                                    {firma.unvan}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Ctrl+Click (Cmd+Click) ile birden fazla seçin</p>
                    </div>
                )}

                {/* Row 4: Alt Bayiler Selection */}
                {data?.altBayiler && data.altBayiler.length > 0 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Alt Bayiler ({selectedAltBayiler.length} seçili)
                        </label>
                        <select
                            multiple
                            value={selectedAltBayiler}
                            onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, option => option.value);
                                setSelectedAltBayiler(selected);
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-24"
                            size={Math.min(6, data.altBayiler.length)}
                        >
                            {data.altBayiler.map((bayi) => (
                                <option key={bayi.id} value={bayi.id}>
                                    {bayi.tam_ad}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Ctrl+Click (Cmd+Click) ile birden fazla seçin</p>
                    </div>
                )}
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-600">Ürün Sayısı</p>
                    <p className="text-3xl font-bold text-blue-700">{stats.productCount}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-600">Ortalama Fiyat</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(stats.avgPrice, locale as any)}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-600">En Düşük Fiyat</p>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.minPrice, locale as any)}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-600">En Yüksek Fiyat</p>
                    <p className="text-2xl font-bold text-red-700">{formatCurrency(stats.maxPrice, locale as any)}</p>
                </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b-2 border-gray-300">
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase sticky left-0 bg-gray-50 z-20 border-r-2 border-gray-300">
                                Ürün
                            </th>
                            {/* Firmalar (Distributors) */}
                            {visibleFirms.map((firma, idx) => (
                                <th
                                    key={`firma-${firma.id}`}
                                    className={`px-2 py-0 text-center text-xs font-bold sticky top-0 z-20 border-r border-gray-200 h-56 ${
                                        idx % 2 === 0 ? 'bg-blue-50' : 'bg-slate-50'
                                    }`}
                                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                                >
                                    <div className="flex items-center justify-center h-full px-1 pt-4">
                                        <span className="text-gray-700 font-semibold text-xs">{firma.unvan}</span>
                                    </div>
                                </th>
                            ))}
                            {/* Alt Bayiler (Sub-dealers) */}
                            {visibleAltBayiler && visibleAltBayiler.length > 0 && (
                                <>
                                    {visibleAltBayiler.map((bayi, idx) => (
                                        <th
                                            key={`bayi-${bayi.id}`}
                                            className={`px-2 py-0 text-center text-xs font-bold sticky top-0 z-20 border-r border-gray-200 h-56 ${
                                                idx % 2 === 0 ? 'bg-amber-50' : 'bg-yellow-50'
                                            }`}
                                            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                                        >
                                            <div className="flex items-center justify-center h-full px-1 pt-4">
                                                <span className="text-gray-700 font-semibold text-xs">{bayi.tam_ad}</span>
                                            </div>
                                        </th>
                                    ))}
                                </>
                            )}
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase whitespace-nowrap sticky top-0 z-20 bg-green-50 border-l-2 border-gray-300">
                                En İyi ✓
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase whitespace-nowrap sticky top-0 z-20 bg-orange-50">
                                Ort. Fiyat
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedProducts.map((product, rowIdx) => {
                            // Filter prices by selected firms
                            const filteredFirmaPrices = product.firmalaPrices.filter(fp =>
                                selectedFirms.length === 0 || selectedFirms.includes(fp.firmaId)
                            );
                            const filteredAltBayiPrices = product.altBayiPrices.filter(ab =>
                                selectedAltBayiler.length === 0 || selectedAltBayiler.includes(ab.bayiId)
                            );

                            const displayPrices = selectedFirms.length > 0 || selectedAltBayiler.length > 0
                                ? [...filteredFirmaPrices, ...filteredAltBayiPrices]
                                : [...product.firmalaPrices, ...product.altBayiPrices];

                            if (displayPrices.length === 0 && (selectedFirms.length > 0 || selectedAltBayiler.length > 0)) {
                                return null;
                            }

                            const allPrices = selectedFirms.length > 0 || selectedAltBayiler.length > 0
                                ? displayPrices
                                : [...product.firmalaPrices, ...product.altBayiPrices];
                            
                            const bestPrice = allPrices.length > 0 ? Math.min(...allPrices.map(p => p.fiyat)) : 0;
                            const avgPrice = allPrices.length > 0 ? allPrices.reduce((sum, p) => sum + p.fiyat, 0) / allPrices.length : 0;

                            // Find highest price for anomaly highlighting
                            const highestPrice = allPrices.length > 0 ? Math.max(...allPrices.map(p => p.fiyat)) : 0;

                            return (
                                <tr
                                    key={product.urunId}
                                    className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 z-10 border-r-2 border-gray-300 bg-inherit">
                                        {getProductName(product.urunAd)}
                                    </td>
                                    {/* Firma fiyatları */}
                                    {visibleFirms.map((firma, colIdx) => {
                                        const fp = product.firmalaPrices.find(f => f.firmaId === firma.id);
                                        return (
                                            <td
                                                key={`firma-${firma.id}`}
                                                className={`px-4 py-4 text-center text-sm font-medium whitespace-nowrap border-r border-gray-200 ${
                                                    colIdx % 2 === 0 ? 'bg-blue-50/30' : 'bg-slate-50/30'
                                                } ${
                                                    fp && fp.fiyat === bestPrice
                                                        ? 'bg-green-100 text-green-900 font-bold'
                                                        : ''
                                                } ${
                                                    showAnomalies && fp && fp.fiyat === highestPrice && fp.fiyat !== bestPrice
                                                        ? 'bg-red-100 text-red-900 border-red-300'
                                                        : ''
                                                }`}
                                            >
                                                {fp ? (
                                                    <>
                                                        {fp.isFiyatistisna && (
                                                            <span className="inline-block mr-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                                İST
                                                            </span>
                                                        )}
                                                        {formatCurrency(fp.fiyat, locale as any)}
                                                    </>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    {/* Alt bayi fiyatları */}
                                    {visibleAltBayiler.map((bayi, colIdx) => {
                                        const ab = product.altBayiPrices.find(a => a.bayiId === bayi.id);
                                        return (
                                            <td
                                                key={`bayi-${bayi.id}`}
                                                className={`px-4 py-4 text-center text-sm font-medium whitespace-nowrap border-r border-gray-200 ${
                                                    colIdx % 2 === 0 ? 'bg-amber-50/30' : 'bg-yellow-50/30'
                                                } ${
                                                    ab && ab.fiyat === bestPrice
                                                        ? 'bg-green-100 text-green-900 font-bold'
                                                        : ''
                                                } ${
                                                    showAnomalies && ab && ab.fiyat === highestPrice && ab.fiyat !== bestPrice
                                                        ? 'bg-red-100 text-red-900 border-red-300'
                                                        : ''
                                                }`}
                                            >
                                                {ab ? (
                                                    <>
                                                        {ab.isFiyatistisna && (
                                                            <span className="inline-block mr-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                                İST
                                                            </span>
                                                        )}
                                                        {formatCurrency(ab.fiyat, locale as any)}
                                                    </>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="px-4 py-4 text-center text-sm font-bold text-green-700 bg-green-50 border-l-2 border-gray-300">
                                        {formatCurrency(bestPrice, locale as any)}
                                    </td>
                                    <td className="px-4 py-4 text-center text-sm text-gray-600 bg-orange-50">
                                        {formatCurrency(avgPrice, locale as any)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-600">Gösterilen Ürün</p>
                    <p className="text-3xl font-bold text-blue-700">{sortedProducts.length}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-600">Firmalar</p>
                    <p className="text-3xl font-bold text-blue-700">{visibleFirms.length}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-600">Alt Bayiler</p>
                    <p className="text-3xl font-bold text-amber-700">{visibleAltBayiler.length}</p>
                </div>
            </div>

            {/* Legend */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Açıklama:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-100 border border-green-700 rounded"></div>
                        <span>En iyi fiyat</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-100 border border-red-700 rounded"></div>
                        <span>En yüksek fiyat</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                            İST
                        </span>
                        <span>İstisna fiyatı</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
                        <span>Firmalar</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-amber-50 border border-amber-200 rounded"></div>
                        <span>Alt Bayiler</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400">-</span>
                        <span>Veri yok</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

