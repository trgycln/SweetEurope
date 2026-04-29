// src/app/[locale]/admin/idari/finans/raporlama/page.tsx
export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import {
    FiBarChart2, FiDollarSign, FiTrendingDown, FiTrendingUp,
    FiSlash, FiPieChart, FiActivity, FiArrowRight,
    FiShoppingCart, FiAlertCircle, FiPercent,
    FiAlertTriangle, FiCheckCircle, FiZap
} from 'react-icons/fi';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/lib/utils';
import { redirect } from 'next/navigation';

type QuickStats = {
    totalGrossRevenue: number;
    totalRevenue: number;
    totalCogs: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    expenseBreakdown: { kategori: string; toplam: number }[];
};

const fmt = (v: number | null | undefined) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

const pct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

const change = (cur: number, prev: number) =>
    prev === 0 ? 0 : ((cur - prev) / prev) * 100;

export default async function FinancialReportsDashboard({
    params,
}: {
    params: { locale: Locale };
}) {
    const { locale } = params;
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    await getDictionary(locale);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller').select('rol').eq('id', user.id).single();
    if (profile?.rol !== 'Yönetici') {
        return (
            <div className="p-8 text-center">
                <FiSlash className="mx-auto text-5xl text-red-500" />
                <h1 className="font-serif mt-4 text-2xl text-red-600">Erişim Reddedildi</h1>
            </div>
        );
    }

    const now = new Date();
    const curStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const curEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const prvStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const prvEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    const last6 = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const e = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return {
            label: d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
            start: d.toISOString().split('T')[0],
            end:   e.toISOString().split('T')[0],
        };
    }).reverse();

    const [plCur, plPrv, gCur, gPrv, trendArr] = await Promise.all([
        supabase.rpc('get_pl_report', { start_date: curStart, end_date: curEnd }).single(),
        supabase.rpc('get_pl_report', { start_date: prvStart, end_date: prvEnd }).single(),
        supabase.from('giderler').select('tutar').eq('durum', 'Onaylandı')
            .gte('tarih', curStart).lte('tarih', curEnd),
        supabase.from('giderler').select('tutar').eq('durum', 'Onaylandı')
            .gte('tarih', prvStart).lte('tarih', prvEnd),
        Promise.all(
            last6.map(m =>
                Promise.all([
                    supabase.from('siparisler').select('toplam_tutar_net')
                        .gte('siparis_tarihi', m.start).lte('siparis_tarihi', m.end)
                        .then(r => (r.data ?? []).reduce((s, o: any) => s + Number(o.toplam_tutar_net ?? 0), 0)),
                    supabase.from('giderler').select('tutar').eq('durum', 'Onaylandı')
                        .gte('tarih', m.start).lte('tarih', m.end)
                        .then(r => (r.data ?? []).reduce((s, g: any) => s + Number(g.tutar ?? 0), 0)),
                ]).then(([rev, exp]) => ({ label: m.label, rev, exp, profit: rev - exp }))
            )
        ),
    ]);

    const stats  = plCur.data  as QuickStats | null;
    const pStats = plPrv.data  as QuickStats | null;

    const curExp  = (gCur.data  ?? []).reduce((s, g: any) => s + Number(g.tutar ?? 0), 0);
    const prvExp  = (gPrv.data  ?? []).reduce((s, g: any) => s + Number(g.tutar ?? 0), 0);

    const curRev   = stats?.totalRevenue  ?? 0;
    const prvRev   = pStats?.totalRevenue ?? 0;
    const curCogs  = stats?.totalCogs     ?? 0;
    const prvCogs  = pStats?.totalCogs    ?? 0;
    const curGross = curRev - curCogs;
    const prvGross = prvRev - prvCogs;
    const curNet   = curGross - curExp;
    const prvNet   = prvGross - prvExp;

    const grossMargin = curRev > 0 ? (curGross / curRev) * 100 : 0;
    const netMargin   = curRev > 0 ? (curNet   / curRev) * 100 : 0;
    const expRatio    = curRev > 0 ? (curExp   / curRev) * 100 : 0;

    const dRev   = change(curRev,   prvRev);
    const dExp   = change(curExp,   prvExp);
    const dGross = change(curGross, prvGross);
    const dNet   = change(curNet,   prvNet);
    const hasPrev = prvRev > 0 || prvExp > 0;

    // Auto insights
    type InsightType = 'positive' | 'negative' | 'warning' | 'info';
    const insights: { type: InsightType; text: string }[] = [];

    if (hasPrev && Math.abs(dRev) > 1)
        insights.push({
            type: dRev > 0 ? 'positive' : 'negative',
            text: `Gelir geçen aya göre ${pct(dRev)} ${dRev > 0 ? 'arttı' : 'azaldı'} (${fmt(curRev - prvRev)})`,
        });
    if (curRev > 0 && netMargin < 8)
        insights.push({ type: 'warning', text: `Net marj %${netMargin.toFixed(1)} — düşük performans, gider yapısı gözden geçirilmeli` });
    else if (curRev > 0 && netMargin >= 20)
        insights.push({ type: 'positive', text: `Güçlü net marj: %${netMargin.toFixed(1)} — finansal sağlık iyi seviyede` });
    if (hasPrev && dExp > 15)
        insights.push({ type: 'negative', text: `Operasyonel giderler geçen aya göre %${dExp.toFixed(1)} arttı (${fmt(curExp - prvExp)} fazla)` });
    if (curRev > 0 && expRatio > 65)
        insights.push({ type: 'warning', text: `Yüksek gider oranı: Gelirin %${expRatio.toFixed(1)}'i operasyonel giderlere gidiyor` });
    if (stats?.expenseBreakdown?.[0]?.toplam)
        insights.push({ type: 'info', text: `Bu ayın en büyük gider kalemi: "${stats.expenseBreakdown[0].kategori}" — ${fmt(stats.expenseBreakdown[0].toplam)}` });
    if (insights.length === 0 && curRev === 0)
        insights.push({ type: 'info', text: 'Bu ay için henüz sipariş geliri kaydedilmemiş.' });

    const trendMax = Math.max(...trendArr.flatMap(m => [m.rev, m.exp]), 1);

    const monthName = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-8 pb-8">

            {/* ── Header ── */}
            <header className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-primary">Finansal Raporlar & Analizler</h1>
                    <p className="text-sm text-gray-500 mt-1">Gerçek zamanlı finansal performans özeti</p>
                </div>
                <div className="text-right text-xs bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm">
                    <p className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Aktif Dönem</p>
                    <p className="font-bold text-primary mt-0.5 capitalize">{monthName}</p>
                </div>
            </header>

            {/* ── KPI Kartları (4 ana metrik) ── */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-gray-700">Bu Ay Finansal Özeti</h2>
                    {hasPrev && <span className="text-xs text-gray-400">▲▼ Geçen aya göre</span>}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        {
                            label: 'Net Ciro',
                            value: fmt(curRev),
                            sub: hasPrev ? `Geçen ay: ${fmt(prvRev)}` : 'Sipariş gelirleri',
                            delta: dRev, invertGood: false,
                            icon: FiDollarSign,
                            bg: 'bg-blue-50', border: 'border-blue-100',
                            txt: 'text-blue-700', ibg: 'bg-blue-100', icol: 'text-blue-500',
                        },
                        {
                            label: 'Brüt Kâr',
                            value: fmt(curGross),
                            sub: `Marj: %${grossMargin.toFixed(1)}`,
                            delta: dGross, invertGood: false,
                            icon: FiShoppingCart,
                            bg: 'bg-emerald-50', border: 'border-emerald-100',
                            txt: 'text-emerald-700', ibg: 'bg-emerald-100', icol: 'text-emerald-500',
                        },
                        {
                            label: 'Operasyonel Gider',
                            value: fmt(curExp),
                            sub: `Gelir oranı: %${expRatio.toFixed(1)}`,
                            delta: dExp, invertGood: true,
                            icon: FiAlertCircle,
                            bg: 'bg-orange-50', border: 'border-orange-100',
                            txt: 'text-orange-700', ibg: 'bg-orange-100', icol: 'text-orange-500',
                        },
                        {
                            label: 'Net Kâr',
                            value: fmt(curNet),
                            sub: `Net marj: %${netMargin.toFixed(1)}`,
                            delta: dNet, invertGood: false,
                            icon: curNet >= 0 ? FiTrendingUp : FiTrendingDown,
                            bg: curNet >= 0 ? 'bg-green-50'  : 'bg-red-50',
                            border: curNet >= 0 ? 'border-green-100' : 'border-red-100',
                            txt:  curNet >= 0 ? 'text-green-700'  : 'text-red-700',
                            ibg:  curNet >= 0 ? 'bg-green-100'    : 'bg-red-100',
                            icol: curNet >= 0 ? 'text-green-600'  : 'text-red-600',
                        },
                    ].map((k, i) => {
                        const positive = k.invertGood ? k.delta < 0 : k.delta > 0;
                        const show = hasPrev && Math.abs(k.delta) > 0.1;
                        return (
                            <div key={i} className={`${k.bg} border ${k.border} p-5 rounded-xl hover:shadow-md transition-shadow`}>
                                <div className="flex items-start justify-between mb-3">
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider leading-tight">{k.label}</p>
                                    <div className={`p-2 ${k.ibg} rounded-lg flex-shrink-0`}>
                                        <k.icon className={k.icol} size={15} />
                                    </div>
                                </div>
                                <p className={`text-2xl font-bold ${k.txt}`}>{k.value}</p>
                                <p className="text-xs text-gray-500 mt-1">{k.sub}</p>
                                {show && (
                                    <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {positive ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
                                        {pct(k.delta)} geçen ay
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ── Oran Metrikleri (3 kart) ── */}
            <section>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        {
                            label: 'Brüt Marj', value: grossMargin,
                            desc: 'COGS sonrası kalan satış marjı',
                            good: grossMargin >= 30, warn: grossMargin >= 15,
                            fill: 'bg-emerald-500', warnFill: 'bg-amber-400', badFill: 'bg-red-500',
                            inverted: false,
                        },
                        {
                            label: 'Net Marj', value: netMargin,
                            desc: 'Tüm giderler sonrası kalan kâr marjı',
                            good: netMargin >= 15, warn: netMargin >= 5,
                            fill: 'bg-emerald-500', warnFill: 'bg-amber-400', badFill: 'bg-red-500',
                            inverted: false,
                        },
                        {
                            label: 'Gider Oranı', value: expRatio,
                            desc: 'Gelirin operasyonel giderlere giden kısmı',
                            good: expRatio <= 30, warn: expRatio <= 60,
                            fill: 'bg-emerald-500', warnFill: 'bg-amber-400', badFill: 'bg-red-500',
                            inverted: true,
                        },
                    ].map((r, i) => {
                        const barColor = r.good ? r.fill : r.warn ? r.warnFill : r.badFill;
                        const txtColor = r.good ? 'text-emerald-700' : r.warn ? 'text-amber-700' : 'text-red-600';
                        const progress = Math.min(Math.max(Math.abs(r.value), 0), 100);
                        return (
                            <div key={i} className="bg-white border border-gray-200 p-5 rounded-xl hover:shadow-sm transition-shadow">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{r.label}</p>
                                    <FiPercent className="text-gray-300" size={14} />
                                </div>
                                <p className={`text-3xl font-bold mt-2 ${txtColor}`}>%{r.value.toFixed(1)}</p>
                                <p className="text-xs text-gray-400 mt-1 leading-snug">{r.desc}</p>
                                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ── Otomatik Analiz & Öneriler ── */}
            {insights.length > 0 && (
                <section>
                    <h2 className="font-semibold text-gray-700 mb-3">Otomatik Analiz & Öneriler</h2>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                        {insights.map((ins, i) => {
                            const s = {
                                positive: { bg: 'bg-emerald-50', icon: <FiCheckCircle className="text-emerald-500" size={15} />, txt: 'text-emerald-800' },
                                negative: { bg: 'bg-red-50',     icon: <FiAlertCircle  className="text-red-500"     size={15} />, txt: 'text-red-800'     },
                                warning:  { bg: 'bg-amber-50',   icon: <FiAlertTriangle className="text-amber-500"  size={15} />, txt: 'text-amber-800'   },
                                info:     { bg: 'bg-blue-50',    icon: <FiZap           className="text-blue-500"   size={15} />, txt: 'text-blue-800'    },
                            }[ins.type];
                            return (
                                <div key={i} className={`${s.bg} flex items-start gap-3 px-5 py-3`}>
                                    <span className="mt-0.5 flex-shrink-0">{s.icon}</span>
                                    <p className={`text-sm ${s.txt}`}>{ins.text}</p>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* ── P&L Waterfall ── */}
            <section>
                <h2 className="font-semibold text-gray-700 mb-3">Kâr & Zarar Özeti — Bu Ay</h2>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {[
                        { label: 'Net Ciro', value: curRev, isExpense: false, bold: false, indent: 0, bg: 'bg-white' },
                        { label: 'Satılan Mal Maliyeti (COGS)', value: curCogs, isExpense: true, bold: false, indent: 1, bg: 'bg-gray-50' },
                        { label: 'Brüt Kâr', value: curGross, isExpense: false, bold: true, indent: 0, bg: 'bg-emerald-50', margin: curRev > 0 ? `%${grossMargin.toFixed(1)} marj` : '' },
                        { label: 'Operasyonel Giderler', value: curExp, isExpense: true, bold: false, indent: 1, bg: 'bg-gray-50' },
                        { label: 'Net Kâr', value: curNet, isExpense: curNet < 0, bold: true, indent: 0, bg: curNet >= 0 ? 'bg-green-50' : 'bg-red-50', margin: curRev > 0 ? `%${netMargin.toFixed(1)} marj` : '' },
                    ].map((row, i) => (
                        <div key={i} className={`${row.bg} flex items-center justify-between border-b border-gray-100 last:border-0 px-5 py-3.5`}
                            style={{ paddingLeft: `${1.25 + row.indent * 1.25}rem` }}>
                            <div className="flex items-center gap-2">
                                {row.indent > 0 && <span className="text-gray-300 text-[11px] select-none">└</span>}
                                <span className={`${row.bold ? 'font-bold text-sm' : 'font-medium text-sm'} text-gray-700`}>{row.label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                {row.margin && (
                                    <span className="text-xs text-gray-400 hidden sm:block">{row.margin}</span>
                                )}
                                <span className={`${row.bold ? 'font-bold text-base' : 'font-semibold text-sm'} ${
                                    row.isExpense ? 'text-red-600' : (row.bold ? (row.value >= 0 ? 'text-emerald-700' : 'text-red-600') : 'text-gray-800')
                                }`}>
                                    {row.isExpense ? '– ' : (row.bold && row.value >= 0 ? '= ' : (row.bold ? '= ' : ''))}{fmt(Math.abs(row.value))}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── 6 Aylık Dual Trend ── */}
            {trendArr.some(m => m.rev > 0 || m.exp > 0) && (
                <section>
                    <h2 className="font-semibold text-gray-700 mb-3">Son 6 Ay Performans Trendi</h2>
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-5 mb-5 text-xs font-semibold text-gray-600">
                            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded bg-emerald-500 inline-block" /> Gelir</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded bg-red-400 inline-block" /> Gider</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded bg-blue-500 inline-block" /> Kâr</span>
                        </div>
                        <div className="space-y-5">
                            {trendArr.map((m, i) => (
                                <div key={i}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-bold text-gray-600 w-12">{m.label}</span>
                                        <div className="flex gap-4 text-xs">
                                            <span className="text-emerald-600 font-semibold">{fmt(m.rev)}</span>
                                            <span className="text-red-500 font-semibold">{fmt(m.exp)}</span>
                                            <span className={`font-bold ${m.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(m.profit)}</span>
                                        </div>
                                    </div>
                                    <div className="ml-12 space-y-1">
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-2 bg-emerald-500 rounded-full" style={{ width: `${(m.rev / trendMax) * 100}%` }} />
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-2 bg-red-400 rounded-full" style={{ width: `${(m.exp / trendMax) * 100}%` }} />
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-2 ${m.profit >= 0 ? 'bg-blue-500' : 'bg-red-600'} rounded-full`}
                                                 style={{ width: `${Math.abs(m.profit / trendMax) * 100}%` }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ── Top Gider Kategorileri ── */}
            {stats?.expenseBreakdown && stats.expenseBreakdown.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-gray-700">Bu Ay En Yüksek Gider Kalemleri</h2>
                        <Link href={`/${locale}/admin/idari/finans/raporlama/giderler`}
                              className="text-xs text-accent hover:text-primary font-semibold transition-colors">
                            Tümünü Gör →
                        </Link>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="space-y-3">
                            {stats.expenseBreakdown.slice(0, 6).map((exp, idx) => {
                                const p = curExp > 0 ? (exp.toplam / curExp) * 100 : 0;
                                const colors = [
                                    { rank: 'text-red-700 bg-red-100',    bar: 'bg-red-500'    },
                                    { rank: 'text-orange-700 bg-orange-100', bar: 'bg-orange-400' },
                                    { rank: 'text-amber-700 bg-amber-100',  bar: 'bg-amber-400'  },
                                    { rank: 'text-yellow-700 bg-yellow-100',bar: 'bg-yellow-400' },
                                    { rank: 'text-gray-600 bg-gray-100',   bar: 'bg-gray-300'   },
                                    { rank: 'text-gray-500 bg-gray-100',   bar: 'bg-gray-200'   },
                                ];
                                const c = colors[idx] ?? colors[5];
                                return (
                                    <div key={idx} className="flex items-center gap-3 py-1 hover:bg-gray-50 rounded-lg px-1 transition-colors group">
                                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${c.rank}`}>
                                            {idx + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-semibold text-gray-800 truncate">{exp.kategori}</span>
                                                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                                    <span className="text-xs text-gray-400">%{p.toFixed(1)}</span>
                                                    <span className="text-sm font-bold text-red-600">{fmt(exp.toplam)}</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div className={`h-1.5 rounded-full ${c.bar}`} style={{ width: `${p}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* ── Detaylı Rapor Kartları ── */}
            <section>
                <h2 className="font-semibold text-gray-700 mb-3">Detaylı Raporlar</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { title: 'Kâr & Zarar Raporu',       desc: 'Dönemsel P&L, brüt kâr, işletme giderleri ve net kâr detayları',           icon: FiBarChart2,    href: `/${locale}/admin/idari/finans/raporlama/kar-zarar`,    grad: 'from-slate-700 to-slate-500'     },
                        { title: 'Gider Analizi',             desc: 'Kategori bazlı gider dağılımı, trend analizi ve verimlilik metrikleri',      icon: FiTrendingDown, href: `/${locale}/admin/idari/finans/raporlama/giderler`,     grad: 'from-orange-600 to-amber-500'    },
                        { title: 'Gelir Analizi',             desc: 'Ciro detayları, ürün kategorisi bazlı gelirler ve müşteri performansı',      icon: FiTrendingUp,   href: `/${locale}/admin/idari/finans/raporlama/gelirler`,     grad: 'from-emerald-600 to-green-500'   },
                        { title: 'Talep Analizi',             desc: 'En çok talep gören ürünler, kategoriler, favoriler ve ABC analizi',          icon: FiPieChart,     href: `/${locale}/admin/idari/finans/raporlama/talep-analizi`, grad: 'from-blue-600 to-blue-400'       },
                        { title: 'Dönemsel Karşılaştırma',   desc: 'Ay ay ve yıl bazında finansal performans karşılaştırmaları ve büyüme',       icon: FiActivity,     href: `/${locale}/admin/idari/finans/raporlama/karsilastirma`, grad: 'from-violet-600 to-purple-500'   },
                    ].map((c, i) => (
                        <Link key={i} href={c.href}>
                            <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group h-full">
                                <div className="flex items-start gap-4">
                                    <div className={`bg-gradient-to-br ${c.grad} p-2.5 rounded-lg flex-shrink-0`}>
                                        <c.icon className="text-white" size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-primary text-sm group-hover:text-accent transition-colors">{c.title}</h3>
                                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{c.desc}</p>
                                    </div>
                                    <FiArrowRight className="text-gray-300 group-hover:text-accent group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5" size={16} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}
