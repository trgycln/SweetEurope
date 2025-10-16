// src/app/admin/idari/finans/raporlama/page.tsx

import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FiBarChart2, FiDollarSign, FiTrendingDown, FiTrendingUp, FiSlash, FiFilter } from 'react-icons/fi';
import { Enums } from '@/lib/supabase/database.types';
import { dictionary } from '@/dictionaries/de';

type ReportData = {
    totalRevenue: number;
    totalCogs: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    expenseBreakdown: { kategori: string; toplam: number }[];
};

const formatCurrency = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);

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

// DÜZELTUNG: Hier ist der vollständige Code für die ReportRow-Komponente
const ReportRow = ({ label, value, isPositive, isNegative, isTotal = false }: { label: string, value: string, isPositive?: boolean, isNegative?: boolean, isTotal?: boolean }) => (
    <div className={`flex justify-between items-center py-4 px-6 ${isTotal ? 'font-bold border-t-2 border-primary text-lg' : 'border-b border-bg-subtle'}`}>
        <p className="text-text-main">{label}</p>
        <p className={`font-semibold ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-primary'}`}>
            {value}
        </p>
    </div>
);

export default async function PNLReportPage({ searchParams }: { searchParams: { period?: string, from?: string, to?: string } }) {
    const supabase = createSupabaseServerClient();
    const content = dictionary.pnlReportPage;

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user!.id).single();
  
    if (profile?.rol !== 'Yönetici') {
        return (
            <div className="p-8 text-center"><FiSlash className="mx-auto text-5xl text-red-500"/><h1 className="font-serif mt-4 text-2xl text-red-600">{content.accessDenied}</h1></div>
        );
    }

    const { start, end } = getDateRange(searchParams.period || 'this-month');
    
    const { data: report, error } = await supabase
        .rpc('get_pl_report', { start_date: start, end_date: end })
        .returns<ReportData>()
        .single();

    if (error || !report) {
        console.error("P&L Bericht Fehler:", error);
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">{content.errorLoading}</div>;
    }

    const datePeriods = [
        { label: content.periodThisMonth, value: 'this-month' },
        { label: content.periodLastMonth, value: 'last-month' },
        { label: content.periodThisYear, value: 'this-year' },
    ];
    
    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">{content.pageTitle}</h1>
                <p className="text-text-main/80 mt-1">{content.pageSubtitle}</p>
            </header>

            <div className="bg-white p-6 rounded-2xl shadow-lg">
                <div className="flex items-center gap-4 mb-6 border-b border-bg-subtle pb-4">
                    <FiFilter className="text-accent" />
                    <p className="font-bold text-primary">{content.filterLabel}</p>
                    {datePeriods.map(p => (
                        <Link 
                            key={p.value}
                            href={`/admin/idari/finans/raporlama?period=${p.value}`}
                            className={`px-3 py-1 text-sm font-bold rounded-full transition-colors ${(searchParams.period || 'this-month') === p.value ? 'bg-accent text-white' : 'bg-secondary hover:bg-bg-subtle'}`}
                        >
                            {p.label}
                        </Link>
                    ))}
                </div>
                
                <div className="font-sans">
                    <ReportRow label={content.totalRevenue} value={formatCurrency(report.totalRevenue)} />
                    <ReportRow label={content.totalCogs} value={`(${formatCurrency(report.totalCogs)})`} />
                    <ReportRow label={content.grossProfit} value={formatCurrency(report.grossProfit)} isTotal={true}/>
                    
                    <h3 className="font-serif text-xl font-bold text-primary mt-8 mb-2 px-6">{content.opExHeader}</h3>
                    {report.expenseBreakdown.map(exp => (
                        <ReportRow key={exp.kategori} label={exp.kategori} value={`(${formatCurrency(exp.toplam)})`} />
                    ))}
                    <ReportRow label={content.totalOpEx} value={`(${formatCurrency(report.totalExpenses)})`} isTotal={true}/>

                    <div className="mt-8 bg-bg-subtle/50 rounded-lg">
                        <ReportRow 
                            label={report.netProfit >= 0 ? content.netProfit : content.netLoss} 
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