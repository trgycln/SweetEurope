'use client';

import { useState, useTransition, useMemo, useEffect } from "react"; // useEffect hinzugefügt
import { Tables, Enums } from "@/lib/supabase/database.types";
import Image from "next/image";
import { FiHeart, FiSearch, FiX, FiImage } from "react-icons/fi"; // FiImage hinzugefügt
import { toggleFavoriteAction } from "@/app/actions/favoriten-actions";
import { Locale } from "@/i18n-config";
import { Dictionary } from "@/dictionaries";
import { ProduktMitPreis, Kategorie } from "@/app/[locale]/portal/katalog/page"; // Pfad ggf. anpassen
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { toast } from "sonner";
import {
    PUBLIC_HIDDEN_MAIN_CATEGORY_SLUGS,
    PUBLIC_VISIBLE_MAIN_CATEGORY_ORDER,
} from "@/lib/public-category-visibility";

// Interface für Props (unverändert)
interface KatalogClientProps {
    initialProdukte: ProduktMitPreis[];
    kategorien: Kategorie[];
    favoritenIds: Set<string>;
    locale: Locale;
    dictionary: Dictionary | null | undefined;
    initialSearchQuery: string;
    initialCategoryFilter: string;
}

// Produktkarte (unverändert)
const ProduktKarte = ({ produkt, isFavorit, locale, dictionary }: { produkt: ProduktMitPreis, isFavorit: boolean, locale: Locale, dictionary: Dictionary | null | undefined }) => {
    const catalogContent = (dictionary as any)?.portal?.catalogPage || {};
    const formatCurrency = (amount: number | null) => {
        if (amount === null) return '-';
        return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
    };
    const getLocalizedName = (adObj: any, fallback = 'Unbenannt') => {
        if (!adObj) return fallback;
        if (typeof adObj === 'string') return adObj;
        return adObj[locale] || adObj['de'] || Object.values(adObj)[0] as string || fallback;
    };
    const produktName = getLocalizedName(produkt.ad);
    const [isPending, startTransition] = useTransition();
    const [favoritStatus, setFavoritStatus] = useState(isFavorit);

     const handleToggleFavorite = (e: React.MouseEvent) => {
         e.preventDefault();
         e.stopPropagation();
         startTransition(async () => {
             const result = await toggleFavoriteAction(produkt.id, favoritStatus);
             if (result.success) {
                 setFavoritStatus(!favoritStatus);
                 // Optional: Inform parent component about the change if needed elsewhere
             } else {
                  console.error("Favoritenfehler:", result.error);
                  toast.error(result.error || "Favoritenstatus konnte nicht geändert werden.");
             }
         });
     };

    return (
        <Link href={`/${locale}/portal/katalog/${produkt.id}`} className="block bg-white rounded-lg shadow border border-gray-200 overflow-hidden group relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <button
                 onClick={handleToggleFavorite}
                 disabled={isPending}
                 title={favoritStatus ? (catalogContent.toggleFavoriteRemove || "Von Favoriten entfernen") : (catalogContent.toggleFavoriteAdd || "Zu Favoriten hinzufügen")}
                 className={`absolute top-2 right-2 z-10 p-1.5 rounded-full ${favoritStatus ? 'bg-red-500 text-white' : 'bg-white/70 text-gray-600 hover:bg-red-100 hover:text-red-500'} transition-colors disabled:opacity-50`}
            >
                <FiHeart size={16} fill={favoritStatus ? 'currentColor' : 'none'}/>
            </button>
            <div className="relative w-full aspect-[4/3] bg-secondary"> {/* Aspect ratio angepasst */}
                 <Image
                     // Korrekte Bildquelle verwenden
                     src={produkt.ana_resim_url || '/placeholder.png'}
                     alt={produktName}
                     fill
                     sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                     className="object-cover group-hover:scale-105 transition-transform duration-300"
                     loading="lazy"
                     onError={(e) => { e.currentTarget.src = '/placeholder.png'; }} // Fallback bei Ladefehler
                 />
                 {/* Fallback-Icon, falls kein Bild geladen wird */}
                 {!produkt.ana_resim_url && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
                        <FiImage size={48}/>
                    </div>
                 )}
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

    // ++ NEU: Favoriten-Filter aus URL lesen ++
    const initialShowFavorites = searchParams.get('favoriten') === 'true';

    const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
    const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter);
    const [showFavorites, setShowFavorites] = useState(initialShowFavorites); // Initialer State aus URL
    const [favoriten, setFavoriten] = useState(initialFavoritenIds); // Favoriten-Set für schnellen Check

    // URL bei Filteränderungen aktualisieren (useDebouncedCallback bleibt gleich)
    const handleFilterChange = useDebouncedCallback((name: 'q' | 'kategorie' | 'favoriten', value: string | boolean) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(name, String(value)); // Wert immer als String setzen
        } else {
            params.delete(name);
        }
        router.replace(`${pathname}?${params.toString()}`);
    }, 500);

    // Klick auf Favoriten-Button
    const toggleShowFavorites = () => {
        const newValue = !showFavorites;
        setShowFavorites(newValue);
        handleFilterChange('favoriten', newValue); // URL aktualisieren
    };

    // Set der relevanten Kategorie-IDs für den aktiven Filter (Hauptkategorie + alle Unterkategorien)
    const relevanteKategorieIDs = useMemo(() => {
        const set = new Set<string>();
        if (!categoryFilter) return set;
        set.add(categoryFilter);
        if (Array.isArray(kategorien)) {
            const queue = [categoryFilter];
            while (queue.length > 0) {
                const current = queue.shift()!;
                kategorien
                    .filter(k => k.ust_kategori_id === current)
                    .forEach(child => {
                        if (!set.has(child.id)) {
                            set.add(child.id);
                            queue.push(child.id);
                        }
                    });
            }
        }
        return set;
    }, [categoryFilter, kategorien]);

    // ++ GEFILTERTE PRODUKTE: Berücksichtigt jetzt showFavorites + Unterkategorien ++
    const gefilterteUrunler = useMemo(() => (initialProdukte || []).filter(produkt => {
        const name = (produkt.ad as any)?.[locale]?.toLowerCase() || '';
        const sku = produkt.stok_kodu?.toLowerCase() || '';
        const passtZuSuche = name.includes(searchQuery.toLowerCase()) || sku.includes(searchQuery.toLowerCase());
        // Filtert nach Favoriten NUR wenn showFavorites aktiv ist
        const passtZuFavoriten = !showFavorites || favoriten.has(produkt.id);
        const passtZuKategorie = !categoryFilter || relevanteKategorieIDs.has(produkt.kategori_id);
        return passtZuSuche && passtZuFavoriten && passtZuKategorie;
    }), [initialProdukte, searchQuery, showFavorites, favoriten, categoryFilter, locale, relevanteKategorieIDs]);

    // Hauptkategorien für das Dropdown: nur sichtbare, FO-relevante, mit mind. einem aktiven Produkt
    const sichtbareHauptKategorien = useMemo(() => {
        if (!Array.isArray(kategorien)) return [];

        // 1. Set aller Kategorie-IDs, die tatsächlich Produkte haben (inkl. transitiv über Unterkategorien)
        const kategorienMitProdukten = new Set<string>();
        (initialProdukte || []).forEach(p => {
            if (p.kategori_id) kategorienMitProdukten.add(p.kategori_id);
        });

        // Eltern-IDs zu jeder kategorie-mit-produkten hinzufügen (Produkt in Unterkat zählt für Hauptkat)
        const idToCategory = new Map(kategorien.map(k => [k.id, k]));
        const hauptIDsMitProdukten = new Set<string>();
        kategorienMitProdukten.forEach(id => {
            let current = idToCategory.get(id);
            const guard = new Set<string>();
            while (current && !guard.has(current.id)) {
                guard.add(current.id);
                if (current.ust_kategori_id === null) {
                    hauptIDsMitProdukten.add(current.id);
                    break;
                }
                current = idToCategory.get(current.ust_kategori_id || '');
            }
        });

        // 2. Hauptkategorien filtern: ust_kategori_id === null && nicht versteckt && hat Produkte
        const hidden = new Set<string>(PUBLIC_HIDDEN_MAIN_CATEGORY_SLUGS as readonly string[]);
        const filtered = kategorien.filter(k =>
            k.ust_kategori_id === null
            && !hidden.has(k.slug || '')
            && hauptIDsMitProdukten.has(k.id)
        );

        // 3. Nach PUBLIC_VISIBLE_MAIN_CATEGORY_ORDER sortieren, Rest alphabetisch nach Name
        const orderIndex = new Map<string, number>();
        (PUBLIC_VISIBLE_MAIN_CATEGORY_ORDER as readonly string[]).forEach((slug, i) => orderIndex.set(slug, i));

        return filtered.sort((a, b) => {
            const ia = orderIndex.has(a.slug || '') ? orderIndex.get(a.slug || '')! : Number.MAX_SAFE_INTEGER;
            const ib = orderIndex.has(b.slug || '') ? orderIndex.get(b.slug || '')! : Number.MAX_SAFE_INTEGER;
            if (ia !== ib) return ia - ib;
            const na = (a.ad as any)?.[locale] || (a.ad as any)?.de || '';
            const nb = (b.ad as any)?.[locale] || (b.ad as any)?.de || '';
            return String(na).localeCompare(String(nb));
        });
    }, [kategorien, initialProdukte, locale]);

    // Effekt, um den Favoritenstatus zu aktualisieren, falls er sich extern ändert (optional aber gut)
    useEffect(() => {
        setFavoriten(initialFavoritenIds);
    }, [initialFavoritenIds]);

    // Effekt, um den Button-Status zu aktualisieren, wenn sich der URL-Parameter ändert (z.B. durch Browser-Navigation)
     useEffect(() => {
         setShowFavorites(searchParams.get('favoriten') === 'true');
     }, [searchParams]);


    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">{content.title}</h1>
                <p className="text-text-main/80 mt-1">{content.description}</p>
            </header>

            {/* Filterleiste */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 sticky top-16 z-10">
                {/* Suchfeld (unverändert) */}
                <div className="relative flex-grow">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={content.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); handleFilterChange('q', e.target.value); }}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-accent-dark focus:border-accent-dark shadow-sm"
                    />
                     {searchQuery && (
                         <button onClick={() => { setSearchQuery(''); handleFilterChange('q', ''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1" aria-label="Suche leeren">
                             <FiX />
                         </button>
                     )}
                </div>
                {/* Kategorie-Filter: nur sichtbare FO-Hauptkategorien mit Produkten */}
                <select
                    value={categoryFilter}
                    onChange={(e) => { setCategoryFilter(e.target.value); handleFilterChange('kategorie', e.target.value); }}
                    className="border border-gray-300 rounded-md py-2 px-4 flex-shrink-0 md:w-64 bg-white shadow-sm"
                >
                    <option value="">{content.allCategories}</option>
                    {sichtbareHauptKategorien.map(kat => (
                        <option key={kat.id} value={kat.id}>
                            {(kat.ad as any)?.[locale] || (kat.ad as any)?.['de'] || 'Unbenannt'}
                        </option>
                    ))}
                </select>
                {/* Favoriten-Button (verwendet jetzt toggleShowFavorites) */}
                <button onClick={toggleShowFavorites} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors border ${showFavorites ? 'bg-accent text-white border-accent' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'}`}>
                    <FiHeart fill={showFavorites ? 'currentColor' : 'none'} className={showFavorites ? '' : 'text-accent'}/> Nur Favoriten
                </button>
            </div>

            {/* Produktliste (unverändert in der Struktur) */}
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
