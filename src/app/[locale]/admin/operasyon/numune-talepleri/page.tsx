// src/app/[locale]/admin/operasyon/numune-talepleri/page.tsx (Vollständig)
import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FiPackage, FiCalendar, FiClock, FiCheckCircle, FiTruck, FiHardDrive, FiXCircle } from 'react-icons/fi';
import { getDictionary } from '@/dictionaries';
import { Enums, Tables } from '@/lib/supabase/database.types';
import { Locale } from '@/i18n-config'; // Pfad ggf. anpassen
import NumuneStatusUpdateButton from './NumuneStatusUpdateButton';
import NumuneCancelButton from './NumuneCancelButton';
// NEU: Filterkomponente importieren
import NumuneFiltreleri from './NumuneFiltreleri';

// Status-Definitionen
type NumuneStatusKey = Enums<'numune_talep_durumu'>;
const STATUS_ICONS: Record<string, React.ElementType> = {
    'Yeni Talep': FiClock,
    'Onaylandı': FiCheckCircle,
    'Hazırlanıyor': FiPackage,
    'Gönderildi': FiTruck,
    'İptal Edildi': FiXCircle,
};
const STATUS_COLORS: Record<string, string> = {
    'Yeni Talep': 'text-yellow-600 bg-yellow-100',
    'Onaylandı': 'text-blue-600 bg-blue-100',
    'Hazırlanıyor': 'text-purple-600 bg-purple-100',
    'Gönderildi': 'text-green-600 bg-green-100',
    'İptal Edildi': 'text-red-600 bg-red-100',
};

export const dynamic = 'force-dynamic';

type NumuneTalepRow = Tables<'numune_talepleri'> & {
    firma: Pick<Tables<'firmalar'>, 'unvan'> | null;
    urun: Pick<Tables<'urunler'>, 'ad' | 'stok_kodu' | 'id'> | null;
};

export default async function MusteranfragenPage({ 
    params,
    searchParams 
}: { 
    params: { locale: Locale };
    searchParams?: { status?: string; firmaId?: string; q?: string; };
}) {
    const supabase = createSupabaseServerClient();
    const locale = params.locale;
    const dictionary = await getDictionary(locale);
    // Sicherer Zugriff auf Dictionary-Einträge
    const content = (dictionary as any).adminDashboard?.sampleRequestsPage || {
        title: "Musteranfragen",
        description: "Anfragen aufgelistet.",
        noRequests: "Keine Anfragen gefunden.",
        noRequestsFilter: "Keine Anfragen für Filter gefunden.",
        statuses: {},
        statusOptions: {}
    };
    const statusTranslations = content.statuses || {};
    const statusOptions = content.statusOptions || {};

    let query = supabase
        .from('numune_talepleri')
        .select(` *, firma: firmalar!firma_id (unvan), urun: urunler!urun_id (id, ad, stok_kodu) `);

    // Filter anwenden
    if (searchParams?.status) {
        query = query.eq('durum', searchParams.status as NumuneStatusKey);
    }
    if (searchParams?.firmaId) {
        query = query.eq('firma_id', searchParams.firmaId);
    }
    if (searchParams?.q) {
        const aramaTerimi = `%${searchParams.q}%`;
        
        // Suche in Firmennamen
        const { data: eslesenFirmalar } = await supabase.from('firmalar').select('id').ilike('unvan', aramaTerimi);
        const firmaIdListesi = eslesenFirmalar?.map(f => f.id) || [];
        
        // TODO: Suche nach Produktnamen (JSONB)
        
        if (firmaIdListesi.length > 0) {
            query = query.in('firma_id', firmaIdListesi);
        } else {
             if (searchParams.q) {
                query = query.eq('id', '00000000-0000-0000-0000-000000000000');
             }
        }
    }

    // Daten parallel abrufen
    const [anfragenRes, firmalarRes] = await Promise.all([
        query.order('created_at', { ascending: false }),
        supabase.from('firmalar').select('id, unvan').order('unvan')
    ]);

    const { data: anfragen, error } = anfragenRes;
    const { data: firmalar, error: firmalarError } = firmalarRes;

    if (error || firmalarError) {
        console.error("Fehler beim Laden der Musteranfragen oder Firmen:", error || firmalarError);
        return <div className="p-6 text-red-500">Daten konnten nicht geladen werden.</div>;
    }

    const anfrageListe: NumuneTalepRow[] = anfragen as any;
    const formatDate = (dateStr: string | null) => new Date(dateStr || 0).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Daten für Filter-Dropdown vorbereiten
    const durumSecenekleri = Object.entries(statusOptions).map(([anahtar, deger]) => ({
        anahtar: anahtar as NumuneStatusKey,
        deger: deger as string
    }));

    return (
        <main className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">{content.title}</h1>
                <p className="text-text-main/80 mt-1">{anfrageListe?.length || 0} {content.description}</p>
            </header>
            
            <NumuneFiltreleri firmalar={firmalar || []} durumlar={durumSecenekleri} />

            {anfrageListe.length === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-bg-subtle rounded-lg bg-white shadow-sm">
                    <FiHardDrive className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h2 className="font-serif text-2xl font-semibold text-primary">
                        {Object.keys(searchParams || {}).length > 1 ? content.noRequestsFilter : content.noRequests}
                    </h2>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                    <table className="min-w-full divide-y divide-bg-subtle">
                        <thead className="bg-bg-subtle">
                            <tr>
                                {['Firma', 'Produkt', 'Artikel-Nr.', 'Anfragedatum', 'Status', 'Aktionen'].map(header => (
                                    <th key={header} className="px-6 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-bg-subtle">
                            {anfrageListe.map((anfrage) => {
                                const firmaUnvan = anfrage.firma?.unvan || 'Unbekannt';
                                const urunAdi = (anfrage.urun?.ad as any)?.[locale] || (anfrage.urun?.ad as any)?.['tr'] || 'Unbekannt';
                                const urunStokKodu = anfrage.urun?.stok_kodu || '-';
                                
                                const statusKey = anfrage.durum;
                                const translatedStatus = (statusTranslations as any)[statusKey] || statusKey;
                                const StatusIcon = STATUS_ICONS[statusKey] || FiPackage;
                                const statusColor = STATUS_COLORS[statusKey] || 'text-gray-600 bg-gray-100';
                                
                                const isFinalState = statusKey === 'Gönderildi' || statusKey === 'İptal Edildi';

                                return (
                                    <tr key={anfrage.id} className="hover:bg-bg-subtle/50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-semibold text-primary">{firmaUnvan}</td>
                                        <td className="px-6 py-4 text-sm text-accent font-bold">
                                            <Link href={`/${locale}/admin/urun-yonetimi/urunler/${anfrage.urun_id}`} className="hover:underline">
                                                {urunAdi}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-gray-500">{urunStokKodu}</td>
                                        <td className="px-6 py-4 text-sm">{formatDate(anfrage.created_at)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                                <StatusIcon size={12} /> {translatedStatus}
                                            </span>
                                            {statusKey === 'İptal Edildi' && anfrage.iptal_aciklamasi && (
                                                <p className="text-xs text-red-500 mt-1 italic" title={anfrage.iptal_aciklamasi}>
                                                    Grund: {anfrage.iptal_aciklamasi.substring(0, 30)}...
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm space-x-2">
                                            {!isFinalState && (
                                                <>
                                                    {statusKey === 'Yeni Talep' && (
                                                        <NumuneStatusUpdateButton anfrageId={anfrage.id} neuerStatus="Onaylandı" label="Bestätigen" icon={<FiCheckCircle size={12}/>} className="bg-blue-100 text-blue-700 hover:bg-blue-200" />
                                                    )}
                                                    {statusKey === 'Onaylandı' && (
                                                        <NumuneStatusUpdateButton anfrageId={anfrage.id} neuerStatus="Hazırlanıyor" label="Vorbereiten" icon={<FiPackage size={12}/>} className="bg-purple-100 text-purple-700 hover:bg-purple-200" />
                                                    )}
                                                    {statusKey === 'Hazırlanıyor' && (
                                                        <NumuneStatusUpdateButton anfrageId={anfrage.id} neuerStatus="Gönderildi" label="Senden" icon={<FiTruck size={12}/>} className="bg-green-100 text-green-700 hover:bg-green-200" />
                                                    )}
                                                    <NumuneCancelButton anfrageId={anfrage.id} />
                                                </>
                                            )}
                                            {isFinalState && (<span className="text-xs text-gray-400">—</span>)}
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