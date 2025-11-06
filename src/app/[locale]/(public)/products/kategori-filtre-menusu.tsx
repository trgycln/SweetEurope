// src/app/[locale]/products/kategori-filtre-menusu.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiChevronRight, FiCheck, FiFolder, FiFile } from 'react-icons/fi';
import { type Kategori } from './types';

interface KategoriFiltreMenusuProps {
    kategoriler: Kategori[];
    locale: string;
    seciliSlug?: string;
    varsayilanAcikKategoriId?: string; 
    dictionary: {
        filterTitle: string;
        allProducts: string;
    };
    categoryProductCounts: Record<string, number>;
    totalProductCount: number;
}

export function KategoriFiltreMenusu({ 
    kategoriler, 
    locale, 
    seciliSlug, 
    varsayilanAcikKategoriId, 
    dictionary,
    categoryProductCounts,
    totalProductCount
}: KategoriFiltreMenusuProps) {
    
    const [acikKategoriler, setAcikKategoriler] = useState<string[]>(
        varsayilanAcikKategoriId ? [varsayilanAcikKategoriId] : []
    );

    const toggleKategori = (kategoriId: string) => {
        setAcikKategoriler(prev => 
            prev.includes(kategoriId) ? prev.filter(id => id !== kategoriId) : [...prev, kategoriId]
        );
    };

    const anaKategoriler = kategoriler.filter(k => !k.ust_kategori_id);

    return (
        <div className="space-y-1">
            {/* All Products - Elegant */}
            <Link 
                href={`/${locale}/products`} 
                className={`group flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    !seciliSlug 
                        ? 'bg-accent text-white shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-accent'
                }`}
            >
                <div className={`flex items-center justify-center w-5 h-5 rounded transition-colors ${
                    !seciliSlug ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-accent/10'
                }`}>
                    {!seciliSlug && <FiCheck className="w-3 h-3" />}
                </div>
                <span className="flex-grow text-sm">{dictionary.allProducts}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    !seciliSlug ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                    {totalProductCount}
                </span>
            </Link>

            <div className="h-px bg-gray-100 my-3"></div>

            {/* Categories - Modern Tree View */}
            <div className="space-y-0.5">
                {anaKategoriler.map(anaKategori => {
                    if (!anaKategori.slug) return null;

                    const altKategoriler = kategoriler.filter(k => k.ust_kategori_id === anaKategori.id);
                    const isAcik = acikKategoriler.includes(anaKategori.id);
                    const isAktif = seciliSlug === anaKategori.slug;
                    const kategoriAdi = anaKategori.ad?.[locale] || anaKategori.ad?.['de'];
                    const productCount = categoryProductCounts[anaKategori.id] || 0;
                    
                    if (altKategoriler.length === 0) {
                        // Simple Category (No Children)
                        return (
                            <Link 
                                key={anaKategori.id}
                                href={`/${locale}/products?kategori=${anaKategori.slug}`} 
                                className={`group flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                                    isAktif 
                                        ? 'bg-accent text-white shadow-sm' 
                                        : 'text-gray-700 hover:bg-gray-50 hover:text-accent'
                                }`}
                            >
                                <div className={`flex items-center justify-center w-5 h-5 rounded transition-colors ${
                                    isAktif ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-accent/10'
                                }`}>
                                    {isAktif ? <FiCheck className="w-3 h-3" /> : <FiFile className="w-3 h-3 text-gray-400 group-hover:text-accent" />}
                                </div>
                                <span className="flex-grow text-sm">{kategoriAdi}</span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                    isAktif ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                                }`}>
                                    {productCount}
                                </span>
                            </Link>
                        );
                    }
                    
                    // Parent Category (With Children)
                    return (
                        <div key={anaKategori.id} className="space-y-0.5">
                            <div className="flex items-stretch gap-0.5">
                                <Link 
                                    href={`/${locale}/products?kategori=${anaKategori.slug}`} 
                                    className={`group flex items-center gap-3 px-4 py-3 rounded-l-lg font-medium transition-all duration-200 flex-grow ${
                                        isAktif 
                                            ? 'bg-accent text-white shadow-sm' 
                                            : 'text-gray-700 hover:bg-gray-50 hover:text-accent'
                                    }`}
                                >
                                    <div className={`flex items-center justify-center w-5 h-5 rounded transition-colors ${
                                        isAktif ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-accent/10'
                                    }`}>
                                        {isAktif ? <FiCheck className="w-3 h-3" /> : <FiFolder className="w-3 h-3 text-gray-400 group-hover:text-accent" />}
                                    </div>
                                    <span className="flex-grow text-sm">{kategoriAdi}</span>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                        isAktif ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {productCount}
                                    </span>
                                </Link>
                                <button 
                                    onClick={() => toggleKategori(anaKategori.id)} 
                                    className={`w-10 rounded-r-lg transition-all duration-200 flex items-center justify-center ${
                                        isAktif 
                                            ? 'bg-accent text-white hover:bg-accent/90' 
                                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-accent'
                                    }`}
                                    aria-label="Toggle subcategories"
                                >
                                    <FiChevronRight 
                                        className={`w-4 h-4 transform transition-transform duration-200 ${
                                            isAcik ? 'rotate-90' : ''
                                        }`} 
                                    />
                                </button>
                            </div>

                            {/* Subcategories */}
                            <div 
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                    isAcik ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                                }`}
                            >
                                <div className="pl-8 pt-0.5 space-y-0.5 border-l-2 border-gray-100 ml-4">
                                    {altKategoriler.map(altKategori => {
                                        if (!altKategori.slug) return null;
                                        const isAltAktif = seciliSlug === altKategori.slug;
                                        const altKategoriAdi = altKategori.ad?.[locale] || altKategori.ad?.['de'];
                                        const altProductCount = categoryProductCounts[altKategori.id] || 0;
                                        
                                        return (
                                            <Link 
                                                key={altKategori.id}
                                                href={`/${locale}/products?kategori=${altKategori.slug}`} 
                                                className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                                                    isAltAktif 
                                                        ? 'bg-accent/10 text-accent border border-accent/20' 
                                                        : 'text-gray-600 hover:bg-gray-50 hover:text-accent'
                                                }`}
                                            >
                                                <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                                    isAltAktif ? 'bg-accent' : 'bg-gray-300 group-hover:bg-accent'
                                                }`} />
                                                <span className="flex-grow">{altKategoriAdi}</span>
                                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                                                    isAltAktif ? 'bg-accent/20 text-accent' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {altProductCount}
                                                </span>
                                                {isAltAktif && (
                                                    <FiCheck className="w-3.5 h-3.5 text-accent" />
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}