'use client';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell,
} from 'recharts';

interface Props {
    data: { month: string; tutar: number }[];
}

const fmt = (v: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

export function HesapOzetTrend({ data }: Props) {
    const formatMonth = (m: string) => {
        const [y, mo] = m.split('-');
        return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('tr-TR', { month: 'short' });
    };

    const maxTutar = Math.max(...data.map(d => d.tutar), 1);
    const avgTutar = data.reduce((s, d) => s + d.tutar, 0) / data.length;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const row = payload[0].payload;
            return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
                    <p className="font-bold text-slate-700 mb-1">{formatMonth(label)}</p>
                    <p className="text-blue-700">
                        <strong>{fmt(row.tutar)}</strong>
                    </p>
                    {row.tutar >= avgTutar && row.tutar > 0 && (
                        <p className="text-emerald-600 text-[10px] mt-0.5">↑ Ortalamanın üzerinde</p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                    dataKey="month"
                    tickFormatter={formatMonth}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    tickFormatter={(v: number) => v >= 1000 ? `€${(v / 1000).toFixed(0)}k` : `€${v}`}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="tutar" radius={[4, 4, 0, 0]}>
                    {data.map((entry, i) => (
                        <Cell key={i} fill={entry.tutar === maxTutar && entry.tutar > 0 ? '#10B981' : '#3B82F6'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
