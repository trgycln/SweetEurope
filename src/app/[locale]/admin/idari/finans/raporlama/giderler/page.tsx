// src/app/[locale]/admin/idari/finans/raporlama/giderler/page.tsx
// Gider Analizi - Kategori Bazlı Detaylı Analiz

'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiFilter, FiCalendar } from 'react-icons/fi';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';

// Veri tipleri
type ExpenseData = {
    kategori: string;
    toplam: number;
    count: number;
};

type MonthlyExpense = {
    month: string;
    total: number;
};

// Renk paleti
const COLORS = ['#8B4789', '#D4AF37', '#2C5F2D', '#97BC62', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

type PageProps = {
    params: Promise<{ locale: string }>;
};

export default function ExpenseAnalysisPage({ params }: PageProps) {
    const [locale, setLocale] = React.useState<string>('de');
    const [period, setPeriod] = useState('this-month');
    const [expensesByCategory, setExpensesByCategory] = useState<ExpenseData[]>([]);
    const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpense[]>([]);
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        params.then(p => setLocale(p.locale));
    }, [params]);

    useEffect(() => {
        fetchExpenseData();
    }, [period]);

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
            case 'last-6-months':
                startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                endDate = new Date();
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

    const fetchExpenseData = async () => {
        setLoading(true);
        const supabase = createDynamicSupabaseClient(false);
        const { start, end } = getDateRange(period);

        // Kategori bazlı giderler (join ile)
        const { data: expenses } = await supabase
            .from('giderler')
            .select(`
                tutar,
                gider_kalemleri!inner(
                    ad,
                    gider_ana_kategoriler!inner(ad)
                )
            `)
            .gte('tarih', start)
            .lte('tarih', end);

        if (expenses) {
            // Kategori bazlı toplama
            const categoryMap = new Map<string, { toplam: number; count: number }>();
            expenses.forEach(exp => {
                const kategori = exp.gider_kalemleri?.gider_ana_kategoriler?.ad || 'Diğer';
                const existing = categoryMap.get(kategori) || { toplam: 0, count: 0 };
                categoryMap.set(kategori, {
                    toplam: existing.toplam + (exp.tutar || 0),
                    count: existing.count + 1
                });
            });

            const categoryData = Array.from(categoryMap.entries()).map(([kategori, data]) => ({
                kategori,
                toplam: data.toplam,
                count: data.count
            })).sort((a, b) => b.toplam - a.toplam);

            setExpensesByCategory(categoryData);
            setTotalExpenses(categoryData.reduce((sum, item) => sum + item.toplam, 0));
        }

        // Aylık trend (sadece 6 ay veya yıllık için)
        if (period === 'last-6-months' || period === 'this-year') {
            const { data: allExpenses } = await supabase
                .from('giderler')
                .select('tarih, tutar')
                .gte('tarih', start)
                .lte('tarih', end)
                .order('tarih');

            if (allExpenses) {
                const monthMap = new Map<string, number>();
                allExpenses.forEach(exp => {
                    const month = exp.tarih.substring(0, 7); // YYYY-MM
                    monthMap.set(month, (monthMap.get(month) || 0) + (exp.tutar || 0));
                });

                const monthlyData = Array.from(monthMap.entries())
                    .map(([month, total]) => ({ month, total }))
                    .sort((a, b) => a.month.localeCompare(b.month));

                setMonthlyExpenses(monthlyData);
            }
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
                <h1 className="font-serif text-4xl font-bold text-primary">Gider Analizi</h1>
                <p className="text-text-main/80 mt-1">Kategori bazlı gider dağılımı ve trend analizi</p>
            </header>

            {/* Filtreler */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <div className="flex items-center gap-4 flex-wrap">
                    <FiFilter className="text-accent" />
                    <p className="font-bold text-primary">Dönem:</p>
                    {[
                        { label: 'Bu Ay', value: 'this-month' },
                        { label: 'Geçen Ay', value: 'last-month' },
                        { label: 'Son 6 Ay', value: 'last-6-months' },
                        { label: 'Bu Yıl', value: 'this-year' },
                    ].map(p => (
                        <button
                            key={p.value}
                            onClick={() => setPeriod(p.value)}
                            className={`px-4 py-2 text-sm font-bold rounded-full transition-colors ${
                                period === p.value 
                                    ? 'bg-accent text-white' 
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-gray-600">Yükleniyor...</p>
                </div>
            ) : (
                <>
                    {/* Özet Kart */}
                    <div className="bg-gradient-to-r from-accent/10 to-primary/10 p-8 rounded-2xl shadow-lg border-2 border-accent/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 mb-2">Toplam Gider</p>
                                <p className="text-5xl font-bold text-primary">{formatCurrency(totalExpenses)}</p>
                                <p className="text-sm text-gray-500 mt-2">{expensesByCategory.length} farklı kategoride</p>
                            </div>
                            <FiCalendar className="text-accent" size={64} />
                        </div>
                    </div>

                    {/* Grafik Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pasta Grafiği */}
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                            <h3 className="font-serif text-xl font-bold text-primary mb-6">Kategori Dağılımı</h3>
                            {expensesByCategory.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={expensesByCategory}
                                            dataKey="toplam"
                                            nameKey="kategori"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            label={(entry: any) => `${entry.kategori}: ${((entry.toplam / totalExpenses) * 100).toFixed(1)}%`}
                                        >
                                            {expensesByCategory.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-gray-500 text-center py-12">Bu dönemde gider kaydı yok</p>
                            )}
                        </div>

                        {/* Bar Grafiği - Kategori Karşılaştırma */}
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                            <h3 className="font-serif text-xl font-bold text-primary mb-6">Kategori Karşılaştırma</h3>
                            {expensesByCategory.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={expensesByCategory}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="kategori" angle={-45} textAnchor="end" height={100} />
                                        <YAxis />
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Bar dataKey="toplam" fill="#8B4789" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-gray-500 text-center py-12">Bu dönemde gider kaydı yok</p>
                            )}
                        </div>
                    </div>

                    {/* Aylık Trend (sadece uzun dönemler için) */}
                    {(period === 'last-6-months' || period === 'this-year') && monthlyExpenses.length > 0 && (
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                            <h3 className="font-serif text-xl font-bold text-primary mb-6">Aylık Gider Trendi</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={monthlyExpenses}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                    <Legend />
                                    <Bar dataKey="total" fill="#D4AF37" name="Toplam Gider" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Detaylı Tablo */}
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                        <h3 className="font-serif text-xl font-bold text-primary mb-6">Kategori Detayları</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Kategori</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">İşlem Sayısı</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Toplam Tutar</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Yüzde</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {expensesByCategory.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div 
                                                        className="w-3 h-3 rounded-full mr-3" 
                                                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                                    />
                                                    <span className="font-medium text-gray-900">{item.kategori}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                                                {item.count}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-primary">
                                                {formatCurrency(item.toplam)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                                                {((item.toplam / totalExpenses) * 100).toFixed(2)}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50">
                                    <tr>
                                        <td className="px-6 py-4 font-bold text-gray-900">TOPLAM</td>
                                        <td className="px-6 py-4 text-right font-bold">
                                            {expensesByCategory.reduce((sum, item) => sum + item.count, 0)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-primary text-lg">
                                            {formatCurrency(totalExpenses)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold">100%</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
