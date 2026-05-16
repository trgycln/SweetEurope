'use client';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, Line, ComposedChart,
} from 'recharts';

interface Props {
    data: { month: string; ciro: number; adet: number }[];
}

const fmt = (v: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

export function FirmaOzetGrafik({ data }: Props) {
    const formatMonth = (m: string) => {
        const [y, mo] = m.split('-');
        return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('tr-TR', { month: 'short' });
    };

    const maxCiro = Math.max(...data.map(d => d.ciro), 1);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const row = payload[0].payload;
            return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs space-y-1">
                    <p className="font-bold text-slate-700">{formatMonth(label)}</p>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-blue-600">● Ciro</span>
                        <span className="font-bold text-blue-700">{fmt(row.ciro)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-1">
                        <span className="text-emerald-600">━ Sipariş</span>
                        <span className="font-bold text-emerald-700">{row.adet} adet</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                    dataKey="month"
                    tickFormatter={formatMonth}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    yAxisId="left"
                    tickFormatter={(v: number) => v >= 1000 ? `€${(v / 1000).toFixed(0)}k` : `€${v}`}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(v: number) => `${v}`}
                    tick={{ fontSize: 10, fill: '#10B981' }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar yAxisId="left" dataKey="ciro" radius={[4, 4, 0, 0]}>
                    {data.map((entry, i) => (
                        <Cell key={i} fill={entry.ciro === maxCiro && entry.ciro > 0 ? '#10B981' : '#3B82F6'} />
                    ))}
                </Bar>
                <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="adet"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#10B981' }}
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
}
