// src/components/portal/katalog/KatalogClient.tsx (Vollständig, Abgesichert)
'use client';

import { useState, useTransition, useMemo } from "react";
import { Tables, Enums } from "@/lib/supabase/database.types";
import Image from "next/image";
import { FiHeart, FiSearch, FiX } from "react-icons/fi";
import { toggleFavoriteAction } from "@/app/actions/favoriten-actions";
import { Locale } from "@/i18n-config";
import { Dictionary } from "@/dictionaries";
import { ProduktMitPreis, Kategorie } from "@/app/[locale]/portal/katalog/page";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { toast } from "sonner";

// Interface für Props
interface KatalogClientProps {
    initialProdukte: ProduktMitPreis[];
    kategorien: Kategorie[];
    favoritenIds: Set<string>;
    locale: Locale;
    dictionary: Dictionary | null | undefined;
    initialSearchQuery: string;
    initialCategoryFilter: string;
}

// Produktkarte (angepasst für sichereren Dictionary-Zugriff)
const ProduktKarte = ({ produkt, isFavorit, locale, dictionary }: { produkt: ProduktMitPreis, isFavorit: boolean, locale: Locale, dictionary: Dictionary | null | undefined }) => {
    const catalogContent = (dictionary as any)?.portal?.catalogPage || {};
    const formatCurrency = (amount: number | null) => {
        if (amount === null) return '-';
        return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
    };
    const produktName = (produkt.ad as any)?.[locale] || (produkt.ad as any)?.['de'] || 'Unbenannt';
    const [isPending, startTransition] = useTransition();
    const [favoritStatus, setFavoritStatus] = useState(isFavorit);

     const handleToggleFavorite = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => {
            const result = await toggleFavoriteAction(produkt.id, favoritStatus);
            if (result.success) {
                setFavoritStatus(!favoritStatus);
            } else {
                 console.error("Favoritenfehler:", result.error);
                 toast.error(result.error || "Favoritenstatus konnte nicht geändert werden.");
            }
        });
    };

    return (
        <Link href={`/${locale}/portal/katalog/${produkt.id}`} className="block bg-white rounded-lg shadow overflow-hidden group relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <button
                 onClick={handleToggleFavorite}
                 disabled={isPending}
                 title={favoritStatus ? (catalogContent.toggleFavoriteRemove || "Von Favoriten entfernen") : (catalogContent.toggleFavoriteAdd || "Zu Favoriten hinzufügen")}
                 className={`absolute top-2 right-2 z-10 p-1.5 rounded-full ${favoritStatus ? 'bg-red-500 text-white' : 'bg-white/70 text-gray-600 hover:bg-red-100 hover:text-red-500'} transition-colors disabled:opacity-50`}
             >
                <FiHeart size={16} fill={favoritStatus ? 'currentColor' : 'none'}/>
            </button>
            <div className="relative w-full aspect-square bg-secondary">
                 <Image
                    src={produkt.ana_resim_url || (produkt.galeri_resim_urls && produkt.galeri_resim_urls.length > 0 ? produkt.galeri_resim_urls[0] : '/placeholder.png')}
                    alt={produktName}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                 />
            </div>
            <div className="p-4">
                 <h3 className="font-semibold text-primary truncate" title={produktName}>{produktName}</h3>
                 <p className="text-sm text-gray-500">{produkt.stok_kodu}</p>
                 <p className="text-lg font-bold text-accent mt-2">{formatCurrency(produkt.partnerPreis)}</p>
            </div>
        </Link>
    );
};

// Haupt-Client-Komponente
export function KatalogClient({
    initialProdukte,
    kategorien,
    favoritenIds: initialFavoritenIds,
    locale,
    dictionary,
    initialSearchQuery,
    initialCategoryFilter
}: KatalogClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const content = (dictionary as any)?.portal?.catalogPage || {
        title: "Produktkatalog",
        description: "Sortiment durchstöbern.",
        searchPlaceholder: "Suchen...",
        allCategories: "Alle Kategorien",
        noProductsFoundFilter: "Keine Produkte für Filter gefunden.",
        noProductsFound: "Keine Produkte verfügbar.",
        toggleFavoriteAdd: "Zu Favoriten",
        toggleFavoriteRemove: "Von Favoriten entfernen",
    };

    const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
    const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter);
    const [showFavorites, setShowFavorites] = useState(false);
    const [favoriten, setFavoriten] = useState(initialFavoritenIds);

    const handleFilterChange = useDebouncedCallback((name: 'q' | 'kategorie', value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) { params.set(name, value); } else { params.delete(name); }
        router.replace(`${pathname}?${params.toString()}`);
    }, 500);

    const gefilterteUrunler = useMemo(() => (initialProdukte || []).filter(produkt => {
        const name = (produkt.ad as any)?.[locale]?.toLowerCase() || '';
        const sku = produkt.stok_kodu?.toLowerCase() || '';
        const passtZuSuche = name.includes(searchQuery.toLowerCase()) || sku.includes(searchQuery.toLowerCase());
        const passtZuFavoriten = !showFavorites || favoriten.has(produkt.id);
        const passtZuKategorie = !categoryFilter || produkt.kategori_id === categoryFilter;
        return passtZuSuche && passtZuFavoriten && passtZuKategorie;
    }), [initialProdukte, searchQuery, showFavorites, favoriten, categoryFilter, locale]);

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">{content.title}</h1>
                <p className="text-text-main/80 mt-1">{content.description}</p>
            </header>

            {/* Filterleiste */}
            <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col md:flex-row gap-4 sticky top-16 z-10">
                <div className="relative flex-grow">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={content.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); handleFilterChange('q', e.target.value); }}
                        className="w-full pl-10 pr-10 py-2 border rounded-md focus:ring-accent focus:border-accent"
                    />
                     {searchQuery && (
                         <button onClick={() => { setSearchQuery(''); handleFilterChange('q', ''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1" aria-label="Suche leeren">
                             <FiX />
                         </button>
                     )}
                </div>
                <select
                    value={categoryFilter}
                    onChange={(e) => { setCategoryFilter(e.target.value); handleFilterChange('kategorie', e.target.value); }}
                    className="border rounded-md py-2 px-4 flex-shrink-0 md:w-64 bg-white"
                >
                    <option value="">{content.allCategories}</option>
                    {/* Sicherstellen, dass 'kategorien' ein Array ist */}
                    {Array.isArray(kategorien) ? kategorien.map(kat => (
                        <option key={kat.id} value={kat.id}>
                            {(kat.ad as any)?.[locale] || 'Unbenannt'}
                        </option>
                    )) : null }
                </select>
                <button onClick={() => setShowFavorites(!showFavorites)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${showFavorites ? 'bg-accent text-white' : 'bg-white shadow-sm border'}`}>
                    <FiHeart fill={showFavorites ? 'currentColor' : 'none'} className={showFavorites ? '' : 'text-accent'}/> Nur Favoriten
                </button>
            </div>

            {/* Produktliste */}
            {/* Sicherstellen, dass initialProdukte existiert, bevor Länge geprüft wird */}
            {(!initialProdukte || initialProdukte.length === 0) && !searchQuery && !categoryFilter ? (
                 <div className="text-center py-16 text-gray-500">{content.noProductsFound}</div>
            ) : gefilterteUrunler.length === 0 ? (
                 <div className="text-center py-16 text-gray-500">{content.noProductsFoundFilter}</div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {gefilterteUrunler.map(produkt => (
                        <ProduktKarte
                            key={produkt.id}
                            produkt={produkt}
                            locale={locale}
                            isFavorit={favoriten.has(produkt.id)}
                            dictionary={dictionary}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}