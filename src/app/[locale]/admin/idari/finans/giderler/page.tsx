// src/app/[locale]/admin/idari/finans/giderler/page.tsx
// VOLLSTÄNDIGER CODE mit await Fixes, !inner Join und Logging

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { GiderlerClient } from '@/components/admin/finans/GiderlerClient';
import { Tables, Constants, Database, Enums } from '@/lib/supabase/database.types';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

// --- Typen-Definitionen ---
export type GiderWithDetails = Tables<'giderler'> & {
    profiller: { tam_ad: string | null } | null;
    gider_kalemleri: {
        id: string;
        ad: string | null;
        ana_kategori_id: string;
        gider_ana_kategoriler: {
            ad: string | null;
        } | null;
    } | null;
};
export type HauptKategorie = Tables<'gider_ana_kategoriler'>;
export type GiderKalemi = Tables<'gider_kalemleri'>;
// --- Ende Typen ---


const getDateRange = (period: string) => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (period) {
        case 'last-month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Letzter Tag des Vormonats
            break;
        case 'this-year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
        case 'this-month':
        default: // Standard ist "Dieser Monat"
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Letzter Tag des aktuellen Monats
            break;
    }

    return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
    };
};

// --- KORREKTUR: Signatur angepasst ---
export default async function GiderlerPage({
    params, // Kommt als Promise
    searchParams // Kommt als Promise
}: {
    // MUSS Promise sein
    params: Promise<{ locale: Locale }>;
    // MUSS Promise sein
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    noStore(); // Caching deaktivieren

    // --- KORREKTUR: Props auflösen ---
    const resolvedParams = await params;
    const locale = resolvedParams.locale;
    const resolvedSearchParams = await searchParams;
    // --- ENDE KORREKTUR ---

    // --- LOGGING START ---
    console.log('--- GiderlerPage START ---');
    console.log('Resolved searchParams:', resolvedSearchParams);
    // --- LOGGING ENDE ---

    // --- KORREKTUR: await für cookies() und createSupabaseServerClient ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    const dictionary = await getDictionary(locale);

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('rol')
        .eq('id', user.id)
        .single();

    if (profile?.rol !== 'Yönetici' && profile?.rol !== 'Ekip Üyesi') {
        return redirect(`/${locale}/dashboard`);
    }

    // Filterwerte extrahieren
    const hauptCategoryFilter = resolvedSearchParams?.haupt_kategorie as string | undefined;
    const giderKalemiFilter = resolvedSearchParams?.gider_kalemi_id as string | undefined;
    // Standard auf 'custom' setzen, wenn KEIN period übergeben wird
    const currentPeriod = (resolvedSearchParams?.period as string) || 'custom';
    let dateFrom = resolvedSearchParams?.from as string | undefined;
    let dateTo = resolvedSearchParams?.to as string | undefined;

    // --- LOGGING START ---
    console.log('Initial Filter Values:', {
         hauptCategoryFilter,
         giderKalemiFilter,
         currentPeriod,
         dateFrom,
         dateTo
    });
    // --- LOGGING ENDE ---


    if (currentPeriod !== 'custom') {
        const { start, end } = getDateRange(currentPeriod);
        dateFrom = start;
        dateTo = end;
        // --- LOGGING START ---
        console.log(`Calculated Dates for Period '${currentPeriod}':`, { dateFrom, dateTo });
        // --- LOGGING ENDE ---
    } else {
         console.log('Using Custom Dates (if provided):', { dateFrom, dateTo });
    }


    // --- WICHTIG: Dynamischer Select-String für !inner join ---
    let selectString = `
        *,
        profiller(tam_ad),
        gider_kalemleri(id,ad,ana_kategori_id,gider_ana_kategoriler(ad))
    `;

    if (hauptCategoryFilter) {
        console.log('🔩 INNER JOIN wird für Hauptkategorie-Filter aktiviert.');
        selectString = `
            *,
            profiller(tam_ad),
            gider_kalemleri!inner(id,ad,ana_kategori_id,gider_ana_kategoriler(ad))
        `;
    }
    // --- ENDE FILTER-LOGIK ---

    let query = supabase
        .from('giderler')
        .select(selectString)
        .order('tarih', { ascending: false });

    // Filter anwenden
    if (giderKalemiFilter) {
        console.log(`Applying GiderKalemi Filter: ${giderKalemiFilter}`);
        query = query.eq('gider_kalemi_id', giderKalemiFilter);
    }
    if (hauptCategoryFilter) {
        console.log(`Applying HauptCategory Filter: ${hauptCategoryFilter}`);
        // Dieser Filter funktioniert wegen des !inner Joins
        query = query.eq('gider_kalemleri.ana_kategori_id', hauptCategoryFilter);
    }
    if (dateFrom) {
        console.log(`Applying Date Filter (FROM): ${dateFrom}`);
        query = query.gte('tarih', dateFrom);
    }
    if (dateTo) {
        // Logik für "bis einschließlich" (kleiner als der nächste Tag)
        const nextDay = new Date(dateTo);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayString = nextDay.toISOString().split('T')[0];
        console.log(`Applying Date Filter (TO): ${dateTo} (Query uses < ${nextDayString})`);
        query = query.lt('tarih', nextDayString);
    }

    // --- Daten parallel abrufen ---
    const [giderlerRes, hauptKategorienRes, giderKalemleriRes] = await Promise.all([
        query, // Die Hauptabfrage
        supabase.from('gider_ana_kategoriler').select('*').order('ad'),
        supabase.from('gider_kalemleri').select('*').order('ad')
    ]);

    const { data: giderler, error } = giderlerRes;
    const { data: hauptKategorien, error: hauptKategorienError } = hauptKategorienRes;
    const { data: giderKalemleri, error: giderKalemleriError } = giderKalemleriRes;

    // Fehler loggen
    if (error) console.error('❌ Supabase Giderler Hatası:', error);
    if (hauptKategorienError) console.error('❌ Supabase HauptKategorien Hatası:', hauptKategorienError);
    if (giderKalemleriError) console.error('❌ Supabase GiderKalemleri Hatası:', giderKalemleriError);

    // --- LOGGING START ---
    console.log('Fetched Gider Count:', giderler?.length ?? 0);
    // Optional: Logge die ersten paar Ergebnisse, um zu sehen, ob die Daten passen
    // if (giderler && giderler.length > 0) {
    //    console.log('First few fetched Giderler:', giderler.slice(0, 3));
    // }
    console.log('--- GiderlerPage END ---');
    // --- LOGGING ENDE ---

    // Variablen für den Client vorbereiten
    const availableFrequencies = Constants.public.Enums.zahlungshaeufigkeit || [];
    const pnlContent = dictionary.pnlReportPage || {};
    const datePeriods = [
        { label: pnlContent.periodThisMonth || 'Dieser Monat', value: 'this-month' },
        { label: pnlContent.periodLastMonth || 'Letzter Monat', value: 'last-month' },
        { label: pnlContent.periodThisYear || 'Dieses Jahr', value: 'this-year' },
        { label: 'Benutzerdef.', value: 'custom' },
    ];

    // Client-Komponente rendern
    return (
        <GiderlerClient
            initialGiderler={giderler as GiderWithDetails[] || []}
            hauptKategorien={hauptKategorien as HauptKategorie[] || []}
            giderKalemleri={giderKalemleri as GiderKalemi[] || []}
            availableFrequencies={availableFrequencies}
            dictionary={dictionary}
            locale={locale} // locale hier verwenden
            datePeriods={datePeriods}
            currentPeriod={currentPeriod} // aktuellen Zeitraum übergeben
        />
    );
}