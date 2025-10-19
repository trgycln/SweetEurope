// src/app/[locale]/admin/urun-yonetimi/urun-talepleri/page.tsx (Korrigiert)
import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FiPackage, FiCalendar, FiClock, FiCheckCircle, FiHardDrive, FiXCircle, FiMessageSquare } from 'react-icons/fi';
import { getDictionary } from '@/dictionaries';
import { Enums, Tables } from '@/lib/supabase/database.types';
import { Locale } from '@/i18n-config'; // Pfad ggf. anpassen
import UrunTalepFiltreleri from './UrunTalepFiltreleri';
import UrunTalepAktionen from './UrunTalepAktionen';

// Status-Definitionen
type UrunStatusKey = Enums<'urun_talep_durumu'>;
const STATUS_ICONS: Record<string, React.ElementType> = { 'Yeni': FiClock, 'Değerlendiriliyor': FiPackage, 'Onaylandı': FiCheckCircle, 'Reddedildi': FiXCircle };
const STATUS_COLORS: Record<string, string> = { 'Yeni': 'text-yellow-600 bg-yellow-100', 'Değerlendiriliyor': 'text-blue-600 bg-blue-100', 'Onaylandı': 'text-green-600 bg-green-100', 'Reddedildi': 'text-red-600 bg-red-100' };

export const dynamic = 'force-dynamic';

// Typ für Abfragedaten
type UrunTalepRow = Tables<'yeni_urun_talepleri'> & {
    firma: Pick<Tables<'firmalar'>, 'unvan'> | null;
};

export default async function UrunTalepleriPage({ 
    params,
    searchParams 
}: { 
    params: { locale: Locale };
    searchParams?: { status?: string; firmaId?: string; q?: string; };
}) {
    const supabase = createSupabaseServerClient();
    const locale = params.locale;
    const dictionary = await getDictionary(locale);
    
    const content = (dictionary as any).adminDashboard?.productRequestsPage || {
        title: "Produkt-Anfragen",
        description: "Anfragen von Partnern für neue Produkte.",
        noRequests: "Keine Anfragen gefunden.",
        noRequestsFilter: "Keine Anfragen für Filter gefunden.",
        statusOptions: { "Yeni": "Neu", "Değerlendiriliyor": "Wird geprüft", "Onaylandı": "Akzeptiert", "Reddedildi": "Abgelehnt" }
    };
    
    // KORREKTUR: Hole das Objekt 'statusOptions' aus dem content
    const statusOptions = content.statusOptions || {};
    // KORREKTUR: Verwende 'statusOptions' auch für die Übersetzungen in der Tabelle
    const statusTranslations = statusOptions;

    let query = supabase
        .from('yeni_urun_talepleri')
        .select(`*, firma: firmalar!firma_id (unvan)`);

    // Filter anwenden
    if (searchParams?.status) {
        query = query.eq('status', searchParams.status as UrunStatusKey);
    }
    if (searchParams?.firmaId) {
        query = query.eq('firma_id', searchParams.firmaId);
    }
    if (searchParams?.q) {
        const aramaTerimi = `%${searchParams.q}%`;
        const { data: eslesenFirmalar } = await supabase.from('firmalar').select('id').ilike('unvan', aramaTerimi);
        const firmaIdListesi = eslesenFirmalar?.map(f => f.id) || [];
        
        query = query.or(`produkt_name.ilike.${aramaTerimi}${firmaIdListesi.length > 0 ? `,firma_id.in.(${firmaIdListesi.join(',')})` : ''}`);
    }

    // Daten parallel abrufen
    const [anfragenRes, firmalarRes] = await Promise.all([
        query.order('created_at', { ascending: false }),
        supabase.from('firmalar').select('id, unvan').order('unvan')
    ]);

    const { data: anfragen, error } = anfragenRes;
    const { data: firmalar, error: firmalarError } = firmalarRes;

    if (error || firmalarError) {
        console.error("Fehler beim Laden der Produktanfragen:", error || firmalarError);
        return <div className="p-6 text-red-500">Daten konnten nicht geladen werden.</div>;
    }

    const anfrageListe: UrunTalepRow[] = anfragen as any;
    const formatDate = (dateStr: string | null) => new Date(dateStr || 0).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

    // KORREKTUR: Verwende die oben definierte Variable 'statusOptions'
    const durumSecenekleri = Object.entries(statusOptions).map(([anahtar, deger]) => ({
        anahtar: anahtar as UrunStatusKey,
        deger: deger as string
    }));

    return (
        <main className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">{content.title}</h1>
                <p className="text-text-main/80 mt-1">{anfrageListe?.length || 0} {content.description}</p>
            </header>
            
            <UrunTalepFiltreleri firmalar={firmalar || []} durumlar={durumSecenekleri} />

            {anfrageListe.length === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-bg-subtle rounded-lg bg-white shadow-sm">
                    <FiMessageSquare className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h2 className="font-serif text-2xl font-semibold text-primary">
                        {Object.keys(searchParams || {}).length > 1 ? content.noRequestsFilter : content.noRequests}
                    </h2>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                    <table className="min-w-full divide-y divide-bg-subtle">
                        <thead className="bg-bg-subtle">
                            <tr>
                                {['Firma', 'Anfrage', 'Geschätzte Menge', 'Anfragedatum', 'Status', 'Aktionen/Notiz'].map(header => (
                                    <th key={header} className="px-6 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-bg-subtle">
                            {anfrageListe.map((anfrage) => {
                                const firmaUnvan = anfrage.firma?.unvan || 'Unbekannt';
                                const statusKey = anfrage.status;
                                // KORREKTUR: 'statusTranslations' verwenden
                                const translatedStatus = (statusTranslations as any)[statusKey] || statusKey;
                                const StatusIcon = STATUS_ICONS[statusKey] || FiClock;
                                const statusColor = STATUS_COLORS[statusKey] || 'text-gray-600 bg-gray-100';

                                return (
                                    <tr key={anfrage.id} className="hover:bg-bg-subtle/50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-semibold text-primary align-top">{firmaUnvan}</td>
                                        <td className="px-6 py-4 text-sm text-text-main align-top max-w-xs">
                                            <p className="font-bold">{anfrage.produkt_name}</p>
                                            <p className="text-xs text-gray-500 mt-1 truncate" title={anfrage.beschreibung || ''}>{anfrage.beschreibung}</p>
                                            {anfrage.referenz_link_gorsel && <a href={anfrage.referenz_link_gorsel} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">Referenz ansehen</a>}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 align-top">{anfrage.geschaetzte_menge_pro_woche || '-'} / Woche</td>
                                        <td className="px-6 py-4 text-sm align-top">{formatDate(anfrage.created_at)}</td>
                                        <td className="px-6 py-4 align-top">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                                <StatusIcon size={12} /> {translatedStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm space-y-2 align-top w-56">
                                            <UrunTalepAktionen talep={anfrage} />
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