// src/app/[locale]/admin/crm/firmalar/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient + Whitespace Fix)

import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Database, Tables, Enums } from '@/lib/supabase/database.types';
import { FiPlus, FiUsers, FiPhone } from 'react-icons/fi';
import FirmaFiltreleri from './FirmaFiltreleri';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { getDictionary } from '@/dictionaries';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic'; // Sicherstellen, dass die Seite dynamisch ist

// Typ für die Firma inklusive verknüpfter Daten
type FirmaRow = Tables<'firmalar'> & {
    sorumlu_personel: {
        tam_ad: string | null;
    } | null;
};
// Typ für den Status Enum
type FirmaStatus = Enums<'firma_status'>; // Korrekten Enum-Typ verwenden

// Styling für verschiedene Status
const STATUS_RENKLERI: Record<string, string> = { // String als Schlüssel verwenden für Flexibilität
    "Potansiyel": "bg-blue-100 text-blue-800",
    "İlk Temas": "bg-gray-100 text-gray-800",
    "Numune Sunuldu": "bg-yellow-100 text-yellow-800",
    "Teklif Verildi": "bg-purple-100 text-purple-800",
    "Anlaşma Sağlandı": "bg-green-100 text-green-800",
    "Pasif": "bg-red-100 text-red-800"
};

// Props-Typ für die Seite (Promises für Next.js 15)
interface FirmalarListPageProps {
    params: Promise<{ locale: Locale }>;
    searchParams?: Promise<{
        q?: string;
        status?: string;
        status_not_in?: string;
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

    // Basisabfrage
    let query = supabase
        .from('firmalar')
        .select(`
            *,
            sorumlu_personel:profiller!firmalar_sorumlu_personel_id_fkey(tam_ad)
        `);

    // Filter anwenden
    if (searchQuery) {
        query = query.ilike('unvan', `%${searchQuery}%`);
    }
    if (statusFilter) {
        query = query.eq('status', statusFilter);
    }
    if (statusNotInFilter.length > 0) {
        query = query.not('status', 'in', `(${statusNotInFilter.map(s => `'${s}'`).join(',')})`);
    }

    // Daten abrufen
    const { data: firmalar, error } = await query.order('unvan', { ascending: true });

    // Fehlerbehandlung
    if (error) {
        console.error("Server: Firma verileri çekilirken hata oluştu:", JSON.stringify(error, null, 2));
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">Fehler beim Laden der Firmenliste. Details: {error.message}</div>;
    }

    const firmaListesi: FirmaRow[] = firmalar || [];
    const firmaSayisi = firmaListesi.length;
    // Status-Optionen dynamisch aus Enum oder Konstanten holen
    const statusOptions = Object.keys(STATUS_RENKLERI) as FirmaStatus[]; // Oder aus Constants.public.Enums.firma_status

    return (
        <div className="space-y-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">{content.title || 'Kundenverwaltung (CRM)'}</h1>
                    <p className="text-text-main/80 mt-1">{firmaSayisi} {content.companiesFound || 'Firmen gefunden.'}</p>
                </div>
                <Link href={`/${locale}/admin/crm/firmalar/yeni`} passHref>
                    <button className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto">
                        <FiPlus size={18} />
                        {content.newCompany || 'Neue Firma'}
                    </button>
                </Link>
            </header>

            {/* Filter Komponente */}
            <FirmaFiltreleri statusOptions={statusOptions} />

            {/* Firmenliste oder "Keine Ergebnisse" */}
            {firmaSayisi === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-gray-200 rounded-lg bg-white shadow-sm">
                    <FiUsers className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h2 className="font-serif text-2xl font-semibold text-primary">
                        {searchQuery || statusFilter || statusNotInFilter.length > 0 
                            ? (content.noCompaniesFilterTitle || 'Keine Firmen für Filter gefunden')
                            : (content.noCompaniesTitle || 'Noch keine Firmen erfasst')
                        }
                    </h2>
                    <p className="mt-2 text-gray-600">
                        {searchQuery || statusFilter || statusNotInFilter.length > 0 
                            ? (content.noCompaniesFilterDesc || 'Versuchen Sie, Ihre Suchkriterien zu ändern.')
                            : (content.noCompaniesDesc || 'Fügen Sie eine neue Firma hinzu, um zu beginnen.')
                        }
                    </p>
                </div>
            ) : (
                <div>
                    {/* Mobile Ansicht (Karten) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-6">
                        {firmaListesi.map((firma) => (
                            <Link key={firma.id} href={`/${locale}/admin/crm/firmalar/${firma.id}`} className="block bg-white rounded-lg shadow-lg p-5 border-l-4 border-accent hover:shadow-xl hover:-translate-y-1 transition-all">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-serif text-xl font-bold text-primary">{firma.unvan}</h3>
                                        <p className="text-sm text-gray-500">{firma.kategori || '-'}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_RENKLERI[firma.status as string] || 'bg-gray-100 text-gray-800'}`}>
                                        {firma.status ? (content.statusOptions?.[firma.status as keyof typeof content.statusOptions] || firma.status) : (content.unknown || 'Unbekannt')}
                                    </span>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <FiPhone size={14} className="text-gray-400"/>
                                        <span>{firma.telefon || (content.noPhone || 'Kein Telefon')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <FiUsers size={14} className="text-gray-400"/>
                                        <span>{content.responsiblePerson || 'Verantwortlich: '}{firma.sorumlu_personel?.tam_ad || (content.notAssigned || 'Nicht zugewiesen')}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Desktop Ansicht (Tabelle - KORRIGIERT ohne Whitespace/Kommentare) */}
                    <div className="hidden lg:block overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {[
                                        content.companyName || 'Firma', 
                                        content.category || 'Kategorie', 
                                        content.phone || 'Telefon', 
                                        content.responsible || 'Verantwortlich', 
                                        content.status || 'Status'
                                    ].map(header => (
                                        <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {firmaListesi.map((firma) => (
                                    <tr key={firma.id} className="hover:bg-gray-50/50 transition-colors duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                                            <Link href={`/${locale}/admin/crm/firmalar/${firma.id}`} className="hover:underline text-accent">
                                                {firma.unvan}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{firma.kategori || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{firma.telefon || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{firma.sorumlu_personel?.tam_ad || (content.notAssigned || 'Nicht zugewiesen')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`inline-flex px-3 py-1 text-xs font-semibold leading-5 rounded-full ${STATUS_RENKLERI[firma.status as string] || 'bg-gray-100 text-gray-800'}`}>
                                                {firma.status ? (content.statusOptions?.[firma.status as keyof typeof content.statusOptions] || firma.status) : (content.unknown || 'Unbekannt')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}