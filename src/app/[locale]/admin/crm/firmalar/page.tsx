// src/app/[locale]/admin/crm/firmalar/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient + Whitespace Fix)

import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Database, Tables, Enums } from '@/lib/supabase/database.types';
import { FiPlus, FiUsers } from 'react-icons/fi';
import FirmaFiltreleri from './FirmaFiltreleri';
import FirmaRow from './FirmaRow';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { getDictionary } from '@/dictionaries';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { KOLN_PLZ_MAP } from '@/lib/plzLookup';

export const dynamic = 'force-dynamic'; // Sicherstellen, dass die Seite dynamisch ist

// Typ für die Firma inklusive verknüpfter Daten
type FirmaRow = Tables<'firmalar'> & {
    kaynak?: string | null;
    sorumlu_personel: {
        tam_ad: string | null;
    } | null;
};
// Typ für den Status Enum
type FirmaStatus = Enums<'firma_status'>; // Korrekten Enum-Typ verwenden

// Styling für verschiedene Status
const STATUS_RENKLERI: Record<string, string> = { // String als Schlüssel verwenden für Flexibilität
    "ADAY": "bg-gray-100 text-gray-800 border border-gray-200",
    "ISITILIYOR": "bg-blue-50 text-blue-600 border border-blue-200",
    "TEMAS EDİLDİ": "bg-yellow-50 text-yellow-600 border border-yellow-200",
    "İLETİŞİMDE": "bg-purple-50 text-purple-600 border border-purple-200",
    "POTANSİYEL": "bg-orange-50 text-orange-600 border border-orange-200",
    "MÜŞTERİ": "bg-green-50 text-green-600 border border-green-200",
    "PASİF": "bg-red-50 text-red-600 border border-red-200",
    // Old statuses fallback
    "Aday": "bg-gray-100 text-gray-800",
    "Takipte": "bg-blue-100 text-blue-800",
    "Temas Kuruldu": "bg-yellow-100 text-yellow-800",
    "İletişimde": "bg-purple-100 text-purple-800",
    "Müşteri": "bg-green-100 text-green-800",
    "Pasif": "bg-red-100 text-red-800"
};

const KATEGORI_RENKLERI: Record<string, string> = {
    "Shisha & Lounge": "bg-indigo-100 text-indigo-800",
    "Coffee Shop & Eiscafé": "bg-amber-100 text-amber-800",
    "Casual Dining": "bg-rose-100 text-rose-800",
    "Hotel & Event": "bg-cyan-100 text-cyan-800",
    "Rakip/Üretici": "bg-gray-200 text-gray-800",
    "Kafe": "bg-emerald-100 text-emerald-800",
    "Restoran": "bg-orange-100 text-orange-800",
    "Otel": "bg-blue-100 text-blue-800",
    "Alt Bayi": "bg-purple-100 text-purple-800",
    "Zincir Market": "bg-teal-100 text-teal-800"
};

// Props-Typ für die Seite (Promises für Next.js 15)
interface FirmalarListPageProps {
    params: Promise<{ locale: Locale }>;
    searchParams?: Promise<{
        q?: string;
        status?: string;
        status_not_in?: string;
        city?: string;
        district?: string;
        posta_kodu?: string; // Changed from mahalle
        priority_group?: string; // New filter
    }>;
}


export default async function FirmalarListPage({
    params,
    searchParams,
}: FirmalarListPageProps) {
    noStore();

    // Await params and searchParams for Next.js 15
    const { locale } = await params;
    const searchParamsResolved = searchParams ? await searchParams : {};

    // Get dictionary for i18n
    const dictionary = await getDictionary(locale);
    const content = dictionary.adminDashboard?.crmPage || {};
    // Provide neutral English fallbacks for missing keys
    const F = {
        title: content.title || 'Customer Management (CRM)',
        companiesFound: content.companiesFound || 'companies found.',
        newCompany: content.newCompany || 'New Company',
        searchPlaceholder: content.searchPlaceholder || 'Search by company name…',
        allStatusesLabel: content.allStatusesLabel || 'All Statuses',
        allPrioritiesLabel: locale === 'tr' ? 'Tüm Öncelikler' : (locale === 'de' ? 'Alle Prioritäten' : 'All Priorities'),
        allCitiesLabel: locale === 'tr' ? 'Tüm Şehirler' : (locale === 'de' ? 'Alle Städte' : 'All Cities'),
        allDistrictsLabel: locale === 'tr' ? 'Tüm İlçeler' : (locale === 'de' ? 'Alle Bezirke' : 'All Districts'),
        allZipCodesLabel: locale === 'tr' ? 'Tüm PLZ Bölgeleri' : (locale === 'de' ? 'Alle PLZ-Gebiete' : 'All Zip Codes'),
        priority: locale === 'tr' ? 'Öncelik' : (locale === 'de' ? 'Priorität' : 'Priority'),
        source: locale === 'tr' ? 'Kaynak' : (locale === 'de' ? 'Quelle' : 'Source'),
        registrationDate: locale === 'tr' ? 'Kayıt Tarihi' : (locale === 'de' ? 'Registrierungsdatum' : 'Registration Date'),
        lastInteraction: locale === 'tr' ? 'Son Etkileşim' : (locale === 'de' ? 'Letzte Interaktion' : 'Last Interaction'),
        noCompaniesFilterTitle: content.noCompaniesFilterTitle || 'No companies match filters',
        noCompaniesTitle: content.noCompaniesTitle || 'No companies added yet',
        noCompaniesFilterDesc: content.noCompaniesFilterDesc || 'Try adjusting your filter criteria.',
        noCompaniesDesc: content.noCompaniesDesc || 'Add a new company to get started.',
        statusOptions: content.statusOptions || {},
        unknown: content.unknown || 'Unknown',
        noPhone: content.noPhone || 'No Phone',
        responsiblePerson: content.responsiblePerson || 'Responsible: ',
        notAssigned: content.notAssigned || 'Unassigned',
        companyName: content.companyName || 'Company',
        category: content.category || 'Category',
        tags: locale === 'tr' ? 'Etiketler' : (locale === 'de' ? 'Tags' : 'Tags'), // Added Tags
        phone: content.phone || 'Phone',
        responsible: content.responsible || 'Responsible',
        status: content.status || 'Status'
    };

    // --- Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE ---

    // Optional: Benutzerprüfung
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) { return redirect(`/${locale}/login`); }
    // ... Rollenprüfung ---

    // Filterwerte extrahieren
    const searchQuery = searchParamsResolved.q || '';
    const statusFilter = searchParamsResolved.status || '';
    const statusNotInFilter = searchParamsResolved.status_not_in?.split(',') || [];
    const cityFilter = searchParamsResolved.city || '';
    const districtFilter = searchParamsResolved.district || '';
    const zipCodeFilter = searchParamsResolved.posta_kodu || '';
    const priorityGroupFilter = searchParamsResolved.priority_group || '';

    // Fetch unique cities and districts for filter dropdowns
    // Note: This might be heavy if there are thousands of records. 
    // Ideally, create a database view or RPC for distinct values.
    const { data: locationData } = await supabase
        .from('firmalar')
        .select('sehir, ilce, posta_kodu');
    
    const uniqueCities = Array.from(new Set(locationData?.map(f => f.sehir?.trim()).filter(Boolean))).sort() as string[];
    const uniqueDistricts = Array.from(new Set(locationData?.map(f => f.ilce?.trim()).filter(Boolean))).sort() as string[];
    const uniqueZipCodes = Array.from(new Set(locationData?.map(f => f.posta_kodu?.trim()).filter(Boolean))).sort() as string[];

    // Create a map of Zip Code -> City/District for display
    const zipCodeLabels: Record<string, string> = {};

    // 1. Pre-fill with known static data for better quality labels (Köln & Surroundings)
    Object.entries(KOLN_PLZ_MAP).forEach(([plz, data]) => {
        zipCodeLabels[plz] = `${plz} - ${data.district}`;
    });

    // 2. Augment with DB data for any missing or non-Köln PLZs
    locationData?.forEach(f => {
        const zip = f.posta_kodu?.trim();
        if (zip) {
            // Only set if not already set by the static map
            if (!zipCodeLabels[zip]) {
                // Prefer District (Ilce), then City (Sehir)
                const locationName = f.ilce?.trim() || f.sehir?.trim() || '';
                if (locationName) {
                    zipCodeLabels[zip] = `${zip} - ${locationName}`;
                } else {
                    zipCodeLabels[zip] = zip;
                }
            }
        }
    });

    // Basisabfrage
    let query = supabase
        .from('firmalar')
        .select(`
            *,
            sorumlu_personel:profiller!firmalar_sorumlu_personel_id_fkey(tam_ad)
        `);

    // Filter anwenden
    if (searchQuery) {
        query = query.or(`unvan.ilike.%${searchQuery}%,adres.ilike.%${searchQuery}%`);
    }
    if (statusFilter) {
        query = query.eq('status', statusFilter as FirmaStatus);
    }
    if (statusNotInFilter.length > 0) {
        query = query.not('status', 'in', `(${statusNotInFilter.join(',')})`);
    }
    if (cityFilter) {
        query = query.ilike('sehir', `%${cityFilter}%`);
    }
    if (districtFilter) {
        query = query.ilike('ilce', `%${districtFilter}%`);
    }
    if (zipCodeFilter) {
        query = query.eq('posta_kodu', zipCodeFilter);
    }
    if (priorityGroupFilter) {
        if (priorityGroupFilter === 'A') {
            query = query.gte('oncelik_puani', 80);
        } else if (priorityGroupFilter === 'B') {
            query = query.lt('oncelik_puani', 80).gte('oncelik_puani', 50);
        } else if (priorityGroupFilter === 'C') {
            query = query.lt('oncelik_puani', 50);
        }
    }

    // Daten abrufen
    // Order by newest first (created_at descending) as requested
    const { data: rawFirmalar, error } = await query.order('created_at', { ascending: false });

    // Fehlerbehandlung
    if (error) {
        console.error("Server: Firma verileri çekilirken hata oluştu:", JSON.stringify(error, null, 2));
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">Fehler beim Laden der Firmenliste. Details: {error.message}</div>;
    }

    // Custom sorting: Push 'REDDEDİLDİ' to the bottom, keep others sorted by created_at desc
    const firmalar = (rawFirmalar || []).sort((a, b) => {
        const isARejected = a.status === 'REDDEDİLDİ';
        const isBRejected = b.status === 'REDDEDİLDİ';
        
        if (isARejected && !isBRejected) return 1;
        if (!isARejected && isBRejected) return -1;
        return 0;
    });

    const firmaListesi = (firmalar || []) as any[];
    const firmaSayisi = firmaListesi.length;
    // Status-Optionen dynamisch aus Enum oder Konstanten holen
    // Nur die neuen/relevanten Status anzeigen
    const statusOptions = [
        "ADAY",
        "ISITILIYOR",
        "TEMAS EDİLDİ",
        "İLETİŞİMDE",
        "POTANSİYEL",
        "MÜŞTERİ",
        "PASİF",
        "REDDEDİLDİ"
    ] as FirmaStatus[];

    return (
        <div className="space-y-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">{F.title}</h1>
                    <p className="text-text-main/80 mt-1">{firmaSayisi} {F.companiesFound}</p>
                </div>
                <Link href={`/${locale}/admin/crm/firmalar/yeni`} passHref>
                    <button className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto">
                        <FiPlus size={18} />
                        {F.newCompany}
                    </button>
                </Link>
            </header>

            {/* Filter Komponente */}
            <div className="bg-gray-50 py-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b border-gray-200 shadow-sm">
                <FirmaFiltreleri 
                    statusOptions={statusOptions}
                    statusLabels={F.statusOptions as Record<string, string>}
                    searchPlaceholder={F.searchPlaceholder}
                    allStatusesLabel={F.allStatusesLabel}
                    allPrioritiesLabel={F.allPrioritiesLabel}
                    allCitiesLabel={F.allCitiesLabel}
                    allDistrictsLabel={F.allDistrictsLabel}
                    allZipCodesLabel={F.allZipCodesLabel}
                    cityOptions={uniqueCities}
                    districtOptions={uniqueDistricts}
                    zipCodeOptions={uniqueZipCodes}
                    zipCodeLabels={zipCodeLabels}
                />
            </div>

            {/* Firmenliste oder "Keine Ergebnisse" */}
            {firmaSayisi === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-gray-200 rounded-lg bg-white shadow-sm">
                    <FiUsers className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h2 className="font-serif text-2xl font-semibold text-primary">
                        {searchQuery || statusFilter || statusNotInFilter.length > 0 
                            ? F.noCompaniesFilterTitle
                            : F.noCompaniesTitle}
                    </h2>
                    <p className="mt-2 text-gray-600">
                        {searchQuery || statusFilter || statusNotInFilter.length > 0 
                            ? F.noCompaniesFilterDesc
                            : F.noCompaniesDesc}
                    </p>
                </div>
            ) : (
                <>
                    {/* Mobile Kartenansicht */}
                    <div className="lg:hidden space-y-4">
                        {firmaListesi.map((firma) => (
                            <FirmaRow
                                key={firma.id}
                                firma={firma}
                                locale={locale}
                                statusOptions={F.statusOptions as Record<string, string>}
                                statusColors={STATUS_RENKLERI}
                                F={F}
                                isDesktop={false}
                            />
                        ))}
                    </div>

                    {/* Desktop Tabelle */}
                    <div className="hidden lg:block bg-white rounded-lg shadow-md border border-gray-200 -mt-8">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="sticky top-[-40px] z-20 bg-gray-50 px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider shadow-sm w-12">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent opacity-30 cursor-not-allowed"
                                            disabled
                                            title="Toplu seçim (yakında)"
                                        />
                                    </th>
                                    {[
                                        F.companyName,
                                        F.priority,
                                        F.source,
                                        F.registrationDate,
                                        F.category,
                                        F.phone,
                                        F.lastInteraction,
                                        F.responsible,
                                        F.status
                                    ].map(header => (
                                        <th key={header} scope="col" className="sticky top-[-40px] z-20 bg-gray-50 px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider shadow-sm">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {firmaListesi.map((firma) => (
                                    <FirmaRow
                                        key={firma.id}
                                        firma={firma}
                                        locale={locale}
                                        statusOptions={F.statusOptions as Record<string, string>}
                                        statusColors={STATUS_RENKLERI}
                                        F={F}
                                        isDesktop={true}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}