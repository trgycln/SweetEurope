'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    FiArrowLeft, FiFilter, FiCalendar, FiChevronDown, FiChevronRight,
    FiTrendingUp, FiTrendingDown, FiAlertCircle, FiPercent, FiCheckCircle
} from 'react-icons/fi';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, LineChart, Line
} from 'recharts';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';

type ExpenseData = {
    kategori: string;
    toplam: number;
    count: number;
    prevToplam: number;
    items: { kalem: string; tutar: number; count: number }[];
};

type MonthlyExpense = { month: string; total: number };

const COLORS = ['#C69F6B', '#2B2B2B', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280'];

const fmt = (v: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);
const chg = (cur: number, prv: number) => prv === 0 ? 0 : ((cur - prv) / prv) * 100;

type PageProps = { params: Promise<{ locale: string }> };

export default function ExpenseAnalysisPage({ params }: PageProps) {
    const [locale, setLocale] = useState('de');
    const [period, setPeriod] = useState('this-month');

    const [expenses,   setExpenses]   = useState<ExpenseData[]>([]);
    const [monthly,    setMonthly]    = useState<MonthlyExpense[]>([]);
    const [totalExp,   setTotalExp]   = useState(0);
    const [prevTotal,  setPrevTotal]  = useState(0);
    const [totalRev,   setTotalRev]   = useState(0);
    const [loading,    setLoading]    = useState(true);
    const [expanded,   setExpanded]   = useState<Set<string>>(new Set());

    useEffect(() => { params.then(p => setLocale(p.locale)); }, [params]);
    useEffect(() => { fetchData(); }, [period]);

    const getRange = (p: string) => {
        const now = new Date();
        let s: Date, e: Date, ps: Date, pe: Date;
        switch (p) {
            case 'last-month':
                s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                e = new Date(now.getFullYear(), now.getMonth(), 0);
                ps = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                pe = new Date(now.getFullYear(), now.getMonth() - 1, 0);
                break;
            case 'this-year':
                s = new Date(now.getFullYear(), 0, 1);
                e = new Date(now.getFullYear(), 11, 31);
                ps = new Date(now.getFullYear() - 1, 0, 1);
                pe = new Date(now.getFullYear() - 1, 11, 31);
                break;
            case 'last-6-months':
                s = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                e = new Date();
                ps = new Date(now.getFullYear(), now.getMonth() - 12, 1);
                pe = new Date(now.getFullYear(), now.getMonth() - 6, 0);
                break;
            default: // this-month
                s = new Date(now.getFullYear(), now.getMonth(), 1);
                e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                ps = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                pe = new Date(now.getFullYear(), now.getMonth(), 0);
        }
        const iso = (d: Date) => d.toISOString().split('T')[0];
        return { start: iso(s), end: iso(e), prevStart: iso(ps), prevEnd: iso(pe) };
    };

    const fetchData = async () => {
        setLoading(true);
        const sb = createDynamicSupabaseClient(false);
        const { start, end, prevStart, prevEnd } = getRange(period);

        // Current period expenses
        const { data: rawExp } = await sb
            .from('giderler')
            .select(`tutar, gider_kalemleri!inner(ad, gider_ana_kategoriler!inner(ad))`)
            .eq('durum', 'Onaylandı')
            .gte('tarih', start)
            .lte('tarih', end);

        // Previous period expenses (by category, for delta)
        const { data: rawPrev } = await sb
            .from('giderler')
            .select(`tutar, gider_kalemleri!inner(ad, gider_ana_kategoriler!inner(ad))`)
            .eq('durum', 'Onaylandı')
            .gte('tarih', prevStart)
            .lte('tarih', prevEnd);

        // Revenue for ratio
        const { data: orders } = await sb
            .from('siparisler')
            .select('toplam_tutar_net')
            .gte('siparis_tarihi', start)
            .lte('siparis_tarihi', end);

        const revenue = (orders ?? []).reduce((s, o: any) => s + (o.toplam_tutar_net || 0), 0);
        setTotalRev(revenue);

        // Aggregate previous by category
        const prevCatMap = new Map<string, number>();
        (rawPrev ?? []).forEach((exp: any) => {
            const kat = exp.gider_kalemleri?.gider_ana_kategoriler?.ad || 'Diğer';
            prevCatMap.set(kat, (prevCatMap.get(kat) || 0) + (exp.tutar || 0));
        });
        const prevTot = Array.from(prevCatMap.values()).reduce((s, v) => s + v, 0);
        setPrevTotal(prevTot);

        if (rawExp) {
            const catMap = new Map<string, { toplam: number; count: number; itemMap: Map<string, { tutar: number; count: number }> }>();
            rawExp.forEach((exp: any) => {
                const kat   = exp.gider_kalemleri?.gider_ana_kategoriler?.ad || 'Diğer';
                const kalem = exp.gider_kalemleri?.ad || 'Tanımsız';
                const tutar = exp.tutar || 0;
                const ex = catMap.get(kat) || { toplam: 0, count: 0, itemMap: new Map() };
                ex.toplam += tutar;
                ex.count  += 1;
                const ie = ex.itemMap.get(kalem) || { tutar: 0, count: 0 };
                ie.tutar += tutar; ie.count += 1;
                ex.itemMap.set(kalem, ie);
                catMap.set(kat, ex);
            });

            const arr = Array.from(catMap.entries()).map(([kat, d]) => ({
                kategori: kat,
                toplam: d.toplam,
                count: d.count,
                prevToplam: prevCatMap.get(kat) || 0,
                items: Array.from(d.itemMap.entries())
                    .map(([kalem, id]) => ({ kalem, tutar: id.tutar, count: id.count }))
                    .sort((a, b) => b.tutar - a.tutar),
            })).sort((a, b) => b.toplam - a.toplam);

            setExpenses(arr);
            setTotalExp(arr.reduce((s, i) => s + i.toplam, 0));
        }

        // Monthly trend
        if (period === 'last-6-months' || period === 'this-year') {
            const { data: all } = await sb
                .from('giderler').select('tarih, tutar').eq('durum', 'Onaylandı')
                .gte('tarih', start).lte('tarih', end).order('tarih');
            if (all) {
                const mm = new Map<string, number>();
                all.forEach((e: any) => {
                    const m = e.tarih.substring(0, 7);
                    mm.set(m, (mm.get(m) || 0) + (e.tutar || 0));
                });
                setMonthly(Array.from(mm.entries()).map(([month, total]) => ({ month, total })).sort((a, b) => a.month.localeCompare(b.month)));
            }
        } else {
            setMonthly([]);
        }

        setLoading(false);
    };

    const toggle = (kat: string) =>
        setExpanded(prev => { const s = new Set(prev); s.has(kat) ? s.delete(kat) : s.add(kat); return s; });

    const expRatio   = totalRev > 0 ? (totalExp / totalRev) * 100 : 0;
    const momChange  = chg(totalExp, prevTotal);
    const hasPrev    = prevTotal > 0;

    const effScore = expRatio <= 20 ? 'Mükemmel' : expRatio <= 40 ? 'İyi' : expRatio <= 60 ? 'Orta' : 'Yüksek Risk';
    const effColor = expRatio <= 20 ? 'text-emerald-700' : expRatio <= 40 ? 'text-blue-700' : expRatio <= 60 ? 'text-amber-700' : 'text-red-700';
    const effBg    = expRatio <= 20 ? 'bg-emerald-50 border-emerald-100' : expRatio <= 40 ? 'bg-blue-50 border-blue-100' : expRatio <= 60 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100';

    return (
        <div className="space-y-8 pb-8">
            {/* Header */}
            <header>
                <Link href={`/${locale}/admin/idari/finans/raporlama`}
                      className="inline-flex items-center gap-2 text-primary hover:text-accent mb-4 font-semibold text-sm transition-colors">
                    <FiArrowLeft size={14} /> Raporlara Dön
                </Link>
                <h1 className="font-serif text-3xl font-bold text-primary">Gider Analizi</h1>
                <p className="text-sm text-gray-500 mt-1">Kategori bazlı gider dağılımı, verimlilik metrikleri ve dönemsel trend</p>
            </header>

            {/* Filter */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <FiFilter className="text-accent" size={14} />
                    <span className="text-sm font-semibold text-gray-600">Dönem:</span>
                    {[
                        { label: 'Bu Ay',     value: 'this-month'   },
                        { label: 'Geçen Ay',  value: 'last-month'   },
                        { label: 'Son 6 Ay',  value: 'last-6-months'},
                        { label: 'Bu Yıl',    value: 'this-year'    },
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Toplam Gider */}
                        <div className="bg-orange-50 border border-orange-100 p-5 rounded-xl">
                            <div className="flex items-start justify-between mb-3">
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Toplam Gider</p>
                                <div className="p-2 bg-orange-100 rounded-lg"><FiAlertCircle className="text-orange-500" size={14} /></div>
                            </div>
                            <p className="text-2xl font-bold text-orange-700">{fmt(totalExp)}</p>
                            <p className="text-xs text-gray-500 mt-1">{expenses.length} kategori, {expenses.reduce((s, e) => s + e.items.length, 0)} kalem</p>
                            {hasPrev && Math.abs(momChange) > 0.1 && (
                                <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${momChange > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                    {momChange > 0 ? <FiTrendingUp size={11} /> : <FiTrendingDown size={11} />}
                                    {momChange > 0 ? '+' : ''}{momChange.toFixed(1)}% geçen döneme göre ({fmt(totalExp - prevTotal)})
                                </div>
                            )}
                        </div>

                        {/* Gelir Oranı */}
                        <div className={`${effBg} border p-5 rounded-xl`}>
                            <div className="flex items-start justify-between mb-3">
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Gider / Gelir Oranı</p>
                                <div className="p-2 bg-white/60 rounded-lg"><FiPercent className="text-gray-500" size={14} /></div>
                            </div>
                            <p className={`text-2xl font-bold ${effColor}`}>%{expRatio.toFixed(1)}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {totalRev > 0 ? `${fmt(totalRev)} gelire karşın` : 'Gelir verisi yok'}
                            </p>
                            <div className="mt-2.5 h-1.5 bg-white/60 rounded-full overflow-hidden">
                                <div className={`h-1.5 rounded-full ${expRatio <= 20 ? 'bg-emerald-500' : expRatio <= 40 ? 'bg-blue-500' : expRatio <= 60 ? 'bg-amber-400' : 'bg-red-500'}`}
                                     style={{ width: `${Math.min(expRatio, 100)}%` }} />
                            </div>
                        </div>

                        {/* Verimlilik Skoru */}
                        <div className="bg-white border border-gray-200 p-5 rounded-xl">
                            <div className="flex items-start justify-between mb-3">
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Verimlilik Değerlendirmesi</p>
                                <FiCheckCircle className={expRatio <= 40 ? 'text-emerald-400' : 'text-amber-400'} size={18} />
                            </div>
                            <p className={`text-2xl font-bold ${effColor}`}>{effScore}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {expRatio <= 20 ? 'Gider kontrolü çok iyi'
                                    : expRatio <= 40 ? 'Giderler makul seviyede'
                                    : expRatio <= 60 ? 'Optimizasyon öneriliyor'
                                    : 'Acil gider gözden geçirmesi gerekli'}
                            </p>
                            <div className="mt-3 flex gap-1">
                                {['≤%20', '≤%40', '≤%60', '>%60'].map((lbl, i) => {
                                    const active = i === (expRatio <= 20 ? 0 : expRatio <= 40 ? 1 : expRatio <= 60 ? 2 : 3);
                                    const bg = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-400', 'bg-red-500'][i];
                                    return (
                                        <div key={i} className={`flex-1 h-1 rounded-full ${active ? bg : 'bg-gray-100'}`} title={lbl} />
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pasta */}
                        {expenses.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-xl p-6">
                                <h3 className="font-semibold text-gray-700 mb-5">Kategori Dağılımı</h3>
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie data={expenses} dataKey="toplam" nameKey="kategori"
                                             cx="50%" cy="50%" outerRadius={95} innerRadius={35}>
                                            {expenses.map((_, i) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v: number) => fmt(v)} />
                                        <Legend iconSize={10} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Kategori Bar + MoM Delta */}
                        {expenses.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-xl p-6">
                                <h3 className="font-semibold text-gray-700 mb-5">Kategori Karşılaştırma {hasPrev && '(Dönem Değişimi)'}</h3>
                                {hasPrev ? (
                                    <div className="space-y-3">
                                        {expenses.map((e, i) => {
                                            const delta = chg(e.toplam, e.prevToplam);
                                            const p = totalExp > 0 ? (e.toplam / totalExp) * 100 : 0;
                                            return (
                                                <div key={i}>
                                                    <div className="flex items-center justify-between mb-1 text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full flex-shrink-0"
                                                                  style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                            <span className="font-semibold text-gray-700">{e.kategori}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {e.prevToplam > 0 && (
                                                                <span className={`font-bold ${delta > 5 ? 'text-red-500' : delta < -5 ? 'text-emerald-600' : 'text-gray-500'}`}>
                                                                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                                                                </span>
                                                            )}
                                                            <span className="font-bold text-gray-800">{fmt(e.toplam)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-2 rounded-full transition-all"
                                                             style={{ width: `${p}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={280}>
                                        <BarChart data={expenses} layout="vertical" barSize={16}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                                            <YAxis type="category" dataKey="kategori" tick={{ fontSize: 10 }} width={90} />
                                            <Tooltip formatter={(v: number) => fmt(v)} />
                                            <Bar dataKey="toplam" name="Gider" radius={[0, 4, 4, 0]}>
                                                {expenses.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Aylık Trend */}
                    {monthly.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                            <h3 className="font-semibold text-gray-700 mb-5">Aylık Gider Trendi</h3>
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={monthly}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                    <YAxis tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(v: number) => fmt(v)} />
                                    <Line type="monotone" dataKey="total" stroke="#C69F6B" strokeWidth={2.5}
                                          name="Gider" dot={{ r: 4, fill: '#C69F6B' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Detaylı Kategori Tablosu (Accordion) */}
                    {expenses.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                                <h3 className="font-semibold text-gray-700">Kategori Detayları</h3>
                                <span className="text-xs text-gray-400">{expenses.length} kategori • {expenses.reduce((s, e) => s + e.items.length, 0)} kalem</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {expenses.map((item, idx) => {
                                    const pctShare = totalExp > 0 ? (item.toplam / totalExp) * 100 : 0;
                                    const delta    = item.prevToplam > 0 ? chg(item.toplam, item.prevToplam) : null;
                                    const isOpen   = expanded.has(item.kategori);
                                    return (
                                        <div key={idx}>
                                            {/* Category Header */}
                                            <button onClick={() => toggle(item.kategori)}
                                                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-3 h-3 rounded-full flex-shrink-0"
                                                          style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                                    <span className="font-bold text-sm text-gray-800">{item.kategori}</span>
                                                    {isOpen ? <FiChevronDown className="text-gray-400" size={14} /> : <FiChevronRight className="text-gray-400" size={14} />}
                                                    <span className="text-xs text-gray-400">{item.items.length} kalem</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {delta !== null && Math.abs(delta) > 0.5 && (
                                                        <span className={`text-xs font-bold ${delta > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                            {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-gray-500">%{pctShare.toFixed(1)}</span>
                                                    <span className="font-bold text-base text-primary">{fmt(item.toplam)}</span>
                                                </div>
                                            </button>

                                            {/* Sub Items */}
                                            {isOpen && (
                                                <div className="bg-gray-50/70 border-t border-gray-100">
                                                    <table className="w-full">
                                                        <thead>
                                                            <tr className="border-b border-gray-200">
                                                                <th className="pl-14 pr-5 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gider Kalemi</th>
                                                                <th className="px-5 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tutar</th>
                                                                <th className="px-5 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kat. İçi %</th>
                                                                <th className="px-5 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24">Dağılım</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {item.items.map((sub, si) => {
                                                                const sp = item.toplam > 0 ? (sub.tutar / item.toplam) * 100 : 0;
                                                                return (
                                                                    <tr key={si} className="hover:bg-white transition-colors">
                                                                        <td className="pl-14 pr-5 py-3 text-sm text-gray-700">{sub.kalem}</td>
                                                                        <td className="px-5 py-3 text-right font-semibold text-sm text-gray-800">{fmt(sub.tutar)}</td>
                                                                        <td className="px-5 py-3 text-right text-xs text-gray-500">%{sp.toFixed(1)}</td>
                                                                        <td className="px-5 py-3 w-24">
                                                                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                                                <div className="h-1.5 rounded-full bg-accent/70" style={{ width: `${sp}%` }} />
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Footer */}
                            <div className="bg-gray-50 border-t-2 border-gray-200 flex items-center justify-between px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-sm text-gray-800">TOPLAM</span>
                                    <span className="text-xs text-gray-400">{expenses.length} kat. • {expenses.reduce((s, e) => s + e.items.length, 0)} kalem</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-primary">{fmt(totalExp)}</p>
                                    {hasPrev && (
                                        <p className={`text-xs font-semibold mt-0.5 ${momChange > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                            {momChange > 0 ? '+' : ''}{momChange.toFixed(1)}% geçen dönem
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {expenses.length === 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                            <p className="text-gray-500">Bu dönemde onaylanmış gider kaydı bulunamadı.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
