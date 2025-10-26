// src/app/[locale]/admin/pazarlama/duyurular/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Database, Tables, Enums } from '@/lib/supabase/database.types';
import { FiPlus, FiRss, FiCalendar } from 'react-icons/fi';
import DuyuruFiltreleri from './DuyuruFiltreleri';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Locale } from '@/i18n-config'; // Importiere Locale
import { redirect } from 'next/navigation'; // Import für Redirect
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

export const dynamic = 'force-dynamic'; // Sicherstellen, dass die Seite dynamisch ist

// Typ für die Zeile in der Tabelle
type DuyuruRow = Tables<'duyurular'> & {
    olusturan: {
        tam_ad: string | null;
    } | null;
};

// Typ für Zielgruppe Enum
type HedefRol = Enums<'hedef_rol'>;

// Styling für Zielgruppen
const HEDEF_RENKLERI: Record<string, string> = { // String als Schlüssel für Flexibilität
    "Tüm Partnerler": "bg-blue-100 text-blue-800",
    "Sadece Alt Bayiler": "bg-purple-100 text-purple-800",
};

// Props-Typ für die Seite
interface DuyurularListPageProps { // Props-Typ hinzugefügt
    params: { locale: Locale };
    searchParams?: {
        q?: string;
        aktif?: string;
        hedef?: string;
    };
}

export default async function DuyurularListPage({
    params: { locale }, // locale aus params holen
    searchParams
}: DuyurularListPageProps) { // Props-Typ verwenden
    noStore(); // Caching deaktivieren

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    // Optional: Benutzerprüfung
    // const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    // if (!user) { return redirect(`/${locale}/login`); }
    // ... Rollenprüfung ...

    // Filterwerte extrahieren
    const searchQuery = searchParams?.q || '';
    const aktifFilter = searchParams?.aktif || '';
    const hedefFilter = searchParams?.hedef || '';

    // Basisabfrage mit Join
    let query = supabase
        .from('duyurular')
        .select(`
            *, 
            olusturan:profiller(tam_ad)
        `);

    // Filter anwenden
    if (searchQuery) {
        query = query.ilike('baslik', `%${searchQuery}%`);
    }
    if (aktifFilter) {
        // Stellt sicher, dass der String 'true' zu boolean true wird
        query = query.eq('aktif', aktifFilter === 'true');
    }
    if (hedefFilter) {
        query = query.eq('hedef_kitle', hedefFilter as HedefRol); // Typ-Zuweisung
    }

    // Daten abrufen
    const { data: duyurular, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error("Server: Fehler beim Laden der Ankündigungen:", JSON.stringify(error, null, 2));
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">Fehler beim Laden der Ankündigungsliste. Details: {error.message}</div>;
    }

    // Typ-Zuweisung
    const duyuruListesi: DuyuruRow[] = (duyurular as any[]) || []; // Sicherer Cast
    const duyuruSayisi = duyuruListesi.length;

    // Optionen für Filter-Dropdown
    const hedefKitleOptions: HedefRol[] = ["Tüm Partnerler", "Sadece Alt Bayiler"];

    // Datumsformatierung (Locale-sensitiv)
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        try {
             return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
             return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">Ankündigungen</h1> {/* Angepasst */}
                    <p className="text-text-main/80 mt-1">{duyuruSayisi} Ankündigungen gefunden.</p> {/* Angepasst */}
                </div>
                {/* Link zur Erstellseite (sprachspezifisch) */}
                <Link href={`/${locale}/admin/pazarlama/duyurular/yeni`} passHref>
                    <button className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto">
                        <FiPlus size={18} />
                        Neue Ankündigung {/* Angepasst */}
                    </button>
                </Link>
            </header>

            {/* Filter */}
            <DuyuruFiltreleri hedefKitleOptions={hedefKitleOptions} locale={locale} /> {/* Locale übergeben */}

            {/* Liste oder "Keine Ergebnisse" */}
            {duyuruSayisi === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-gray-200 rounded-lg bg-white shadow-sm">
                    <FiRss className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h2 className="font-serif text-2xl font-semibold text-primary">
                        {searchQuery || aktifFilter || hedefFilter ? 'Keine Ankündigungen für Filter gefunden' : 'Noch keine Ankündigungen erstellt'}
                    </h2>
                    <p className="mt-2 text-gray-600">
                        {searchQuery || aktifFilter || hedefFilter ? 'Versuchen Sie, Ihre Suchkriterien zu ändern.' : 'Erstellen Sie eine neue Ankündigung, um zu beginnen.'}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {['Titel', 'Zielgruppe', 'Erstellt von', 'Veröffentlicht am', 'Status'].map(header => (
                                    <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        {header}
                                    </th>
                                ))}
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Bearbeiten</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {duyuruListesi.map((duyuru) => (
                                <tr key={duyuru.id} className="hover:bg-gray-50/50 transition-colors duration-150">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                                        {/* Link zur Bearbeiten-Seite (sprachspezifisch) */}
                                        <Link href={`/${locale}/admin/pazarlama/duyurular/${duyuru.id}`} className="hover:underline text-accent">
                                            {duyuru.baslik}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold leading-5 rounded-full ${HEDEF_RENKLERI[duyuru.hedef_kitle] || 'bg-gray-100 text-gray-800'}`}>
                                            {duyuru.hedef_kitle}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{duyuru.olusturan?.tam_ad || 'Unbekannt'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{formatDate(duyuru.yayin_tarihi)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`inline-flex px-3 py-1 text-xs font-semibold leading-5 rounded-full ${duyuru.aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {duyuru.aktif ? 'Aktiv' : 'Inaktiv'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link href={`/${locale}/admin/pazarlama/duyurular/${duyuru.id}`} className="text-accent hover:text-accent-dark">
                                            Bearbeiten
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}