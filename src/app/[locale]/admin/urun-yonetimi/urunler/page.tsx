// src/app/[locale]/admin/urun-yonetimi/urunler/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Tables, Database } from '@/lib/supabase/database.types'; // Database importieren
import { FiPlus, FiArchive, FiAlertTriangle, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { formatCurrency, getLocalizedName } from '@/lib/utils';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten
import { UrunFiltre } from './urun-filtre';
import { Pagination } from './pagination';
import EditableUrunRowClient from "./EditableUrunRowClient";

export const dynamic = 'force-dynamic';

// Typdefinition mit Kategorie
type UrunWithKategori = Tables<'urunler'> & {
    kategoriler: {
        ad: any; // Lässt JSON zu
    } | null;
};

// Stok Durum Göstergesi Komponente (localized)
const StokDurumGostergesi = ({ miktar, esik, labels }: { miktar: number | null; esik: number | null; labels: { sufficient: string; low: string; out: string } }) => {
     const mevcutMiktar = miktar ?? 0;
     const uyariEsigi = esik ?? 0;
     let durum = { text: labels.sufficient, color: 'bg-green-100 text-green-800', icon: <FiCheckCircle size={12}/> };
     if (mevcutMiktar <= 0) {
         durum = { text: labels.out, color: 'bg-red-100 text-red-800', icon: <FiXCircle size={12}/> };
     } else if (mevcutMiktar <= uyariEsigi) {
         durum = { text: labels.low, color: 'bg-yellow-100 text-yellow-800', icon: <FiAlertTriangle size={12}/> };
     }
     return (
         <div className="flex items-center gap-2">
             <span className="font-medium text-gray-800">{mevcutMiktar}</span>
             <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold leading-5 rounded-full ${durum.color}`}>
                 {durum.icon} {durum.text}
             </span>
         </div>
     );
};

// Props-Typ für die Seite
interface UrunlerListPageProps { // Props-Typ hinzugefügt
    params: Promise<{ locale: Locale }>;
    searchParams?: Promise<{ 
        kategori?: string;
        durum?: string;
        stok?: string;
        q?: string;
        page?: string;
    }>;
}

// Hauptseitenkomponente
export default async function UrunlerListPage({
    params,
    searchParams
}: UrunlerListPageProps) { // Props-Typ verwenden
    noStore(); // Caching deaktivieren

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    const { locale } = await params; // Next.js 15: params should be awaited
    const dictionary = await getDictionary(locale);
    const content = (dictionary as any).adminDashboard?.productsPage || {};

    // Benutzer prüfen
    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        return redirect(`/${locale}/login`);
    }
     // Rollenprüfung
     const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
     const isAdmin = profile?.rol === 'Yönetici';
     // Ekip Üyesi sadece okuma yapabilir, düzenleme yetkisi yok

    // Filter aus searchParams lesen
    const sp = searchParams ? await searchParams : undefined; // await searchParams if provided
    const kategoriFilter = sp?.kategori;
    const durumFilter = sp?.durum;
    const stokFilter = sp?.stok;
    const queryParam = sp?.q;
    const currentPage = Math.max(1, Number.parseInt(sp?.page || '1') || 1);
    const itemsPerPage = 50;

    // Get all categories for filter
    const { data: allKategoriler } = await supabase
        .from('kategoriler')
        .select('id, ad, ust_kategori_id')
        .order(`ad->>${locale}`, { ascending: true });

    // Supabase-Abfrage erstellen (ohne count für Performance)
    let query = supabase
        .from('urunler')
                .select(`
            id,
            ad,
            ana_resim_url,
            stok_kodu,
            stok_miktari,
            stok_esigi,
            satis_fiyati_musteri,
            satis_fiyati_alt_bayi,
            aktif,
            kategori_id,
            distributor_alis_fiyati,
            kategoriler ( ad )
        `, { count: 'exact' });

    // Kategori-Filter
    if (kategoriFilter) {
        // Get subcategories of selected category
        const subcatIds = allKategoriler
            ?.filter(k => k.ust_kategori_id === kategoriFilter)
            .map(k => k.id) || [];
        
        const allCategoryIds = [kategoriFilter, ...subcatIds];
        query = query.in('kategori_id', allCategoryIds);
    }

    // Status-Filter (aktif/pasif)
    if (durumFilter === 'aktif') {
        query = query.eq('aktif', true);
    } else if (durumFilter === 'pasif') {
        query = query.eq('aktif', false);
    }

    // Stok-Filter
    if (stokFilter === 'kritisch') {
        // Products where stock <= threshold AND stock > 0
        query = query.or('and(stok_miktari.lte.stok_esigi,stok_miktari.gt.0)');
    } else if (stokFilter === 'aufgebraucht') {
        query = query.or('stok_miktari.lte.0,stok_miktari.is.null');
    } else if (stokFilter === 'ausreichend') {
        query = query.gt('stok_miktari', 0);
    }

    // Suchfilter anwenden (Suche in Name oder SKU)
    if (queryParam) {
         const searchQuery = `%${queryParam}%`;
         // Suche im Namen (JSONB) ODER im Stok-Code (Text)
         // Sicherstellen, dass die Locale-Suche zuerst versucht wird
         query = query.or(`ad->>${locale}.ilike.${searchQuery},ad->>de.ilike.${searchQuery},stok_kodu.ilike.${searchQuery}`);
    }

    // Count total for pagination
    const { count: totalCount } = await query;
    const totalPages = Math.ceil((totalCount || 0) / itemsPerPage);
    const clampedPage = Math.min(currentPage, Math.max(1, totalPages));

    // Apply pagination
    const from = (clampedPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    // Sortieren und Daten abrufen
    const { data: urunler, error } = await query
         .order(`ad->>${locale}`, { ascending: true, nullsFirst: false })
         .order(`ad->>de`, { ascending: true, nullsFirst: false }) // Fallback-Sortierung
         .range(from, to);

    if (error) {
        console.error("Fehler beim Laden der Produkte:", error);
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">{content.loadError || 'Produktliste konnte nicht geladen werden. Details in Server-Logs.'}</div>;
    }

    const urunListesi: UrunWithKategori[] = (urunler as any[]) || [];

    return (
        <div className="space-y-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">{content.title || 'Produktverwaltung'}</h1>
                    <p className="text-text-main/80 mt-1">
                        {totalCount || 0} {content.productsListed || 'Produkte gefunden'}
                        {(kategoriFilter || durumFilter || stokFilter || queryParam) && (content.filteredSuffix || ' (gefiltert)')}
                    </p>
                </div>
                {isAdmin && (
                    <Link href={`/${locale}/admin/urun-yonetimi/urunler/yeni`} passHref>
                        <button className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto">
                            <FiPlus size={18} />
                            {content.addProduct || 'Neues Produkt hinzufügen'}
                        </button>
                    </Link>
                )}
            </header>

            {/* Filter Component */}
                        <UrunFiltre 
                            kategoriler={allKategoriler || []} 
                            locale={locale}
                            labels={{
                                searchPlaceholder: content.filter?.searchPlaceholder || 'Search by product name or SKU...',
                                searchButton: content.filter?.searchButton || 'Search',
                                filterLabel: content.filter?.filterLabel || 'Filters:',
                                allCategories: content.filter?.allCategories || 'All Categories',
                                allStatuses: content.filter?.allStatuses || 'All Statuses',
                                allStocks: content.filter?.allStocks || 'All Stock Levels',
                                statusActiveLabel: content.filter?.statusActiveLabel || 'Active',
                                statusInactiveLabel: content.filter?.statusInactiveLabel || 'Inactive',
                                stockCriticalLabel: content.filter?.stockCriticalLabel || 'Critical',
                                stockOutLabel: content.filter?.stockOutLabel || 'Out of Stock',
                                stockSufficientLabel: content.filter?.stockSufficientLabel || 'Sufficient',
                                clearFilters: content.filter?.clearFilters || 'Reset filters',
                                active: {
                                    searchPrefix: content.filter?.active?.searchPrefix || 'Search:',
                                    categoryFiltered: content.filter?.active?.categoryFiltered || 'Category filtered',
                                    statusPrefix: content.filter?.active?.statusPrefix || 'Status:',
                                    stockPrefix: content.filter?.active?.stockPrefix || 'Stock:',
                                }
                            }}
                        />

            {/* Liste oder "Keine Ergebnisse" */}
            {urunListesi.length === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-gray-200 rounded-lg bg-white shadow-sm">
                    <FiArchive className="mx-auto text-5xl text-gray-300 mb-4" />
                     <h2 className="font-serif text-2xl font-semibold text-primary">
                         {(kategoriFilter || durumFilter || stokFilter || queryParam) 
                            ? (content.noProductsFoundFilter || 'Keine Produkte für diese Filter gefunden') 
                            : (content.noProductsYet || 'Noch keine Produkte hinzugefügt')}
                    </h2>
                    {!(kategoriFilter || durumFilter || stokFilter || queryParam) && (
                         <p className="mt-2 text-gray-600">{content.noProductsYetHint || 'Verwenden Sie die Schaltfläche "Neues Produkt hinzufügen", um zu beginnen.'}</p>
                    )}
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3"></th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ürün Adı</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ürün Kodu</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stok Durumu</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Aktif/Pasif</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Alış Fiyatı</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Müşteri Satış Fiyatı</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Alt Bayi Satış Fiyatı</th>
                                    <th className="relative px-6 py-3"><span className="sr-only">Kaydet</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                    {urunListesi.map((urun) => (
                                        <EditableUrunRowClient key={urun.id} urun={urun} locale={locale} content={content} isAdmin={isAdmin} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination */}
                    <Pagination 
                        currentPage={clampedPage}
                        totalPages={totalPages}
                        totalItems={totalCount || 0}
                        itemsPerPage={itemsPerPage}
                        labels={{
                          prev: content.pagination?.prev || 'Zurück',
                          next: content.pagination?.next || 'Weiter',
                          showing: content.pagination?.showing || 'Zeige',
                          to: content.pagination?.to || 'bis',
                          of: content.pagination?.of || 'von',
                          products: content.pagination?.products || 'Produkten'
                        }}
                    />
                </>
            )}
        </div>
    );
}