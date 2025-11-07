'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { type Urun } from './types';
import { FiEye, FiSearch, FiStar, FiPackage, FiHeart, FiBox } from 'react-icons/fi';
import { getBadgeText, getFlavorLabel, piecesSuffix, weightLabel } from '@/lib/labels';

interface ProductGridClientProps {
    urunler: Urun[];
    locale: string;
    kategoriAdlariMap: Map<string, string>;
    sablonMap: Record<string, Array<{ alan_adi: string; gosterim_adi: any; sira: number }>>;
    kategoriParentMap: Record<string, string | null>; // for inheritance fallback
    pagination?: { page: number; perPage: number; total: number; kategori?: string };
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

export function ProductGridClient({ urunler, locale, kategoriAdlariMap, sablonMap, kategoriParentMap, pagination }: ProductGridClientProps) {
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
                                    
                                    {/* Rating - Shows only if reviews exist */}
                                    <StarRating 
                                        rating={urun.ortalama_puan || 0} 
                                        reviewCount={urun.degerlendirme_sayisi || 0} 
                                    />
                                    
                                    {/* Category attribute preview */}
                                    {(() => {
                                        if (!urun.kategori_id) return null;
                                        // Template inheritance: if subcategory lacks template, fallback to parent
                                        let template = sablonMap[urun.kategori_id];
                                        if ((!template || template.length === 0) && kategoriParentMap[urun.kategori_id]) {
                                            const parentId = kategoriParentMap[urun.kategori_id]!;
                                            template = sablonMap[parentId];
                                        }
                                        const tekniks: any = (urun as any).teknik_ozellikler || {};
                                        if (!template || template.length === 0) return null;
                                        const visible = template
                                            .filter(f => tekniks[f.alan_adi] !== undefined && tekniks[f.alan_adi] !== '' && tekniks[f.alan_adi] !== null)
                                            .slice(0, 3); // show at most 3
                                        if (visible.length === 0) return null;
                                        return (
                                            <ul className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">
                                                {visible.map(f => (
                                                    <li key={f.alan_adi} className="bg-gray-100 px-2 py-1 rounded-md">
                                                        {(f.gosterim_adi?.[locale] || f.gosterim_adi?.['de'] || f.alan_adi)}: {String(tekniks[f.alan_adi])}
                                                    </li>
                                                ))}
                                                {/* Filter badges */}
                                                {tekniks.vegan && <li className="bg-green-600 text-white px-2 py-1 rounded-md">{getBadgeText('vegan', locale as any)}</li>}
                                                {tekniks.vegetarisch && <li className="bg-green-800 text-white px-2 py-1 rounded-md">{getBadgeText('vegetarisch', locale as any)}</li>}
                                                {tekniks.glutenfrei && <li className="bg-yellow-600 text-white px-2 py-1 rounded-md">{getBadgeText('glutenfrei', locale as any)}</li>}
                                                {tekniks.laktosefrei && <li className="bg-blue-600 text-white px-2 py-1 rounded-md">{getBadgeText('laktosefrei', locale as any)}</li>}
                                                {tekniks.bio && <li className="bg-emerald-700 text-white px-2 py-1 rounded-md">{getBadgeText('bio', locale as any)}</li>}
                                                {Array.isArray(tekniks.geschmack) && tekniks.geschmack.slice(0,2).map((g: string) => (
                                                    <li key={g} className="bg-pink-600 text-white px-2 py-1 rounded-md">{getFlavorLabel(g, locale as any)}</li>
                                                ))}
                                            </ul>
                                        );
                                    })()}
                                    {/* Stück / Gewicht footer info */}
                                    {(() => {
                                        const tekniks: any = (urun as any).teknik_ozellikler || {};
                                        const sliceCount = tekniks.dilim_adedi || tekniks.kutu_ici_adet; // from teknik_ozellikler only
                                        const weightRaw = tekniks.net_agirlik_gram || tekniks.net_agirlik_gr || tekniks.net_agirlik || tekniks.gramaj || tekniks.agirlik;
                                        const weight = weightRaw ? (typeof weightRaw === 'number' ? `${weightRaw} g` : String(weightRaw)) : undefined;
                                        if (!sliceCount && !weight) return null;
                                        return (
                                            <div className="mt-5 flex flex-wrap gap-3 text-xs">
                                                {sliceCount && (
                                                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md font-medium">
                                                        <FiBox className="w-3 h-3" /> {sliceCount} {piecesSuffix(locale as any)}
                                                    </span>
                                                )}
                                                {weight && (
                                                    <span className="inline-flex items-center gap-1 bg-accent/10 text-accent px-2 py-1 rounded-md font-medium">
                                                        ⚖️ {weightLabel(locale as any)}: {weight}
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
                                    
                                    {/* Rating - Shows only if reviews exist */}
                                    <StarRating 
                                        rating={urun.ortalama_puan || 0} 
                                        reviewCount={urun.degerlendirme_sayisi || 0} 
                                    />

                                    {/* Attribute preview (list view) */}
                                    {(() => {
                                        if (!urun.kategori_id) return null;
                                        let template = sablonMap[urun.kategori_id];
                                        if ((!template || template.length === 0) && kategoriParentMap[urun.kategori_id]) {
                                            const parentId = kategoriParentMap[urun.kategori_id]!;
                                            template = sablonMap[parentId];
                                        }
                                        const tekniks: any = (urun as any).teknik_ozellikler || {};
                                        if (!template || template.length === 0) return null;
                                        const visible = template
                                            .filter(f => tekniks[f.alan_adi] !== undefined && tekniks[f.alan_adi] !== '' && tekniks[f.alan_adi] !== null)
                                            .slice(0, 5);
                                        if (visible.length === 0) return null;
                                        return (
                                            <ul className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                                                {visible.map(f => (
                                                    <li key={f.alan_adi} className="bg-gray-100 px-2 py-1 rounded-md">
                                                        {(f.gosterim_adi?.[locale] || f.gosterim_adi?.['de'] || f.alan_adi)}: {String(tekniks[f.alan_adi])}
                                                    </li>
                                                ))}
                                                {tekniks.vegan && <li className="bg-green-600 text-white px-2 py-1 rounded-md">{getBadgeText('vegan', locale as any)}</li>}
                                                {tekniks.vegetarisch && <li className="bg-green-800 text-white px-2 py-1 rounded-md">{getBadgeText('vegetarisch', locale as any)}</li>}
                                                {tekniks.glutenfrei && <li className="bg-yellow-600 text-white px-2 py-1 rounded-md">{getBadgeText('glutenfrei', locale as any)}</li>}
                                                {tekniks.laktosefrei && <li className="bg-blue-600 text-white px-2 py-1 rounded-md">{getBadgeText('laktosefrei', locale as any)}</li>}
                                                {tekniks.bio && <li className="bg-emerald-700 text-white px-2 py-1 rounded-md">{getBadgeText('bio', locale as any)}</li>}
                                                {Array.isArray(tekniks.geschmack) && tekniks.geschmack.slice(0,4).map((g: string) => (
                                                    <li key={g} className="bg-pink-600 text-white px-2 py-1 rounded-md">{getFlavorLabel(g, locale as any)}</li>
                                                ))}
                                            </ul>
                                        );
                                    })()}
                                    {(() => {
                                        const tekniks: any = (urun as any).teknik_ozellikler || {};
                                        const sliceCount = tekniks.dilim_adedi || tekniks.kutu_ici_adet; // from teknik_ozellikler only
                                        const weightRaw = tekniks.net_agirlik_gram || tekniks.net_agirlik_gr || tekniks.net_agirlik || tekniks.gramaj || tekniks.agirlik;
                                        const weight = weightRaw ? (typeof weightRaw === 'number' ? `${weightRaw} g` : String(weightRaw)) : undefined;
                                        if (!sliceCount && !weight) return null;
                                        return (
                                            <div className="mt-3 flex flex-wrap gap-3 text-xs">
                                                {sliceCount && (
                                                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md font-medium">
                                                        <FiBox className="w-3 h-3" /> {sliceCount} {piecesSuffix(locale as any)}
                                                    </span>
                                                )}
                                                {weight && (
                                                    <span className="inline-flex items-center gap-1 bg-accent/10 text-accent px-2 py-1 rounded-md font-medium">
                                                        ⚖️ {weightLabel(locale as any)}: {weight}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
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
                <Pagination />
                </>
            )}
        </div>
    );
}
