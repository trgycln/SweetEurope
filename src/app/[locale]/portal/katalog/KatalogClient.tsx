// src/components/portal/katalog/KatalogClient.tsx (Nur Hauptkategorien im Filter)
'use client';

import { useState, useTransition, useMemo } from "react";
import { Tables, Enums } from "@/lib/supabase/database.types";
import Image from "next/image";
import { FiHeart, FiSearch, FiX, FiPlus } from "react-icons/fi";
import { toggleFavoriteAction } from "@/app/actions/favoriten-actions";
import { Dictionary } from "@/dictionaries";
// KORREKTUR: Locale und Utils aus einem Ort importieren
import { Locale, getLocalizedName, formatCurrency } from "@/lib/utils";
import { ProduktMitPreis, Kategorie } from "@/app/[locale]/portal/katalog/page"; // Typen importieren
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { toast } from "sonner";

// Interface für Props (unverändert)
interface KatalogClientProps {
    initialProdukte: ProduktMitPreis[];
    kategorien: Kategorie[]; // Enthält ALLE Kategorien (Haupt- und Unterkategorien)
    favoritenIds: Set<string>;
    locale: Locale;
    dictionary: Dictionary | null | undefined;
    initialSearchQuery: string;
    initialCategoryFilter: string;
}

// Produktkarte (unverändert)
const ProduktKarte = ({ produkt, isFavorit, locale, dictionary }: { produkt: ProduktMitPreis, isFavorit: boolean, locale: Locale, dictionary: Dictionary | null | undefined }) => {
    const catalogContent = (dictionary as any)?.portal?.catalogPage || {};
    // Preisformatierung (verwende locale)
    const formatPreis = (amount: number | null) => {
        return formatCurrency(amount, locale, 'EUR');
    };
    const produktName = getLocalizedName(produkt.ad, locale) || 'Unbenannt';
    const [isPending, startTransition] = useTransition();
    const [favoritStatus, setFavoritStatus] = useState(isFavorit);

    const handleToggleFavorite = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
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
            <button onClick={handleToggleFavorite} disabled={isPending} title={favoritStatus ? (catalogContent.toggleFavoriteRemove || "Von Favoriten entfernen") : (catalogContent.toggleFavoriteAdd || "Zu Favoriten hinzufügen")} className={`absolute top-2 right-2 z-10 p-1.5 rounded-full ${favoritStatus ? 'bg-red-500 text-white' : 'bg-white/70 text-gray-600 hover:bg-red-100 hover:text-red-500'} transition-colors disabled:opacity-50`}>
                <FiHeart size={16} fill={favoritStatus ? 'currentColor' : 'none'}/>
            </button>
            <div className="relative w-full aspect-square bg-secondary">
                 <Image src={produkt.ana_resim_url || (produkt.galeri_resim_urls && produkt.galeri_resim_urls.length > 0 ? produkt.galeri_resim_urls[0] : '/placeholder.png')} alt={produktName} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
            </div>
            <div className="p-4">
                 <h3 className="font-semibold text-primary truncate" title={produktName}>{produktName}</h3>
                 <p className="text-sm text-gray-500">{produkt.stok_kodu}</p>
                 <p className="text-lg font-bold text-accent mt-2">{formatPreis(produkt.partnerPreis)}</p>
            </div>
        </Link>
    );
};

// Haupt-Client-Komponente
export function KatalogClient({
    initialProdukte,
    kategorien, // Dies ist die volle Liste (Haupt+Unterkategorien)
    favoritenIds: initialFavoritenIds,
    locale,
    dictionary,
    initialSearchQuery,
    initialCategoryFilter
}: KatalogClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const content = (dictionary as any)?.portal?.catalogPage || { /* Fallbacks */ };

    const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
    const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter);
    const [showFavorites, setShowFavorites] = useState(false);
    const [favoriten, setFavoriten] = useState(initialFavoritenIds);

    // Debounced-Funktion für URL-Updates (unverändert)
    const handleFilterChange = useDebouncedCallback((name: 'q' | 'kategorie', value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(name, value);
        } else {
            params.delete(name);
        }
        router.replace(`${pathname}?${params.toString()}`);
    }, 500);

    // KORREKTUR: Hauptkategorien für das Dropdown filtern
    // (Array.isArray(kategorien) stellt sicher, dass der Code nicht abstürzt, falls kategorien undefined ist)
    const hauptKategorien = useMemo(() =>
        Array.isArray(kategorien) ? kategorien.filter(k => k.ust_kategori_id === null) : [],
    [kategorien]);

    // KORREKTUR: Filterlogik
    const gefilterteUrunler = useMemo(() => {
        if (!Array.isArray(initialProdukte)) return [];
        
        // 1. Erstelle ein Set aller relevanten Kategorie-IDs (ausgewählte + untergeordnete)
        const relevanteKategorieIDs = new Set<string>();
        if (categoryFilter) {
            relevanteKategorieIDs.add(categoryFilter); // Die Hauptkategorie selbst hinzufügen
            
            // Finde alle Unterkategorien und füge sie hinzu
            if(Array.isArray(kategorien)) {
                kategorien
                    .filter(k => k.ust_kategori_id === categoryFilter)
                    .forEach(subKat => relevanteKategorieIDs.add(subKat.id));
            }
        }

        // 2. Produkte filtern
        return initialProdukte.filter(produkt => {
            const name = (produkt.ad as any)?.[locale]?.toLowerCase() || '';
            const sku = produkt.stok_kodu?.toLowerCase() || '';
            const passtZuSuche = name.includes(searchQuery.toLowerCase()) || sku.includes(searchQuery.toLowerCase());
            
            const passtZuFavoriten = !showFavorites || favoriten.has(produkt.id);
            
            // Prüfe: Entweder kein Filter aktiv ODER Produkt-Kategorie ist im Set
            const passtZuKategorie = !categoryFilter || relevanteKategorieIDs.has(produkt.kategori_id);
            
            return passtZuSuche && passtZuFavoriten && passtZuKategorie;
        });
    }, [initialProdukte, searchQuery, showFavorites, favoriten, categoryFilter, locale, kategorien]);


    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">{content.title}</h1>
                <p className="text-text-main/80 mt-1">{content.description}</p>
            </header>

            {/* Filterleiste */}
            <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col md:flex-row gap-4 sticky top-16 z-10">
                {/* Suchfeld */}
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
                
                {/* KORREKTUR: Dropdown-Menü rendert NUR Hauptkategorien */}
                <select
                    value={categoryFilter}
                    onChange={(e) => { setCategoryFilter(e.target.value); handleFilterChange('kategorie', e.target.value); }}
                    className="border rounded-md py-2 px-4 flex-shrink-0 md:w-64 bg-white"
                >
                    <option value="">{content.allCategories}</option>
                    {/* Rendert nur noch die Hauptkategorien */}
                    {hauptKategorien.map(hauptKat => (
                        <option key={hauptKat.id} value={hauptKat.id} className="font-semibold text-primary">
                            {getLocalizedName(hauptKat.ad, locale) || 'Unbenannt'}
                        </option>
                    ))}
                </select>
                
                {/* Favoriten-Button */}
                <button onClick={() => setShowFavorites(!showFavorites)} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors w-full sm:w-auto ${showFavorites ? 'bg-accent text-white' : 'bg-white shadow-sm border'}`}>
                    <FiHeart fill={showFavorites ? 'currentColor' : 'none'} className={showFavorites ? '' : 'text-accent'}/> Nur Favoriten
                </button>
            </div>

            {/* Produktliste */}
            {(!initialProdukte || initialProdukte.length === 0) && !searchQuery && !categoryFilter && !showFavorites ? (
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