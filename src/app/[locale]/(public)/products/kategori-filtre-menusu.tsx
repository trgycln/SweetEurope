// src/app/[locale]/products/kategori-filtre-menusu.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiChevronDown, FiCheckCircle, FiCircle } from 'react-icons/fi';
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
}

export function KategoriFiltreMenusu({ 
    kategoriler, 
    locale, 
    seciliSlug, 
    varsayilanAcikKategoriId, 
    dictionary 
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
        <div className="space-y-2">
            {/* All Products Button */}
            <Link 
                href={`/${locale}/products`} 
                className={`flex items-center gap-3 p-4 rounded-xl font-semibold transition-all duration-300 ${
                    !seciliSlug 
                        ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg transform scale-105' 
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-md'
                }`}
            >
                {!seciliSlug ? (
                    <FiCheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                    <FiCircle className="w-5 h-5 flex-shrink-0 text-gray-400" />
                )}
                <span className="flex-grow">{dictionary.allProducts}</span>
                {!seciliSlug && (
                    <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-bold">✓</span>
                )}
            </Link>

            {/* Category List */}
            <div className="space-y-1">
                {anaKategoriler.map(anaKategori => {
                    if (!anaKategori.slug) return null;

                    const altKategoriler = kategoriler.filter(k => k.ust_kategori_id === anaKategori.id);
                    const isAcik = acikKategoriler.includes(anaKategori.id);
                    const isAktif = seciliSlug === anaKategori.slug;
                    
                    if (altKategoriler.length === 0) {
                        return (
                            <Link 
                                key={anaKategori.id}
                                href={`/${locale}/products?kategori=${anaKategori.slug}`} 
                                className={`flex items-center gap-3 p-4 rounded-xl font-semibold transition-all duration-300 ${
                                    isAktif 
                                        ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg transform scale-105' 
                                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-md'
                                }`}
                            >
                                {isAktif ? (
                                    <FiCheckCircle className="w-5 h-5 flex-shrink-0" />
                                ) : (
                                    <FiCircle className="w-5 h-5 flex-shrink-0 text-gray-400" />
                                )}
                                <span className="flex-grow">{anaKategori.ad?.[locale] || anaKategori.ad?.['de']}</span>
                                {isAktif && (
                                    <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-bold">✓</span>
                                )}
                            </Link>
                        );
                    }
                    
                    return (
                        <div key={anaKategori.id} className="space-y-1">
                            <div className="flex items-stretch gap-1">
                                <Link 
                                    href={`/${locale}/products?kategori=${anaKategori.slug}`} 
                                    className={`flex items-center gap-3 p-4 rounded-l-xl font-semibold transition-all duration-300 flex-grow ${
                                        isAktif 
                                            ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg' 
                                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    {isAktif ? (
                                        <FiCheckCircle className="w-5 h-5 flex-shrink-0" />
                                    ) : (
                                        <FiCircle className="w-5 h-5 flex-shrink-0 text-gray-400" />
                                    )}
                                    <span className="flex-grow">{anaKategori.ad?.[locale] || anaKategori.ad?.['de']}</span>
                                </Link>
                                <button 
                                    onClick={() => toggleKategori(anaKategori.id)} 
                                    className={`px-4 rounded-r-xl transition-all duration-300 ${
                                        isAktif 
                                            ? 'bg-gradient-to-r from-primary to-accent text-white hover:opacity-90' 
                                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    <FiChevronDown 
                                        className={`w-5 h-5 transform transition-transform duration-300 ${
                                            isAcik ? 'rotate-180' : ''
                                        }`} 
                                    />
                                </button>
                            </div>

                            <div 
                                className={`overflow-hidden transition-all duration-300 ${
                                    isAcik ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                }`}
                            >
                                <div className="pl-4 pt-1 space-y-1">
                                    {altKategoriler.map(altKategori => {
                                        if (!altKategori.slug) return null;
                                        const isAltAktif = seciliSlug === altKategori.slug;
                                        
                                        return (
                                            <Link 
                                                key={altKategori.id}
                                                href={`/${locale}/products?kategori=${altKategori.slug}`} 
                                                className={`flex items-center gap-3 p-3 rounded-lg font-medium text-sm transition-all duration-300 ${
                                                    isAltAktif 
                                                        ? 'bg-gradient-to-r from-primary/90 to-accent/90 text-white shadow-md ml-2' 
                                                        : 'bg-gray-50/80 text-gray-600 hover:bg-gray-100 hover:ml-2'
                                                }`}
                                            >
                                                <div className={`w-2 h-2 rounded-full ${
                                                    isAltAktif ? 'bg-white' : 'bg-gray-400'
                                                }`} />
                                                <span className="flex-grow">{altKategori.ad?.[locale] || altKategori.ad?.['de']}</span>
                                                {isAltAktif && (
                                                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">✓</span>
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