'use client';

import { useState, useTransition, useEffect, useMemo } from "react";
import { FiHeart, FiSearch, FiX, FiList, FiGrid } from "react-icons/fi";
import { toggleFavoriteAction } from "@/app/actions/favoriten-actions";
import { submitUrunTalep } from "@/app/actions/talep-actions";
import { Locale } from "@/i18n-config";
import { Dictionary } from "@/dictionaries";
import { ProduktMitPreis, Kategorie } from "@/app/[locale]/portal/katalog/types";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { toast } from "sonner";
import { usePortal } from '@/contexts/PortalContext';
import {
    PUBLIC_HIDDEN_MAIN_CATEGORY_SLUGS,
    PUBLIC_VISIBLE_MAIN_CATEGORY_ORDER,
} from "@/lib/public-category-visibility";
import { 
    ProduktGridCard, 
    ProduktListRow, 
    SepeteEkleModal, 
    BADGE_DEFS, 
    ZERTIFIKAT_CONFIG, 
    TAT_CONFIG,
    getLocalizedName,
    getBirimFiyatKatalog,
    Birim
} from "./KatalogProductCard";
import { KatalogPagination } from "./KatalogPagination";

export interface KatalogClientProps {
    initialProdukte: ProduktMitPreis[];
    kategorien: Kategorie[];
    favoritenIdsArray: string[];
    locale: Locale;
    dictionary: Dictionary | null | undefined;
    totalItems: number;
    totalPages: number;
    currentPage: number;
    initialSearchQuery: string;
    initialCategoryFilter: string;
    initialFavoritenFilter: boolean;
    initialStokFilter: boolean;
    initialBadges: string[];
    initialZertifikate: string[];
    initialTat: string[];
    initialSort: string;
    userRole?: string;
}

export function KatalogClient({
    initialProdukte,
    kategorien,
    favoritenIdsArray,
    locale,
    dictionary,
    totalItems,
    totalPages,
    currentPage,
    initialSearchQuery,
    initialCategoryFilter,
    initialFavoritenFilter,
    initialStokFilter,
    initialBadges,
    initialZertifikate,
    initialTat,
    initialSort,
    userRole,
}: KatalogClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { addToWarenkorb } = usePortal();
    const [isPending, startTransition] = useTransition();

    const content = (dictionary as any)?.portal?.catalogPage || {
        title: "Produktkatalog",
        description: "Sortiment durchstöbern.",
        searchPlaceholder: "Suchen...",
        allCategories: "Alle Kategorien",
        noProductsFoundFilter: "Keine Produkte für Filter gefunden.",
        noProductsFound: "Keine Produkte verfügbar.",
        toggleFavoriteAdd: "Zu Favoriten",
        toggleFavoriteRemove: "Von Favoriten entfernen",
        listView: "Listenansicht",
        gridView: "Gitteransicht",
    };

    // Filter states for instant UI response
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
    const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter);
    const [showFavorites, setShowFavorites] = useState(initialFavoritenFilter);
    const [stokFilter, setStokFilter] = useState(initialStokFilter);
    const [badgeFilters, setBadgeFilters] = useState<Set<string>>(new Set(initialBadges));
    const [zertifikatFilters, setZertifikatFilters] = useState<Set<string>>(new Set(initialZertifikate));
    const [tatFilters, setTatFilters] = useState<Set<string>>(new Set(initialTat));
    const [sortBy, setSortBy] = useState(initialSort);

    const [favoriten, setFavoriten] = useState<Set<string>>(new Set(favoritenIdsArray));
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [modalProdukt, setModalProdukt] = useState<ProduktMitPreis | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('katalog-view-mode');
            if (saved === 'grid') setViewMode('grid');
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('katalog-view-mode', viewMode);
        }
    }, [viewMode]);

    useEffect(() => {
        setFavoriten(new Set(favoritenIdsArray));
    }, [favoritenIdsArray]);

    const updateURL = useDebouncedCallback((newFilters: any) => {
        const params = new URLSearchParams(searchParams.toString());
        
        const updateParam = (key: string, val: any) => {
            if (val === undefined) return;
            if (Array.isArray(val)) {
                if (val.length > 0) params.set(key, val.join(','));
                else params.delete(key);
            } else if (typeof val === 'boolean') {
                if (val) params.set(key, 'true');
                else params.delete(key);
            } else if (val) {
                params.set(key, String(val));
            } else {
                params.delete(key);
            }
        };

        updateParam('q', newFilters.q);
        updateParam('kategorie', newFilters.kategorie);
        updateParam('favoriten', newFilters.favoriten);
        updateParam('stok', newFilters.stok);
        updateParam('badges', newFilters.badges);
        updateParam('zertifikate', newFilters.zertifikate);
        updateParam('tat', newFilters.tat);
        updateParam('sort', newFilters.sort);

        // Reset page to 1 on any filter change, unless it's explicitly a page change
        if (newFilters.page) {
            if (newFilters.page > 1) params.set('page', String(newFilters.page));
            else params.delete('page');
        } else {
            params.delete('page');
        }

        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        });
    }, 400);

    const handleSearchChange = (val: string) => {
        setSearchQuery(val);
        updateURL({ q: val });
    };

    const handleCategoryChange = (val: string) => {
        setCategoryFilter(val);
        updateURL({ kategorie: val });
    };

    const handleSortChange = (val: string) => {
        setSortBy(val);
        updateURL({ sort: val });
    };

    const toggleShowFavorites = () => {
        const v = !showFavorites;
        setShowFavorites(v);
        updateURL({ favoriten: v });
    };

    const toggleStokFilter = () => {
        const v = !stokFilter;
        setStokFilter(v);
        updateURL({ stok: v });
    };

    const toggleBadge = (key: string) => {
        const next = new Set(badgeFilters);
        if (next.has(key)) next.delete(key); else next.add(key);
        setBadgeFilters(next);
        updateURL({ badges: Array.from(next) });
    };

    const toggleZertifikat = (key: string) => {
        const next = new Set(zertifikatFilters);
        if (next.has(key)) next.delete(key); else next.add(key);
        setZertifikatFilters(next);
        updateURL({ zertifikate: Array.from(next) });
    };

    const toggleTat = (key: string) => {
        const next = new Set(tatFilters);
        if (next.has(key)) next.delete(key); else next.add(key);
        setTatFilters(next);
        updateURL({ tat: Array.from(next) });
    };

    const clearFilters = () => {
        setSearchQuery('');
        setCategoryFilter('');
        setShowFavorites(false);
        setStokFilter(false);
        setBadgeFilters(new Set());
        setZertifikatFilters(new Set());
        setTatFilters(new Set());
        updateURL({ q: '', kategorie: '', favoriten: false, stok: false, badges: [], zertifikate: [], tat: [] });
    };

    const handlePageChange = (page: number) => {
        updateURL({
            q: searchQuery, kategorie: categoryFilter, favoriten: showFavorites, stok: stokFilter,
            badges: Array.from(badgeFilters), zertifikate: Array.from(zertifikatFilters),
            tat: Array.from(tatFilters), sort: sortBy, page
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Hauptkategorien vorbereiten (Sichtbarkeit)
    const hidden = new Set<string>(PUBLIC_HIDDEN_MAIN_CATEGORY_SLUGS as readonly string[]);
    const sichtbareHauptKategorien = kategorien
        .filter(k => k.ust_kategori_id === null && !hidden.has(k.slug || ''))
        .sort((a, b) => {
            const orderIndex = new Map<string, number>();
            (PUBLIC_VISIBLE_MAIN_CATEGORY_ORDER as readonly string[]).forEach((slug, i) => orderIndex.set(slug, i));
            const ia = orderIndex.has(a.slug || '') ? orderIndex.get(a.slug || '')! : Number.MAX_SAFE_INTEGER;
            const ib = orderIndex.has(b.slug || '') ? orderIndex.get(b.slug || '')! : Number.MAX_SAFE_INTEGER;
            if (ia !== ib) return ia - ib;
            const na = (a.ad as any)?.[locale] || (a.ad as any)?.de || '';
            const nb = (b.ad as any)?.[locale] || (b.ad as any)?.de || '';
            return String(na).localeCompare(String(nb));
        });

    const handleModalAdd = (miktar: number, birim: Birim) => {
        if (!modalProdukt) return;
        const adetFiyat = getBirimFiyatKatalog(modalProdukt, birim, miktar);

        addToWarenkorb(
            { ...modalProdukt, partnerPreis: adetFiyat },
            miktar,
            birim as any
        );

        const birimLabel = locale === 'de'
            ? birim === 'koli' ? 'Karton' : birim === 'palet' ? 'Palette' : 'Stück'
            : birim === 'koli' ? 'koli' : birim === 'palet' ? 'palet' : 'adet';

        toast.success(
            `${miktar} ${birimLabel} → ${getLocalizedName(modalProdukt.ad, locale)}`
        );
        setModalProdukt(null);
    };

    const handleModalTalep = async (miktar: number, birim: Birim, notlar: string) => {
        if (!modalProdukt) return;

        const result = await submitUrunTalep({
            urun_id: modalProdukt.id,
            miktar,
            birim,
            notlar
        });

        if (result.success) {
            toast.success(
                locale === 'de' ? 'Ihre Anfrage wurde erfolgreich gesendet!' : 'Talebiniz başarıyla gönderildi!'
            );
            setModalProdukt(null);
        } else {
            toast.error(result.error || (locale === 'de' ? 'Fehler beim Senden der Anfrage.' : 'Talep gönderilirken hata oluştu.'));
        }
    };

    const ProduktKarteWithFavorite = ({ produkt }: { produkt: ProduktMitPreis }) => {
        const [isToggling, startToggleTransition] = useTransition();
        const isFavorit = favoriten.has(produkt.id);

        const handleToggleFavorite = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            startToggleTransition(async () => {
                const result = await toggleFavoriteAction(produkt.id, isFavorit);
                if (result.success) {
                    setFavoriten(prev => {
                        const newSet = new Set(prev);
                        if (isFavorit) newSet.delete(produkt.id);
                        else newSet.add(produkt.id);
                        return newSet;
                    });
                } else {
                    toast.error(result.error || "Favoritenstatus konnte nicht geändert werden.");
                }
            });
        };

        const handleQuickAdd = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setModalProdukt(produkt);
        };

        if (viewMode === 'list') {
            return (
                <ProduktListRow
                    produkt={produkt}
                    isFavorit={isFavorit}
                    locale={locale}
                    dictionary={dictionary}
                    isPending={isToggling}
                    onToggleFavorite={handleToggleFavorite}
                    onQuickAdd={handleQuickAdd}
                />
            );
        }

        return (
            <ProduktGridCard
                produkt={produkt}
                isFavorit={isFavorit}
                locale={locale}
                dictionary={dictionary}
                isPending={isToggling}
                onToggleFavorite={handleToggleFavorite}
                onQuickAdd={handleQuickAdd}
            />
        );
    };

    return (
        <div className={`space-y-8 ${isPending ? 'opacity-60 transition-opacity' : 'transition-opacity duration-300'}`}>
            <header>
                <h1 className="font-serif text-2xl sm:text-4xl font-bold text-primary">{content.title}</h1>
                <p className="text-text-main/80 mt-1">{content.description}</p>
            </header>

            {/* Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Row 1: Search + Category + Sort */}
                <div className="flex flex-col md:flex-row gap-3 p-4 border-b border-gray-100">
                    <div className="relative flex-grow">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder={locale === 'de'
                                ? 'Name, Artikelnr., EAN, Inhalt suchen...'
                                : 'Ürün adı, kod, EAN, içerik ara...'}
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent/30 focus:border-accent text-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => handleSearchChange('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <FiX size={16} />
                            </button>
                        )}
                    </div>

                    <select
                        value={categoryFilter}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        className="border border-gray-200 rounded-lg py-2.5 px-3 md:w-72 bg-white text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    >
                        <option value="">{locale === 'de' ? 'Alle Kategorien' : 'Tüm Kategoriler'}</option>
                        {sichtbareHauptKategorien.map(hauptKat => {
                            const name = getLocalizedName(hauptKat.ad, locale);
                            const altKats = kategorien
                                .filter(k => k.ust_kategori_id === hauptKat.id)
                                .sort((a, b) => getLocalizedName(a.ad, locale).localeCompare(getLocalizedName(b.ad, locale)));
                            if (altKats.length === 0) {
                                return <option key={hauptKat.id} value={hauptKat.id}>{name}</option>;
                            }
                            return (
                                <optgroup key={hauptKat.id} label={name}>
                                    <option value={hauptKat.id}>— {locale === 'de' ? 'Alle' : 'Tümü'} —</option>
                                    {altKats.map(alt => (
                                        <option key={alt.id} value={alt.id}>
                                            &nbsp;&nbsp;{getLocalizedName(alt.ad, locale)}
                                        </option>
                                    ))}
                                </optgroup>
                            );
                        })}
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => handleSortChange(e.target.value)}
                        className="border border-gray-200 rounded-lg py-2.5 px-3 md:w-52 bg-white text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    >
                        <option value="name">{locale === 'de' ? 'Name A–Z' : 'İsim A–Z'}</option>
                        <option value="price_asc">{locale === 'de' ? 'Preis: niedrigste zuerst' : 'Fiyat: Düşükten Yükseğe'}</option>
                        <option value="price_desc">{locale === 'de' ? 'Preis: höchste zuerst' : 'Fiyat: Yüksekten Düşüğe'}</option>
                        <option value="new">{locale === 'de' ? 'Neueste zuerst' : 'En Yeni'}</option>
                    </select>
                </div>

                {/* Row 2: Quick filters */}
                <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
                    <div className="flex gap-2 flex-shrink-0">
                        <button
                            onClick={toggleShowFavorites}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                showFavorites
                                    ? 'bg-red-500 text-white border-red-500'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <FiHeart size={12} fill={showFavorites ? 'currentColor' : 'none'} />
                            {locale === 'de' ? 'Nur Favoriten' : 'Sadece Favoriler'}
                        </button>

                        <button
                            onClick={toggleStokFilter}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                stokFilter
                                    ? 'bg-green-600 text-white border-green-600'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${stokFilter ? 'bg-white' : 'bg-green-500'}`} />
                            {locale === 'de' ? 'Auf Lager' : 'Stokta Var'}
                        </button>

                        {BADGE_DEFS.map(b => (
                            <button
                                key={b.key}
                                onClick={() => toggleBadge(b.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                    badgeFilters.has(b.key)
                                        ? `${b.bg} border-current`
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                {b.short}
                            </button>
                        ))}

                        {['Halal', 'Bio', 'Kosher', 'IFS', 'Vegan_Zert'].map(z => {
                            const cfg = ZERTIFIKAT_CONFIG[z];
                            if (!cfg) return null;
                            return (
                                <button
                                    key={z}
                                    onClick={() => toggleZertifikat(z)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                        zertifikatFilters.has(z)
                                            ? `${cfg.bg} border-current`
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    {cfg.label}
                                </button>
                            );
                        })}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <FiList size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <FiGrid size={16} />
                        </button>
                    </div>
                </div>

                {/* Row 3: Tat/Aroma filtreleri */}
                <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none border-t border-gray-50">
                    <span className="text-xs font-semibold text-gray-400 self-center mr-1 flex-shrink-0">
                        {locale === 'de' ? 'Geschmack:' : 'Aroma:'}
                    </span>
                    {Object.entries(TAT_CONFIG).map(([key, cfg]) => {
                        return (
                            <button
                                key={key}
                                onClick={() => toggleTat(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex-shrink-0 ${
                                    tatFilters.has(key)
                                        ? 'bg-orange-100 text-orange-800 border-orange-300'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-orange-200 hover:text-orange-700'
                                }`}
                            >
                                <span>{cfg.emoji}</span>
                                {locale === 'de' ? cfg.de : cfg.tr}
                            </button>
                        );
                    })}
                </div>

                {/* Aktif filtre badge'leri */}
                {(badgeFilters.size > 0 || zertifikatFilters.size > 0 || tatFilters.size > 0 || stokFilter || categoryFilter || showFavorites || searchQuery) && (
                    <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                        <span className="text-xs text-gray-400 self-center">
                            {locale === 'de' ? 'Aktiv:' : 'Aktif:'}
                        </span>
                        {searchQuery && (
                            <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
                                "{searchQuery}"
                                <button onClick={() => handleSearchChange('')}><FiX size={10} /></button>
                            </span>
                        )}
                        {categoryFilter && (() => {
                            const kat = kategorien.find(k => k.id === categoryFilter);
                            return kat ? (
                                <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                    {getLocalizedName(kat.ad, locale)}
                                    <button onClick={() => handleCategoryChange('')}><FiX size={10} /></button>
                                </span>
                            ) : null;
                        })()}
                        {showFavorites && (
                            <span className="flex items-center gap-1 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                                <FiHeart size={10} fill="currentColor" /> {locale === 'de' ? 'Favoriten' : 'Favoriler'}
                                <button onClick={toggleShowFavorites}><FiX size={10} /></button>
                            </span>
                        )}
                        {stokFilter && (
                            <span className="flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                {locale === 'de' ? 'Auf Lager' : 'Stokta Var'}
                                <button onClick={toggleStokFilter}><FiX size={10} /></button>
                            </span>
                        )}
                        {Array.from(badgeFilters).map(key => {
                            const b = BADGE_DEFS.find(b => b.key === key);
                            return b ? (
                                <span key={key} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${b.bg}`}>
                                    {b.short}
                                    <button onClick={() => toggleBadge(key)}><FiX size={10} /></button>
                                </span>
                            ) : null;
                        })}
                        {Array.from(zertifikatFilters).map(z => {
                            const cfg = ZERTIFIKAT_CONFIG[z];
                            return cfg ? (
                                <span key={z} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.bg}`}>
                                    {cfg.label}
                                    <button onClick={() => toggleZertifikat(z)}><FiX size={10} /></button>
                                </span>
                            ) : null;
                        })}
                        {Array.from(tatFilters).map(key => {
                            const cfg = TAT_CONFIG[key];
                            return cfg ? (
                                <span key={key} className="flex items-center gap-1 text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                                    {cfg.emoji} {locale === 'de' ? cfg.de : cfg.tr}
                                    <button onClick={() => toggleTat(key)}><FiX size={10} /></button>
                                </span>
                            ) : null;
                        })}
                        <button
                            onClick={clearFilters}
                            className="text-xs text-red-500 hover:underline ml-2"
                        >
                            {locale === 'de' ? 'Alle löschen' : 'Hepsini temizle'}
                        </button>
                    </div>
                )}
            </div>

            {/* Sonuç sayacı */}
            <div className="flex items-center justify-between text-sm text-gray-500 px-1">
                <span>
                    {totalItems} {locale === 'de' ? 'Produkte gefunden' : 'ürün bulundu'}
                </span>
            </div>

            {/* Products */}
            {initialProdukte.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    {totalItems === 0 ? content.noProductsFoundFilter : content.noProductsFound}
                </div>
            ) : (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {initialProdukte.map(produkt => (
                                <ProduktKarteWithFavorite key={produkt.id} produkt={produkt} />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {initialProdukte.map(produkt => (
                                <ProduktKarteWithFavorite key={produkt.id} produkt={produkt} />
                            ))}
                        </div>
                    )}

                    <KatalogPagination 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        locale={locale}
                    />
                </>
            )}

            {/* Sepete Ekle Modal */}
            {modalProdukt && (
                <SepeteEkleModal
                    produkt={modalProdukt}
                    locale={locale}
                    onClose={() => setModalProdukt(null)}
                    onAdd={handleModalAdd}
                    onTalep={handleModalTalep}
                />
            )}
        </div>
    );
}
