// src/app/[locale]/admin/urun-yonetimi/urun-talepleri/page.tsx
// KORRIGIERTE VERSION (Tippfehler in Zeile 108 behoben)

import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FiPackage, FiCalendar, FiClock, FiCheckCircle, FiHardDrive, FiXCircle, FiMessageSquare } from 'react-icons/fi';
import { getDictionary } from '@/dictionaries';
import { Enums, Tables, Database } from '@/lib/supabase/database.types';
import { Locale } from '@/i18n-config';
import UrunTalepFiltreleri from './UrunTalepFiltreleri';
import UrunTalepAktionen from './UrunTalepAktionen';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';

// Status-Definitionen
type UrunStatusKey = Enums<'urun_talep_durumu'>;
const STATUS_ICONS: Record<string, React.ElementType> = { 'Yeni': FiClock, 'Değerlendiriliyor': FiPackage, 'Onaylandı': FiCheckCircle, 'Reddedildi': FiXCircle };
const STATUS_COLORS: Record<string, string> = { 'Yeni': 'text-yellow-600 bg-yellow-100', 'Değerlendiriliyor': 'text-blue-600 bg-blue-100', 'Onaylandı': 'text-green-600 bg-green-100', 'Reddedildi': 'text-red-600 bg-red-100' };

export const dynamic = 'force-dynamic';

// Typ für Abfragedaten
type UrunTalepRow = Tables<'yeni_urun_talepleri'> & {
    firma: Pick<Tables<'firmalar'>, 'unvan'> | null;
};

// Props-Typ für die Seite
interface UrunTalepleriPageProps {
    params: { locale: Locale };
    searchParams?: { status?: string; firmaId?: string; q?: string; };
}

// Funktion zum Extrahieren des Produktnamens (falls benötigt, hier nicht direkt)
// const getProductName = (urunAdJson: any, currentLocale: Locale): string => { ... };

export default async function UrunTalepleriPage({
    params,
    searchParams
}: UrunTalepleriPageProps) {
    noStore(); // Caching deaktivieren
    const locale = params.locale;

    // --- Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE ---

    // Optional: Benutzerprüfung
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) { return redirect(`/${locale}/login`); }
    // ... Rollenprüfung ...

    const dictionary = await getDictionary(locale);

    const content = (dictionary as any).adminDashboard?.productRequestsPage || {
        title: "Produkt-Anfragen",
        description: "Anfragen von Partnern für neue Produkte.",
        noRequests: "Keine Anfragen gefunden.",
        noRequestsFilter: "Keine Anfragen für Filter gefunden.",
        statusOptions: { "Yeni": "Neu", "Değerlendiriliyor": "Wird geprüft", "Onaylandı": "Akzeptiert", "Reddedildi": "Abgelehnt" }
    };

    const statusOptions = content.statusOptions || {};
    const statusTranslations = statusOptions; // Übersetzungen

    // Basisabfrage mit Join
    let query = supabase
        .from('yeni_urun_talepleri')
        .select(`*, firma: firmalar!inner (unvan)`); // !inner Join

    // Filter anwenden
    if (searchParams?.status) {
        query = query.eq('status', searchParams.status as UrunStatusKey);
    }
    if (searchParams?.firmaId) {
        query = query.eq('firma_id', searchParams.firmaId);
    }
    if (searchParams?.q) {
        const aramaTerimi = `%${searchParams.q}%`;
        const { data: eslesenFirmalar, error: firmaSearchError } = await supabase
            .from('firmalar')
            .select('id')
            .ilike('unvan', aramaTerimi);
        
        if (firmaSearchError) {
             console.error("Fehler bei Firmensuche für Produktanfragen-Filter:", firmaSearchError);
        }
        const firmaIdListesi = eslesenFirmalar?.map(f => f.id) || [];

        query = query.or(
            `produkt_name.ilike.${aramaTerimi}` +
            (firmaIdListesi.length > 0 ? `,firma_id.in.(${firmaIdListesi.join(',')})` : '')
        );
    }

    // Daten parallel abrufen
    const [anfragenRes, firmalarRes] = await Promise.all([
        query.order('created_at', { ascending: false }),
        supabase.from('firmalar').select('id, unvan').order('unvan') // Für Filter-Dropdown
    ]);

    // --- KORREKTUR HIER ---
    const { data: anfragen, error: anfragenError } = anfragenRes; // 'error' umbenannt
    const { data: firmalar, error: firmalarError } = firmalarRes;

    // Fehlerbehandlung (angepasst)
    if (anfragenError || firmalarError) {
        console.error("Fehler beim Laden der Produktanfragen oder Firmen:", anfragenError || firmalarError);
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">Daten konnten nicht geladen werden. Details in Server-Logs.</div>;
    }
    // --- ENDE KORREKTUR ---

    // Typ-Zuweisung
    const anfrageListe: UrunTalepRow[] = (anfragen as any[]) || []; // Sicherer Cast
    // Datumsformatierung
    const formatDate = (dateStr: string | null): string => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
             return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
    };

    // Optionen für Filter-Dropdown
    const durumSecenekleri = Object.entries(statusOptions).map(([anahtar, deger]) => ({
        anahtar: anahtar as UrunStatusKey,
        deger: deger as string
    }));

    return (
        <main className="space-y-8">
            {/* Header */}
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">{content.title}</h1>
                <p className="text-text-main/80 mt-1">{anfrageListe?.length || 0} {content.description}</p>
            </header>

            {/* Filter */}
            <UrunTalepFiltreleri firmalar={firmalar || []} durumlar={durumSecenekleri} locale={locale} />

            {/* Liste oder "Keine Ergebnisse" */}
            {anfrageListe.length === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-gray-200 rounded-lg bg-white shadow-sm">
                    <FiMessageSquare className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h2 className="font-serif text-2xl font-semibold text-primary">
                        {Object.keys(searchParams || {}).filter(k => k !== 'locale').length > 0 ? content.noRequestsFilter : content.noRequests}
                    </h2>
                     <p className="text-gray-500 mt-1">
                         {Object.keys(searchParams || {}).filter(k => k !== 'locale').length > 0 ? 'Versuchen Sie, Ihre Filterkriterien zu ändern.' : ''}
                     </p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {['Firma', 'Anfrage', 'Geschätzte Menge', 'Anfragedatum', 'Status', 'Aktionen/Notiz'].map(header => (
                                    <th key={header} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {anfrageListe.map((anfrage) => {
                                const firmaUnvan = anfrage.firma!.unvan || 'Unbekannt';
                                const statusKey = anfrage.status as UrunStatusKey;
                                const translatedStatus = (statusTranslations as Record<string, string>)[statusKey] || statusKey;
                                const StatusIcon = STATUS_ICONS[statusKey] || FiClock;
                                const statusColor = STATUS_COLORS[statusKey] || 'text-gray-600 bg-gray-100';

                                return (
                                    <tr key={anfrage.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-semibold text-primary align-top whitespace-nowrap">
                                             <Link href={`/${locale}/admin/crm/firmalar/${anfrage.firma_id}`} className="hover:underline hover:text-accent">
                                                 {firmaUnvan}
                                             </Link>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-main align-top max-w-xs">
                                            <p className="font-bold">{anfrage.produkt_name}</p>
                                            <p className="text-xs text-gray-500 mt-1 truncate" title={anfrage.beschreibung || ''}>{anfrage.beschreibung || 'Keine Beschreibung'}</p>
                                            {anfrage.referenz_link_gorsel && <a href={anfrage.referenz_link_gorsel} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline mt-1 block">Referenz ansehen</a>}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 align-top whitespace-nowrap">{anfrage.geschaetzte_menge_pro_woche || '-'} / Woche</td>
                                        <td className="px-6 py-4 text-sm align-top whitespace-nowrap">{formatDate(anfrage.created_at)}</td>
                                        <td className="px-6 py-4 align-top whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                                <StatusIcon size={12} /> {translatedStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm space-y-2 align-top w-56">
                                            <UrunTalepAktionen talep={anfrage} locale={locale} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}