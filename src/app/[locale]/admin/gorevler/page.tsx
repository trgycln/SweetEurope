// src/app/[locale]/admin/gorevler/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Tables, Database, Enums } from '@/lib/supabase/database.types'; // Database und Enums importieren
import { getDictionary } from '@/dictionaries';
import { FiPlus, FiClipboard, FiCalendar, FiUser, FiCheckCircle, FiCircle, FiFlag, FiBriefcase } from 'react-icons/fi';
import GorevTamamlaButton from './GorevTamamlaButton';
import GorevGeriAlButton from './GorevGeriAlButton';
import GorevFiltreleri from './GorevFiltreleri';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Locale } from '@/i18n-config'; // Importiere Locale
import { redirect } from 'next/navigation'; // Import für Redirect
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

export const dynamic = 'force-dynamic'; // Sicherstellen, dass die Seite dynamisch ist

// Typ für die erweiterte Aufgabe mit Verknüpfungen
type GorevRow = Tables<'gorevler'> & {
    ilgili_firma: { unvan: string } | null;
    atanan_kisi: { tam_ad: string | null } | null;
};

// Typ für Priorität
type GorevOncelik = Enums<'gorev_oncelik'>;

// Farbdefinitionen (Schlüssel in Anführungszeichen)
const PRIORITAT_FARBEN: Record<string, { bg: string; text: string; border: string; }> = {
    'Düşük': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500' },
    'Orta': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-500' },
    'Yüksek': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500' },
};
// Statusfarben (Schlüssel als string 'true'/'false')
const STATUS_FARBEN: Record<string, string> = {
    'true': 'bg-green-100 text-green-800', // Abgeschlossen
    'false': 'bg-accent/20 text-accent'      // Offen
};

// Props-Typ für die Seite
interface GorevlerListPageProps { // Props-Typ hinzugefügt
    params: { locale: Locale };
    searchParams?: {
        durum?: string;
        atanan?: string;
        oncelik?: string;
    };
}

export default async function GorevlerListPage({
    params: { locale }, // Locale aus params holen
    searchParams
}: GorevlerListPageProps) { // Props-Typ verwenden
    noStore(); // Caching deaktivieren

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    // Optional: Benutzerprüfung
    // const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    // if (!user) { return redirect(`/${locale}/login`); }
    // ... Rollenprüfung ...

    // ### ROBUSTE DATENLADESTRATEGIE (wie in Ihrem Code) ###

    // 1. Gefilterte Aufgaben abrufen (nur IDs und FKs)
    let query = supabase.from('gorevler').select('*'); // Alle Spalten der Haupttabelle holen

    // Filter anwenden
    if (searchParams?.durum === 'acik') query = query.eq('tamamlandi', false);
    if (searchParams?.durum === 'tamamlandi') query = query.eq('tamamlandi', true);
    if (searchParams?.atanan) query = query.eq('atanan_kisi_id', searchParams.atanan);
    if (searchParams?.oncelik) query = query.eq('oncelik', searchParams.oncelik as GorevOncelik);

    // Sortieren (zuerst nach Status, dann Fälligkeit)
    const { data: gorevlerData, error: gorevlerError } = await query
        .order('tamamlandi', { ascending: true }) // Offene zuerst
        .order('son_tarih', { ascending: true, nullsFirst: false }); // Bald fällige zuerst (NULLs am Ende)

    // 2. Alle Firmen und Profile separat für das Mapping holen
    const [firmalarRes, profillerRes] = await Promise.all([
        supabase.from('firmalar').select('id, unvan'),
        supabase.from('profiller').select('id, tam_ad')
    ]);
    const { data: firmalar, error: firmalarError } = firmalarRes;
    const { data: profiller, error: profillerError } = profillerRes;

    // Fehlerbehandlung
    if (gorevlerError || firmalarError || profillerError) {
        console.error('Fehler beim Laden der Aufgaben, Firmen oder Profile:', gorevlerError || firmalarError || profillerError);
        return (
            <div className="flex h-full items-center justify-center p-6 text-red-500 bg-red-50 rounded-lg">
                Fehler beim Laden der Daten. Details in den Server-Logs.
            </div>
        );
    }

    // 3. Maps für schnellen Zugriff erstellen
    const firmaMap = new Map((firmalar || []).map(f => [f.id, f.unvan]));
    const profilMap = new Map((profiller || []).map(p => [p.id, p.tam_ad]));

    // 4. Daten im Code zusammenführen
    const gorevListe: GorevRow[] = (gorevlerData || []).map(gorev => ({
        ...gorev,
        ilgili_firma: gorev.ilgili_firma_id && firmaMap.get(gorev.ilgili_firma_id) ? { unvan: firmaMap.get(gorev.ilgili_firma_id)! } : null,
        atanan_kisi: gorev.atanan_kisi_id ? { tam_ad: profilMap.get(gorev.atanan_kisi_id) || null } : null,
    }));

    const anzahlAufgaben = gorevListe.length;
    // Dictionary
    // Fetch dictionary
    const dictionary = await getDictionary(locale);
    // Enum-Werte für Filter-Dropdown
    const oncelikOptions: GorevOncelik[] = ['Düşük', 'Orta', 'Yüksek'];

    // Datumsformatierung (Locale-sensitiv)
    const formatDate = (date: string | null): string => {
        if (!date) return 'Unbestimmt';
        try {
            return new Date(date).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
             return new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
        }
    };

    // Extract dictionary (pattern copied from other pages)
    // NOTE: For consistency with other pages we could call getDictionary(locale) here if not already handled at layout level.
    // For now we attempt to use existing approach without additional fetch to avoid double calls.
    const tRoot: any = dictionary;
    const t = (tRoot.adminDashboard?.tasksPage) || tRoot.tasksPage || {};
    const F = {
        title: t.title || 'Task Management',
        tasksListed: t.tasksListed || 'tasks listed.',
        newTask: t.newTask || 'New Task',
        noTasksFilterTitle: t.noTasksFilterTitle || 'No tasks match filters',
        noTasksTitle: t.noTasksTitle || 'No tasks yet',
        noTasksFilterDesc: t.noTasksFilterDesc || 'Try adjusting your filter criteria.',
        noTasksDesc: t.noTasksDesc || 'Add a new task to get started.',
        columnTask: t.columnTask || 'Task',
        columnAssignee: t.columnAssignee || 'Assigned To',
        columnPriority: t.columnPriority || 'Priority',
        columnDue: t.columnDue || 'Due Date',
        columnStatus: t.columnStatus || 'Status',
        columnAction: t.columnAction || 'Action',
        statusOpen: t.statusOpen || 'Open',
        statusCompleted: t.statusCompleted || 'Completed'
    };

    return (
        <main className="space-y-8"> {/* Container entfernt, da Layout dies evtl. schon hat */}
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">{F.title}</h1>
                    <p className="text-text-main/80 mt-1">{anzahlAufgaben} {F.tasksListed}</p>
                </div>
                {/* Link zur Erstellseite (Pfad ggf. anpassen) */}
                <Link href={`/${locale}/admin/gorevler/ekle`} passHref>
                    <button className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto">
                        <FiPlus size={18} /> {F.newTask}
                    </button>
                </Link>
            </header>

            {/* Filter */}
            <GorevFiltreleri
                profiller={profiller || []}
                oncelikler={oncelikOptions}
                dictionary={{ tasksPage: t }}
            />

            {/* Liste oder "Keine Ergebnisse" */}
            {anzahlAufgaben === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-gray-200 rounded-lg bg-white shadow-sm">
                    <FiClipboard className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h2 className="font-serif text-2xl font-semibold text-primary">
                        {Object.keys(searchParams || {}).length > 0 ? F.noTasksFilterTitle : F.noTasksTitle}
                    </h2>
                    <p className="mt-2 text-gray-600">
                        {Object.keys(searchParams || {}).length > 0 ? F.noTasksFilterDesc : F.noTasksDesc}
                    </p>
                </div>
            ) : (
                <div>
                    {/* Mobile/Tablet Ansicht (Karten) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
                        {gorevListe.map(gorev => {
                            const prio = PRIORITAT_FARBEN[gorev.oncelik] || { border: 'border-gray-300', bg: 'bg-gray-100', text: 'text-gray-800' };
                            return (
                                <div key={gorev.id} className={`bg-white rounded-lg shadow-md border-l-4 p-4 flex flex-col gap-3 ${gorev.tamamlandi ? 'opacity-60 bg-gray-50 border-gray-300' : prio.border}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-grow">
                                            <p className={`font-bold text-base ${gorev.tamamlandi ? 'line-through text-gray-500' : 'text-primary'}`}>{gorev.baslik}</p>
                                            {gorev.ilgili_firma?.unvan && (
                                                <Link href={`/${locale}/admin/crm/firmalar/${gorev.ilgili_firma_id}`} className="text-xs text-gray-500 hover:text-accent hover:underline flex items-center gap-1.5 mt-1">
                                                     <FiBriefcase size={12}/> {gorev.ilgili_firma.unvan}
                                                </Link>
                                            )}
                                        </div>
                                        <div className="flex-shrink-0 ml-2">
                                            {gorev.tamamlandi ? <GorevGeriAlButton gorevId={gorev.id} /> : <GorevTamamlaButton gorevId={gorev.id} />}
                                        </div>
                                    </div>
                                    <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-xs text-gray-600"> {/* Styling angepasst */}
                                        <div className="flex items-center gap-4">
                                            <span className="flex items-center gap-1.5"><FiCalendar size={14}/> {formatDate(gorev.son_tarih)}</span>
                                            <span className="flex items-center gap-1.5"><FiUser size={14}/> {gorev.atanan_kisi?.tam_ad ?? 'N/A'}</span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full font-semibold ${prio.bg} ${prio.text}`}>{gorev.oncelik}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop Ansicht (Tabelle) */}
                    <div className="hidden lg:block overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-2/5">{F.columnTask}</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{F.columnAssignee}</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{F.columnPriority}</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{F.columnDue}</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{F.columnStatus}</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">{F.columnAction}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {gorevListe.map((gorev) => {
                                    const prio = PRIORITAT_FARBEN[gorev.oncelik] || { bg: 'bg-gray-100', text: 'text-gray-800' };
                                    return (
                                        <tr key={gorev.id} className={`transition-colors duration-150 ${gorev.tamamlandi ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50/50'}`}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                                                <div className={`font-bold ${gorev.tamamlandi ? 'line-through' : ''}`}>{gorev.baslik}</div>
                                                {gorev.ilgili_firma?.unvan && (
                                                     <Link href={`/${locale}/admin/crm/firmalar/${gorev.ilgili_firma_id}`} className="text-xs font-normal text-gray-500 hover:text-accent hover:underline flex items-center gap-1.5 mt-0.5">
                                                         <FiBriefcase size={12}/> {gorev.ilgili_firma.unvan}
                                                     </Link>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{gorev.atanan_kisi?.tam_ad ?? 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`inline-flex px-3 py-1 text-xs font-semibold leading-5 rounded-full ${prio.bg} ${prio.text}`}>{gorev.oncelik}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{formatDate(gorev.son_tarih)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold leading-5 rounded-full ${STATUS_FARBEN[gorev.tamamlandi.toString()]}`}>
                                                    {gorev.tamamlandi ? <FiCheckCircle /> : <FiCircle />}
                                                    {gorev.tamamlandi ? F.statusCompleted : F.statusOpen}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {gorev.tamamlandi ? (
                                                    <GorevGeriAlButton gorevId={gorev.id} />
                                                ) : (
                                                    <GorevTamamlaButton gorevId={gorev.id} />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </main>
    );
}