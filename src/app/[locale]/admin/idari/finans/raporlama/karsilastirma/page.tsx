'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiTrendingUp, FiTrendingDown, FiAward, FiAlertTriangle, FiActivity } from 'react-icons/fi';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';

type PeriodData = {
    period: string;
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
    cumRevenue: number;
    cumProfit: number;
};

const fmt  = (v: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);
const pct  = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
const chg  = (cur: number, prv: number) => prv === 0 ? null : ((cur - prv) / prv) * 100;

type PageProps = { params: Promise<{ locale: string }> };

export default function ComparisonPage({ params }: PageProps) {
    const [locale, setLocale] = useState('de');
    const [view, setView]     = useState<'monthly' | 'yearly'>('monthly');
    const [data, setData]     = useState<PeriodData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { params.then(p => setLocale(p.locale)); }, [params]);
    useEffect(() => { fetchData(); }, [view]);

    const fetchData = async () => {
        setLoading(true);
        const sb  = createDynamicSupabaseClient(false);
        const now = new Date();
        const rows: PeriodData[] = [];

        if (view === 'monthly') {
            for (let i = 11; i >= 0; i--) {
                const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                const s   = d.toISOString().split('T')[0];
                const e   = end.toISOString().split('T')[0];

                const [revRes, expRes] = await Promise.all([
                    sb.from('siparisler').select('toplam_tutar_net').gte('siparis_tarihi', s).lte('siparis_tarihi', e),
                    sb.from('giderler').select('tutar').eq('durum', 'Onaylandı').gte('tarih', s).lte('tarih', e),
                ]);
                const rev = (revRes.data ?? []).reduce((sum, o: any) => sum + (o.toplam_tutar_net || 0), 0);
                const exp = (expRes.data ?? []).reduce((sum, g: any) => sum + (g.tutar || 0), 0);
                rows.push({
                    period:  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                    revenue: rev, expenses: exp, profit: rev - exp,
                    margin:  rev > 0 ? ((rev - exp) / rev) * 100 : 0,
                    cumRevenue: 0, cumProfit: 0,
                });
            }
        } else {
            for (let i = 4; i >= 0; i--) {
                const year = now.getFullYear() - i;
                const [revRes, expRes] = await Promise.all([
                    sb.from('siparisler').select('toplam_tutar_net').gte('siparis_tarihi', `${year}-01-01`).lte('siparis_tarihi', `${year}-12-31`),
                    sb.from('giderler').select('tutar').eq('durum', 'Onaylandı').gte('tarih', `${year}-01-01`).lte('tarih', `${year}-12-31`),
                ]);
                const rev = (revRes.data ?? []).reduce((sum, o: any) => sum + (o.toplam_tutar_net || 0), 0);
                const exp = (expRes.data ?? []).reduce((sum, g: any) => sum + (g.tutar || 0), 0);
                rows.push({
                    period: String(year),
                    revenue: rev, expenses: exp, profit: rev - exp,
                    margin: rev > 0 ? ((rev - exp) / rev) * 100 : 0,
                    cumRevenue: 0, cumProfit: 0,
                });
            }
        }

        // Cumulative
        let cumRev = 0, cumProfit = 0;
        rows.forEach(r => {
            cumRev    += r.revenue;
            cumProfit += r.profit;
            r.cumRevenue = cumRev;
            r.cumProfit  = cumProfit;
        });

        setData(rows);
        setLoading(false);
    };

    const totalRev  = data.reduce((s, d) => s + d.revenue,  0);
    const totalExp  = data.reduce((s, d) => s + d.expenses, 0);
    const totalProf = data.reduce((s, d) => s + d.profit,   0);
    const avgMargin = data.length > 0 ? data.reduce((s, d) => s + d.margin, 0) / data.length : 0;

    const bestRev  = data.length > 0 ? data.reduce((a, b) => a.revenue > b.revenue ? a : b) : null;
    const worstRev = data.length > 0 ? data.filter(d => d.revenue > 0).reduce((a, b) => a.revenue < b.revenue ? a : b, data[0]) : null;
    const bestProf = data.length > 0 ? data.reduce((a, b) => a.profit > b.profit ? a : b) : null;

    // YoY only for yearly view
    const yoyGrowth = view === 'yearly' && data.length >= 2
        ? chg(data[data.length - 1].revenue, data[data.length - 2].revenue)
        : null;

    // Positive/negative periods
    const profPeriods = data.filter(d => d.profit > 0).length;
    const lossPeriods = data.filter(d => d.profit < 0).length;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs">
                <p className="font-bold text-gray-700 mb-2">{label}</p>
                {payload.map((p: any, i: number) => (
                    <p key={i} className="flex justify-between gap-4" style={{ color: p.color }}>
                        <span>{p.name}:</span>
                        <span className="font-bold">{typeof p.value === 'number' ? fmt(p.value) : p.value}</span>
                    </p>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-8 pb-8">
            {/* Header */}
            <header>
                <Link href={`/${locale}/admin/idari/finans/raporlama`}
                      className="inline-flex items-center gap-2 text-primary hover:text-accent mb-4 font-semibold text-sm transition-colors">
                    <FiArrowLeft size={14} /> Raporlara Dön
                </Link>
                <h1 className="font-serif text-3xl font-bold text-primary">Dönemsel Karşılaştırma</h1>
                <p className="text-sm text-gray-500 mt-1">Ay ay ve yıl bazında finansal performans karşılaştırması</p>
            </header>

            {/* View Toggle */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                <FiActivity className="text-accent" size={14} />
                <span className="text-sm font-semibold text-gray-600">Görünüm:</span>
                {[
                    { label: 'Aylık (Son 12 Ay)', value: 'monthly' },
                    { label: 'Yıllık (Son 5 Yıl)', value: 'yearly' },
                ].map(v => (
                    <button key={v.value} onClick={() => setView(v.value as any)}
                        className={`px-5 py-2 text-sm font-bold rounded-full transition-colors ${
                            view === v.value ? 'bg-accent text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}>
                        {v.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent mx-auto" />
                    <p className="mt-4 text-sm text-gray-500">Veriler hesaplanıyor...</p>
                </div>
            ) : (
                <>
                    {/* Summary KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            {
                                label: 'Toplam Ciro',
                                value: fmt(totalRev),
                                sub: `${data.length} dönem toplamı`,
                                icon: FiTrendingUp,
                                bg: 'bg-emerald-50', border: 'border-emerald-100', txt: 'text-emerald-700',
                                ibg: 'bg-emerald-100', icol: 'text-emerald-500',
                                extra: yoyGrowth !== null ? { label: `YoY: ${pct(yoyGrowth)}`, pos: yoyGrowth >= 0 } : null,
                            },
                            {
                                label: 'Toplam Gider',
                                value: fmt(totalExp),
                                sub: `Ortalama: ${fmt(data.length > 0 ? totalExp / data.length : 0)}/${view === 'monthly' ? 'ay' : 'yıl'}`,
                                icon: FiTrendingDown,
                                bg: 'bg-orange-50', border: 'border-orange-100', txt: 'text-orange-700',
                                ibg: 'bg-orange-100', icol: 'text-orange-500',
                                extra: null,
                            },
                            {
                                label: 'Toplam Kâr',
                                value: fmt(totalProf),
                                sub: `Ortalama marj: %${avgMargin.toFixed(1)}`,
                                icon: totalProf >= 0 ? FiTrendingUp : FiTrendingDown,
                                bg: totalProf >= 0 ? 'bg-blue-50' : 'bg-red-50',
                                border: totalProf >= 0 ? 'border-blue-100' : 'border-red-100',
                                txt: totalProf >= 0 ? 'text-blue-700' : 'text-red-700',
                                ibg: totalProf >= 0 ? 'bg-blue-100' : 'bg-red-100',
                                icol: totalProf >= 0 ? 'text-blue-600' : 'text-red-600',
                                extra: null,
                            },
                            {
                                label: 'Kârlı Dönemler',
                                value: `${profPeriods} / ${data.length}`,
                                sub: `${lossPeriods} dönem zararda`,
                                icon: FiAward,
                                bg: profPeriods > lossPeriods ? 'bg-green-50' : 'bg-red-50',
                                border: profPeriods > lossPeriods ? 'border-green-100' : 'border-red-100',
                                txt: profPeriods > lossPeriods ? 'text-green-700' : 'text-red-700',
                                ibg: profPeriods > lossPeriods ? 'bg-green-100' : 'bg-red-100',
                                icol: profPeriods > lossPeriods ? 'text-green-600' : 'text-red-600',
                                extra: null,
                            },
                        ].map((k, i) => (
                            <div key={i} className={`${k.bg} border ${k.border} p-5 rounded-xl`}>
                                <div className="flex items-start justify-between mb-3">
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{k.label}</p>
                                    <div className={`p-2 ${k.ibg} rounded-lg`}><k.icon className={k.icol} size={14} /></div>
                                </div>
                                <p className={`text-xl font-bold ${k.txt}`}>{k.value}</p>
                                <p className="text-xs text-gray-500 mt-1">{k.sub}</p>
                                {k.extra && (
                                    <div className={`mt-2 text-xs font-bold ${k.extra.pos ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {k.extra.pos ? '▲' : '▼'} {k.extra.label}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Best/Worst Highlight */}
                    {(bestRev || bestProf) && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {bestRev && (
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-100 rounded-lg"><FiAward className="text-emerald-600" size={18} /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">En Yüksek Ciro</p>
                                        <p className="font-bold text-emerald-800 text-base">{fmt(bestRev.revenue)}</p>
                                        <p className="text-xs text-emerald-600">{bestRev.period}</p>
                                    </div>
                                </div>
                            )}
                            {bestProf && (
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-100 rounded-lg"><FiTrendingUp className="text-blue-600" size={18} /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">En Yüksek Kâr</p>
                                        <p className="font-bold text-blue-800 text-base">{fmt(bestProf.profit)}</p>
                                        <p className="text-xs text-blue-600">{bestProf.period} · %{bestProf.margin.toFixed(1)} marj</p>
                                    </div>
                                </div>
                            )}
                            {worstRev && worstRev.period !== bestRev?.period && (
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-3">
                                    <div className="p-2.5 bg-amber-100 rounded-lg"><FiAlertTriangle className="text-amber-600" size={18} /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">En Düşük Ciro</p>
                                        <p className="font-bold text-amber-800 text-base">{fmt(worstRev.revenue)}</p>
                                        <p className="text-xs text-amber-600">{worstRev.period}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Main Chart: Composed */}
                    {data.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                            <h3 className="font-semibold text-gray-700 mb-5">
                                {view === 'monthly' ? 'Aylık' : 'Yıllık'} Gelir · Gider · Kâr Karşılaştırması
                            </h3>
                            <ResponsiveContainer width="100%" height={380}>
                                <ComposedChart data={data} barGap={2} barCategoryGap="25%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                                    <YAxis yAxisId="left"  tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v: number) => `%${v.toFixed(0)}`} tick={{ fontSize: 10 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <ReferenceLine yAxisId="left" y={0} stroke="#9CA3AF" strokeWidth={1} />
                                    <Bar yAxisId="left" dataKey="revenue"  name="Ciro"  fill="#10B981" opacity={0.85} radius={[3, 3, 0, 0]} />
                                    <Bar yAxisId="left" dataKey="expenses" name="Gider" fill="#F59E0B" opacity={0.85} radius={[3, 3, 0, 0]} />
                                    <Bar yAxisId="left" dataKey="profit"   name="Kâr"   radius={[3, 3, 0, 0]}>
                                        {data.map((d, i) => (
                                            <Cell key={i} fill={d.profit >= 0 ? '#3B82F6' : '#EF4444'} opacity={0.9} />
                                        ))}
                                    </Bar>
                                    <Line yAxisId="right" type="monotone" dataKey="margin" name="Marj %"
                                          stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                            <p className="text-xs text-gray-400 text-center mt-2">* Mor çizgi = net kâr marjı (%), sağ eksen</p>
                        </div>
                    )}

                    {/* Detailed Comparison Table */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-semibold text-gray-700">
                                {view === 'monthly' ? 'Aylık' : 'Yıllık'} Detaylı Karşılaştırma
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dönem</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ciro</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Büyüme</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gider</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kâr/Zarar</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Marj</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kümülatif Ciro</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data.map((row, i) => {
                                        const growth = i > 0 ? chg(row.revenue, data[i - 1].revenue) : null;
                                        const isBestRev   = row.period === bestRev?.period;
                                        const isBestProf  = row.period === bestProf?.period;
                                        const isWorstRev  = row.period === worstRev?.period && worstRev?.period !== bestRev?.period;
                                        return (
                                            <tr key={i} className={`hover:bg-gray-50 transition-colors ${
                                                isBestRev ? 'bg-emerald-50/50' : isWorstRev ? 'bg-amber-50/30' : ''
                                            }`}>
                                                <td className="px-4 py-3.5 font-bold text-sm text-gray-800 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        {row.period}
                                                        {isBestRev  && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">🏆 Zirve</span>}
                                                        {isBestProf && !isBestRev && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">★ Kâr</span>}
                                                        {isWorstRev && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">↓ Dip</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-semibold text-sm text-emerald-700 whitespace-nowrap">{fmt(row.revenue)}</td>
                                                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                    {growth !== null ? (
                                                        <span className={`inline-flex items-center gap-1 text-xs font-bold ${growth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            {growth >= 0 ? <FiTrendingUp size={11} /> : <FiTrendingDown size={11} />}
                                                            {pct(growth)}
                                                        </span>
                                                    ) : <span className="text-gray-300 text-xs">—</span>}
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-sm text-amber-600 font-semibold whitespace-nowrap">{fmt(row.expenses)}</td>
                                                <td className="px-4 py-3.5 text-right font-bold text-sm whitespace-nowrap">
                                                    <span className={row.profit >= 0 ? 'text-blue-700' : 'text-red-600'}>{fmt(row.profit)}</span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                        row.margin >= 15 ? 'bg-emerald-100 text-emerald-700' :
                                                        row.margin >= 5  ? 'bg-blue-100 text-blue-700' :
                                                        row.margin >= 0  ? 'bg-amber-100 text-amber-700' :
                                                                           'bg-red-100 text-red-700'
                                                    }`}>
                                                        %{row.margin.toFixed(1)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-xs text-gray-500 whitespace-nowrap">{fmt(row.cumRevenue)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                    <tr>
                                        <td className="px-4 py-3.5 font-bold text-sm text-gray-800">TOPLAM</td>
                                        <td className="px-4 py-3.5 text-right font-bold text-emerald-700">{fmt(totalRev)}</td>
                                        <td />
                                        <td className="px-4 py-3.5 text-right font-bold text-amber-600">{fmt(totalExp)}</td>
                                        <td className={`px-4 py-3.5 text-right font-bold text-base ${totalProf >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmt(totalProf)}</td>
                                        <td className="px-4 py-3.5 text-right">
                                            <span className="text-xs font-bold text-gray-600">Ort. %{avgMargin.toFixed(1)}</span>
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Margin Trend Note */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3.5 flex items-start gap-3">
                        <FiActivity className="text-blue-400 flex-shrink-0 mt-0.5" size={14} />
                        <p className="text-xs text-blue-700">
                            <strong>Kümülatif analiz:</strong> Seçili dönem içindeki toplam ciro{' '}
                            <strong>{fmt(totalRev)}</strong>, toplam kâr <strong>{fmt(totalProf)}</strong> ve ortalama net marj{' '}
                            <strong>%{avgMargin.toFixed(1)}</strong> olarak gerçekleşmiştir.
                            {profPeriods < data.length && ` ${lossPeriods} dönem zararda kapanmıştır.`}
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}
