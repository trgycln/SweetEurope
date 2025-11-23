'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface TopCategoryData {
    kategori_adi: string;
    total_ciro: number;
}

interface SalesTrendData {
    ay: string;
    total_ciro: number;
}

interface TopCategoriesChartProps {
    data: TopCategoryData[];
}

interface SalesTrendChartProps {
    data: SalesTrendData[];
}

export function TopCategoriesChart({ data }: TopCategoriesChartProps) {
    if (!data || data.length === 0) {
        return <div className="text-center text-gray-500 py-8">Henüz veri yok</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                    dataKey="kategori_adi" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    fontSize={12}
                />
                <YAxis />
                <Tooltip 
                    formatter={(value: number) => `€${value.toFixed(2)}`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                />
                <Legend />
                <Bar dataKey="total_ciro" fill="#8B5CF6" name="Toplam Ciro (€)" />
            </BarChart>
        </ResponsiveContainer>
    );
}

export function SalesTrendChart({ data }: SalesTrendChartProps) {
    if (!data || data.length === 0) {
        return <div className="text-center text-gray-500 py-8">Henüz veri yok</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ay" />
                <YAxis />
                <Tooltip 
                    formatter={(value: number) => `€${value.toFixed(2)}`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                />
                <Legend />
                <Line 
                    type="monotone" 
                    dataKey="total_ciro" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Aylık Ciro (€)"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
