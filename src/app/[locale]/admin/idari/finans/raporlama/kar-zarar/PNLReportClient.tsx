'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    FiArrowLeft, FiFilter, FiTrendingUp, FiTrendingDown,
    FiDollarSign, FiShoppingCart, FiCreditCard,
    FiChevronDown, FiChevronUp, FiCalendar, FiPercent, FiInfo
} from 'react-icons/fi';

type ExpenseDetail  = { id: string; tarih: string; tutar: number; aciklama: string | null };
type ExpenseItem    = { kalem_id: string; kalem_adi: string; toplam: number; detaylar: ExpenseDetail[] | null };
type ExpenseCategory= { kategori: string; toplam: number; kalemler: ExpenseItem[] };
type ReportData     = {
    totalGrossRevenue: number;
    totalRevenue: number;
    totalCogs: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    expenseBreakdown: ExpenseCategory[];
};

const fmt = (v: number | null | undefined) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const pctOf = (part: number, total: number) =>
    total === 0 ? '0.0' : ((part / total) * 100).toFixed(1);

const PERIODS = [
    { label: 'Bu Ay',       value: 'this-month'   },
    { label: 'Geçen Ay',    value: 'last-month'   },
    { label: 'Son 3 Ay',    value: 'last-3-months'},
    { label: 'Son 6 Ay',    value: 'last-6-months'},
    { label: 'Bu Yıl',      value: 'this-year'    },
    { label: 'Geçen Yıl',   value: 'last-year'    },
];

export default function PNLReportClient({
    locale, dictionary, report, error, currentPeriod, startDate, endDate
}: {
    locale: string; dictionary: any; report: ReportData | null;
    error: any; currentPeriod: string; startDate: string; endDate: string;
}) {
    const router = useRouter();
    const [showExpenses,    setShowExpenses]    = useState(false);
    const [expandedCat,     setExpandedCat]     = useState<string | null>(null);
    const [expandedItem,    setExpandedItem]    = useState<string | null>(null);
    const [showCustomDate,  setShowCustomDate]  = useState(false);
    const [customFrom,      setCustomFrom]      = useState(startDate);
    const [customTo,        setCustomTo]        = useState(endDate);

    const periodLabel = PERIODS.find(p => p.value === currentPeriod)?.label ?? currentPeriod;

    const handlePeriod = (val: string) => {
        if (val === 'custom') { setShowCustomDate(v => !v); return; }
        router.push(`/${locale}/admin/idari/finans/raporlama/kar-zarar?period=${val}`);
    };
    const handleCustomApply = () =>
        router.push(`/${locale}/admin/idari/finans/raporlama/kar-zarar?period=custom&from=${customFrom}&to=${customTo}`);

    if (error || !report) {
        return (
            <div className="space-y-6">
                <header>
                    <Link href={`/${locale}/admin/idari/finans/raporlama`}
                          className="inline-flex items-center gap-2 text-primary hover:text-accent mb-4 font-semibold text-sm">
                        <FiArrowLeft size={14} /> Geri
                    </Link>
                    <h1 className="font-serif text-3xl font-bold text-primary">Kâr & Zarar Raporu</h1>
                </header>
                <div className="p-8 text-center bg-red-50 rounded-xl border border-red-200">
                    <p className="text-red-600">Rapor verisi yüklenemedi. Lütfen tekrar deneyin.</p>
                </div>
            </div>
        );
    }

    const grossMargin  = report.totalRevenue > 0 ? (report.grossProfit    / report.totalRevenue) * 100 : 0;
    const netMargin    = report.totalRevenue > 0 ? (report.netProfit       / report.totalRevenue) * 100 : 0;
    const cogsRatio    = report.totalRevenue > 0 ? (report.totalCogs       / report.totalRevenue) * 100 : 0;
    const opexRatio    = report.totalRevenue > 0 ? (report.totalExpenses   / report.totalRevenue) * 100 : 0;

    // Waterfall bars for visual P&L
    const wfMax = Math.max(report.totalRevenue, 1);

    return (
        <div className="space-y-8 pb-8">
            {/* Header */}
            <header>
                <Link href={`/${locale}/admin/idari/finans/raporlama`}
                      className="inline-flex items-center gap-2 text-primary hover:text-accent mb-4 font-semibold text-sm transition-colors">
                    <FiArrowLeft size={14} /> Raporlara Dön
                </Link>
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="font-serif text-3xl font-bold text-primary">Kâr & Zarar Raporu</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {new Date(startDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} — {new Date(endDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <span className="px-3 py-1 bg-accent/10 text-accent font-bold text-sm rounded-full">{periodLabel}</span>
                </div>
            </header>

            {/* Period Filter */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <FiFilter className="text-accent" size={14} />
                    <span className="text-sm font-semibold text-gray-600">Dönem Seç:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {PERIODS.map(p => (
                        <button key={p.value} onClick={() => handlePeriod(p.value)}
                            className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-all ${
                                currentPeriod === p.value
                                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}>
                            {p.label}
                        </button>
                    ))}
                    <button onClick={() => setShowCustomDate(v => !v)}
                        className={`px-3 py-1.5 text-sm font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                            currentPeriod === 'custom'
                                ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}>
                        <FiCalendar size={13} /> Özel Tarih
                    </button>
                </div>
                {showCustomDate && (
                    <div className="flex items-end gap-3 mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Başlangıç</label>
                            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                                   className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Bitiş</label>
                            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                                   className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent" />
                        </div>
                        <button onClick={handleCustomApply}
                                className="px-5 py-2 bg-accent text-white font-bold text-sm rounded-lg hover:bg-accent/90 transition-colors">
                            Uygula
                        </button>
                    </div>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Brüt Ciro',    value: fmt(report.totalGrossRevenue), sub: 'KDV dahil toplam',       icon: FiDollarSign,   grad: 'from-blue-500 to-blue-600'     },
                    { label: 'Brüt Kâr',     value: fmt(report.grossProfit),       sub: `Marj: %${grossMargin.toFixed(1)}`, icon: FiShoppingCart, grad: 'from-emerald-500 to-emerald-600' },
                    { label: 'Operasyonel Gider', value: fmt(report.totalExpenses), sub: `Gelir oranı: %${opexRatio.toFixed(1)}`, icon: FiCreditCard,   grad: 'from-orange-500 to-orange-600'   },
                    {
                        label: report.netProfit >= 0 ? 'Net Kâr' : 'Net Zarar',
                        value: fmt(report.netProfit),
                        sub: `Net marj: %${netMargin.toFixed(1)}`,
                        icon: report.netProfit >= 0 ? FiTrendingUp : FiTrendingDown,
                        grad: report.netProfit >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600',
                    },
                ].map((k, i) => (
                    <div key={i} className={`bg-gradient-to-br ${k.grad} text-white p-5 rounded-xl shadow-lg`}>
                        <div className="flex items-center justify-between mb-3">
                            <k.icon className="opacity-80" size={22} />
                        </div>
                        <p className="text-xs opacity-80 font-semibold uppercase tracking-wider">{k.label}</p>
                        <p className="text-2xl font-bold mt-1">{k.value}</p>
                        <p className="text-xs opacity-70 mt-1">{k.sub}</p>
                    </div>
                ))}
            </div>

            {/* Margin Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: 'Brüt Marj', value: grossMargin,
                        desc: 'COGS sonrası marj',
                        good: grossMargin >= 30, warn: grossMargin >= 15,
                    },
                    {
                        label: 'Net Marj', value: netMargin,
                        desc: 'Tüm gider sonrası marj',
                        good: netMargin >= 15, warn: netMargin >= 5,
                    },
                    {
                        label: 'COGS Oranı', value: cogsRatio,
                        desc: 'Satılan mal maliyeti oranı',
                        good: cogsRatio <= 40, warn: cogsRatio <= 65,
                        invert: true,
                    },
                    {
                        label: 'OPEX Oranı', value: opexRatio,
                        desc: 'Operasyonel gider oranı',
                        good: opexRatio <= 20, warn: opexRatio <= 40,
                        invert: true,
                    },
                ].map((m, i) => {
                    const clr = m.good ? 'text-emerald-700' : m.warn ? 'text-amber-700' : 'text-red-600';
                    const bar = m.good ? 'bg-emerald-500' : m.warn ? 'bg-amber-400' : 'bg-red-500';
                    return (
                        <div key={i} className="bg-white border border-gray-200 p-4 rounded-xl">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{m.label}</p>
                                <FiPercent className="text-gray-300" size={12} />
                            </div>
                            <p className={`text-2xl font-bold ${clr}`}>%{Math.abs(m.value).toFixed(1)}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{m.desc}</p>
                            <div className="mt-2.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-1 rounded-full ${bar}`} style={{ width: `${Math.min(Math.abs(m.value), 100)}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Visual Waterfall P&L */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="font-semibold text-gray-700">Kâr & Zarar — Detaylı Özet</h2>
                </div>

                <div className="divide-y divide-gray-100">
                    {/* Gross Revenue */}
                    <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                        <div className="w-40 flex-shrink-0">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Brüt Ciro</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">KDV dahil</p>
                        </div>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-5 bg-blue-400 rounded-full" style={{ width: `${(report.totalGrossRevenue / wfMax) * 100}%` }} />
                        </div>
                        <span className="text-sm font-bold text-blue-700 w-32 text-right flex-shrink-0">{fmt(report.totalGrossRevenue)}</span>
                    </div>

                    {/* Net Revenue */}
                    <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                        <div className="w-40 flex-shrink-0 pl-4">
                            <p className="text-xs font-semibold text-gray-600">Net Ciro</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">KDV hariç</p>
                        </div>
                        <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-4 bg-emerald-400 rounded-full" style={{ width: `${(report.totalRevenue / wfMax) * 100}%` }} />
                        </div>
                        <span className="text-sm font-bold text-emerald-700 w-32 text-right flex-shrink-0">{fmt(report.totalRevenue)}</span>
                    </div>

                    {/* COGS */}
                    <div className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors bg-red-50/30">
                        <div className="w-40 flex-shrink-0 pl-4">
                            <p className="text-xs font-semibold text-gray-600">– Satılan Mal Maliyeti</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">%{cogsRatio.toFixed(1)} ciranın</p>
                        </div>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-3 bg-red-400 rounded-full" style={{ width: `${(report.totalCogs / wfMax) * 100}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-red-600 w-32 text-right flex-shrink-0">– {fmt(report.totalCogs)}</span>
                    </div>

                    {/* Gross Profit */}
                    <div className="flex items-center gap-4 px-5 py-4 bg-emerald-50 border-y border-emerald-100">
                        <div className="w-40 flex-shrink-0">
                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">= Brüt Kâr</p>
                            <p className="text-[10px] text-emerald-600 mt-0.5">%{grossMargin.toFixed(1)} marj</p>
                        </div>
                        <div className="flex-1 h-5 bg-emerald-100 rounded-full overflow-hidden">
                            <div className="h-5 bg-emerald-500 rounded-full" style={{ width: `${(Math.max(report.grossProfit, 0) / wfMax) * 100}%` }} />
                        </div>
                        <span className="text-base font-bold text-emerald-700 w-32 text-right flex-shrink-0">{fmt(report.grossProfit)}</span>
                    </div>

                    {/* OPEX */}
                    <div className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors bg-orange-50/30">
                        <div className="w-40 flex-shrink-0 pl-4">
                            <button onClick={() => setShowExpenses(v => !v)}
                                className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-accent transition-colors">
                                – Operasyonel Gider {showExpenses ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                            </button>
                            <p className="text-[10px] text-gray-400 mt-0.5">%{opexRatio.toFixed(1)} ciranın</p>
                        </div>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-3 bg-orange-400 rounded-full" style={{ width: `${(report.totalExpenses / wfMax) * 100}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-orange-600 w-32 text-right flex-shrink-0">– {fmt(report.totalExpenses)}</span>
                    </div>

                    {/* Expense Breakdown (accordion) */}
                    {showExpenses && (
                        <div className="bg-gray-50 px-5 py-3 space-y-1">
                            {report.expenseBreakdown.length > 0 ? (
                                report.expenseBreakdown.map((cat, ci) => (
                                    <div key={ci} className="border border-gray-200 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setExpandedCat(expandedCat === cat.kategori ? null : cat.kategori)}
                                            className="w-full flex items-center justify-between px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors">
                                            <span className="text-sm text-gray-700 font-semibold flex items-center gap-2">
                                                {expandedCat === cat.kategori ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
                                                {cat.kategori}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-gray-400">%{pctOf(cat.toplam, report.totalExpenses)}</span>
                                                <span className="text-sm font-bold text-gray-700">– {fmt(cat.toplam)}</span>
                                            </div>
                                        </button>

                                        {expandedCat === cat.kategori && cat.kalemler?.length > 0 && (
                                            <div className="divide-y divide-gray-100 bg-gray-50">
                                                {cat.kalemler.map((item, ii) => (
                                                    <div key={ii}>
                                                        <button
                                                            onClick={() => setExpandedItem(expandedItem === item.kalem_id ? null : item.kalem_id)}
                                                            className="w-full flex items-center justify-between px-6 py-2 hover:bg-gray-100 transition-colors">
                                                            <span className="text-xs text-gray-600 flex items-center gap-1.5">
                                                                {expandedItem === item.kalem_id ? <FiChevronUp size={11} /> : <FiChevronDown size={11} />}
                                                                {item.kalem_adi}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-gray-400">%{pctOf(item.toplam, cat.toplam)}</span>
                                                                <span className="text-xs font-semibold text-gray-600">– {fmt(item.toplam)}</span>
                                                            </div>
                                                        </button>
                                                        {expandedItem === item.kalem_id && item.detaylar && item.detaylar.length > 0 && (
                                                            <div className="bg-white px-8 py-2 space-y-1.5">
                                                                {item.detaylar.map((d, di) => (
                                                                    <div key={di} className="flex justify-between items-center text-xs text-gray-500 py-1 border-b border-gray-50 last:border-0">
                                                                        <div>
                                                                            <span className="font-medium text-gray-600">{new Date(d.tarih).toLocaleDateString('tr-TR')}</span>
                                                                            {d.aciklama && <span className="text-gray-400 ml-2">{d.aciklama}</span>}
                                                                        </div>
                                                                        <span className="font-semibold text-gray-600">– {fmt(d.tutar)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-gray-400 italic text-center py-3">Bu dönemde kayıtlı operasyonel gider yok</p>
                            )}
                        </div>
                    )}

                    {/* Net Profit */}
                    <div className={`flex items-center gap-4 px-5 py-5 ${report.netProfit >= 0 ? 'bg-green-50 border-t border-green-100' : 'bg-red-50 border-t border-red-100'}`}>
                        <div className="w-40 flex-shrink-0">
                            <p className={`text-xs font-bold uppercase tracking-wide ${report.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                = {report.netProfit >= 0 ? 'Net Kâr' : 'Net Zarar'}
                            </p>
                            <p className={`text-[10px] mt-0.5 ${report.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                %{Math.abs(netMargin).toFixed(1)} {report.netProfit >= 0 ? 'kâr marjı' : 'zarar oranı'}
                            </p>
                        </div>
                        <div className={`flex-1 h-6 ${report.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-full overflow-hidden`}>
                            <div className={`h-6 ${report.netProfit >= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-full`}
                                 style={{ width: `${(Math.abs(report.netProfit) / wfMax) * 100}%` }} />
                        </div>
                        <span className={`text-xl font-bold w-32 text-right flex-shrink-0 ${report.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {fmt(report.netProfit)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Expense Breakdown Summary Table */}
            {report.expenseBreakdown.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-semibold text-gray-700">Gider Dağılımı — Özet</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kategori</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tutar</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Toplam Gider %</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gelir %</th>
                                    <th className="px-4 py-3 w-28 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dağılım</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {report.expenseBreakdown.map((cat, i) => {
                                    const pctExp = report.totalExpenses > 0 ? (cat.toplam / report.totalExpenses) * 100 : 0;
                                    const pctRev = report.totalRevenue  > 0 ? (cat.toplam / report.totalRevenue)  * 100 : 0;
                                    return (
                                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-3.5 font-semibold text-sm text-gray-800">{cat.kategori}</td>
                                            <td className="px-5 py-3.5 text-right font-bold text-sm text-red-600">{fmt(cat.toplam)}</td>
                                            <td className="px-5 py-3.5 text-right text-sm text-gray-600">%{pctExp.toFixed(1)}</td>
                                            <td className="px-5 py-3.5 text-right text-sm text-gray-600">%{pctRev.toFixed(1)}</td>
                                            <td className="px-4 py-3.5 w-28">
                                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-1.5 bg-orange-400 rounded-full" style={{ width: `${pctExp}%` }} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                <tr>
                                    <td className="px-5 py-3.5 font-bold text-sm text-gray-800">TOPLAM</td>
                                    <td className="px-5 py-3.5 text-right font-bold text-red-700 text-base">{fmt(report.totalExpenses)}</td>
                                    <td className="px-5 py-3.5 text-right font-bold text-sm text-gray-700">%100</td>
                                    <td className="px-5 py-3.5 text-right font-bold text-sm text-gray-700">%{opexRatio.toFixed(1)}</td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
