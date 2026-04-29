'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    FiArrowLeft, FiFilter, FiDollarSign, FiTrendingUp,
    FiTrendingDown, FiShoppingCart, FiUsers, FiAward
} from 'react-icons/fi';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';

type MonthlyRevenue = { month: string; grossRevenue: number; netRevenue: number; orderCount: number };
type CategoryRevenue = { category: string; revenue: number; orderCount: number };
type TopCustomer = { firmName: string; revenue: number; orderCount: number; avgOrder: number };
type SegmentSplit = { segment: string; revenue: number; orderCount: number };

const CHART_COLORS = ['#C69F6B', '#2B2B2B', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];

const fmt  = (v: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);
const pct  = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
const chg  = (cur: number, prv: number) => prv === 0 ? 0 : ((cur - prv) / prv) * 100;

type PageProps = { params: Promise<{ locale: string }> };

export default function RevenueAnalysisPage({ params }: PageProps) {
    const [locale, setLocale] = useState('de');
    const [period, setPeriod] = useState('this-year');

    const [monthly,      setMonthly]      = useState<MonthlyRevenue[]>([]);
    const [categories,   setCategories]   = useState<CategoryRevenue[]>([]);
    const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
    const [segments,     setSegments]     = useState<SegmentSplit[]>([]);

    const [totalRev,    setTotalRev]    = useState(0);
    const [totalOrders, setTotalOrders] = useState(0);
    const [prevRev,     setPrevRev]     = useState(0);
    const [loading,     setLoading]     = useState(true);

    useEffect(() => { params.then(p => setLocale(p.locale)); }, [params]);
    useEffect(() => { fetchData(); }, [period]);

    const getRange = (p: string): { start: string; end: string; prevStart: string; prevEnd: string } => {
        const now = new Date();
        let s: Date, e: Date, ps: Date, pe: Date;
        switch (p) {
            case 'last-month':
                s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                e = new Date(now.getFullYear(), now.getMonth(), 0);
                ps = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                pe = new Date(now.getFullYear(), now.getMonth() - 1, 0);
                break;
            case 'last-6-months':
                s = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                e = new Date();
                ps = new Date(now.getFullYear(), now.getMonth() - 12, 1);
                pe = new Date(now.getFullYear(), now.getMonth() - 6, 0);
                break;
            case 'last-year':
                s = new Date(now.getFullYear() - 1, 0, 1);
                e = new Date(now.getFullYear() - 1, 11, 31);
                ps = new Date(now.getFullYear() - 2, 0, 1);
                pe = new Date(now.getFullYear() - 2, 11, 31);
                break;
            default: // this-year
                s = new Date(now.getFullYear(), 0, 1);
                e = new Date(now.getFullYear(), 11, 31);
                ps = new Date(now.getFullYear() - 1, 0, 1);
                pe = new Date(now.getFullYear() - 1, 11, 31);
        }
        const iso = (d: Date) => d.toISOString().split('T')[0];
        return { start: iso(s), end: iso(e), prevStart: iso(ps), prevEnd: iso(pe) };
    };

    const fetchData = async () => {
        setLoading(true);
        const sb = createDynamicSupabaseClient(false);
        const { start, end, prevStart, prevEnd } = getRange(period);

        // Current period orders
        const { data: orders } = await sb
            .from('siparisler')
            .select('siparis_tarihi, toplam_tutar_brut, toplam_tutar_net, firma_id, olusturan_kullanici_id')
            .gte('siparis_tarihi', start)
            .lte('siparis_tarihi', end);

        // Previous period revenue for growth calc
        const { data: prevOrders } = await sb
            .from('siparisler')
            .select('toplam_tutar_net')
            .gte('siparis_tarihi', prevStart)
            .lte('siparis_tarihi', prevEnd);

        const prevTotal = (prevOrders ?? []).reduce((s, o: any) => s + (o.toplam_tutar_net || 0), 0);
        setPrevRev(prevTotal);

        if (orders) {
            // Monthly aggregation
            const monthMap = new Map<string, { gross: number; net: number; orders: number }>();
            orders.forEach((o: any) => {
                const m = (o.siparis_tarihi as string).substring(0, 7);
                const ex = monthMap.get(m) || { gross: 0, net: 0, orders: 0 };
                monthMap.set(m, { gross: ex.gross + (o.toplam_tutar_brut || 0), net: ex.net + (o.toplam_tutar_net || 0), orders: ex.orders + 1 });
            });
            setMonthly(
                Array.from(monthMap.entries())
                    .map(([month, d]) => ({ month, grossRevenue: d.gross, netRevenue: d.net, orderCount: d.orders }))
                    .sort((a, b) => a.month.localeCompare(b.month))
            );

            const total = orders.reduce((s, o: any) => s + (o.toplam_tutar_net || 0), 0);
            setTotalRev(total);
            setTotalOrders(orders.length);

            // Top customers by firma
            const firmaMap = new Map<string, { revenue: number; count: number }>();
            orders.forEach((o: any) => {
                if (!o.firma_id) return;
                const ex = firmaMap.get(o.firma_id) || { revenue: 0, count: 0 };
                firmaMap.set(o.firma_id, { revenue: ex.revenue + (o.toplam_tutar_net || 0), count: ex.count + 1 });
            });
            const firmaIds = Array.from(firmaMap.keys());
            if (firmaIds.length > 0) {
                const { data: firms } = await sb.from('firmalar').select('id, unvan').in('id', firmaIds);
                const nameById = new Map<string, string>((firms ?? []).map((f: any) => [f.id, f.unvan]));
                setTopCustomers(
                    Array.from(firmaMap.entries())
                        .map(([id, d]) => ({
                            firmName: nameById.get(id) || 'Bilinmeyen',
                            revenue:  d.revenue,
                            orderCount: d.count,
                            avgOrder: d.count > 0 ? d.revenue / d.count : 0,
                        }))
                        .sort((a, b) => b.revenue - a.revenue)
                        .slice(0, 10)
                );
            } else {
                setTopCustomers([]);
            }

            // Segment split
            const userIds = Array.from(new Set(orders.map((o: any) => o.olusturan_kullanici_id).filter(Boolean)));
            if (userIds.length > 0) {
                const { data: profiles } = await sb.from('kullanici_segment_bilgileri').select('id, rol').in('id', userIds);
                const roleMap = new Map<string, string>((profiles ?? []).map((p: any) => [p.id, p.rol]));
                const segMap = new Map<string, { revenue: number; count: number }>();
                orders.forEach((o: any) => {
                    const rol = roleMap.get(o.olusturan_kullanici_id) ?? 'Diğer';
                    const seg = rol === 'Alt Bayi' ? 'Alt Bayi' : (rol === 'Müşteri' ? 'Müşteri' : 'Diğer');
                    const ex = segMap.get(seg) || { revenue: 0, count: 0 };
                    segMap.set(seg, { revenue: ex.revenue + (o.toplam_tutar_net || 0), count: ex.count + 1 });
                });
                setSegments(
                    Array.from(segMap.entries())
                        .map(([segment, d]) => ({ segment, revenue: d.revenue, orderCount: d.count }))
                        .sort((a, b) => b.revenue - a.revenue)
                );
            } else {
                setSegments([]);
            }
        }

        // Order items for category breakdown
        const { data: items } = await sb
            .from('siparis_detay')
            .select(`miktar, birim_fiyat, toplam_fiyat, siparisler!inner(siparis_tarihi), urunler!inner(kategori_id, kategoriler(ad))`)
            .gte('siparisler.siparis_tarihi', start)
            .lte('siparisler.siparis_tarihi', end);

        if (items) {
            const resolveName = (ad: any): string => {
                if (!ad) return 'Diğer';
                if (typeof ad === 'string') return ad;
                return ad?.[locale] || ad?.de || ad?.en || ad?.tr || Object.values(ad)[0] || 'Diğer';
            };
            const catMap = new Map<string, { revenue: number; orders: Set<string> }>();
            (items as any[]).forEach(item => {
                const cat = resolveName(item?.urunler?.kategoriler?.ad);
                const lineTotal = item?.toplam_fiyat ?? ((item?.miktar || 0) * (item?.birim_fiyat || 0));
                const ex = catMap.get(cat) || { revenue: 0, orders: new Set<string>() };
                ex.revenue += lineTotal;
                if (item?.siparis_id) ex.orders.add(item.siparis_id);
                catMap.set(cat, ex);
            });
            setCategories(
                Array.from(catMap.entries())
                    .map(([category, d]) => ({ category, revenue: d.revenue, orderCount: d.orders.size }))
                    .sort((a, b) => b.revenue - a.revenue)
            );
        }

        setLoading(false);
    };

    const aov         = totalOrders > 0 ? totalRev / totalOrders : 0;
    const revGrowth   = chg(totalRev, prevRev);
    const hasPrev     = prevRev > 0;

    const periodLabels: Record<string, string> = {
        'last-month': 'Geçen Ay', 'last-6-months': 'Son 6 Ay',
        'this-year': 'Bu Yıl',   'last-year': 'Geçen Yıl',
    };

    // Top-3 concentration
    const top3Rev = topCustomers.slice(0, 3).reduce((s, c) => s + c.revenue, 0);
    const top3Pct = totalRev > 0 ? (top3Rev / totalRev) * 100 : 0;

    return (
        <div className="space-y-8 pb-8">
            {/* Header */}
            <header>
                <Link href={`/${locale}/admin/idari/finans/raporlama`}
                      className="inline-flex items-center gap-2 text-primary hover:text-accent mb-4 font-semibold text-sm transition-colors">
                    <FiArrowLeft size={14} /> Raporlara Dön
                </Link>
                <h1 className="font-serif text-3xl font-bold text-primary">Gelir Analizi</h1>
                <p className="text-sm text-gray-500 mt-1">Ciro detayları, müşteri performansı ve kategori bazlı gelir dağılımı</p>
            </header>

            {/* Period Filter */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <FiFilter className="text-accent" size={14} />
                    <span className="text-sm font-semibold text-gray-600">Dönem:</span>
                    {[
                        { label: 'Geçen Ay', value: 'last-month' },
                        { label: 'Son 6 Ay', value: 'last-6-months' },
                        { label: 'Bu Yıl',   value: 'this-year'    },
                        { label: 'Geçen Yıl',value: 'last-year'    },
                    ].map(p => (
                        <button key={p.value} onClick={() => setPeriod(p.value)}
                            className={`px-4 py-1.5 text-sm font-bold rounded-full transition-colors ${
                                period === p.value ? 'bg-accent text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}>
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent mx-auto" />
                    <p className="mt-4 text-sm text-gray-500">Veriler yükleniyor...</p>
                </div>
            ) : (
                <>
                    {/* KPI Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            {
                                label: 'Net Ciro',
                                value: fmt(totalRev),
                                sub: `${periodLabels[period]}`,
                                delta: hasPrev ? revGrowth : null,
                                icon: FiDollarSign,
                                bg: 'bg-emerald-50', border: 'border-emerald-100',
                                txt: 'text-emerald-700', ibg: 'bg-emerald-100', icol: 'text-emerald-500',
                            },
                            {
                                label: 'Toplam Sipariş',
                                value: totalOrders.toLocaleString('tr-TR'),
                                sub: 'Dönem içi sipariş adedi',
                                delta: null,
                                icon: FiShoppingCart,
                                bg: 'bg-blue-50', border: 'border-blue-100',
                                txt: 'text-blue-700', ibg: 'bg-blue-100', icol: 'text-blue-500',
                            },
                            {
                                label: 'Ort. Sipariş Değeri',
                                value: fmt(aov),
                                sub: 'Sipariş başına ortalama ciro',
                                delta: null,
                                icon: FiAward,
                                bg: 'bg-violet-50', border: 'border-violet-100',
                                txt: 'text-violet-700', ibg: 'bg-violet-100', icol: 'text-violet-500',
                            },
                            {
                                label: hasPrev ? 'Dönem Büyümesi' : 'Müşteri Konsantrasyonu',
                                value: hasPrev ? pct(revGrowth) : `%${top3Pct.toFixed(1)}`,
                                sub: hasPrev ? 'Bir önceki döneme göre' : 'İlk 3 müşteri payı',
                                delta: null,
                                icon: hasPrev ? (revGrowth >= 0 ? FiTrendingUp : FiTrendingDown) : FiUsers,
                                bg: !hasPrev ? 'bg-orange-50' : (revGrowth >= 0 ? 'bg-green-50' : 'bg-red-50'),
                                border: !hasPrev ? 'border-orange-100' : (revGrowth >= 0 ? 'border-green-100' : 'border-red-100'),
                                txt: !hasPrev ? 'text-orange-700' : (revGrowth >= 0 ? 'text-green-700' : 'text-red-700'),
                                ibg: !hasPrev ? 'bg-orange-100' : (revGrowth >= 0 ? 'bg-green-100' : 'bg-red-100'),
                                icol: !hasPrev ? 'text-orange-500' : (revGrowth >= 0 ? 'text-green-600' : 'text-red-600'),
                            },
                        ].map((k, i) => (
                            <div key={i} className={`${k.bg} border ${k.border} p-5 rounded-xl`}>
                                <div className="flex items-start justify-between mb-3">
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{k.label}</p>
                                    <div className={`p-2 ${k.ibg} rounded-lg`}>
                                        <k.icon className={k.icol} size={14} />
                                    </div>
                                </div>
                                <p className={`text-2xl font-bold ${k.txt}`}>{k.value}</p>
                                <p className="text-xs text-gray-500 mt-1">{k.sub}</p>
                                {k.delta !== null && Math.abs(k.delta) > 0.1 && (
                                    <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${k.delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {k.delta >= 0 ? <FiTrendingUp size={11} /> : <FiTrendingDown size={11} />}
                                        {pct(k.delta)} bir önceki dönem
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Aylık Ciro Trendi (Area Chart) */}
                    {monthly.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                            <h3 className="font-semibold text-gray-700 mb-5">Aylık Ciro Trendi</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={monthly}>
                                    <defs>
                                        <linearGradient id="gradGross" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#C69F6B" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#C69F6B" stopOpacity={0}   />
                                        </linearGradient>
                                        <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#2B2B2B" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#2B2B2B" stopOpacity={0}    />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                    <YAxis tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(v: number) => fmt(v)} />
                                    <Legend />
                                    <Area type="monotone" dataKey="grossRevenue" stroke="#C69F6B" fill="url(#gradGross)" strokeWidth={2} name="Brüt Ciro" />
                                    <Area type="monotone" dataKey="netRevenue"   stroke="#2B2B2B" fill="url(#gradNet)"   strokeWidth={2} name="Net Ciro"  />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Kategori & Segment Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Kategori Dağılımı */}
                        {categories.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-xl p-6">
                                <h3 className="font-semibold text-gray-700 mb-5">Kategori Bazlı Ciro Dağılımı</h3>
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie data={categories} dataKey="revenue" nameKey="category"
                                             cx="50%" cy="50%" outerRadius={90} innerRadius={40}
                                             label={({ category, percent }: any) => `${category} %${(percent * 100).toFixed(0)}`}
                                             labelLine={false}>
                                            {categories.map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v: number) => fmt(v)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Segment Dağılımı */}
                        {segments.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-xl p-6">
                                <h3 className="font-semibold text-gray-700 mb-5">Müşteri Segmenti Ciro Dağılımı</h3>
                                <div className="space-y-4 mt-2">
                                    {segments.map((seg, i) => {
                                        const p = totalRev > 0 ? (seg.revenue / totalRev) * 100 : 0;
                                        const barColors = ['bg-accent', 'bg-primary', 'bg-gray-400'];
                                        const txtColors = ['text-accent', 'text-primary', 'text-gray-500'];
                                        return (
                                            <div key={i}>
                                                <div className="flex items-center justify-between mb-1.5 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2.5 h-2.5 rounded-full ${barColors[i % 3]}`} />
                                                        <span className="font-semibold text-gray-700">{seg.segment}</span>
                                                        <span className="text-gray-400 text-xs">{seg.orderCount} sipariş</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-xs font-bold ${txtColors[i % 3]}`}>%{p.toFixed(1)}</span>
                                                        <span className="font-bold text-gray-800">{fmt(seg.revenue)}</span>
                                                    </div>
                                                </div>
                                                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className={`h-2.5 rounded-full ${barColors[i % 3]}`} style={{ width: `${p}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Segment Summary */}
                                <div className="mt-6 pt-4 border-t border-gray-100">
                                    <ResponsiveContainer width="100%" height={160}>
                                        <BarChart data={segments} layout="vertical" barSize={18}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                                            <YAxis type="category" dataKey="segment" tick={{ fontSize: 11 }} width={70} />
                                            <Tooltip formatter={(v: number) => fmt(v)} />
                                            <Bar dataKey="revenue" name="Ciro" radius={[0, 4, 4, 0]}>
                                                {segments.map((_, i) => (
                                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Kategori Detay Tablosu */}
                    {categories.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                <h3 className="font-semibold text-gray-700">Kategori Detayları</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kategori</th>
                                            <th className="px-5 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Sipariş</th>
                                            <th className="px-5 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Toplam Ciro</th>
                                            <th className="px-5 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ort. Sipariş</th>
                                            <th className="px-5 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pay</th>
                                            <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider w-28">Dağılım</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {categories.map((item, idx) => {
                                            const share = totalRev > 0 ? (item.revenue / totalRev) * 100 : 0;
                                            return (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                                  style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                                                            <span className="font-semibold text-sm text-gray-800">{item.category}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right text-sm text-gray-600">{item.orderCount}</td>
                                                    <td className="px-5 py-3.5 text-right font-bold text-emerald-700 text-sm">{fmt(item.revenue)}</td>
                                                    <td className="px-5 py-3.5 text-right text-sm text-gray-600">
                                                        {item.orderCount > 0 ? fmt(item.revenue / item.orderCount) : '—'}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <span className="inline-block bg-gray-100 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                                            %{share.toFixed(1)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 w-28">
                                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-1.5 rounded-full bg-accent" style={{ width: `${share}%` }} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                        <tr>
                                            <td className="px-5 py-3.5 font-bold text-gray-800 text-sm">TOPLAM</td>
                                            <td className="px-5 py-3.5 text-right font-bold text-sm text-gray-700">
                                                {categories.reduce((s, i) => s + i.orderCount, 0)}
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-bold text-emerald-700 text-base">{fmt(totalRev)}</td>
                                            <td className="px-5 py-3.5 text-right font-bold text-sm text-gray-700">
                                                {totalOrders > 0 ? fmt(totalRev / totalOrders) : '—'}
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-bold text-sm text-gray-700">%100</td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Top 10 Müşteriler */}
                    {topCustomers.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                                <h3 className="font-semibold text-gray-700">En Yüksek Cirolu Müşteriler — Top 10</h3>
                                {top3Pct > 0 && (
                                    <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-3 py-1 rounded-full">
                                        İlk 3 müşteri: %{top3Pct.toFixed(1)} paya sahip
                                    </span>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">#</th>
                                            <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Firma</th>
                                            <th className="px-5 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Sipariş</th>
                                            <th className="px-5 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Net Ciro</th>
                                            <th className="px-5 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ort. Sipariş</th>
                                            <th className="px-5 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Toplam Payı</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {topCustomers.map((c, i) => {
                                            const share = totalRev > 0 ? (c.revenue / totalRev) * 100 : 0;
                                            const medals = ['🥇', '🥈', '🥉'];
                                            return (
                                                <tr key={i} className={`hover:bg-gray-50 transition-colors ${i < 3 ? 'bg-amber-50/30' : ''}`}>
                                                    <td className="px-5 py-3.5 text-sm font-bold text-gray-500 w-8">
                                                        {i < 3 ? medals[i] : <span className="text-gray-400">{i + 1}</span>}
                                                    </td>
                                                    <td className="px-5 py-3.5 font-semibold text-sm text-gray-800">{c.firmName}</td>
                                                    <td className="px-5 py-3.5 text-right text-sm text-gray-600">{c.orderCount}</td>
                                                    <td className="px-5 py-3.5 text-right font-bold text-emerald-700 text-sm">{fmt(c.revenue)}</td>
                                                    <td className="px-5 py-3.5 text-right text-sm text-gray-600">{fmt(c.avgOrder)}</td>
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                <div className="h-1.5 bg-accent rounded-full" style={{ width: `${share}%` }} />
                                                            </div>
                                                            <span className="text-xs text-gray-500 w-10 text-right">%{share.toFixed(1)}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {monthly.length === 0 && categories.length === 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                            <p className="text-gray-500">Bu dönemde sipariş kaydı bulunamadı.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
