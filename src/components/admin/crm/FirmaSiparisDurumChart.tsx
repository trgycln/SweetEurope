'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
    data: { durum: string; adet: number }[];
}

const STATUS_COLOR: Record<string, string> = {
    'Beklemede': '#F59E0B',
    'Hazırlanıyor': '#3B82F6',
    'processing': '#06B6D4',
    'Yola Çıktı': '#8B5CF6',
    'shipped': '#8B5CF6',
    'Teslim Edildi': '#10B981',
    'delivered': '#10B981',
    'İptal Edildi': '#EF4444',
    'cancelled': '#EF4444',
};

const STATUS_LABEL: Record<string, string> = {
    'Beklemede': 'Beklemede',
    'Hazırlanıyor': 'Hazırlanıyor',
    'processing': 'İşleniyor',
    'Yola Çıktı': 'Yolda',
    'shipped': 'Yolda',
    'Teslim Edildi': 'Teslim',
    'delivered': 'Teslim',
    'İptal Edildi': 'İptal',
    'cancelled': 'İptal',
};

export function FirmaSiparisDurumChart({ data }: Props) {
    const total = data.reduce((s, d) => s + d.adet, 0);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const row = payload[0].payload;
            const pct = total > 0 ? Math.round((row.adet / total) * 100) : 0;
            return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-xs">
                    <p className="font-bold text-slate-700">{STATUS_LABEL[row.durum] || row.durum}</p>
                    <p className="text-slate-600">{row.adet} sipariş · %{pct}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div>
            <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                    <Pie data={data} dataKey="adet" nameKey="durum"
                        cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2}>
                        {data.map((entry, i) => (
                            <Cell key={i} fill={STATUS_COLOR[entry.durum] || '#94A3B8'} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1">
                {data.map((row, i) => {
                    const pct = total > 0 ? Math.round((row.adet / total) * 100) : 0;
                    return (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: STATUS_COLOR[row.durum] || '#94A3B8' }} />
                                <span className="text-slate-600 truncate">{STATUS_LABEL[row.durum] || row.durum}</span>
                            </div>
                            <span className="font-semibold text-slate-700 flex-shrink-0">
                                {row.adet}
                                <span className="text-[9px] text-slate-400 ml-1">%{pct}</span>
                            </span>
                        </div>
                    );
                })}
            </div>
            <p className="text-[10px] text-slate-400 text-center pt-2 mt-2 border-t border-slate-100">
                Toplam <strong className="text-slate-600">{total}</strong> sipariş
            </p>
        </div>
    );
}
