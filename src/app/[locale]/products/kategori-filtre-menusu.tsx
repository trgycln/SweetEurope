// src/app/[locale]/products/kategori-filtre-menusu.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiChevronDown } from 'react-icons/fi';
import { type Kategori } from './types'; // Tipleri ortak dosyadan import et

interface KategoriFiltreMenusuProps {
    kategoriler: Kategori[];
    locale: string;
    seciliSlug?: string;
    dictionary: {
        filterTitle: string;
        allProducts: string;
    };
}

export function KategoriFiltreMenusu({ kategoriler, locale, seciliSlug, dictionary }: KategoriFiltreMenusuProps) {
    // Aktif olarak açık olan ana kategori(ler)in ID'lerini tutan state
    const [acikKategoriler, setAcikKategoriler] = useState<string[]>([]);

    // Bir ana kategoriye tıklandığında, onu açık/kapalı yapar
    const toggleKategori = (kategoriId: string) => {
        setAcikKategoriler(prev => 
            prev.includes(kategoriId) ? prev.filter(id => id !== kategoriId) : [...prev, kategoriId]
        );
    };

    const anaKategoriler = kategoriler.filter(k => !k.ust_kategori_id);

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{dictionary.filterTitle}</h2>
            <ul className="space-y-1">
                {/* Tüm Ürünler Linki */}
                <li>
                    <Link href={`/${locale}/products`} className={`block p-2 rounded-md text-sm font-semibold transition-colors ${!seciliSlug ? 'bg-accent text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                        {dictionary.allProducts}
                    </Link>
                </li>
                {/* Ana Kategorileri Listeleme */}
                {anaKategoriler.map(anaKategori => {
                    const altKategoriler = kategoriler.filter(k => k.ust_kategori_id === anaKategori.id);
                    const isAcik = acikKategoriler.includes(anaKategori.id);
                    const isAktif = seciliSlug === anaKategori.slug;

                    // Eğer alt kategorisi yoksa, basit bir link göster
                    if (altKategoriler.length === 0) {
                        return (
                            <li key={anaKategori.id}>
                                <Link href={`/${locale}/products?kategori=${anaKategori.slug}`} className={`block p-2 rounded-md text-sm font-semibold transition-colors ${isAktif ? 'bg-accent text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                                    {anaKategori.ad?.[locale] || anaKategori.ad?.['de']}
                                </Link>
                            </li>
                        );
                    }
                    
                    // Eğer alt kategorisi varsa, akordiyon yapısını göster
                    return (
                        <li key={anaKategori.id}>
                            <div className="flex justify-between items-center">
                                <Link href={`/${locale}/products?kategori=${anaKategori.slug}`} className={`flex-grow p-2 rounded-l-md text-sm font-semibold transition-colors ${isAktif ? 'bg-accent text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                                    {anaKategori.ad?.[locale] || anaKategori.ad?.['de']}
                                </Link>
                                <button onClick={() => toggleKategori(anaKategori.id)} className={`p-2 rounded-r-md transition-colors ${isAktif ? 'bg-accent text-white hover:bg-accent/90' : 'hover:bg-gray-100 text-gray-600'}`}>
                                    <FiChevronDown className={`transform transition-transform duration-300 ${isAcik ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                            {/* Alt Kategorilerin Açılır/Kapanır Alanı */}
                            <div className={`pl-4 overflow-hidden transition-all duration-300 ${isAcik ? 'max-h-96 pt-1' : 'max-h-0'}`}>
                                <ul className="space-y-1 border-l-2 border-gray-200 ml-2">
                                {altKategoriler.map(altKategori => (
                                    <li key={altKategori.id}>
                                        <Link href={`/${locale}/products?kategori=${altKategori.slug}`} className={`block p-2 rounded-md text-sm font-semibold transition-colors ml-2 ${seciliSlug === altKategori.slug ? 'bg-accent text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                                            {altKategori.ad?.[locale] || altKategori.ad?.['de']}
                                        </Link>
                                    </li>
                                ))}
                                </ul>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}