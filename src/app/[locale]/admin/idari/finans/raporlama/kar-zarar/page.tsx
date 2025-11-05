// src/app/[locale]/admin/idari/finans/raporlama/kar-zarar/page.tsx
// Detaylı Kar & Zarar Raporu

export const dynamic = 'force-dynamic';

import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { FiSlash, FiFilter, FiArrowLeft } from 'react-icons/fi';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/lib/utils';
import { redirect } from 'next/navigation';
import Link from 'next/link';

// ReportData Typ
type ReportData = {
    totalGrossRevenue: number;
    totalRevenue: number;
    totalCogs: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    expenseBreakdown: { kategori: string; toplam: number }[];
};

// Währungsformatierung
const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

// Datumsbereich-Funktion
const getDateRange = (period: string) => {
     const now = new Date();
     let startDate = new Date();
     let endDate = new Date();
     switch (period) {
         case 'last-month':
             startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
             endDate = new Date(now.getFullYear(), now.getMonth(), 0);
             break;
         case 'this-year':
             startDate = new Date(now.getFullYear(), 0, 1);
             endDate = new Date(now.getFullYear(), 11, 31);
             break;
         case 'this-month':
         default:
             startDate = new Date(now.getFullYear(), now.getMonth(), 1);
             endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
             break;
     }
     return {
         start: startDate.toISOString().split('T')[0],
         end: endDate.toISOString().split('T')[0]
     };
};

// ReportRow Komponente
const ReportRow = ({ label, value, isPositive, isNegative, isTotal = false }: { label: string, value: string, isPositive?: boolean, isNegative?: boolean, isTotal?: boolean }) => (
    <div className={`flex justify-between items-center py-4 px-6 ${isTotal ? 'font-bold border-t-2 border-primary text-lg' : 'border-b border-gray-200'}`}>
        <p className="text-text-main">{label}</p>
        <p className={`font-semibold ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-primary'}`}>
            {value}
        </p>
    </div>
);

// Hauptkomponente
export default async function PNLDetailPage({
    params: { locale },
    searchParams
}: {
    params: { locale: Locale };
    searchParams: { period?: string, from?: string, to?: string }
}) {
    // Supabase Client korrekt initialisieren
    const cookieStore = await cookies(); 
    const supabase = await createSupabaseServerClient(cookieStore); 

    const dictionary = await getDictionary(locale);
    // Sicherer Zugriff auf Dictionary-Inhalte
    const content = dictionary.pnlReportPage || {
        pageTitle: "Gewinn & Verlust Bericht",
        pageSubtitle: "Finanzielle Übersicht",
        accessDenied: "Zugriff verweigert",
        errorLoading: "Bericht konnte nicht geladen werden.",
        filterLabel: "Zeitraum wählen:",
        periodThisMonth: "Dieser Monat",
        periodLastMonth: "Letzter Monat",
        periodThisYear: "Dieses Jahr",
        totalGrossRevenue: "Bruttoumsatz (Ciro)",
        totalRevenue: "Nettoumsatz",
        totalCogs: "Warenkosten (SMM)",
        grossProfit: "Bruttogewinn",
        opExHeader: "Betriebsausgaben",
        totalOpEx: "Gesamte Betriebsausgaben",
        netProfit: "Nettogewinn",
        netLoss: "Nettoverlust"
    };

    // Benutzerprüfung
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user!.id).single();
    if (profile?.rol !== 'Yönetici') {
        return (
            <div className="p-8 text-center">
                <FiSlash className="mx-auto text-5xl text-red-500"/>
                <h1 className="font-serif mt-4 text-2xl text-red-600">{content.accessDenied}</h1>
            </div>
        );
    }

    // Zeitfilterung
    const currentPeriod = searchParams.period || 'this-month';
    const { start, end } = getDateRange(currentPeriod);

    // RPC-Funktion aufrufen
    const { data: reportData, error } = await supabase
        .rpc('get_pl_report', { start_date: start, end_date: end })
        .single();

    const report = reportData as ReportData | null;

    if (error || !report) {
        console.error("P&L Bericht Fehler:", error);
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">{content.errorLoading}</div>;
    }

    // Datumsperioden für Filter
    const datePeriods = [
        { label: content.periodThisMonth, value: 'this-month' },
        { label: content.periodLastMonth, value: 'last-month' },
        { label: content.periodThisYear, value: 'this-year' },
    ];

    return (
        <div className="space-y-8">
            <header>
                <Link 
                    href={`/${locale}/admin/idari/finans/raporlama`}
                    className="inline-flex items-center gap-2 text-primary hover:text-accent mb-4 font-semibold"
                >
                    <FiArrowLeft /> Raporlara Dön
                </Link>
                <h1 className="font-serif text-4xl font-bold text-primary">{content.pageTitle}</h1>
                <p className="text-text-main/80 mt-1">{content.pageSubtitle}</p>
            </header>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                {/* Filter */}
                <div className="flex items-center gap-4 mb-6 border-b border-gray-200 pb-4">
                    <FiFilter className="text-accent" />
                    <p className="font-bold text-primary">{content.filterLabel}</p>
                    {datePeriods.map(p => (
                        <Link
                            key={p.value}
                            href={`/${locale}/admin/idari/finans/raporlama/kar-zarar?period=${p.value}`}
                            className={`px-3 py-1 text-sm font-bold rounded-full transition-colors ${currentPeriod === p.value ? 'bg-accent text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                        >
                            {p.label}
                        </Link>
                    ))}
                </div>

                {/* Berichtsanzeige */}
                <div className="font-sans">
                    <ReportRow label={content.totalGrossRevenue || "Bruttoumsatz (Ciro)"} value={formatCurrency(report.totalGrossRevenue)} />
                    <ReportRow label={content.totalRevenue || "Nettoumsatz"} value={formatCurrency(report.totalRevenue)} />
                    <ReportRow label={content.totalCogs || "Warenkosten (SMM)"} value={`(${formatCurrency(report.totalCogs)})`} />
                    <ReportRow label={content.grossProfit || "Bruttogewinn"} value={formatCurrency(report.grossProfit)} isTotal={true}/>

                    <h3 className="font-serif text-xl font-bold text-primary mt-8 mb-2 px-6">{content.opExHeader || "Betriebsausgaben"}</h3>
                    {report.expenseBreakdown.length > 0 ? report.expenseBreakdown.map(exp => (
                        <ReportRow key={exp.kategori} label={exp.kategori} value={`(${formatCurrency(exp.toplam)})`} />
                    )) : <p className="px-6 text-gray-500 text-sm">Keine Ausgaben im Zeitraum.</p>}
                    <ReportRow label={content.totalOpEx || "Gesamte Betriebsausgaben"} value={`(${formatCurrency(report.totalExpenses)})`} isTotal={true}/>

                    {/* Nettogewinn/-verlust */}
                    <div className="mt-8 bg-gray-100 rounded-lg">
                        <ReportRow
                            label={report.netProfit >= 0 ? (content.netProfit || "Nettogewinn") : (content.netLoss || "Nettoverlust")}
                            value={formatCurrency(report.netProfit)}
                            isPositive={report.netProfit >= 0}
                            isNegative={report.netProfit < 0}
                            isTotal={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
