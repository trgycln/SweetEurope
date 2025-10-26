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

export const dynamic = 'force-dynamic';

// Typdefinition mit Kategorie
type UrunWithKategori = Tables<'urunler'> & {
    kategoriler: {
        ad: any; // Lässt JSON zu
    } | null;
};

// Stok Durum Göstergesi Komponente (unverändert)
const StokDurumGostergesi = ({ miktar, esik }: { miktar: number | null; esik: number | null }) => {
     const mevcutMiktar = miktar ?? 0;
     const uyariEsigi = esik ?? 0;
     let durum = { text: 'Yeterli', color: 'bg-green-100 text-green-800', icon: <FiCheckCircle size={12}/> };
     if (mevcutMiktar <= 0) {
         durum = { text: 'Tükendi', color: 'bg-red-100 text-red-800', icon: <FiXCircle size={12}/> };
     } else if (mevcutMiktar <= uyariEsigi) {
         durum = { text: 'Azaldı', color: 'bg-yellow-100 text-yellow-800', icon: <FiAlertTriangle size={12}/> };
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
    params: { locale: Locale };
    searchParams?: { filter?: string; q?: string; };
}

// Hauptseitenkomponente
export default async function UrunlerListPage({
    params: { locale }, // locale aus params holen
    searchParams
}: UrunlerListPageProps) { // Props-Typ verwenden
    noStore(); // Caching deaktivieren

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    const dictionary = await getDictionary(locale);
    const content = (dictionary as any).adminDashboard?.productsPage || {};

    // Benutzer prüfen
    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        return redirect(`/${locale}/login`);
    }
     // Optional: Rollenprüfung
     // const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
     // if (profile?.rol !== 'Yönetici') { return redirect(`/${locale}/dashboard`); } // Nur Admins?

    // Filter aus searchParams lesen
    const filterParam = searchParams?.filter;
    const queryParam = searchParams?.q;

    // Supabase-Abfrage erstellen
    let query = supabase
        .from('urunler')
        .select(`
            id,
            ad,
            stok_kodu,
            stok_miktari,
            stok_esigi,
            satis_fiyati_musteri,
            aktif,
            kategoriler ( ad )
        `);

    // Filter anwenden
    if (filterParam === 'kritisch') {
        // RPC-Funktion aufrufen, um kritische IDs zu holen
        const { data: criticalIdsData, error: rpcError } = await supabase.rpc('get_critical_product_ids');
        if (rpcError) {
            console.error("Fehler beim Abrufen kritischer Produkt-IDs:", rpcError);
        } else {
            const criticalIds = criticalIdsData?.map((item: { product_id: string }) => item.product_id) || [];
            if (criticalIds.length > 0) {
                query = query.in('id', criticalIds);
            } else {
                // Wenn keine kritischen Produkte gefunden wurden, leere Liste erzwingen
                query = query.eq('id', '00000000-0000-0000-0000-000000000000');
            }
        }
    }

    // Suchfilter anwenden (Suche in Name oder SKU)
    if (queryParam) {
         const searchQuery = `%${queryParam}%`;
         // Suche im Namen (JSONB) ODER im Stok-Code (Text)
         // Sicherstellen, dass die Locale-Suche zuerst versucht wird
         query = query.or(`ad->>${locale}.ilike.${searchQuery},ad->>de.ilike.${searchQuery},stok_kodu.ilike.${searchQuery}`);
    }


    // Sortieren und Daten abrufen
    const { data: urunler, error } = await query
         .order(`ad->>${locale}`, { ascending: true, nullsFirst: false })
         .order(`ad->>de`, { ascending: true, nullsFirst: false }); // Fallback-Sortierung

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
                    <p className="text-text-main/80 mt-1">{urunListesi.length} {content.productsListed || 'Produkte aufgelistet.'}</p>
                </div>
                <Link href={`/${locale}/admin/urun-yonetimi/urunler/yeni`} passHref>
                     <button className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto">
                         <FiPlus size={18} />
                         {content.addProduct || 'Neues Produkt hinzufügen'}
                     </button>
                 </Link>
            </header>

            {/* TODO: Hier Filter hinzufügen (Suche, Kategorie, Status 'kritisch') */}

            {/* Liste oder "Keine Ergebnisse" */}
            {urunListesi.length === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-gray-200 rounded-lg bg-white shadow-sm">
                    <FiArchive className="mx-auto text-5xl text-gray-300 mb-4" />
                     <h2 className="font-serif text-2xl font-semibold text-primary">
                         {filterParam || queryParam ? (content.noProductsFoundFilter || 'Keine Produkte für Filter gefunden') : (content.noProductsYet || 'Noch keine Produkte hinzugefügt')}
                    </h2>
                    {!filterParam && !queryParam && (
                         <p className="mt-2 text-gray-600">{content.noProductsYetHint || 'Verwenden Sie die Schaltfläche "Neues Produkt hinzufügen", um zu beginnen.'}</p>
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                 {['Produktname', 'Artikelnummer', 'Kategorie', 'Lagerbestand', 'Preis (Kunde)', 'Status'].map(header => (
                                     <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                         {header}
                                     </th>
                                 ))}
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Bearbeiten</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {urunListesi.map((urun) => (
                                <tr key={urun.id} className="hover:bg-gray-50 transition-colors duration-150">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                                         <Link href={`/${locale}/admin/urun-yonetimi/urunler/${urun.id}`} className="hover:underline hover:text-accent transition-colors">
                                             {getLocalizedName(urun.ad, locale)} {/* utils Funktion */}
                                         </Link>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                        {urun.stok_kodu || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {getLocalizedName(urun.kategoriler?.ad, locale, 'Ohne Kategorie')} {/* utils Funktion */}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        <StokDurumGostergesi miktar={urun.stok_miktari} esik={urun.stok_esigi} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {formatCurrency(urun.satis_fiyati_musteri, locale)} {/* utils Funktion */}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`inline-flex px-3 py-1 text-xs font-semibold leading-5 rounded-full ${
                                             urun.aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                             {urun.aktif ? (content.statusActive || 'Aktiv') : (content.statusInactive || 'Inaktiv')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                         <Link href={`/${locale}/admin/urun-yonetimi/urunler/${urun.id}`} className="text-accent hover:text-accent-dark">
                                             {content.edit || 'Bearbeiten'}
                                         </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {/* Optional: Paginierung hier hinzufügen */}
        </div>
    );
}