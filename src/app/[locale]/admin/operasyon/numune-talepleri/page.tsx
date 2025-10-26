// src/app/[locale]/admin/operasyon/numune-talepleri/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FiPackage, FiCalendar, FiClock, FiCheckCircle, FiTruck, FiHardDrive, FiXCircle } from 'react-icons/fi';
import { getDictionary } from '@/dictionaries';
import { Enums, Tables, Database } from '@/lib/supabase/database.types'; // Database hinzugefügt
import { Locale } from '@/i18n-config';
import NumuneStatusUpdateButton from './NumuneStatusUpdateButton';
import NumuneCancelButton from './NumuneCancelButton';
import NumuneFiltreleri from './NumuneFiltreleri';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { redirect } from 'next/navigation'; // Import für Redirect
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

export const dynamic = 'force-dynamic'; // Sicherstellen, dass die Seite dynamisch ist

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

// Typ für die Zeile in der Tabelle
type NumuneTalepRow = Tables<'numune_talepleri'> & {
    firma: Pick<Tables<'firmalar'>, 'unvan'> | null;
    urun: Pick<Tables<'urunler'>, 'ad' | 'stok_kodu' | 'id'> | null;
};

// Props-Typ für die Seite
interface MusteranfragenPageProps { // Props-Typ hinzugefügt
    params: { locale: Locale };
    searchParams?: { status?: string; firmaId?: string; q?: string; };
}

// Funktion zum Extrahieren des Produktnamens
const getProductName = (urunAdJson: Database['public']['Tables']['urunler']['Row']['ad'] | null | undefined, currentLocale: Locale): string => {
    if (!urunAdJson || typeof urunAdJson !== 'object') return 'Produkt nicht gefunden';
    return (urunAdJson as any)[currentLocale] || (urunAdJson as any)['de'] || (urunAdJson as any)['tr'] || Object.values(urunAdJson)[0] || 'Name fehlt';
};

export default async function MusteranfragenPage({
    params,
    searchParams
}: MusteranfragenPageProps) { // Props-Typ verwenden
    noStore(); // Caching deaktivieren
    const locale = params.locale;

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    // Optional: Benutzerprüfung
    // const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    // if (!user) { return redirect(`/${locale}/login`); }
    // ... Rollenprüfung ...

    const dictionary = await getDictionary(locale);
    // Sicherer Zugriff auf Dictionary-Einträge
    const content = (dictionary as any).adminDashboard?.sampleRequestsPage || {
        title: "Musteranfragen",
        description: "Anfragen aufgelistet.",
        noRequests: "Keine Anfragen gefunden.",
        noRequestsFilter: "Keine Anfragen für Filter gefunden.",
        statuses: {}, // Übersetzungen der Status für Anzeige
        statusOptions: {} // Optionen für Filter-Dropdown
    };
    const statusTranslations = content.statuses || {};
    // Optionen für Filter-Dropdown (aus Dictionary oder DB-Enum generieren)
    const statusKeysFromEnum = Object.keys(STATUS_COLORS) as NumuneStatusKey[]; // Annahme: Alle Status haben Farben
    const durumSecenekleri = statusKeysFromEnum.map(key => ({
         anahtar: key,
         deger: (content.statusOptions as Record<string, string>)[key] || key // Übersetzung oder Schlüssel
    }));


    // Basisabfrage mit Joins
    let query = supabase
        .from('numune_talepleri')
        .select(`
            *,
            firma: firmalar!inner (unvan),
            urun: urunler!inner (id, ad, stok_kodu)
        `); // !inner verwenden, wenn Firma/Produkt existieren MUSS

    // Filter anwenden
    if (searchParams?.status) {
        query = query.eq('durum', searchParams.status as NumuneStatusKey);
    }
    if (searchParams?.firmaId) {
        query = query.eq('firma_id', searchParams.firmaId);
    }
    // Suche implementieren
    if (searchParams?.q) {
        const aramaTerimi = `%${searchParams.q}%`;
        // Suche in Firmennamen über Join
        // WICHTIG: Die Syntax für Joins in Filtern kann komplex sein.
        // Einfachere Alternative: Erst Firmen-IDs holen, dann filtern.
        const { data: eslesenFirmalar } = await supabase
              .from('firmalar')
              .select('id')
              .ilike('unvan', aramaTerimi);
        const firmaIdListesi = eslesenFirmalar?.map(f => f.id) || [];

        // TODO: Suche nach Produktnamen (JSONB) - Erfordert spezielle Abfrage
        // Beispiel (PostgreSQL Syntax, muss ggf. angepasst werden):
        // query = query.or(`urun->ad->>'${locale}'.ilike.${aramaTerimi},urun->ad->>'de'.ilike.${aramaTerimi},firma_id.in.(${...})`);

        // Vorerst nur nach Firma filtern, wenn gefunden
        if (firmaIdListesi.length > 0) {
            query = query.in('firma_id', firmaIdListesi);
        } else {
            // Wenn Suche aktiv, aber keine Firma gefunden wurde, leeres Ergebnis erzwingen
             query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // Ungültige ID
        }
    }

    // Daten parallel abrufen: Anfragen und Firmenliste für Filter
    const [anfragenRes, firmalarRes] = await Promise.all([
        query.order('created_at', { ascending: false }),
        supabase.from('firmalar').select('id, unvan').order('unvan') // Für Filter-Dropdown
    ]);

    const { data: anfragen, error } = anfragenRes;
    const { data: firmalar, error: firmalarError } = firmalarRes;

    // Fehlerbehandlung
    if (error || firmalarError) {
        console.error("Fehler beim Laden der Musteranfragen oder Firmen:", error || firmalarError);
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">Fehler beim Laden der Daten. Details in den Server-Logs.</div>;
    }

    // Typ-Zuweisung
    const anfrageListe: NumuneTalepRow[] = (anfragen as any[]) || []; // Sicherer Cast
    // Datumsformatierung
    const formatDate = (dateStr: string | null): string => {
         if (!dateStr) return '-';
         try {
             return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
         } catch {
             return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
         }
    };


    return (
        <main className="space-y-8">
            {/* Header */}
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">{content.title || "Musteranfragen"}</h1>
                <p className="text-text-main/80 mt-1">{anfrageListe?.length || 0} {content.description || "Anfragen gefunden."}</p>
            </header>

            {/* Filter */}
            <NumuneFiltreleri firmalar={firmalar || []} durumlar={durumSecenekleri} locale={locale} /> {/* Locale übergeben */}

            {/* Liste oder "Keine Ergebnisse" */}
            {anfrageListe.length === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-gray-200 rounded-lg bg-white shadow-sm">
                    <FiHardDrive className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h2 className="font-serif text-2xl font-semibold text-primary">
                        {/* Prüft, ob mehr als nur 'locale' in searchParams ist */}
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
                                {/* Spaltenüberschriften anpassen */}
                                {['Firma', 'Produkt', 'Artikel-Nr.', 'Anfragedatum', 'Status', 'Aktionen'].map(header => (
                                    <th key={header} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {anfrageListe.map((anfrage) => {
                                const firmaUnvan = anfrage.firma?.unvan || 'Unbekannt';
                                // Produktnamen mit Locale holen
                                const urunAdi = getProductName(anfrage.urun?.ad, locale);
                                const urunStokKodu = anfrage.urun?.stok_kodu || '-';

                                const statusKey = anfrage.durum as NumuneStatusKey; // Typ-Zuweisung
                                // Übersetzung oder Schlüssel verwenden
                                const translatedStatus = (statusTranslations as Record<string, string>)[statusKey] || statusKey;
                                const StatusIcon = STATUS_ICONS[statusKey] || FiPackage; // Fallback
                                const statusColor = STATUS_COLORS[statusKey] || 'text-gray-600 bg-gray-100'; // Fallback

                                // Prüfen, ob Status final ist (keine weiteren Aktionen)
                                const isFinalState = statusKey === 'Gönderildi' || statusKey === 'İptal Edildi';

                                return (
                                    <tr key={anfrage.id} className="hover:bg-gray-50/50 transition-colors">
                                        {/* Firma */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary">
                                             {anfrage.firma_id ? (
                                                  <Link href={`/${locale}/admin/crm/firmalar/${anfrage.firma_id}`} className="hover:underline hover:text-accent">
                                                      {firmaUnvan}
                                                  </Link>
                                             ) : firmaUnvan}
                                        </td>
                                        {/* Produkt */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-accent font-bold">
                                             {anfrage.urun_id ? (
                                                  <Link href={`/${locale}/admin/urun-yonetimi/urunler/${anfrage.urun_id}`} className="hover:underline">
                                                      {urunAdi}
                                                  </Link>
                                             ): urunAdi}
                                        </td>
                                        {/* Artikel-Nr. */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{urunStokKodu}</td>
                                        {/* Datum */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(anfrage.created_at)}</td>
                                        {/* Status */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                                <StatusIcon size={12} /> {translatedStatus}
                                            </span>
                                            {/* Ablehnungsgrund anzeigen */}
                                            {statusKey === 'İptal Edildi' && anfrage.iptal_aciklamasi && (
                                                <p className="text-xs text-red-500 mt-1 italic max-w-xs truncate" title={anfrage.iptal_aciklamasi}>
                                                    Grund: {anfrage.iptal_aciklamasi}
                                                </p>
                                            )}
                                        </td>
                                        {/* Aktionen */}
                                        <td className="px-6 py-4 text-sm space-x-1 whitespace-nowrap">
                                            {/* Buttons nur anzeigen, wenn Status nicht final ist */}
                                            {!isFinalState && (
                                                <>
                                                    {statusKey === 'Yeni Talep' && (
                                                        <NumuneStatusUpdateButton anfrageId={anfrage.id} neuerStatus="Onaylandı" label="Bestätigen" icon={<FiCheckCircle size={12}/>} className="bg-blue-100 text-blue-700 hover:bg-blue-200" locale={locale} />
                                                    )}
                                                    {statusKey === 'Onaylandı' && (
                                                        <NumuneStatusUpdateButton anfrageId={anfrage.id} neuerStatus="Hazırlanıyor" label="Vorbereiten" icon={<FiPackage size={12}/>} className="bg-purple-100 text-purple-700 hover:bg-purple-200" locale={locale} />
                                                    )}
                                                    {statusKey === 'Hazırlanıyor' && (
                                                        <NumuneStatusUpdateButton anfrageId={anfrage.id} neuerStatus="Gönderildi" label="Senden" icon={<FiTruck size={12}/>} className="bg-green-100 text-green-700 hover:bg-green-200" locale={locale} />
                                                    )}
                                                    {/* Storno-Button immer anzeigen, solange nicht final */}
                                                    <NumuneCancelButton anfrageId={anfrage.id} locale={locale} />
                                                </>
                                            )}
                                            {/* Platzhalter, wenn final */}
                                            {isFinalState && (<span className="text-xs text-gray-400">—</span>)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
             {/* Optional: Paginierung hier */}
        </main>
    );
}