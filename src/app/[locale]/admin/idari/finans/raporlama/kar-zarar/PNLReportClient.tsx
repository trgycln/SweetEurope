'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    FiArrowLeft, FiFilter, FiTrendingUp, FiTrendingDown, 
    FiDollarSign, FiShoppingCart, FiCreditCard, FiChevronDown,
    FiChevronUp, FiCalendar, FiDownload, FiInfo
} from 'react-icons/fi';

type ExpenseDetail = {
    id: string;
    tarih: string;
    tutar: number;
    aciklama: string | null;
};

type ExpenseItem = {
    kalem_id: string;
    kalem_adi: string;
    toplam: number;
    detaylar: ExpenseDetail[] | null;
};

type ExpenseCategory = {
    kategori: string;
    toplam: number;
    kalemler: ExpenseItem[];
};

type ReportData = {
    totalGrossRevenue: number;
    totalRevenue: number;
    totalCogs: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    expenseBreakdown: ExpenseCategory[];
};

// Währungsformatierung
const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '€0,00';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

// Prozentberechnung
const calculatePercentage = (part: number, total: number) => {
    if (total === 0) return 0;
    return ((part / total) * 100).toFixed(1);
};

export default function PNLReportClient({
    locale,
    dictionary,
    report,
    error,
    currentPeriod,
    startDate,
    endDate
}: {
    locale: string;
    dictionary: any;
    report: ReportData | null;
    error: any;
    currentPeriod: string;
    startDate: string;
    endDate: string;
}) {
    const router = useRouter();
    const [showExpenseDetails, setShowExpenseDetails] = useState(false);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const [showCustomDate, setShowCustomDate] = useState(false);
    const [customFrom, setCustomFrom] = useState(startDate);
    const [customTo, setCustomTo] = useState(endDate);

    const content = dictionary.pnlReportPage || {
        pageTitle: "Gewinn & Verlust Bericht",
        pageSubtitle: "Finanzielle Übersicht",
        errorLoading: "Bericht konnte nicht geladen werden.",
        filterLabel: "Zeitraum:",
        periodThisMonth: "Dieser Monat",
        periodLastMonth: "Letzter Monat",
        periodLast3Months: "Letzte 3 Monate",
        periodLast6Months: "Letzte 6 Monate",
        periodThisYear: "Dieses Jahr",
        periodLastYear: "Letztes Jahr",
        customPeriod: "Benutzerdefiniert",
        totalGrossRevenue: "Bruttoumsatz",
        totalRevenue: "Nettoumsatz",
        totalCogs: "Warenkosten",
        grossProfit: "Bruttogewinn",
        totalOpEx: "Betriebsausgaben",
        netProfit: "Nettogewinn",
        netLoss: "Nettoverlust",
        margin: "Marge",
        showDetails: "Details anzeigen",
        hideDetails: "Details ausblenden",
        exportPDF: "Als PDF exportieren",
        backButton: "Zurück zu Berichten",
        dateFrom: "Von:",
        dateTo: "Bis:",
        applyFilter: "Anwenden",
        detailedBreakdown: "Detaillierte Aufschlüsselung",
        revenueSection: "Einnahmen",
        expensesSection: "Ausgaben",
        noExpenses: "Keine Ausgaben im gewählten Zeitraum"
    };

    const datePeriods = [
        { label: content.periodThisMonth, value: 'this-month' },
        { label: content.periodLastMonth, value: 'last-month' },
        { label: content.periodLast3Months, value: 'last-3-months' },
        { label: content.periodLast6Months, value: 'last-6-months' },
        { label: content.periodThisYear, value: 'this-year' },
        { label: content.periodLastYear, value: 'last-year' },
    ];

    const handlePeriodChange = (period: string) => {
        if (period === 'custom') {
            setShowCustomDate(!showCustomDate);
        } else {
            router.push(`/${locale}/admin/idari/finans/raporlama/kar-zarar?period=${period}`);
        }
    };

    const handleCustomDateApply = () => {
        router.push(`/${locale}/admin/idari/finanz/raporlama/kar-zarar?period=custom&from=${customFrom}&to=${customTo}`);
    };

    if (error || !report) {
        return (
            <div className="space-y-8">
                <header>
                    <Link 
                        href={`/${locale}/admin/idari/finans/raporlama`}
                        className="inline-flex items-center gap-2 text-primary hover:text-accent mb-4 font-semibold"
                    >
                        <FiArrowLeft /> Geri
                    </Link>
                    <h1 className="font-serif text-4xl font-bold text-primary">{content.pageTitle}</h1>
                </header>
                <div className="p-8 text-center bg-red-50 rounded-2xl border-2 border-red-200">
                    <p className="text-red-600 text-lg">{content.errorLoading}</p>
                </div>
            </div>
        );
    }

    const grossMargin = calculatePercentage(report.grossProfit, report.totalRevenue);
    const netMargin = calculatePercentage(report.netProfit, report.totalRevenue);

    return (
        <div className="space-y-6">
            {/* Header */}
            <header>
                <Link 
                    href={`/${locale}/admin/idari/finans/raporlama`}
                    className="inline-flex items-center gap-2 text-primary hover:text-accent mb-4 font-semibold transition-colors"
                >
                    <FiArrowLeft /> {content.backButton}
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-serif text-4xl font-bold text-primary">{content.pageTitle}</h1>
                        <p className="text-text-main/70 mt-1">
                            {new Date(startDate).toLocaleDateString('de-DE')} - {new Date(endDate).toLocaleDateString('de-DE')}
                        </p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                        <FiDownload /> {content.exportPDF || 'Export'}
                    </button>
                </div>
            </header>

            {/* Filter Section */}
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                    <FiFilter className="text-accent text-xl" />
                    <h3 className="font-bold text-lg text-primary">{content.filterLabel}</h3>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                    {datePeriods.map(p => (
                        <button
                            key={p.value}
                            onClick={() => handlePeriodChange(p.value)}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                                currentPeriod === p.value 
                                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg' 
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                    <button
                        onClick={() => setShowCustomDate(!showCustomDate)}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
                            currentPeriod === 'custom' 
                                ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg' 
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                    >
                        <FiCalendar /> {content.customPeriod || 'Custom'}
                    </button>
                </div>

                {/* Custom Date Picker */}
                {showCustomDate && (
                    <div className="flex items-end gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fadeIn">
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">{content.dateFrom}</label>
                            <input
                                type="date"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">{content.dateTo}</label>
                            <input
                                type="date"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                            />
                        </div>
                        <button
                            onClick={handleCustomDateApply}
                            className="px-6 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 transition-colors"
                        >
                            {content.applyFilter}
                        </button>
                    </div>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Bruttoumsatz */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                        <FiDollarSign className="text-3xl opacity-80" />
                        <FiTrendingUp className="text-2xl" />
                    </div>
                    <p className="text-sm opacity-90 mb-1">{content.totalGrossRevenue}</p>
                    <p className="text-3xl font-bold">{formatCurrency(report.totalGrossRevenue)}</p>
                </div>

                {/* Bruttogewinn */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                        <FiShoppingCart className="text-3xl opacity-80" />
                        <span className="text-sm bg-white/20 px-2 py-1 rounded">{grossMargin}%</span>
                    </div>
                    <p className="text-sm opacity-90 mb-1">{content.grossProfit}</p>
                    <p className="text-3xl font-bold">{formatCurrency(report.grossProfit)}</p>
                </div>

                {/* Betriebsausgaben */}
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                        <FiCreditCard className="text-3xl opacity-80" />
                        <FiTrendingDown className="text-2xl" />
                    </div>
                    <p className="text-sm opacity-90 mb-1">{content.totalOpEx}</p>
                    <p className="text-3xl font-bold">{formatCurrency(report.totalExpenses)}</p>
                </div>

                {/* Nettogewinn */}
                <div className={`bg-gradient-to-br ${report.netProfit >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'} text-white p-6 rounded-2xl shadow-xl`}>
                    <div className="flex items-center justify-between mb-2">
                        {report.netProfit >= 0 ? <FiTrendingUp className="text-3xl" /> : <FiTrendingDown className="text-3xl" />}
                        <span className="text-sm bg-white/20 px-2 py-1 rounded">{netMargin}%</span>
                    </div>
                    <p className="text-sm opacity-90 mb-1">{report.netProfit >= 0 ? content.netProfit : content.netLoss}</p>
                    <p className="text-3xl font-bold">{formatCurrency(report.netProfit)}</p>
                </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <h2 className="text-2xl font-bold text-primary">{content.detailedBreakdown}</h2>
                </div>

                <div className="p-6 space-y-4">
                    {/* Umsatz */}
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-gray-700 font-medium flex items-center gap-2">
                            {content.totalGrossRevenue}
                            <span className="group relative">
                                <FiInfo className="text-gray-400 cursor-help" size={16} />
                                <span className="invisible group-hover:visible absolute left-0 top-6 w-64 bg-gray-900 text-white text-xs rounded-lg p-2 z-10">
                                    {content.totalGrossRevenueTooltip || "KDV dahil toplam satış geliri"}
                                </span>
                            </span>
                        </span>
                        <span className="text-lg font-bold text-gray-900">{formatCurrency(report.totalGrossRevenue)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-3 border-b border-gray-100 pl-6">
                        <span className="text-gray-600 flex items-center gap-2">
                            {content.totalRevenue}
                            <span className="group relative">
                                <FiInfo className="text-gray-400 cursor-help" size={14} />
                                <span className="invisible group-hover:visible absolute left-0 top-6 w-64 bg-gray-900 text-white text-xs rounded-lg p-2 z-10">
                                    {content.totalRevenueTooltip || "KDV, iadeler ve iskontolar düşüldükten sonraki net gelir"}
                                </span>
                            </span>
                        </span>
                        <span className="text-lg font-semibold text-gray-800">{formatCurrency(report.totalRevenue)}</span>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-gray-100 pl-6">
                        <span className="text-gray-600">- {content.totalCogs}</span>
                        <span className="text-lg font-semibold text-red-600">-{formatCurrency(report.totalCogs)}</span>
                    </div>

                    <div className="flex justify-between items-center py-4 bg-green-50 -mx-6 px-6 border-y-2 border-green-200">
                        <span className="text-gray-800 font-bold text-lg">= {content.grossProfit}</span>
                        <span className="text-2xl font-bold text-green-600">{formatCurrency(report.grossProfit)}</span>
                    </div>

                    {/* Betriebsausgaben */}
                    <div className="pt-4">
                        <button
                            onClick={() => setShowExpenseDetails(!showExpenseDetails)}
                            className="w-full flex justify-between items-center py-3 text-left hover:bg-gray-50 rounded-lg px-2 transition-colors"
                        >
                            <span className="text-gray-700 font-medium flex items-center gap-2">
                                - {content.totalOpEx}
                                {showExpenseDetails ? <FiChevronUp /> : <FiChevronDown />}
                            </span>
                            <span className="text-lg font-semibold text-red-600">-{formatCurrency(report.totalExpenses)}</span>
                        </button>

                        {showExpenseDetails && (
                            <div className="ml-6 mt-2 space-y-2 animate-fadeIn">
                                {report.expenseBreakdown.length > 0 ? (
                                    report.expenseBreakdown.map((category, idx) => (
                                        <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                                            {/* Category Level */}
                                            <button
                                                onClick={() => {
                                                    const newExpanded = expandedCategory === category.kategori ? null : category.kategori;
                                                    setExpandedCategory(newExpanded);
                                                    if (!newExpanded) setExpandedItem(null);
                                                }}
                                                className="w-full flex justify-between items-center py-2 px-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                                            >
                                                <span className="text-sm text-gray-700 font-medium flex items-center gap-2">
                                                    {expandedCategory === category.kategori ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                                                    {category.kategori}
                                                </span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-gray-500">
                                                        {calculatePercentage(category.toplam, report.totalExpenses)}%
                                                    </span>
                                                    <span className="text-sm font-semibold text-gray-700">-{formatCurrency(category.toplam)}</span>
                                                </div>
                                            </button>
                                            
                                            {/* Items Level */}
                                            {expandedCategory === category.kategori && category.kalemler && category.kalemler.length > 0 && (
                                                <div className="bg-gray-50 border-t border-gray-200 animate-fadeIn">
                                                    {category.kalemler.map((item, itemIdx) => (
                                                        <div key={itemIdx} className="border-b border-gray-200 last:border-b-0">
                                                            <button
                                                                onClick={() => setExpandedItem(expandedItem === item.kalem_id ? null : item.kalem_id)}
                                                                className="w-full flex justify-between items-center py-2 px-4 pl-8 hover:bg-gray-100 transition-colors"
                                                            >
                                                                <span className="text-sm text-gray-600 flex items-center gap-2">
                                                                    {expandedItem === item.kalem_id ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                                                                    {item.kalem_adi}
                                                                </span>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-xs text-gray-400">
                                                                        {calculatePercentage(item.toplam, category.toplam)}%
                                                                    </span>
                                                                    <span className="text-sm font-medium text-gray-600">-{formatCurrency(item.toplam)}</span>
                                                                </div>
                                                            </button>

                                                            {/* Transaction Details Level */}
                                                            {expandedItem === item.kalem_id && item.detaylar && item.detaylar.length > 0 && (
                                                                <div className="bg-white p-3 pl-12 animate-fadeIn">
                                                                    <div className="space-y-2">
                                                                        {item.detaylar.map((detail, detailIdx) => (
                                                                            <div key={detailIdx} className="text-xs text-gray-600 flex justify-between items-start py-1 border-b border-gray-100 last:border-b-0">
                                                                                <div className="flex-1">
                                                                                    <div className="font-medium text-gray-700">{new Date(detail.tarih).toLocaleDateString('de-DE')}</div>
                                                                                    {detail.aciklama && (
                                                                                        <div className="text-gray-500 mt-0.5">{detail.aciklama}</div>
                                                                                    )}
                                                                                </div>
                                                                                <span className="font-semibold text-gray-700 ml-3">-{formatCurrency(detail.tutar)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 italic px-3">{content.noExpenses}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Nettogewinn */}
                    <div className={`flex justify-between items-center py-4 -mx-6 px-6 border-y-2 mt-4 ${
                        report.netProfit >= 0 
                            ? 'bg-emerald-50 border-emerald-200' 
                            : 'bg-red-50 border-red-200'
                    }`}>
                        <span className="text-gray-800 font-bold text-xl">= {report.netProfit >= 0 ? content.netProfit : content.netLoss}</span>
                        <span className={`text-3xl font-bold ${report.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(report.netProfit)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
