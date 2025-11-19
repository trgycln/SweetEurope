// src/app/[locale]/(public)/search/page.tsx (Verbesserte Suche)

import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/dictionaries';
// Annahme: Locale ist in utils.ts definiert
import { Locale, getLocalizedName } from '@/lib/utils';
import { Tables } from '@/lib/supabase/database.types';
import Link from 'next/link';
import { FiSearch, FiFileText, FiPackage } from 'react-icons/fi';
import Image from 'next/image';

// Props-Typ für die Seite
type SearchPageProps = {
    params: { locale: Locale };
    searchParams: { [key: string]: string | string[] | undefined };
};

// Typen für die Suchergebnisse
type ProductResult = Pick<Tables<'urunler'>, 'id' | 'ad' | 'slug' | 'ana_resim_url' | 'aciklamalar'>;
type BlogResult = Pick<Tables<'blog_yazilari'>, 'id' | 'baslik' | 'slug' | 'one_cikan_gorsel_url' | 'meta_aciklama'>;


export default async function SearchPage({ params, searchParams }: SearchPageProps) {
    const { locale } = params;
    const supabase = createSupabaseServerClient();
    const dictionary = await getDictionary(locale);
    // Sicherer Zugriff auf das Dictionary mit Fallback
    const searchContent = (dictionary as any).search || {
        modalPlaceholder: "Wonach suchen Sie?",
        close: "Schließen"
    };

    // 1. Suchbegriff aus der URL holen
    const query = typeof searchParams.q === 'string' ? searchParams.q : '';
    const searchTerm = `%${query}%`; // Wildcard für ILIKE-Suche
    const hasSearch = query.trim().length > 0;

    let productResults: ProductResult[] = [];
    let blogResults: BlogResult[] = [];

    // 2. Nur suchen, wenn ein Suchbegriff vorhanden ist
    if (hasSearch) {
        // Parallel in Produkten und Blog-Posts suchen
        const [productSearch, blogSearch] = await Promise.all([
            // Produkte durchsuchen (lokalisierte Namen UND Beschreibungen)
            supabase
                .from('urunler')
                .select('id, ad, slug, ana_resim_url, aciklamalar')
                .eq('aktif', true)
                .or(`ad->>de.ilike.${searchTerm},ad->>en.ilike.${searchTerm},ad->>tr.ilike.${searchTerm},ad->>ar.ilike.${searchTerm},aciklamalar->>de.ilike.${searchTerm},aciklamalar->>tr.ilike.${searchTerm},aciklamalar->>en.ilike.${searchTerm},aciklamalar->>ar.ilike.${searchTerm}`)
                .limit(20),
            
            // KORREKTUR: Blog/Rezepte durchsuchen (Titel UND Meta-Beschreibung)
            supabase
                .from('blog_yazilari')
                .select('id, baslik, slug, one_cikan_gorsel_url, meta_aciklama')
                .eq('durum', 'Yayınlandı') // Nur veröffentlichte Posts
                // Suche im Titel ODER in der Meta-Beschreibung
                .or(`baslik.ilike.${searchTerm},meta_aciklama.ilike.${searchTerm}`)
                .limit(10)
        ]);

        if (productSearch.data) productResults = productSearch.data as any;
        if (blogSearch.data) blogResults = blogSearch.data as any;
    }

    const totalResults = productResults.length + blogResults.length;

    return (
        <div className="bg-secondary">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 min-h-screen">
                <header className="mb-10">
                    {hasSearch ? (
                        <>
                            <p className="text-text-main/70 text-sm">
                                {totalResults} {totalResults === 1 ? 'Ergebnis' : 'Ergebnisse'} gefunden
                            </p>
                            <h1 className="text-3xl md:text-5xl font-serif font-bold text-primary break-words">
                                Ergebnisse für: "{query}"
                            </h1>
                        </>
                    ) : (
                        <h1 className="text-4xl font-serif font-bold text-primary">
                            Suche
                        </h1>
                    )}
                </header>

                {/* Wenn keine Suche, Eingabeaufforderung anzeigen */}
                {!hasSearch && (
                    <div className="text-center p-12 bg-white rounded-lg shadow-sm">
                        <FiSearch className="mx-auto text-5xl text-gray-300 mb-4" />
                        <p className="text-text-main/70">
                            {searchContent.modalPlaceholder || "Wonach suchen Sie?"}
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            Bitte verwenden Sie das Such-Icon oben rechts, um Produkte oder Rezepte zu finden.
                        </p>
                    </div>
                )}

                {/* Wenn Suche, aber keine Ergebnisse */}
                {hasSearch && totalResults === 0 && (
                    <div className="text-center p-12 bg-white rounded-lg shadow-sm">
                        <p className="text-lg text-text-main">
                            Leider wurden keine Ergebnisse für "{query}" gefunden.
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            Bitte versuchen Sie es mit einem anderen Suchbegriff.
                        </p>
                    </div>
                )}

                {/* Ergebnisse anzeigen */}
                {hasSearch && totalResults > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                        {/* Haupt-Ergebnisse (Produkte) */}
                        <div className="lg:col-span-2 space-y-6">
                            <h2 className="text-2xl font-serif font-semibold text-primary border-b border-bg-subtle pb-3 flex items-center gap-2">
                                <FiPackage /> Produkte ({productResults.length})
                            </h2>
                            {productResults.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    {productResults.map(product => (
                                        <li key={product.id} className="py-4">
                                            <Link href={`/${locale}/products/${product.slug}`} className="group flex items-center gap-4">
                                                <div className="relative w-20 h-20 rounded-md overflow-hidden bg-white border flex-shrink-0">
                                                    <Image 
                                                        src={product.ana_resim_url || '/placeholder.png'} 
                                                        alt={getLocalizedName(product.ad, locale)}
                                                        fill
                                                        sizes="80px"
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-accent group-hover:underline">
                                                        {getLocalizedName(product.ad, locale)}
                                                    </h3>
                                                    <p className="text-sm text-text-main/80 line-clamp-2">
                                                        {getLocalizedName(product.aciklamalar, locale)}
                                                    </p>
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-text-main/70">Keine Produkte gefunden.</p>
                            )}
                        </div>

                        {/* Neben-Ergebnisse (Blog/Rezepte) */}
                        <div className="space-y-6">
                            <h2 className="text-2xl font-serif font-semibold text-primary border-b border-bg-subtle pb-3 flex items-center gap-2">
                                <FiFileText /> Blog & Rezepte ({blogResults.length})
                            </h2>
                            {blogResults.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    {blogResults.map(post => (
                                        <li key={post.id} className="py-4">
                                            {/* TODO: Pfad zu Blog-Posts anpassen, falls abweichend */}
                                            <Link href={`/${locale}/blog/${post.slug}`} className="group flex items-center gap-4">
                                                 <div className="relative w-16 h-16 rounded-md overflow-hidden bg-white border flex-shrink-0">
                                                    <Image 
                                                        src={post.one_cikan_gorsel_url || '/placeholder.png'} 
                                                        alt={post.baslik}
                                                        fill
                                                        sizes="64px"
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <h3 className="text-md font-semibold text-accent group-hover:underline">
                                                        {post.baslik}
                                                    </h3>
                                                    <p className="text-sm text-text-main/80 line-clamp-2">
                                                        {post.meta_aciklama}
                                                    </p>
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-text-main/70">Keine Blog-Einträge gefunden.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}