'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';
import { FiArrowLeft, FiFilter, FiHeart, FiUsers, FiAward, FiBarChart2, FiShoppingCart } from 'react-icons/fi';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

type PageProps = { params: Promise<{ locale: string }> };
type TopProduct = { id: string; name: string; totalQty: number; totalRevenue: number; orderCount: number; abcClass?: 'A' | 'B' | 'C' };
type TopCategory = { name: string; totalQty: number; totalRevenue: number; orderCount: number };
type FavoriteStat = { productId: string; name: string; slug?: string | null; favCount: number; orderedInPeriod: number };
type SegmentBuyer = { segment: string; firmName: string; totalRevenue: number; orderCount: number };

const THEME_COLORS = ['#C69F6B', '#2B2B2B', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280'];
const ABC_COLORS = { A: { bg: 'bg-emerald-100 text-emerald-700', bar: '#10B981', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                     B: { bg: 'bg-blue-100 text-blue-700',      bar: '#3B82F6', badge: 'bg-blue-100 text-blue-700 border-blue-200'       },
                     C: { bg: 'bg-gray-100 text-gray-600',      bar: '#9CA3AF', badge: 'bg-gray-100 text-gray-500 border-gray-200'       } };

const fmt      = (v: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);
const truncate = (s: string, n = 20) => s?.length > n ? `${s.slice(0, n - 1)}…` : (s || '');

export default function DemandAnalysisPage({ params }: PageProps) {
    const [locale, setLocale] = React.useState('de');
    const [period, setPeriod] = React.useState<'last-month' | 'last-6-months' | 'this-year' | 'last-year'>('this-year');
    const [loading, setLoading] = React.useState(true);

    const [topByQty,   setTopByQty]   = React.useState<TopProduct[]>([]);
    const [topByRev,   setTopByRev]   = React.useState<TopProduct[]>([]);
    const [categories, setCategories] = React.useState<TopCategory[]>([]);
    const [favorites,  setFavorites]  = React.useState<FavoriteStat[]>([]);
    const [segments,   setSegments]   = React.useState<SegmentBuyer[]>([]);

    const [totalRev,    setTotalRev]    = React.useState(0);
    const [totalOrders, setTotalOrders] = React.useState(0);

    React.useEffect(() => { params.then(p => setLocale(p.locale)); }, [params]);
    React.useEffect(() => { fetchAll(); }, [period, locale]);

    const getRange = (p: string) => {
        const now = new Date();
        let s: Date, e: Date;
        switch (p) {
            case 'last-month': s = new Date(now.getFullYear(), now.getMonth() - 1, 1); e = new Date(now.getFullYear(), now.getMonth(), 0); break;
            case 'last-6-months': s = new Date(now.getFullYear(), now.getMonth() - 6, 1); e = new Date(); break;
            case 'last-year': s = new Date(now.getFullYear() - 1, 0, 1); e = new Date(now.getFullYear() - 1, 11, 31); break;
            default: s = new Date(now.getFullYear(), 0, 1); e = new Date(now.getFullYear(), 11, 31);
        }
        return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0] };
    };

    const resolveName = (ad: any): string => {
        if (!ad) return 'Diğer';
        if (typeof ad === 'string') return ad;
        return ad?.[locale] || ad?.de || ad?.en || ad?.tr || Object.values(ad)[0] || 'Diğer';
    };

    // ABC Classification based on cumulative revenue share
    const classifyABC = (products: TopProduct[]): TopProduct[] => {
        const totalRev = products.reduce((s, p) => s + p.totalRevenue, 0);
        let cumRev = 0;
        return products.map(p => {
            cumRev += p.totalRevenue;
            const cumPct = totalRev > 0 ? (cumRev / totalRev) * 100 : 0;
            return { ...p, abcClass: cumPct <= 70 ? 'A' : cumPct <= 90 ? 'B' : 'C' };
        });
    };

    const fetchAll = async () => {
        setLoading(true);
        const sb = createDynamicSupabaseClient(false);
        const { start, end } = getRange(period);

        // Order items
        const { data: items } = await sb
            .from('siparis_detay')
            .select(`id, siparis_id, miktar, birim_fiyat, toplam_fiyat, siparisler!inner(siparis_tarihi), urunler!inner(id, ad, slug, kategori_id, kategoriler(ad))`)
            .gte('siparisler.siparis_tarihi', start)
            .lte('siparisler.siparis_tarihi', end);

        const productMap  = new Map<string, { name: string; qty: number; revenue: number; orders: Set<string> }>();
        const categoryMap = new Map<string, { qty: number; revenue: number; orders: Set<string> }>();
        let grandRev = 0;

        if (items) {
            (items as any[]).forEach(row => {
                const pid      = row?.urunler?.id as string;
                const pname    = resolveName(row?.urunler?.ad);
                const catName  = resolveName(row?.urunler?.kategoriler?.ad);
                const qty      = Number(row?.miktar || 0);
                const lineTotal= Number(row?.toplam_fiyat ?? ((row?.miktar || 0) * (row?.birim_fiyat || 0)));
                const orderId  = row?.siparis_id as string;
                grandRev += lineTotal;

                if (pid) {
                    const p = productMap.get(pid) || { name: pname, qty: 0, revenue: 0, orders: new Set<string>() };
                    p.qty += qty; p.revenue += lineTotal;
                    if (orderId) p.orders.add(orderId);
                    productMap.set(pid, p);
                }
                const c = categoryMap.get(catName) || { qty: 0, revenue: 0, orders: new Set<string>() };
                c.qty += qty; c.revenue += lineTotal;
                if (orderId) c.orders.add(orderId);
                categoryMap.set(catName, c);
            });
        }

        const products: TopProduct[] = Array.from(productMap.entries()).map(([id, v]) => ({
            id, name: v.name, totalQty: v.qty, totalRevenue: v.revenue, orderCount: v.orders.size,
        }));

        const byRev = classifyABC([...products].sort((a, b) => b.totalRevenue - a.totalRevenue));
        setTopByRev(byRev);
        setTopByQty([...products].sort((a, b) => b.totalQty - a.totalQty).slice(0, 15));
        setTotalRev(grandRev);

        setCategories(
            Array.from(categoryMap.entries())
                .map(([name, v]) => ({ name, totalQty: v.qty, totalRevenue: v.revenue, orderCount: v.orders.size }))
                .sort((a, b) => b.totalRevenue - a.totalRevenue)
        );

        // Orders for total count and segments
        const { data: orders } = await sb
            .from('siparisler')
            .select('id, firma_id, toplam_tutar_net, olusturan_kullanici_id')
            .gte('siparis_tarihi', start)
            .lte('siparis_tarihi', end);

        setTotalOrders((orders ?? []).length);

        if (orders && orders.length > 0) {
            const userIds = Array.from(new Set((orders as any[]).map(o => o.olusturan_kullanici_id).filter(Boolean)));
            const firmaIds = Array.from(new Set((orders as any[]).map(o => o.firma_id).filter(Boolean)));

            const [profileRows, firmRows] = await Promise.all([
                userIds.length > 0 ? sb.from('kullanici_segment_bilgileri').select('id, rol').in('id', userIds) : { data: [] },
                firmaIds.length > 0 ? sb.from('firmalar').select('id, unvan').in('id', firmaIds) : { data: [] },
            ]);

            const roleMap = new Map<string, string>((profileRows.data ?? []).map((r: any) => [r.id, r.rol]));
            const firmMap = new Map<string, string>((firmRows.data ?? []).map((f: any) => [f.id, f.unvan]));

            const segMap = new Map<string, { seg: string; firmName: string; rev: number; cnt: number }>();
            (orders as any[]).forEach(o => {
                const rol  = roleMap.get(o.olusturan_kullanici_id) ?? 'Diğer';
                const seg  = rol === 'Alt Bayi' ? 'Alt Bayi' : (rol === 'Müşteri' ? 'Müşteri' : 'Diğer');
                const firm = firmMap.get(o.firma_id) || 'Bilinmeyen';
                const key  = `${seg}::${o.firma_id}`;
                const ex   = segMap.get(key) || { seg, firmName: firm, rev: 0, cnt: 0 };
                ex.rev += Number(o.toplam_tutar_net || 0);
                ex.cnt += 1;
                segMap.set(key, ex);
            });
            setSegments(
                Array.from(segMap.values())
                    .map(x => ({ segment: x.seg, firmName: x.firmName, totalRevenue: x.rev, orderCount: x.cnt }))
                    .sort((a, b) => b.totalRevenue - a.totalRevenue)
            );
        } else {
            setSegments([]);
        }

        // Favorites
        const { data: favAgg } = await sb.from('favori_urunler_istatistik').select('urun_id, fav_count').order('fav_count', { ascending: false });
        if (favAgg && favAgg.length > 0) {
            const prodIds = favAgg.map((f: any) => f.urun_id);
            const { data: prodRows } = await sb.from('urunler').select('id, ad, slug').in('id', prodIds);
            const prodById = new Map<string, any>((prodRows ?? []).map((p: any) => [p.id, p]));
            const ordByProd = new Map<string, number>();
            if (items) (items as any[]).forEach(row => {
                const pid = row?.urunler?.id; const oid = row?.siparis_id;
                if (pid && oid) { const s = ordByProd.get(pid) || 0; ordByProd.set(pid, s + 1); }
            });
            setFavorites(
                favAgg.map((f: any) => {
                    const prod = prodById.get(f.urun_id) || {};
                    return { productId: f.urun_id, name: resolveName(prod.ad), slug: prod.slug, favCount: Number(f.fav_count), orderedInPeriod: ordByProd.get(f.urun_id) || 0 };
                }).sort((a, b) => b.favCount - a.favCount).slice(0, 10)
            );
        } else {
            setFavorites([]);
        }

        setLoading(false);
    };

    // ABC stats
    const aCount = topByRev.filter(p => p.abcClass === 'A').length;
    const aRev   = topByRev.filter(p => p.abcClass === 'A').reduce((s, p) => s + p.totalRevenue, 0);
    const aPct   = totalRev > 0 ? (aRev / totalRev) * 100 : 0;

    // Top 3 customer concentration
    const custSeg = segments.filter(s => s.segment === 'Müşteri');
    const top3Rev = custSeg.slice(0, 3).reduce((s, c) => s + c.totalRevenue, 0);
    const segTotal = segments.reduce((s, c) => s + c.totalRevenue, 0);
    const top3Pct = segTotal > 0 ? (top3Rev / segTotal) * 100 : 0;

    const periodLabels: Record<string, string> = {
        'last-month': 'Geçen Ay', 'last-6-months': 'Son 6 Ay',
        'this-year': 'Bu Yıl',   'last-year': 'Geçen Yıl',
    };

    return (
        <div className="space-y-8 pb-8">
            {/* Header */}
            <header>
                <Link href={`/${locale}/admin/idari/finans/raporlama`}
                      className="inline-flex items-center gap-2 text-primary hover:text-accent mb-4 font-semibold text-sm transition-colors">
                    <FiArrowLeft size={14} /> Raporlara Dön
                </Link>
                <h1 className="font-serif text-3xl font-bold text-primary">Talep Analizi</h1>
                <p className="text-sm text-gray-500 mt-1">En çok talep gören ürünler, ABC analizi, müşteri konsantrasyonu ve favoriler</p>
            </header>

            {/* Filter */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <FiFilter className="text-accent" size={14} />
                    <span className="text-sm font-semibold text-gray-600">Dönem:</span>
                    {[
                        { label: 'Geçen Ay',  value: 'last-month'   },
                        { label: 'Son 6 Ay',  value: 'last-6-months'},
                        { label: 'Bu Yıl',    value: 'this-year'    },
                        { label: 'Geçen Yıl', value: 'last-year'    },
                    ].map(p => (
                        <button key={p.value} onClick={() => setPeriod(p.value as any)}
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
                    <p className="mt-4 text-sm text-gray-500">Analiz yapılıyor...</p>
                </div>
            ) : (
                <>
                    {/* Summary KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Toplam Ciro', value: fmt(totalRev), sub: `${periodLabels[period]} ürün gelirleri`, icon: FiBarChart2, bg: 'bg-emerald-50', border: 'border-emerald-100', txt: 'text-emerald-700', ibg: 'bg-emerald-100', icol: 'text-emerald-500' },
                            { label: 'Toplam Sipariş', value: totalOrders.toLocaleString('tr-TR'), sub: 'Dönem içi', icon: FiShoppingCart, bg: 'bg-blue-50', border: 'border-blue-100', txt: 'text-blue-700', ibg: 'bg-blue-100', icol: 'text-blue-500' },
                            { label: `A Sınıfı (${aCount} ürün)`, value: `%${aPct.toFixed(1)}`, sub: `Toplam cironun %70'ini oluşturuyor`, icon: FiAward, bg: 'bg-amber-50', border: 'border-amber-100', txt: 'text-amber-700', ibg: 'bg-amber-100', icol: 'text-amber-500' },
                            { label: 'Müşteri Konsantrasyonu', value: `%${top3Pct.toFixed(1)}`, sub: 'İlk 3 müşteri toplam payı', icon: FiUsers, bg: top3Pct > 60 ? 'bg-red-50' : 'bg-violet-50', border: top3Pct > 60 ? 'border-red-100' : 'border-violet-100', txt: top3Pct > 60 ? 'text-red-700' : 'text-violet-700', ibg: top3Pct > 60 ? 'bg-red-100' : 'bg-violet-100', icol: top3Pct > 60 ? 'text-red-600' : 'text-violet-600' },
                        ].map((k, i) => (
                            <div key={i} className={`${k.bg} border ${k.border} p-5 rounded-xl`}>
                                <div className="flex items-start justify-between mb-3">
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider leading-tight">{k.label}</p>
                                    <div className={`p-2 ${k.ibg} rounded-lg flex-shrink-0`}><k.icon className={k.icol} size={14} /></div>
                                </div>
                                <p className={`text-2xl font-bold ${k.txt}`}>{k.value}</p>
                                <p className="text-xs text-gray-500 mt-1">{k.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* ABC Analysis */}
                    {topByRev.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-semibold text-gray-700">ABC Ürün Analizi — Ciro Bazlı Sınıflandırma</h2>
                                <div className="flex gap-2 text-xs">
                                    {(['A', 'B', 'C'] as const).map(c => (
                                        <span key={c} className={`px-2 py-0.5 rounded border font-bold ${ABC_COLORS[c].badge}`}>
                                            {c} {c === 'A' ? '(≤%70 ciro)' : c === 'B' ? '(%70-90)' : '(%90+)'}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-100 bg-gray-50">
                                                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">#</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sınıf</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ürün</th>
                                                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Adet</th>
                                                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ciro</th>
                                                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pay</th>
                                                <th className="px-4 py-3 w-28 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dağılım</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {topByRev.slice(0, 20).map((p, i) => {
                                                const share = totalRev > 0 ? (p.totalRevenue / totalRev) * 100 : 0;
                                                const cls = p.abcClass ?? 'C';
                                                return (
                                                    <tr key={i} className={`hover:bg-gray-50 transition-colors ${cls === 'A' ? 'bg-emerald-50/20' : ''}`}>
                                                        <td className="px-4 py-3 text-xs text-gray-400 font-semibold">{i + 1}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${ABC_COLORS[cls].badge}`}>{cls}</span>
                                                        </td>
                                                        <td className="px-4 py-3 font-semibold text-sm text-gray-800 max-w-[180px] truncate">{p.name}</td>
                                                        <td className="px-4 py-3 text-right text-sm text-gray-600">{p.totalQty}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-sm text-emerald-700">{fmt(p.totalRevenue)}</td>
                                                        <td className="px-4 py-3 text-right text-xs text-gray-500">%{share.toFixed(1)}</td>
                                                        <td className="px-4 py-3 w-28">
                                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                <div className="h-1.5 rounded-full"
                                                                     style={{ width: `${share}%`, backgroundColor: ABC_COLORS[cls].bar }} />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {topByRev.length > 20 && (
                                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-400">
                                        + {topByRev.length - 20} ürün daha gösterilmiyor
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Top Products Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {topByQty.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-xl p-6">
                                <h3 className="font-semibold text-gray-700 mb-5">En Çok Satılan Ürünler (Adet)</h3>
                                <ResponsiveContainer width="100%" height={320}>
                                    <BarChart data={topByQty.slice(0, 10)} layout="vertical" barSize={14}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tick={{ fontSize: 10 }} />
                                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }}
                                               tickFormatter={(v: string) => truncate(v, 18)} />
                                        <Tooltip />
                                        <Bar dataKey="totalQty" name="Adet" fill="#2B2B2B" radius={[0, 4, 4, 0]}>
                                            {topByQty.slice(0, 10).map((_, i) => (
                                                <Cell key={i} fill={THEME_COLORS[i % THEME_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                        {topByRev.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-xl p-6">
                                <h3 className="font-semibold text-gray-700 mb-5">En Çok Ciro Yapan Ürünler (€)</h3>
                                <ResponsiveContainer width="100%" height={320}>
                                    <BarChart data={topByRev.slice(0, 10)} layout="vertical" barSize={14}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }}
                                               tickFormatter={(v: string) => truncate(v, 18)} />
                                        <Tooltip formatter={(v: number) => fmt(v)} />
                                        <Bar dataKey="totalRevenue" name="Ciro" radius={[0, 4, 4, 0]}>
                                            {topByRev.slice(0, 10).map((p, i) => (
                                                <Cell key={i} fill={ABC_COLORS[p.abcClass ?? 'C'].bar} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Categories */}
                    {categories.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white border border-gray-200 rounded-xl p-6">
                                <h3 className="font-semibold text-gray-700 mb-5">Kategori Ciro Dağılımı</h3>
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie data={categories} dataKey="totalRevenue" nameKey="name"
                                             cx="50%" cy="50%" outerRadius={95} innerRadius={35}>
                                            {categories.map((_, i) => <Cell key={i} fill={THEME_COLORS[i % THEME_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(v: number) => fmt(v)} />
                                        <Legend iconSize={10} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-xl p-6">
                                <h3 className="font-semibold text-gray-700 mb-5">Kategori Detayları</h3>
                                <div className="space-y-3">
                                    {categories.map((cat, i) => {
                                        const catTotal = categories.reduce((s, c) => s + c.totalRevenue, 0);
                                        const p = catTotal > 0 ? (cat.totalRevenue / catTotal) * 100 : 0;
                                        return (
                                            <div key={i}>
                                                <div className="flex items-center justify-between mb-1 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                              style={{ backgroundColor: THEME_COLORS[i % THEME_COLORS.length] }} />
                                                        <span className="font-semibold text-gray-700">{cat.name}</span>
                                                        <span className="text-xs text-gray-400">{cat.orderCount} sipariş · {cat.totalQty} adet</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-400">%{p.toFixed(1)}</span>
                                                        <span className="font-bold text-gray-800">{fmt(cat.totalRevenue)}</span>
                                                    </div>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-2 rounded-full transition-all"
                                                         style={{ width: `${p}%`, backgroundColor: THEME_COLORS[i % THEME_COLORS.length] }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Customer Segments */}
                    {segments.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {(['Müşteri', 'Alt Bayi'] as const).map(seg => {
                                const segData = segments.filter(s => s.segment === seg);
                                if (segData.length === 0) return null;
                                const segTotal = segData.reduce((s, c) => s + c.totalRevenue, 0);
                                return (
                                    <div key={seg} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <FiUsers className="text-accent" size={14} />
                                                <h3 className="font-semibold text-gray-700">{seg}ler — Top Alıcılar</h3>
                                            </div>
                                            <span className="text-xs text-gray-400">{segData.length} firma</span>
                                        </div>
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-gray-100">
                                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">#</th>
                                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Firma</th>
                                                    <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sipariş</th>
                                                    <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Net Ciro</th>
                                                    <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pay</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {segData.slice(0, 8).map((b, i) => {
                                                    const p = segTotal > 0 ? (b.totalRevenue / segTotal) * 100 : 0;
                                                    return (
                                                        <tr key={i} className={`hover:bg-gray-50 transition-colors ${i < 3 ? 'bg-amber-50/20' : ''}`}>
                                                            <td className="px-4 py-3 text-xs font-bold text-gray-400">{['🥇','🥈','🥉'][i] ?? i + 1}</td>
                                                            <td className="px-4 py-3 font-semibold text-sm text-gray-800 max-w-[140px] truncate">{b.firmName}</td>
                                                            <td className="px-4 py-3 text-right text-sm text-gray-600">{b.orderCount}</td>
                                                            <td className="px-4 py-3 text-right font-bold text-sm text-emerald-700">{fmt(b.totalRevenue)}</td>
                                                            <td className="px-4 py-3 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <div className="w-14 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                                        <div className="h-1 bg-accent rounded-full" style={{ width: `${p}%` }} />
                                                                    </div>
                                                                    <span className="text-[10px] text-gray-400 w-9">%{p.toFixed(0)}</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Favorites */}
                    {favorites.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                                <FiHeart className="text-rose-400" size={14} />
                                <h3 className="font-semibold text-gray-700">Favori Ürünler & Konversiyon Analizi</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">#</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ürün</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Favori</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dönem Sipariş</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Konversiyon</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-28">Oran</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {favorites.map((f, i) => {
                                            const conv = f.favCount > 0 ? (f.orderedInPeriod / f.favCount) * 100 : 0;
                                            const convColor = conv >= 30 ? 'text-emerald-600' : conv >= 10 ? 'text-blue-600' : 'text-gray-500';
                                            const barColor  = conv >= 30 ? 'bg-emerald-500' : conv >= 10 ? 'bg-blue-400' : 'bg-gray-300';
                                            return (
                                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3.5 text-xs font-bold text-gray-400">{i + 1}</td>
                                                    <td className="px-4 py-3.5 font-semibold text-sm text-gray-800">
                                                        {f.slug ? (
                                                            <Link href={`/${locale}/products/${f.slug}`}
                                                                  className="hover:text-accent transition-colors">{f.name}</Link>
                                                        ) : f.name}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right text-sm">
                                                        <span className="inline-flex items-center gap-1">
                                                            <FiHeart className="text-rose-400" size={11} />
                                                            <span className="font-semibold text-gray-700">{f.favCount}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right text-sm text-gray-600">{f.orderedInPeriod}</td>
                                                    <td className="px-4 py-3.5 text-right">
                                                        <span className={`font-bold text-sm ${convColor}`}>%{conv.toFixed(1)}</span>
                                                    </td>
                                                    <td className="px-4 py-3.5 w-28">
                                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className={`h-1.5 rounded-full ${barColor}`}
                                                                 style={{ width: `${Math.min(conv, 100)}%` }} />
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

                    {topByRev.length === 0 && categories.length === 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                            <p className="text-gray-500">Bu dönemde sipariş verisi bulunamadı.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
