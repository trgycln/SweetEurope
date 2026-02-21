 'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { type Urun } from './types';
import { FiEye, FiSearch, FiStar, FiPackage, FiHeart, FiBox } from 'react-icons/fi';
import { getBadgeText, getFlavorLabel, piecesSuffix, weightLabel, perSliceSuffix } from '@/lib/labels';

interface ProductGridClientProps {
    urunler: Urun[];
    locale: string;
    kategoriAdlariMap: Map<string, string>;
    sablonMap: Record<string, Array<{ alan_adi: string; gosterim_adi: any; sira: number }>>;
    kategoriParentMap: Record<string, string | null>; // for inheritance fallback
    pagination?: { page: number; perPage: number; total: number; kategori?: string };
    dictionary?: any;
}

const colorGradients = [
    'from-blue-500 to-purple-600',
    'from-green-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600',
    'from-indigo-500 to-blue-600',
    'from-yellow-500 to-orange-600',
];

// Star Rating Component - Only shows if there are reviews
const StarRating = ({ rating, reviewCount }: { rating: number; reviewCount: number }) => {
    // Değerlendirme yoksa hiçbir şey gösterme
    if (!reviewCount || reviewCount === 0) return null;
    if (!rating || rating === 0) return null;
    
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

export function ProductGridClient({ urunler, locale, kategoriAdlariMap, sablonMap, kategoriParentMap, pagination, dictionary }: ProductGridClientProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState<Record<string, number>>({});

    const filteredUrunler = useMemo(() => {
        let filtered = urunler.filter(urun => {
            const urunAdi = (urun.ad?.[locale] || urun.ad?.['de'] || '').toLowerCase();
            return urunAdi.includes(searchTerm.toLowerCase());
        });

        return filtered;
    }, [urunler, searchTerm, locale]);

    const Pagination = () => {
        if (!pagination) return null;
        const { page, perPage, total, kategori } = pagination;
        const totalPages = Math.max(1, Math.ceil(total / perPage));
        if (totalPages <= 1) return null;

        const makeHref = (p: number) => {
            const params = new URLSearchParams();
            params.set('page', String(p));
            params.set('limit', String(perPage));
            if (kategori) params.set('kategori', kategori);
            return `/${locale}/products?${params.toString()}`;
        };

        const pages: number[] = [];
        const start = Math.max(1, page - 2);
        const end = Math.min(totalPages, page + 2);
        for (let p = start; p <= end; p++) pages.push(p);

        const showFirst = start > 1;
        const showLast = end < totalPages;

        return (
            <nav className="mt-8 flex items-center justify-center gap-2 select-none">
                {/* Prev */}
                <Link
                    href={page > 1 ? makeHref(page - 1) : '#'}
                    aria-disabled={page === 1}
                    className={`px-3 py-2 rounded-lg border text-sm ${page === 1 ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-200 hover:border-accent hover:text-accent'}`}
                >
                    Zurück
                </Link>

                {/* First */}
                {showFirst && (
                    <>
                        <Link href={makeHref(1)} className="px-3 py-2 rounded-lg border text-sm text-gray-700 border-gray-200 hover:border-accent hover:text-accent">1</Link>
                        {start > 2 && <span className="px-2 text-gray-400">…</span>}
                    </>
                )}

                {/* Middle pages */}
                {pages.map((p) => (
                    <Link
                        key={p}
                        href={makeHref(p)}
                        className={`px-3 py-2 rounded-lg border text-sm ${p === page ? 'bg-gradient-to-r from-primary to-accent text-white border-transparent' : 'text-gray-700 border-gray-200 hover:border-accent hover:text-accent'}`}
                    >
                        {p}
                    </Link>
                ))}

                {/* Last */}
                {showLast && (
                    <>
                        {end < totalPages - 1 && <span className="px-2 text-gray-400">…</span>}
                        <Link href={makeHref(totalPages)} className="px-3 py-2 rounded-lg border text-sm text-gray-700 border-gray-200 hover:border-accent hover:text-accent">{totalPages}</Link>
                    </>
                )}

                {/* Next */}
                <Link
                    href={page < totalPages ? makeHref(page + 1) : '#'}
                    aria-disabled={page === totalPages}
                    className={`px-3 py-2 rounded-lg border text-sm ${page === totalPages ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-200 hover:border-accent hover:text-accent'}`}
                >
                    Weiter
                </Link>
            </nav>
        );
    };

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
                <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUrunler.map((urun, index) => {
                        const originalIndex = urunler.indexOf(urun);
                        const gradient = colorGradients[originalIndex % colorGradients.length];
                        const isHovered = hoveredId === urun.id;
                        const tekniks: any = (urun as any).teknik_ozellikler || {};
                        // fields to exclude from attribute preview to avoid duplication with footer chips
                        const EXCLUDE_FIELDS = new Set([
                            'dilim_adedi',
                            'kutu_ici_adet',
                            'net_agirlik_gram',
                            'net_agirlik_gr',
                            'net_agirlik',
                            'gramaj',
                            'agirlik',
                        ]);
                        
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
                                <div className="relative h-80 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                                    {urun.ana_resim_url ? (
                                        <>
                                            {(() => {
                                                // Get all available images (main + gallery)
                                                const allImages = [
                                                    urun.ana_resim_url,
                                                    ...((urun as any).galeri_resim_urls || [])
                                                ].filter(Boolean) as string[];
                                                
                                                const currentIndex = currentImageIndex[urun.id] || 0;
                                                const hasMultipleImages = allImages.length > 1;
                                                
                                                const handlePrevImage = (e: React.MouseEvent) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setCurrentImageIndex(prev => ({
                                                        ...prev,
                                                        [urun.id]: currentIndex > 0 ? currentIndex - 1 : allImages.length - 1
                                                    }));
                                                };
                                                
                                                const handleNextImage = (e: React.MouseEvent) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setCurrentImageIndex(prev => ({
                                                        ...prev,
                                                        [urun.id]: (currentIndex + 1) % allImages.length
                                                    }));
                                                };
                                                
                                                return (
                                                    <>
                                                        <Image 
                                                            src={allImages[currentIndex]}
                                                            alt={urun.ad?.[locale] || "Produkt"}
                                                            fill 
                                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                            className={`object-cover transition-all duration-700 ${
                                                                isHovered ? 'scale-110 rotate-2' : 'scale-100 rotate-0'
                                                            }`}
                                                        />
                                                        
                                                        {/* Image Navigation Arrows - Only show if multiple images */}
                                                        {hasMultipleImages && (
                                                            <>
                                                                <button
                                                                    onClick={handlePrevImage}
                                                                    className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all duration-300 opacity-0 group-hover:opacity-100"
                                                                    aria-label="Previous image"
                                                                >
                                                                    <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={handleNextImage}
                                                                    className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all duration-300 opacity-0 group-hover:opacity-100"
                                                                    aria-label="Next image"
                                                                >
                                                                    <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                    </svg>
                                                                </button>
                                                                
                                                                {/* Image Indicator Dots */}
                                                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                                    {allImages.map((_, index) => (
                                                                        <button
                                                                            key={index}
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                setCurrentImageIndex(prev => ({
                                                                                    ...prev,
                                                                                    [urun.id]: index
                                                                                }));
                                                                            }}
                                                                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                                                                index === currentIndex
                                                                                    ? 'bg-white w-6'
                                                                                    : 'bg-white/50 hover:bg-white/75'
                                                                            }`}
                                                                            aria-label={`Go to image ${index + 1}`}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                            
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
                                            {/* Nutrition/Property Badges overlay (top-right) */}
                                            {(tekniks.vegan || tekniks.vegetarisch || tekniks.glutenfrei || tekniks.laktosefrei || tekniks.bio) && (
                                                <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                                                    {tekniks.vegan && (
                                                        <span title={getBadgeText('vegan', locale as any)} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white text-xs font-bold shadow-lg">🌿</span>
                                                    )}
                                                    {tekniks.vegetarisch && (
                                                        <span title={getBadgeText('vegetarisch', locale as any)} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-800 text-white text-[10px] font-bold shadow-lg">VEG</span>
                                                    )}
                                                    {tekniks.glutenfrei && (
                                                        <span title={getBadgeText('glutenfrei', locale as any)} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-600 text-white text-[10px] font-bold shadow-lg">GF</span>
                                                    )}
                                                    {tekniks.laktosefrei && (
                                                        <span title={getBadgeText('laktosefrei', locale as any)} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-lg">LF</span>
                                                    )}
                                                    {tekniks.bio && (
                                                        <span title={getBadgeText('bio', locale as any)} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-700 text-white text-[10px] font-bold shadow-lg">BIO</span>
                                                    )}
                                                </div>
                                            )}
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
                                    className="block p-7 relative z-20"
                                >
                                    <h2 className={`text-2xl font-bold font-serif mb-4 leading-snug transition-colors duration-300 ${
                                        isHovered ? 'text-accent' : 'text-gray-800'
                                    }`}>
                                        {urun.ad?.[locale] || urun.ad?.['de']}
                                    </h2>
                                    
                                    {/* Rating - Shows only if reviews exist */}
                                    <StarRating 
                                        rating={urun.ortalama_puan || 0} 
                                        reviewCount={urun.degerlendirme_sayisi || 0} 
                                    />
                                    
                                    {/* Simplified: No attribute preview on cards */}
                                    {/* Stück / Gewicht footer info */}
                                    {(() => {
                                        const tekniks: any = (urun as any).teknik_ozellikler || {};
                                        const sliceCount = tekniks.dilim_adedi || tekniks.kutu_ici_adet; // from teknik_ozellikler only
                                        const weightRaw = tekniks.net_agirlik_gram || tekniks.net_agirlik_gr || tekniks.net_agirlik || tekniks.gramaj || tekniks.agirlik;
                                        // slice gramaj explicit field variants
                                        const sliceWeightRaw = tekniks.dilim_gramaj || tekniks.dilim_gr || tekniks.slice_weight || tekniks.dilim_birim_gramaj;
                                        const numericWeight = typeof weightRaw === 'number' ? weightRaw : parseFloat(String(weightRaw || ''));
                                        const weight = weightRaw ? (Number.isFinite(numericWeight) ? (numericWeight >= 1000 ? `${(numericWeight/1000).toFixed(1)} kg` : `${numericWeight} g`) : String(weightRaw)) : undefined;
                                        let sliceWeight: string | undefined;
                                        if (sliceWeightRaw) {
                                            const n = typeof sliceWeightRaw === 'number' ? sliceWeightRaw : parseFloat(String(sliceWeightRaw));
                                            if (Number.isFinite(n)) sliceWeight = `${n} g/${perSliceSuffix(locale as any)}`;
                                        } else if (sliceCount && Number.isFinite(numericWeight) && numericWeight > 0) {
                                            const per = Math.round(numericWeight / sliceCount);
                                            if (per > 0) sliceWeight = `${per} g/${perSliceSuffix(locale as any)}`;
                                        }
                                        if (!sliceCount && !weight && !sliceWeight) return null;
                                        return (
                                            <div className="mt-6 flex flex-wrap gap-3 text-xs">
                                                {sliceCount && (
                                                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary/90 backdrop-blur px-2.5 py-1.5 rounded-full font-medium shadow-sm">
                                                        <FiBox className="w-3.5 h-3.5" /> {sliceCount} {piecesSuffix(locale as any)}
                                                    </span>
                                                )}
                                                {weight && (
                                                    <span className="inline-flex items-center gap-1 bg-accent/10 text-accent/90 px-2.5 py-1.5 rounded-full font-medium shadow-sm">
                                                        ⚖️ {weight}
                                                    </span>
                                                )}
                                                {sliceWeight && (
                                                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-full font-medium shadow-sm">
                                                        {sliceWeight}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    <div className="flex items-center justify-between mt-4">
                                        <span className={`inline-flex items-center gap-2 text-sm font-semibold transition-all duration-300 ${isHovered ? 'text-primary transform translate-x-2' : 'text-gray-500'}`}>
                                            Mehr erfahren
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
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
                <Pagination />
                </>
            ) : (
                <>
                <div className="space-y-4">
                    {filteredUrunler.map((urun, index) => {
                        const originalIndex = urunler.indexOf(urun);
                        const gradient = colorGradients[originalIndex % colorGradients.length];
                        const tekniks: any = (urun as any).teknik_ozellikler || {};
                        const EXCLUDE_FIELDS = new Set([
                            'dilim_adedi',
                            'kutu_ici_adet',
                            'net_agirlik_gram',
                            'net_agirlik_gr',
                            'net_agirlik',
                            'gramaj',
                            'agirlik',
                        ]);
                        
                        return (
                            <Link
                                key={urun.id}
                                href={`/${locale}/products/${urun.slug}`}
                                className="group flex gap-8 bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 p-7"
                            >
                                <div className="relative w-48 h-48 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
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
                                    <h2 className="text-3xl font-bold leading-tight text-gray-800 group-hover:text-accent transition-colors mb-3 font-serif">
                                        {urun.ad?.[locale] || urun.ad?.['de']}
                                    </h2>
                                    
                                    {/* Rating - Shows only if reviews exist */}
                                    <StarRating 
                                        rating={urun.ortalama_puan || 0} 
                                        reviewCount={urun.degerlendirme_sayisi || 0} 
                                    />

                                    {/* Simplified: No attribute preview on cards (list view) */}
                                    {(() => {
                                        const tekniks: any = (urun as any).teknik_ozellikler || {};
                                        const sliceCount = tekniks.dilim_adedi || tekniks.kutu_ici_adet;
                                        const weightRaw = tekniks.net_agirlik_gram || tekniks.net_agirlik_gr || tekniks.net_agirlik || tekniks.gramaj || tekniks.agirlik;
                                        const sliceWeightRaw = tekniks.dilim_gramaj || tekniks.dilim_gr || tekniks.slice_weight || tekniks.dilim_birim_gramaj;
                                        const numericWeight = typeof weightRaw === 'number' ? weightRaw : parseFloat(String(weightRaw || ''));
                                        const weight = weightRaw ? (Number.isFinite(numericWeight) ? (numericWeight >= 1000 ? `${(numericWeight/1000).toFixed(1)} kg` : `${numericWeight} g`) : String(weightRaw)) : undefined;
                                        let sliceWeight: string | undefined;
                                        if (sliceWeightRaw) {
                                            const n = typeof sliceWeightRaw === 'number' ? sliceWeightRaw : parseFloat(String(sliceWeightRaw));
                                            if (Number.isFinite(n)) sliceWeight = `${n} g/${perSliceSuffix(locale as any)}`;
                                        } else if (sliceCount && Number.isFinite(numericWeight) && numericWeight > 0) {
                                            const per = Math.round(numericWeight / sliceCount);
                                            if (per > 0) sliceWeight = `${per} g/${perSliceSuffix(locale as any)}`;
                                        }
                                        if (!sliceCount && !weight && !sliceWeight) return null;
                                        return (
                                            <div className="mt-4 flex flex-wrap gap-4 text-sm">
                                                {sliceCount && (
                                                    <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary/90 px-3 py-1.5 rounded-full font-medium shadow-sm">
                                                        <FiBox className="w-4 h-4" /> {sliceCount} {piecesSuffix(locale as any)}
                                                    </span>
                                                )}
                                                {weight && (
                                                    <span className="inline-flex items-center gap-1.5 bg-accent/10 text-accent/90 px-3 py-1.5 rounded-full font-medium shadow-sm">
                                                        ⚖️ {weight}
                                                    </span>
                                                )}
                                                {sliceWeight && (
                                                    <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-medium shadow-sm">
                                                        {sliceWeight}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                                
                                <div className="p-4 bg-gradient-to-r from-primary to-accent text-white rounded-full group-hover:scale-110 transition-transform duration-300">
                                    <FiEye className="w-6 h-6" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
                <Pagination />
                </>
            )}
        </div>
    );
}
