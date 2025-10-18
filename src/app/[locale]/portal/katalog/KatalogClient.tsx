// src/components/portal/katalog/KatalogClient.tsx (Vollständig mit Link)
'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
// Typen aus der übergeordneten Server-Komponente importieren
import { ProduktMitPreis, Kategorie } from '@/app/[locale]/portal/katalog/page';
import { Locale } from '@/i18n-config';
import { Dictionary } from '@/dictionaries';
import { FiSearch, FiHeart, FiX } from 'react-icons/fi';
import Image from 'next/image';
import Link from 'next/link'; // Link importieren

interface KatalogClientProps {
    initialProdukte: ProduktMitPreis[];
    kategorien: Kategorie[];
    favoritenIds: Set<string>;
    locale: Locale;
    dictionary: Dictionary;
    initialSearchQuery: string;
    initialCategoryFilter: string;
}

// Kleine Produktkarte (Beispiel) - Jetzt mit Link zur Detailseite
function ProduktKarteClient({ produkt, locale, isFavorite, dictionary }: { produkt: ProduktMitPreis, locale: Locale, isFavorite: boolean, dictionary: Dictionary }) {
    const formatCurrency = (amount: number | null) => {
        if (amount === null) return '-';
        return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(amount);
    };
    // Texte aus dem Dictionary holen (mit Fallbacks)
    const catalogContent = (dictionary as any).portal?.catalogPage || {};
    const productDetailContent = (dictionary as any).portal?.productDetailPage || {};

    return (
        // Die gesamte Karte ist jetzt ein Link zur Detailseite
        <Link href={`/${locale}/portal/katalog/${produkt.id}`} className="block bg-white rounded-lg shadow overflow-hidden group relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            {/* Favoriten-Button */}
            <button
                 // TODO: Favoriten-Funktion implementieren (onClick)
                 title={isFavorite ? catalogContent.toggleFavoriteRemove || "Von Favoriten entfernen" : catalogContent.toggleFavoriteAdd || "Zu Favoriten hinzufügen"}
                 className={`absolute top-2 right-2 z-10 p-1.5 rounded-full ${isFavorite ? 'bg-red-500 text-white' : 'bg-white/70 text-gray-600 hover:bg-red-100 hover:text-red-500'} transition-colors`}
                 // Verhindert, dass der Klick auf den Button auch den Link auslöst
                 onClick={(e) => { e.preventDefault(); e.stopPropagation(); /* Favoriten-Logik hier */ alert('Favoriten-Funktion noch nicht implementiert'); }}
             >
                <FiHeart size={16} fill={isFavorite ? 'currentColor' : 'none'}/>
            </button>
            {/* Produktbild */}
            <div className="relative w-full aspect-square bg-secondary">
                 <Image
                    src={produkt.ana_resim_url || '/placeholder.png'} // Fallback-Bild
                    alt={(produkt.ad as any)?.[locale] || 'Produktbild'} // Lokalisierter Alt-Text
                    fill // Füllt den Container aus
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" // Responsive Bildgrößen
                    className="object-cover group-hover:scale-105 transition-transform duration-300" // Hover-Effekt
                    priority={false} // Nur wichtige Bilder priorisieren (optional)
                    loading="lazy" // Bilder erst laden, wenn sie sichtbar werden (optional)
                 />
            </div>
            {/* Produktinformationen */}
            <div className="p-4">
                 <h3 className="font-semibold text-primary truncate" title={(produkt.ad as any)?.[locale]}>
                     {(produkt.ad as any)?.[locale] || 'Unbenannt'} {/* Lokalisierter Name */}
                 </h3>
                 <p className="text-sm text-gray-500">{produkt.stok_kodu}</p> {/* Stok Kodu */}
                 <p className="text-lg font-bold text-accent mt-2">
                     {formatCurrency(produkt.partnerPreis)} {/* Partner-Preis */}
                 </p>
                 {/* Optional: "Details ansehen"-Text */}
                 {/* <span className="text-xs text-accent mt-1 block group-hover:underline">{catalogContent.viewDetails || "Details"}</span> */}
            </div>
        </Link> // Ende des Links
    );
}


// Haupt-Client Komponente für den Katalog
export function KatalogClient({
    initialProdukte,
    kategorien,
    favoritenIds,
    locale,
    dictionary,
    initialSearchQuery,
    initialCategoryFilter
}: KatalogClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams(); // Aktuelle URL-Parameter lesen
    const content = (dictionary as any).portal?.catalogPage || {}; // Dictionary-Texte

    // Lokaler State für die Filterwerte, initialisiert aus den Server Props
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
    const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter);

    // Debounced Funktion: Aktualisiert die URL, wenn sich ein Filter ändert
    // Dies löst einen erneuten Datenabruf im Server Component aus
    const handleFilterChange = useDebouncedCallback((name: 'q' | 'kategorie', value: string) => {
        const params = new URLSearchParams(searchParams.toString()); // Aktuelle Parameter kopieren
        if (value) {
            params.set(name, value); // Neuen Wert setzen oder aktualisieren
        } else {
            params.delete(name); // Parameter entfernen, wenn Wert leer ist
        }
        // URL mit `router.replace` aktualisieren (verhindert neuen Browserverlauf-Eintrag)
        router.replace(`${pathname}?${params.toString()}`);
    }, 500); // 500ms warten, nachdem der Benutzer aufgehört hat zu tippen/klicken

    return (
        <div className="space-y-8">
            {/* Seitenkopf */}
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">{content.title}</h1>
                <p className="text-text-main/80 mt-1">{content.description}</p>
            </header>

            {/* Filterleiste */}
            <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col md:flex-row gap-4 sticky top-16 z-10"> {/* Sticky Header für Filter */}
                {/* Suchfeld */}
                <div className="relative flex-grow">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={content.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value); // Lokalen State sofort aktualisieren
                            handleFilterChange('q', e.target.value); // URL nach kurzer Verzögerung aktualisieren
                        }}
                        className="w-full pl-10 pr-10 py-2 border rounded-md focus:ring-accent focus:border-accent" // pr-10 für X-Button
                    />
                     {/* X-Button zum Leeren des Suchfelds */}
                     {searchQuery && (
                         <button
                             onClick={() => { setSearchQuery(''); handleFilterChange('q', ''); }}
                             className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                             aria-label="Suche leeren"
                         >
                             <FiX />
                         </button>
                     )}
                </div>
                {/* Kategorie-Filter Dropdown */}
                <select
                    value={categoryFilter}
                    onChange={(e) => {
                        setCategoryFilter(e.target.value); // Lokalen State sofort aktualisieren
                        handleFilterChange('kategorie', e.target.value); // URL nach kurzer Verzögerung aktualisieren
                    }}
                    className="border rounded-md py-2 px-4 flex-shrink-0 md:w-64 bg-white" // bg-white hinzugefügt
                >
                    <option value="">{content.allCategories}</option>
                    {kategorien.map(kat => (
                        <option key={kat.id} value={kat.id}>
                            {(kat.ad as any)?.[locale] || 'Unbenannt'} {/* Lokalisierter Kategoriename */}
                        </option>
                    ))}
                </select>
            </div>

            {/* Produktliste Grid */}
            {initialProdukte.length === 0 ? (
                 <div className="text-center py-16 text-gray-500">
                     {/* Unterschiedliche Meldung, je nachdem ob Filter aktiv sind */}
                     {searchQuery || categoryFilter ? content.noProductsFoundFilter : content.noProductsFound}
                 </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {initialProdukte.map(produkt => (
                        <ProduktKarteClient
                            key={produkt.id}
                            produkt={produkt}
                            locale={locale}
                            isFavorite={favoritenIds.has(produkt.id)}
                            dictionary={dictionary} // Dictionary weitergeben
                        />
                    ))}
                </div>
            )}

             {/* Zukünftige Paginierung */}
             {/* <Pagination pageCount={...} currentPage={...} /> */}

        </div>
    );
}