// src/app/admin/gorevler/page.tsx (FINALE, ROBUSTE VERSION)

import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Tables } from '@/lib/supabase/database.types';
import { FiPlus, FiClipboard, FiCalendar, FiUser, FiCheckCircle, FiCircle, FiFlag, FiBriefcase } from 'react-icons/fi';
import GorevTamamlaButton from './GorevTamamlaButton';
import GorevGeriAlButton from './GorevGeriAlButton';
import GorevFiltreleri from './GorevFiltreleri';

// Der Typ bleibt gleich, wir werden die Daten manuell in diese Struktur bringen.
type GorevRow = Tables<'gorevler'> & {
    ilgili_firma: { unvan: string | null } | null;
    atanan_kisi: { tam_ad: string | null } | null;
};

const PRIORITAT_FARBEN: Record<string, { bg: string; text: string; border: string; }> = {
    'Düşük': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500' },
    'Orta': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-500' },
    'Yüksek': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500' },
};

const STATUS_FARBEN: Record<string, string> = {
    true: 'bg-green-100 text-green-800',
    false: 'bg-accent/20 text-accent'
}

export default async function GorevlerListPage({
    searchParams
}: {
    searchParams?: {
        durum?: string;
        atanan?: string;
        oncelik?: string;
    };
}) {
    const supabase = createSupabaseServerClient();

    // ### NEUE, ROBUSTE DATENLADESTRATEGIE ###

    // 1. Hole nur die gefilterten Aufgaben (ohne Verknüpfungen)
    let query = supabase.from('gorevler').select('*');
    if (searchParams?.durum === 'acik') query = query.eq('tamamlandi', false);
    if (searchParams?.durum === 'tamamlandi') query = query.eq('tamamlandi', true);
    if (searchParams?.atanan) query = query.eq('atanan_kisi_id', searchParams.atanan);
    if (searchParams?.oncelik) query = query.eq('oncelik', searchParams.oncelik);

    const { data: gorevlerData, error: gorevlerError } = await query.order('son_tarih', { ascending: true, nullsFirst: false });

    // 2. Hole alle Firmen und Profile separat für das Mapping
    const [firmalarRes, profillerRes] = await Promise.all([
        supabase.from('firmalar').select('id, unvan'),
        supabase.from('profiller').select('id, tam_ad')
    ]);
    const { data: firmalar, error: firmalarError } = firmalarRes;
    const { data: profiller, error: profillerError } = profillerRes;

    if (gorevlerError || firmalarError || profillerError) {
        console.error('Görevler yüklenirken hata oluştu:', gorevlerError || firmalarError || profillerError);
        return (
            <div className="flex h-full items-center justify-center p-6"><p>Fehler beim Laden der Daten.</p></div>
        );
    }
    
    // 3. Erstelle "Maps" für schnellen Zugriff (effizienter als .find() in einer Schleife)
    const firmaMap = new Map((firmalar || []).map(f => [f.id, f.unvan]));
    const profilMap = new Map((profiller || []).map(p => [p.id, p.tam_ad]));

    // 4. Füge die Daten im Code zusammen
    const gorevListe: GorevRow[] = (gorevlerData || []).map(gorev => ({
        ...gorev,
        ilgili_firma: gorev.ilgili_firma_id ? { unvan: firmaMap.get(gorev.ilgili_firma_id) || null } : null,
        atanan_kisi: gorev.atanan_kisi_id ? { tam_ad: profilMap.get(gorev.atanan_kisi_id) || null } : null,
    }));

    const anzahlAufgaben = gorevListe.length;
    const oncelikOptions: Tables<'gorevler'>['oncelik'][] = ['Düşük', 'Orta', 'Yüksek'];

    const formatDate = (date: string | null) => {
        if (!date) return 'Unbestimmt';
        return new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8 font-sans text-text-main">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">Aufgabenverwaltung</h1>
                    <p className="text-text-main/80 mt-1">{anzahlAufgaben} Aufgaben gelistet.</p>
                </div>
                <Link href="/admin/gorevler/ekle" passHref>
                    <button className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto">
                        <FiPlus size={18} /> Neue Aufgabe
                    </button>
                </Link>
            </header>

            <GorevFiltreleri profiller={profiller || []} oncelikler={oncelikOptions} />

            {anzahlAufgaben === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-bg-subtle rounded-lg bg-white shadow-sm">
                    <FiClipboard className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h2 className="font-serif text-2xl font-semibold text-primary">
                        {Object.keys(searchParams || {}).length > 0 ? 'Keine passenden Aufgaben gefunden' : 'Noch keine Aufgaben vorhanden'}
                    </h2>
                    <p className="mt-2 text-text-main/70">
                        {Object.keys(searchParams || {}).length > 0 ? 'Ändern Sie Ihre Filterkriterien.' : 'Fügen Sie eine neue Aufgabe hinzu, um zu beginnen.'}
                    </p>
                </div>
            ) : (
                <div>
                    {/* ## Mobile/Tablet Ansicht (Karten) ## */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
                        {gorevListe.map(gorev => {
                            const prio = PRIORITAT_FARBEN[gorev.oncelik] || { border: 'border-gray-300' };
                            return (
                                <div key={gorev.id} className={`bg-white rounded-lg shadow-md border-l-4 p-4 flex flex-col gap-3 ${gorev.tamamlandi ? 'opacity-60 bg-gray-50' : prio.border}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-grow">
                                            <p className={`font-bold text-base ${gorev.tamamlandi ? 'line-through text-gray-500' : 'text-primary'}`}>{gorev.baslik}</p>
                                            {gorev.ilgili_firma?.unvan && <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1"><FiBriefcase size={12}/> {gorev.ilgili_firma.unvan}</p>}
                                        </div>
                                        <div className="flex-shrink-0 ml-2">
                                            {gorev.tamamlandi ? <GorevGeriAlButton gorevId={gorev.id} /> : <GorevTamamlaButton gorevId={gorev.id} />}
                                        </div>
                                    </div>
                                    <div className="border-t border-bg-subtle pt-3 flex justify-between items-center text-xs text-text-main/80">
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

                    {/* ## Desktop Ansicht (optimierte Tabelle) ## */}
                    <div className="hidden lg:block overflow-x-auto bg-white rounded-lg shadow-md">
                        <table className="min-w-full divide-y divide-bg-subtle">
                            <thead className="bg-bg-subtle">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider w-2/5">Aufgabe</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider">Zugewiesen an</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider">Priorität</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider">Fälligkeitsdatum</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-text-main uppercase tracking-wider">Aktion</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-bg-subtle">
                                {gorevListe.map((gorev) => {
                                    const prio = PRIORITAT_FARBEN[gorev.oncelik] || { bg: 'bg-gray-100', text: 'text-gray-800' };
                                    return (
                                        <tr key={gorev.id} className={`transition-colors duration-150 ${gorev.tamamlandi ? 'opacity-50 bg-gray-50' : 'hover:bg-bg-subtle/50'}`}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                                                <div className={`font-bold ${gorev.tamamlandi ? 'line-through' : ''}`}>{gorev.baslik}</div>
                                                {gorev.ilgili_firma?.unvan && <div className="text-xs font-normal text-gray-500">{gorev.ilgili_firma.unvan}</div>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{gorev.atanan_kisi?.tam_ad ?? 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`inline-flex px-3 py-1 text-xs font-semibold leading-5 rounded-full ${prio.bg} ${prio.text}`}>{gorev.oncelik}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{formatDate(gorev.son_tarih)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold leading-5 rounded-full ${STATUS_FARBEN[gorev.tamamlandi.toString()]}`}>
                                                    {gorev.tamamlandi ? <FiCheckCircle /> : <FiCircle />}
                                                    {gorev.tamamlandi ? 'Abgeschlossen' : 'Offen'}
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