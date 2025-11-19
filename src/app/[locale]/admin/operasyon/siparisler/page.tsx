// src/app/[locale]/admin/operasyon/siparisler/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FiPackage, FiCalendar, FiDollarSign, FiCheckCircle, FiClock, FiTruck, FiXCircle } from 'react-icons/fi';
import { getDictionary } from '@/dictionaries';
import StatusUpdateButton from './StatusUpdateButton'; // Stellen Sie sicher, dass dieser Pfad korrekt ist
import SiparisFiltreleri from './SiparisFiltreleri'; // Stellen Sie sicher, dass dieser Pfad korrekt ist
import { Enums, Tables, Database } from '@/lib/supabase/database.types'; // Database und Tables importieren
import { Locale } from '@/i18n-config';
import { redirect } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils'; // utils importieren
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren

export const dynamic = 'force-dynamic';

// Typ für die erweiterten Siparis-Daten mit Firma
type SiparisWithFirma = Tables<'siparisler'> & {
    firmalar: Pick<Tables<'firmalar'>, 'unvan'> | null; // Firma-Objekt oder null (Name geändert zu 'firmalar')
};

// Mögliche Statuswerte aus der DB (inklusive Ihrer spezifischen Werte)
const DB_STATUSES: ReadonlyArray<Enums<'siparis_durumu'>> = ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'Teslim Edildi', 'İptal Edildi', 'processing']; // ReadonlyArray für Sicherheit
const OFFENE_STATUS: ReadonlyArray<Enums<'siparis_durumu'>> = ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'processing'];

// Status Icons und Farben (mit Anführungszeichen für Schlüssel mit Sonderzeichen)
const STATUS_ICONS: Record<string, React.ElementType> = {
    'Beklemede': FiClock,
    'Hazırlanıyor': FiClock,
    'processing': FiClock,
    'Yola Çıktı': FiTruck,
    'Teslim Edildi': FiCheckCircle,
    'İptal Edildi': FiXCircle
};
const STATUS_COLORS: Record<string, string> = {
    'Beklemede': 'text-gray-600 bg-gray-100',
    'Hazırlanıyor': 'text-blue-600 bg-blue-100',
    'processing': 'text-blue-600 bg-blue-100',
    'Yola Çıktı': 'text-purple-600 bg-purple-100', // Farbe angepasst
    'Teslim Edildi': 'text-green-600 bg-green-100',
    'İptal Edildi': 'text-red-600 bg-red-100'
};


// Props-Typ für die Seite
interface AlleSiparislerPageProps {
    params: Promise<{ locale: Locale }>; // Promise in Next.js 15
    searchParams?: Promise<{ status?: string; firmaId?: string; q?: string; filter?: string; }>; // Promise in Next.js 15
}

export default async function AlleSiparislerPage({
    params,
    searchParams
}: AlleSiparislerPageProps) {
    // Await params und searchParams (Next.js 15 Anforderung)
    const { locale } = await params;
    const searchParamsResolved = await searchParams;

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    const dictionary = await getDictionary(locale);
    // Sicherer Zugriff auf Dictionary-Inhalte
    const content = (dictionary as any).adminDashboard?.ordersPage || {};
    const orderStatusTranslations = (dictionary as any).orderStatuses || {}; // Pfad zu Status-Übersetzungen anpassen!

    // Benutzer prüfen
    const { data: { user }, error: userAuthError } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        console.log("Kein Benutzer gefunden in AlleSiparislerPage, redirect zu Login.");
        return redirect(`/${locale}/login?next=/admin/operasyon/siparisler`);
    }
     // Optional: Rollenprüfung
     // const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
     // if (profile?.rol !== 'Yönetici' && profile?.rol !== 'Ekip Üyesi') { return redirect(`/${locale}/dashboard`); }

    // Abfrage erstellen
    let query = supabase
        .from('siparisler')
        // Einfachere Join-Syntax: Ohne expliziten Foreign Key
        .select(`
            *,
            firmalar (
                unvan
            )
        `);

    // Filter anwenden
    const statusParam = searchParamsResolved?.status as Enums<'siparis_durumu'> | undefined;
    const firmaIdParam = searchParamsResolved?.firmaId;
    const queryParam = searchParamsResolved?.q;
    const filterParam = searchParamsResolved?.filter;

    // Filterlogik (Priorität beachten)
    let appliedStatusFilter: Enums<'siparis_durumu'>[] | null = null; // Für die Filterkomponente merken

    if (statusParam && DB_STATUSES.includes(statusParam)) {
        query = query.eq('siparis_durumu', statusParam);
        appliedStatusFilter = [statusParam];
    } else if (filterParam === 'offen') {
        query = query.in('siparis_durumu', OFFENE_STATUS);
        appliedStatusFilter = [...OFFENE_STATUS]; // Kopie übergeben
    }

    if (firmaIdParam) {
        query = query.eq('firma_id', firmaIdParam);
    }

    // ------------------------------
    // Suche implementieren (Firma + Bestellnummer Prefix)
    // Problem: PostgREST erlaubt kein ilike direkt auf uuid Spalten (id::text Casting nicht in Column-Namen möglich)
    // Lösung: Für ID-Prefix-Suche RPC nutzen (separate Funktion), für Firmennamen normale Query.
    // ------------------------------
    let siparislerData: any[] | null = null;
    let siparislerError: any = null;

    const cleanQuery = queryParam?.replace(/^#/,'').trim();
    const isIdPrefix = !!cleanQuery && /^[0-9a-fA-F-]{3,36}$/.test(cleanQuery); // hex/uuid Fragmente

    if (queryParam) {
        // 1) Firmennamen Kandidaten holen
        const searchPattern = `%${queryParam}%`;
        const { data: matchingFirmen, error: firmaSearchError } = await supabase
            .from('firmalar')
            .select('id')
            .ilike('unvan', searchPattern);
        if (firmaSearchError) console.error('⚠️  Fehler bei Firmensuche:', firmaSearchError);
        const matchingFirmaIds = matchingFirmen?.map(f => f.id) || [];

        // 2) Falls ID-Prefix → RPC verwenden (wir legen separat eine Funktion an)
        let idPrefixRows: any[] = [];
        // RPC Funktion existiert noch nicht im Typesystem -> fallback: später Addon bereitstellen.
        // Vorläufige Lösung: gesamte Tabelle laden (bereits durch vorherige Filter eingeschränkt) und clientseitig filtern.
        if (isIdPrefix) {
            const lowered = cleanQuery!.toLowerCase();
            try {
                // Minimaler Select für ID + firma_id + siparis_durumu + siparis_tarihi (Performance)
                const { data: allForPrefix, error: allErr } = await supabase
                    .from('siparisler')
                    .select('id, firma_id, siparis_durumu, siparis_tarihi, toplam_tutar_brut')
                    .limit(500);
                if (allErr) {
                    console.error('⚠️  Fallback-ID Prefix Ladefehler:', allErr);
                } else {
                    idPrefixRows = (allForPrefix || []).filter(r => typeof r.id === 'string' && r.id.toLowerCase().startsWith(lowered));
                }
            } catch (e) {
                console.error('❌ Unerwarteter Fallback-Fehler bei ID Prefix Filterung:', e);
            }
        }

        // 3) Falls Firmen-Treffer → Grund-Query einschränken
        if (matchingFirmaIds.length > 0) {
            query = query.in('firma_id', matchingFirmaIds);
        }

        // 4) Wenn nur ID-Prefix & keine Firmen-Treffer → wir umgehen die Hauptquery komplett
    const useOnlyIdPrefix = isIdPrefix && matchingFirmaIds.length === 0;

        if (useOnlyIdPrefix) {
            // Filter (Status/Firma) nachträglich anwenden
            let filtered = idPrefixRows as any[];
            if (statusParam) filtered = filtered.filter(r => r.siparis_durumu === statusParam);
            if (firmaIdParam) filtered = filtered.filter(r => r.firma_id === firmaIdParam);
            // Später brauchen wir firmalar.unvan: separate Lookup
            const uniqueFirmaIds = Array.from(new Set(filtered.map(r => r.firma_id).filter(Boolean)));
            if (uniqueFirmaIds.length > 0) {
                const { data: firmaRows } = await supabase.from('firmalar').select('id, unvan').in('id', uniqueFirmaIds as string[]);
                const firmaMap = new Map((firmaRows||[]).map(f => [f.id, f.unvan]));
                filtered = filtered.map(r => ({ ...r, firmalar: { unvan: firmaMap.get(r.firma_id) || null } }));
            }
            siparislerData = filtered;
        } else {
            // Normale Query (ggf. durch Firma eingeschränkt). ID-Prefix zusätzlich clientseitig filtern falls angegeben.
            const { data, error } = await query.order('siparis_tarihi', { ascending: false });
            siparislerError = error;
            if (!error) {
                let rows = data || [];
                if (isIdPrefix) {
                    const lowered = cleanQuery!.toLowerCase();
                    rows = rows.filter(r => r.id.toLowerCase().startsWith(lowered));
                }
                siparislerData = rows;
            }
        }
    } else {
        // Kein Suchbegriff → normale Query
        const { data, error } = await query.order('siparis_tarihi', { ascending: false });
        siparislerError = error;
        siparislerData = data || [];
    }

    // Detailliertes Error-Logging für Bestellungen
    if (siparislerError) {
        console.error("❌ Fehler beim Laden der Bestellungen:");
        console.error("Error Object:", JSON.stringify(siparislerError, null, 2));
        console.error("Message:", siparislerError.message);
        console.error("Details:", siparislerError.details);
        console.error("Hint:", siparislerError.hint);
        console.error("Code:", siparislerError.code);
    }

    // Firmen separat laden (für Filter-Dropdown)
    const { data: firmalar, error: firmalarError } = await supabase.from('firmalar').select('id, unvan').order('unvan');

    // Detailliertes Error-Logging für Firmen
    if (firmalarError) {
        console.error("❌ Fehler beim Laden der Firmen:");
        console.error("Error Object:", JSON.stringify(firmalarError, null, 2));
        console.error("Message:", firmalarError.message);
    }

    if (siparislerError || firmalarError) {
        const errorMsg = siparislerError?.message || firmalarError?.message || "Unbekannter Fehler";
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">
            <h2 className="font-bold mb-2">Fehler beim Laden der Daten</h2>
            <p className="text-sm">{errorMsg}</p>
            <p className="text-xs mt-2 text-gray-600">Details in den Server-Logs.</p>
        </div>;
    }

    // Typ-Anpassung
    const siparisler: SiparisWithFirma[] = (siparislerData as any[]) || []; // Sicherer Cast

    // Optionen für Status-Dropdown erstellen
    const durumSecenekleri = DB_STATUSES.map(dbStatus => ({
        anahtar: dbStatus, // Der DB-Wert
        deger: orderStatusTranslations[dbStatus] || dbStatus // Übersetzung oder DB-Wert
    }));

    return (
        // Container hinzugefügt für Padding etc.
        <main className="space-y-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                     <h1 className="font-serif text-4xl font-bold text-primary">{content.title || 'Bestellverwaltung'}</h1>
                     <p className="text-text-main/80 mt-1">{siparisler.length} {content.ordersListed || 'orders found.'}</p>
                </div>
                 {/* Optional: Button für "Neue Bestellung" (ohne spezifische Firma) */}
                 {/* <Link href={`/${locale}/admin/operasyon/siparisler/yeni`} ... >Neue Bestellung</Link> */}
            </header>

             {/* Filterkomponente */}
             <SiparisFiltreleri
                 firmalar={firmalar || []}
                 durumlar={durumSecenekleri}
                 locale={locale}
                 dictionary={dictionary} // Gesamtes Dictionary übergeben
             />


            {siparisler.length === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-gray-200 rounded-lg bg-white shadow-sm">
                    <FiPackage className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h2 className="font-serif text-2xl font-semibold text-primary">
                         {Object.keys(searchParamsResolved || {}).length > 0 ? (content.noOrdersFoundFilter || 'No orders found for filters') : (content.noOrdersYet || 'No orders yet')}
                    </h2>
                     <p className="text-gray-500 mt-1">
                         {Object.keys(searchParamsResolved || {}).length > 0 ? (content.tryChangingFilters || 'Try adjusting your filter criteria.') : ''}
                     </p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                 {/* Spaltenüberschriften */}
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{content.orderId || 'Order No.'}</th>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{content.company || 'Company'}</th>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{content.date || 'Date'}</th>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{content.total || 'Total (Gross)'}</th>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{content.status || 'Status'}</th>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{content.actions || 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {siparisler.map((siparis) => {
                                // Sicherer Zugriff auf Firma, da LEFT JOIN verwendet wird
                                const firmaUnvan = siparis.firmalar?.unvan || content.unknownCompany || 'Unknown';
                                const dbStatus = siparis.siparis_durumu;
                                // Sicherer Zugriff auf Übersetzungen
                                const translatedText = (orderStatusTranslations as Record<string, string>)[dbStatus] || dbStatus;
                                const StatusIcon = STATUS_ICONS[dbStatus] || FiPackage; // Fallback Icon
                                const statusColor = STATUS_COLORS[dbStatus] || 'text-gray-600 bg-gray-100'; // Fallback Farbe

                                return (
                                    <tr key={siparis.id} className="hover:bg-gray-50/50 transition-colors">
                                        {/* Bestellnummer Link */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Link href={`/${locale}/admin/operasyon/siparisler/${siparis.id}`} className="font-bold text-accent hover:underline">
                                                #{siparis.id.substring(0, 8).toUpperCase()}
                                            </Link>
                                        </td>
                                        {/* Firma Link */}
                                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                                             {siparis.firma_id ? (
                                                 <Link href={`/${locale}/admin/crm/firmalar/${siparis.firma_id}`} className="hover:underline hover:text-accent">
                                                     {firmaUnvan}
                                                 </Link>
                                             ) : (
                                                 firmaUnvan
                                             )}
                                        </td>
                                        {/* Datum */}
                                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                                             {formatDate(siparis.siparis_tarihi, locale)}
                                        </td>
                                        {/* Betrag */}
                                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                                             {formatCurrency(siparis.toplam_tutar_brut, locale)} {/* Locale übergeben */}
                                        </td>
                                        {/* Status Badge */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                                <StatusIcon size={12}/> {translatedText}
                                            </span>
                                        </td>
                                        {/* Aktionen (Status Update Buttons) */}
                                        <td className="px-6 py-4 text-sm space-x-2 whitespace-nowrap">
                                             {/* Zeigt Buttons basierend auf aktuellem Status */}
                                             {/* "Als versandt markieren" */}
                                             {(dbStatus === 'Beklemede' || dbStatus === 'processing' || dbStatus === 'Hazırlanıyor') && ( // 'Hazırlanıyor' hinzugefügt
                                                 <StatusUpdateButton
                                                     siparisId={siparis.id}
                                                     neuerStatus="Yola Çıktı" // Nächster Status
                                                     label={content.markShipped || "Als versandt markieren"}
                                                     icon={<FiTruck size={12}/>}
                                                     className="bg-purple-100 text-purple-700 hover:bg-purple-200" // Farbe angepasst
                                                 />
                                             )}
                                             {/* "Als zugestellt markieren" */}
                                             {dbStatus === 'Yola Çıktı' && (
                                                  <StatusUpdateButton
                                                      siparisId={siparis.id}
                                                      neuerStatus="Teslim Edildi" // Nächster Status
                                                      label={content.markDelivered || "Als zugestellt markieren"}
                                                      icon={<FiCheckCircle size={12}/>}
                                                      className="bg-green-100 text-green-700 hover:bg-green-200"
                                                  />
                                             )}
                                              {/* Optional: Stornieren Button */}
                                             {/* {(dbStatus === 'Beklemede' || dbStatus === 'processing') && ( ... )} */}
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