'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { type Urun } from './types';
import { FiEye, FiSearch, FiStar, FiPackage, FiHeart } from 'react-icons/fi';

interface ProductGridClientProps {
    urunler: Urun[];
    locale: string;
    kategoriAdlariMap: Map<string, string>;
}

const colorGradients = [
    'from-blue-500 to-purple-600',
    'from-green-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600',
    'from-indigo-500 to-blue-600',
    'from-yellow-500 to-orange-600',
];

// Star Rating Component - Will show real ratings from database
const StarRating = ({ rating, reviewCount }: { rating: number; reviewCount: number }) => {
    // Değerlendirme yoksa hiçbir şey gösterme
    if (!rating || rating === 0 || !reviewCount || reviewCount === 0) return null;
    
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <FiStar
                    key={star}
                    className={`w-4 h-4 ${
                        star <= Math.floor(rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : star - 0.5 <= rating
                            ? 'fill-yellow-400 text-yellow-400 opacity-50'
                            : 'text-gray-300'
                    }`}
                />
            ))}
            <span className="text-sm font-semibold text-gray-700 ml-1">{rating.toFixed(1)}</span>
            <span className="text-xs text-gray-500 ml-1">({reviewCount})</span>
        </div>
    );
};

export function ProductGridClient({ urunler, locale, kategoriAdlariMap }: ProductGridClientProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const filteredUrunler = useMemo(() => {
        let filtered = urunler.filter(urun => {
            const urunAdi = (urun.ad?.[locale] || urun.ad?.['de'] || '').toLowerCase();
            return urunAdi.includes(searchTerm.toLowerCase());
        });

        return filtered;
    }, [urunler, searchTerm, locale]);

    return (
        <div className="space-y-6">
            {/* Search and View Controls */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="relative flex-grow max-w-md w-full">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Produkte durchsuchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-3 rounded-lg transition-all ${
                                viewMode === 'grid' 
                                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-3 rounded-lg transition-all ${
                                viewMode === 'list' 
                                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Products Grid/List */}
            {filteredUrunler.length === 0 ? (
                <div className="text-center p-16 bg-white rounded-2xl shadow-lg">
                    <FiSearch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-xl font-semibold text-gray-600">Keine Ergebnisse gefunden</p>
                    <p className="text-gray-400 mt-2">Versuchen Sie einen anderen Suchbegriff</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUrunler.map((urun, index) => {
                        const originalIndex = urunler.indexOf(urun);
                        const gradient = colorGradients[originalIndex % colorGradients.length];
                        const isHovered = hoveredId === urun.id;
                        // TODO: Get real ratings from database when review system is implemented
                        // const rating = urun.average_rating || 0;
                        // const reviewCount = urun.review_count || 0;
                        
                        return (
                            <div
                                key={urun.id}
                                onMouseEnter={() => setHoveredId(urun.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2"
                            >
                                {/* Gradient Overlay */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 z-10 pointer-events-none`} />
                                
                                {/* Image Section */}
                                <div className="relative h-64 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                                    {urun.ana_resim_url ? (
                                        <>
                                            <Image 
                                                src={urun.ana_resim_url as string}
                                                alt={urun.ad?.[locale] || "Produkt"}
                                                fill 
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                className={`object-cover transition-all duration-700 ${
                                                    isHovered ? 'scale-110 rotate-2' : 'scale-100 rotate-0'
                                                }`}
                                            />
                                            {/* Hover Overlay */}
                                            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
                                                isHovered ? 'opacity-100' : 'opacity-0'
                                            }`}>
                                                <Link
                                                    href={`/${locale}/products/${urun.slug}`}
                                                    className="flex items-center gap-2 px-6 py-3 bg-white text-primary rounded-full font-semibold hover:bg-primary hover:text-white transition-all duration-300 transform hover:scale-110"
                                                >
                                                    <FiEye />
                                                    Details ansehen
                                                </Link>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <FiPackage className="w-20 h-20 text-gray-300" />
                                        </div>
                                    )}
                                    
                                    {/* Category Badge */}
                                    <div className={`absolute top-4 left-4 bg-gradient-to-r ${gradient} text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg transform transition-all duration-300 ${
                                        isHovered ? 'scale-110 rotate-3' : 'scale-100 rotate-0'
                                    }`}>
                                        {urun.kategori_id ? kategoriAdlariMap.get(urun.kategori_id) : 'Kategori'}
                                    </div>

                                    {/* Like Button */}
                                    <button className="absolute bottom-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-all duration-300 transform hover:scale-110">
                                        <FiHeart className="w-5 h-5" />
                                    </button>
                                </div>
                                
                                {/* Content Section */}
                                <Link 
                                    href={`/${locale}/products/${urun.slug}`}
                                    className="block p-6 relative z-20"
                                >
                                    <h2 className={`text-xl font-bold font-serif mb-3 transition-colors duration-300 ${
                                        isHovered ? 'text-accent' : 'text-gray-800'
                                    }`}>
                                        {urun.ad?.[locale] || urun.ad?.['de']}
                                    </h2>
                                    
                                    {/* Rating - Now shows real data from database */}
                                    {urun.ortalama_puan && urun.ortalama_puan > 0 && (
                                        <div className="mb-3">
                                            <StarRating 
                                                rating={urun.ortalama_puan} 
                                                reviewCount={urun.degerlendirme_sayisi || 0} 
                                            />
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center justify-between mt-4">
                                        <span className={`inline-flex items-center gap-2 text-sm font-semibold transition-all duration-300 ${
                                            isHovered ? 'text-primary transform translate-x-2' : 'text-gray-500'
                                        }`}>
                                            Mehr erfahren
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </span>
                                    </div>
                                </Link>
                                
                                {/* Decorative Elements */}
                                <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-5 rounded-tl-full transition-all duration-500 ${
                                    isHovered ? 'scale-150' : 'scale-100'
                                }`} />
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredUrunler.map((urun, index) => {
                        const originalIndex = urunler.indexOf(urun);
                        const gradient = colorGradients[originalIndex % colorGradients.length];
                        // TODO: Get real ratings from database when review system is implemented
                        // const rating = urun.average_rating || 0;
                        // const reviewCount = urun.review_count || 0;
                        
                        return (
                            <Link
                                key={urun.id}
                                href={`/${locale}/products/${urun.slug}`}
                                className="group flex gap-6 bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 p-6"
                            >
                                <div className="relative w-40 h-40 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                                    {urun.ana_resim_url ? (
                                        <Image 
                                            src={urun.ana_resim_url as string}
                                            alt={urun.ad?.[locale] || "Produkt"}
                                            fill 
                                            sizes="160px"
                                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <FiPackage className="w-12 h-12 text-gray-300" />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex-grow flex flex-col justify-center">
                                    <div className={`inline-flex items-center gap-2 text-xs font-bold text-white px-3 py-1 rounded-full bg-gradient-to-r ${gradient} w-fit mb-2`}>
                                        {urun.kategori_id ? kategoriAdlariMap.get(urun.kategori_id) : 'Kategori'}
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800 group-hover:text-accent transition-colors mb-2">
                                        {urun.ad?.[locale] || urun.ad?.['de']}
                                    </h2>
                                    
                                    {/* Rating - Now shows real data from database */}
                                    {urun.ortalama_puan && urun.ortalama_puan > 0 && (
                                        <div className="mb-2">
                                            <StarRating 
                                                rating={urun.ortalama_puan} 
                                                reviewCount={urun.degerlendirme_sayisi || 0} 
                                            />
                                        </div>
                                    )}

                                    <p className="text-sm text-gray-600 mt-2">
                                        Klicken Sie hier, um weitere Details zu diesem Produkt anzuzeigen.
                                    </p>
                                </div>
                                
                                <div className="flex items-center">
                                    <div className="p-4 bg-gradient-to-r from-primary to-accent text-white rounded-full group-hover:scale-110 transition-transform duration-300">
                                        <FiEye className="w-6 h-6" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
