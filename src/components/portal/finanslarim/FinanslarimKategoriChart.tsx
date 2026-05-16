'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
    data: { kategori: string; tutar: number; oran: number }[];
}

const COLORS = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1',
    '#14B8A6', '#A855F7', '#94A3B8',
];

const fmt = (v: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

export function FinanslarimKategoriChart({ data }: Props) {
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const row = payload[0].payload;
            return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
                    <p className="font-bold text-slate-700">{row.kategori}</p>
                    <p className="text-slate-600 mt-0.5">{fmt(row.tutar)} · %{row.oran}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div>
            <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="tutar"
                        nameKey="kategori"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                    >
                        {data.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                </PieChart>
            </ResponsiveContainer>
            {/* Legend below the pie chart - vertical list */}
            <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
                {data.slice(0, 6).map((row, i) => (
                    <div key={row.kategori} className="flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-slate-600 truncate">{row.kategori}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-semibold text-slate-700">{fmt(row.tutar)}</span>
                            <span className="text-[10px] text-slate-400 w-8 text-right">%{row.oran}</span>
                        </div>
                    </div>
                ))}
                {data.length > 6 && (
                    <p className="text-[10px] text-slate-400 text-center pt-1 border-t border-slate-100">
                        +{data.length - 6} kategori daha
                    </p>
                )}
            </div>
        </div>
    );
}
