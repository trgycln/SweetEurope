'use client';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, Line, ComposedChart,
} from 'recharts';

interface Props {
    data: { month: string; gelir: number; gider: number; net: number }[];
}

const fmt = (v: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

export function FinanslarimTrendChart({ data }: Props) {
    const formatMonth = (m: string) => {
        const [y, mo] = m.split('-');
        return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('tr-TR', { month: 'short' });
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const row = payload[0].payload;
            return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs space-y-1">
                    <p className="font-bold text-slate-700 mb-1.5">{formatMonth(label)}</p>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-blue-600">● Gelir</span>
                        <span className="font-bold text-blue-700">{fmt(row.gelir)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-red-600">● Gider</span>
                        <span className="font-bold text-red-700">{fmt(row.gider)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-1 mt-1">
                        <span className={row.net >= 0 ? 'text-emerald-600' : 'text-orange-600'}>━ Net</span>
                        <span className={`font-bold ${row.net >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                            {fmt(row.net)}
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="gelir" name="Gelir" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gider" name="Gider" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Line
                    type="monotone"
                    dataKey="net"
                    name="Net Kâr"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10B981' }}
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
}
