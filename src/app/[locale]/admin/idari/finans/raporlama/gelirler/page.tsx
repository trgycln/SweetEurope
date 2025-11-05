// src/app/[locale]/admin/idari/finans/raporlama/gelirler/page.tsx
// Gelir Analizi - Ciro ve Gelir Detayları

'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiFilter, FiDollarSign, FiTrendingUp } from 'react-icons/fi';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';

// Veri tipleri
type MonthlyRevenue = {
    month: string;
    grossRevenue: number;
    netRevenue: number;
};

type CategoryRevenue = {
    category: string;
    revenue: number;
    orderCount: number;
};

// Tailwind paletiyle uyumlu renk seti
const THEME = {
    primary: '#2B2B2B',
    accent: '#C69F6B',
    text: '#3D3D3D',
    bgSubtle: '#EAE8E1',
    secondary: '#FAF9F6',
};
const COLORS = [THEME.accent, THEME.primary, THEME.text, '#6B7280', '#9CA3AF', THEME.bgSubtle];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

type PageProps = {
    params: Promise<{ locale: string }>;
};

export default function RevenueAnalysisPage({ params }: PageProps) {
    const [locale, setLocale] = React.useState<string>('de');
    const [period, setPeriod] = useState('this-year');
    const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>([]);
    const [categoryData, setCategoryData] = useState<CategoryRevenue[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalOrders, setTotalOrders] = useState(0);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        params.then(p => setLocale(p.locale));
    }, [params]);

    useEffect(() => {
        fetchRevenueData();
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
            case 'last-6-months':
                startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                endDate = new Date();
                break;
            case 'last-year':
                startDate = new Date(now.getFullYear() - 1, 0, 1);
                endDate = new Date(now.getFullYear() - 1, 11, 31);
                break;
            case 'this-year':
            default:
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
        }
        
        return {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
        };
    };

    const fetchRevenueData = async () => {
        setLoading(true);
        const supabase = createDynamicSupabaseClient(false);
        const { start, end } = getDateRange(period);

        // Siparişlerden gelir verilerini çek
        const { data: orders } = await supabase
            .from('siparisler')
            .select('siparis_tarihi, toplam_tutar_brut, toplam_tutar_net, siparis_durumu')
            .gte('siparis_tarihi', start)
            .lte('siparis_tarihi', end);

        if (orders) {
            // Aylık toplama
            const monthMap = new Map<string, { gross: number; net: number }>();
            orders.forEach(order => {
                const month = order.siparis_tarihi.substring(0, 7); // YYYY-MM
                const existing = monthMap.get(month) || { gross: 0, net: 0 };
                monthMap.set(month, {
                    gross: existing.gross + (order.toplam_tutar_brut || 0),
                    net: existing.net + (order.toplam_tutar_net || 0)
                });
            });

            const monthly = Array.from(monthMap.entries())
                .map(([month, data]) => ({
                    month,
                    grossRevenue: data.gross,
                    netRevenue: data.net
                }))
                .sort((a, b) => a.month.localeCompare(b.month));

            setMonthlyData(monthly);
            setTotalRevenue(orders.reduce((sum, o) => sum + (o.toplam_tutar_net || 0), 0));
            setTotalOrders(orders.length);
        }

        // Kategori bazlı gelir – sipariş detayları üzerinden
        // Not: kategoriler.ad alanı Json, mevcut locale'e göre okunur
        const { data: orderItems } = await supabase
            .from('siparis_detay')
            .select(`
                siparis_id,
                miktar,
                birim_fiyat,
                toplam_fiyat,
                siparisler!inner(siparis_tarihi),
                urunler!inner(
                    kategori_id,
                    kategoriler(
                        ad
                    )
                )
            `)
            .gte('siparisler.siparis_tarihi', start)
            .lte('siparisler.siparis_tarihi', end);

        if (orderItems) {
            const resolveName = (ad: any): string => {
                if (!ad) return 'Diğer';
                if (typeof ad === 'string') return ad;
                if (typeof ad === 'object') {
                    return ad?.[locale] || ad?.de || ad?.en || ad?.tr || Object.values(ad)[0] || 'Diğer';
                }
                return 'Diğer';
            };

            const categoryMap = new Map<string, { revenue: number; orders: Set<string> }>();
            (orderItems as any[]).forEach((item) => {
                const catName = resolveName(item?.urunler?.kategoriler?.ad);
                const entry = categoryMap.get(catName) || { revenue: 0, orders: new Set<string>() };
                const lineTotal = (item?.toplam_fiyat ?? ((item?.miktar || 0) * (item?.birim_fiyat || 0)));
                entry.revenue += lineTotal;
                if (item?.siparis_id) entry.orders.add(item.siparis_id);
                categoryMap.set(catName, entry);
            });

            const categories: CategoryRevenue[] = Array.from(categoryMap.entries())
                .map(([category, data]) => ({
                    category,
                    revenue: data.revenue,
                    orderCount: data.orders.size
                }))
                .sort((a, b) => b.revenue - a.revenue);

            setCategoryData(categories);
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
                <h1 className="font-serif text-4xl font-bold text-primary">Gelir Analizi</h1>
                <p className="text-text-main/80 mt-1">Ciro detayları ve kategori bazlı gelir dağılımı</p>
            </header>

            {/* Filtreler */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <div className="flex items-center gap-4 flex-wrap">
                    <FiFilter className="text-accent" />
                    <p className="font-bold text-primary">Dönem:</p>
                    {[
                        { label: 'Geçen Ay', value: 'last-month' },
                        { label: 'Son 6 Ay', value: 'last-6-months' },
                        { label: 'Bu Yıl', value: 'this-year' },
                        { label: 'Geçen Yıl', value: 'last-year' },
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
                    {/* Özet Kartları */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-secondary p-8 rounded-2xl shadow-lg border-2 border-bg-subtle">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-2">Toplam Net Ciro</p>
                                    <p className="text-5xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
                                </div>
                                <FiDollarSign className="text-accent" size={64} />
                            </div>
                        </div>
                        <div className="bg-secondary p-8 rounded-2xl shadow-lg border-2 border-bg-subtle">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-2">Toplam Sipariş</p>
                                    <p className="text-5xl font-bold text-primary">{totalOrders}</p>
                                    <p className="text-sm text-gray-600 mt-2">
                                        Ort: {totalOrders > 0 ? formatCurrency(totalRevenue / totalOrders) : '0'}
                                    </p>
                                </div>
                                <FiTrendingUp className="text-accent" size={64} />
                            </div>
                        </div>
                    </div>

                    {/* Aylık Gelir Trendi */}
                    {monthlyData.length > 0 && (
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                            <h3 className="font-serif text-xl font-bold text-primary mb-6">Aylık Gelir Trendi</h3>
                            <ResponsiveContainer width="100%" height={350}>
                                <LineChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                    <Legend />
                                    <Line type="monotone" dataKey="grossRevenue" stroke={THEME.accent} name="Brüt Ciro" strokeWidth={2} />
                                    <Line type="monotone" dataKey="netRevenue" stroke={THEME.primary} name="Net Ciro" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Kategori Analizi */}
                    {categoryData.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Pasta Grafiği */}
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                                <h3 className="font-serif text-xl font-bold text-primary mb-6">Kategori Dağılımı</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            dataKey="revenue"
                                            nameKey="category"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            label={(entry: any) => `${entry.category}: ${totalRevenue > 0 ? ((entry.revenue / totalRevenue) * 100).toFixed(1) : '0'}%`}
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Bar Grafiği */}
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                                <h3 className="font-serif text-xl font-bold text-primary mb-6">Kategori Karşılaştırma</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={categoryData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                                        <YAxis />
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Bar dataKey="revenue" fill={THEME.accent} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Detaylı Tablo */}
                    {categoryData.length > 0 && (
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                            <h3 className="font-serif text-xl font-bold text-primary mb-6">Kategori Detayları</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Kategori</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Sipariş Sayısı</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Toplam Gelir</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Ort. Sipariş</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Pay (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {categoryData.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div 
                                                            className="w-3 h-3 rounded-full mr-3" 
                                                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                                        />
                                                        <span className="font-medium text-gray-900">{item.category}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                                                    {item.orderCount}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-primary">
                                                    {formatCurrency(item.revenue)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                                                    {formatCurrency(item.revenue / item.orderCount)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                                                    {((item.revenue / totalRevenue) * 100).toFixed(2)}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50">
                                        <tr>
                                            <td className="px-6 py-4 font-bold text-gray-900">TOPLAM</td>
                                            <td className="px-6 py-4 text-right font-bold">
                                                {categoryData.reduce((sum, item) => sum + item.orderCount, 0)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-green-700 text-lg">
                                                {formatCurrency(totalRevenue)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold">
                                                {formatCurrency(totalRevenue / totalOrders)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold">100%</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Veri yoksa */}
                    {monthlyData.length === 0 && categoryData.length === 0 && (
                        <div className="bg-white p-12 rounded-2xl shadow-lg border border-gray-200 text-center">
                            <p className="text-gray-500 text-lg">Bu dönemde sipariş kaydı bulunamadı</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
