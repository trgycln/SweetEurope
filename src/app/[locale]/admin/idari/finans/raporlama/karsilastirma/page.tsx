// src/app/[locale]/admin/idari/finans/raporlama/karsilastirma/page.tsx
// Dönemsel Karşılaştırma - Ay ay ve Yıl Bazlı Karşılaştırma

'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';

// Veri tipleri
type ComparisonData = {
    period: string;
    revenue: number;
    expenses: number;
    profit: number;
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

const calculateGrowth = (current: number, previous: number): string => {
    if (previous === 0) return 'N/A';
    const growth = ((current - previous) / previous) * 100;
    return `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`;
};

type PageProps = {
    params: Promise<{ locale: string }>;
};

export default function ComparisonPage({ params }: PageProps) {
    const [locale, setLocale] = React.useState<string>('de');
    const [viewType, setViewType] = useState<'monthly' | 'yearly'>('monthly');
    const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        params.then(p => setLocale(p.locale));
    }, [params]);

    useEffect(() => {
        fetchComparisonData();
    }, [viewType]);

    const fetchComparisonData = async () => {
        setLoading(true);
        const supabase = createDynamicSupabaseClient(false);
        const now = new Date();

        if (viewType === 'monthly') {
            // Son 12 ay
            const data: ComparisonData[] = [];
            
            for (let i = 11; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const start = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
                const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

                // Gelir
                const { data: orders } = await supabase
                    .from('siparisler')
                    .select('toplam_tutar_net')
                    .gte('siparis_tarihi', start)
                    .lte('siparis_tarihi', end);

                const revenue = orders?.reduce((sum, o) => sum + (o.toplam_tutar_net || 0), 0) || 0;

                // Gider
                const { data: expenses } = await supabase
                    .from('giderler')
                    .select('tutar')
                    .gte('tarih', start)
                    .lte('tarih', end);

                const expense = expenses?.reduce((sum, e) => sum + (e.tutar || 0), 0) || 0;

                data.push({
                    period: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                    revenue,
                    expenses: expense,
                    profit: revenue - expense
                });
            }

            setComparisonData(data);
        } else {
            // Son 5 yıl
            const data: ComparisonData[] = [];
            
            for (let i = 4; i >= 0; i--) {
                const year = now.getFullYear() - i;
                const start = `${year}-01-01`;
                const end = `${year}-12-31`;

                // Gelir
                const { data: orders } = await supabase
                    .from('siparisler')
                    .select('toplam_tutar_net')
                    .gte('siparis_tarihi', start)
                    .lte('siparis_tarihi', end);

                const revenue = orders?.reduce((sum, o) => sum + (o.toplam_tutar_net || 0), 0) || 0;

                // Gider
                const { data: expenses } = await supabase
                    .from('giderler')
                    .select('tutar')
                    .gte('tarih', start)
                    .lte('tarih', end);

                const expense = expenses?.reduce((sum, e) => sum + (e.tutar || 0), 0) || 0;

                data.push({
                    period: String(year),
                    revenue,
                    expenses: expense,
                    profit: revenue - expense
                });
            }

            setComparisonData(data);
        }

        setLoading(false);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <header>
                <Link 
                    href={`/${locale}/admin/idari/finans/raporlama`}
                    className="inline-flex items-center gap-2 text-primary hover:text-accent mb-4 font-semibold"
                >
                    <FiArrowLeft /> Raporlara Dön
                </Link>
                <h1 className="font-serif text-4xl font-bold text-primary">Dönemsel Karşılaştırma</h1>
                <p className="text-text-main/80 mt-1">Ay ay ve yıl bazında finansal performans analizi</p>
            </header>

            {/* Görünüm Seçici */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <div className="flex items-center gap-4">
                    <p className="font-bold text-primary">Görünüm:</p>
                    <button
                        onClick={() => setViewType('monthly')}
                        className={`px-6 py-2 text-sm font-bold rounded-full transition-colors ${
                            viewType === 'monthly' 
                                ? 'bg-accent text-white' 
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                    >
                        Aylık (Son 12 Ay)
                    </button>
                    <button
                        onClick={() => setViewType('yearly')}
                        className={`px-6 py-2 text-sm font-bold rounded-full transition-colors ${
                            viewType === 'yearly' 
                                ? 'bg-accent text-white' 
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                    >
                        Yıllık (Son 5 Yıl)
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-gray-600">Yükleniyor...</p>
                </div>
            ) : (
                <>
                    {/* Gelir-Gider-Kar Grafiği */}
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                        <h3 className="font-serif text-xl font-bold text-primary mb-6">
                            {viewType === 'monthly' ? 'Aylık' : 'Yıllık'} Gelir-Gider-Kar Karşılaştırması
                        </h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={comparisonData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="period" />
                                <YAxis />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                                <Bar dataKey="revenue" fill="#2C5F2D" name="Gelir" />
                                <Bar dataKey="expenses" fill="#D4AF37" name="Gider" />
                                <Bar dataKey="profit" fill="#8B4789" name="Kar" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Kar Trend Çizgisi */}
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                        <h3 className="font-serif text-xl font-bold text-primary mb-6">Kar Trendi</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={comparisonData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="period" />
                                <YAxis />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                                <Line 
                                    type="monotone" 
                                    dataKey="profit" 
                                    stroke="#8B4789" 
                                    strokeWidth={3}
                                    name="Net Kar"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Detaylı Tablo */}
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                        <h3 className="font-serif text-xl font-bold text-primary mb-6">Detaylı Karşılaştırma</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Dönem
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Gelir
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Gider
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Kar
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Kar Marjı
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Büyüme
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {comparisonData.map((item, idx) => {
                                        const previousProfit = idx > 0 ? comparisonData[idx - 1].profit : 0;
                                        const growth = calculateGrowth(item.profit, previousProfit);
                                        const profitMargin = item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0;
                                        
                                        return (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                                    {item.period}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-green-700">
                                                    {formatCurrency(item.revenue)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-amber-600">
                                                    {formatCurrency(item.expenses)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-primary">
                                                    {formatCurrency(item.profit)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                                                    {profitMargin.toFixed(1)}%
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    {idx > 0 && (
                                                        <span className={`inline-flex items-center gap-1 text-sm font-semibold ${
                                                            item.profit >= previousProfit ? 'text-green-600' : 'text-red-600'
                                                        }`}>
                                                            {item.profit >= previousProfit ? (
                                                                <FiTrendingUp size={16} />
                                                            ) : (
                                                                <FiTrendingDown size={16} />
                                                            )}
                                                            {growth}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-gray-50">
                                    <tr>
                                        <td className="px-6 py-4 font-bold text-gray-900">TOPLAM</td>
                                        <td className="px-6 py-4 text-right font-bold text-green-700 text-lg">
                                            {formatCurrency(comparisonData.reduce((sum, item) => sum + item.revenue, 0))}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-amber-600 text-lg">
                                            {formatCurrency(comparisonData.reduce((sum, item) => sum + item.expenses, 0))}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-primary text-lg">
                                            {formatCurrency(comparisonData.reduce((sum, item) => sum + item.profit, 0))}
                                        </td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Özet İstatistikler */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-2xl shadow-lg border-2 border-green-200">
                            <p className="text-sm font-medium text-gray-600 mb-2">En Yüksek Gelir</p>
                            <p className="text-2xl font-bold text-green-700">
                                {formatCurrency(Math.max(...comparisonData.map(d => d.revenue)))}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {comparisonData.find(d => d.revenue === Math.max(...comparisonData.map(x => x.revenue)))?.period}
                            </p>
                        </div>
                        <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-6 rounded-2xl shadow-lg border-2 border-amber-200">
                            <p className="text-sm font-medium text-gray-600 mb-2">En Yüksek Gider</p>
                            <p className="text-2xl font-bold text-amber-700">
                                {formatCurrency(Math.max(...comparisonData.map(d => d.expenses)))}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {comparisonData.find(d => d.expenses === Math.max(...comparisonData.map(x => x.expenses)))?.period}
                            </p>
                        </div>
                        <div className="bg-gradient-to-r from-primary/10 to-primary/20 p-6 rounded-2xl shadow-lg border-2 border-primary/20">
                            <p className="text-sm font-medium text-gray-600 mb-2">En Yüksek Kar</p>
                            <p className="text-2xl font-bold text-primary">
                                {formatCurrency(Math.max(...comparisonData.map(d => d.profit)))}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {comparisonData.find(d => d.profit === Math.max(...comparisonData.map(x => x.profit)))?.period}
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
