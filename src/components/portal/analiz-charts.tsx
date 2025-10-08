// src/components/portal/analiz-charts.tsx
'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#C69F6B', '#2B2B2B', '#8884d8', '#82ca9d', '#ffc658'];

export const TopCategoriesChart = ({ data }: { data: any[] }) => (
    <ResponsiveContainer width="100%" height={300}>
        <PieChart>
            <Pie data={data} cx="50%" cy="50%" labelLine={false} outerRadius={80} dataKey="total" nameKey="kategori" label>
                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value)} />
            <Legend />
        </PieChart>
    </ResponsiveContainer>
);

export const SalesTrendChart = ({ data }: { data: any[] }) => (
    <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
            <XAxis dataKey="monat" />
            <YAxis tickFormatter={(value) => `${value / 1000}k`} />
            <Tooltip formatter={(value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value)} />
            <Legend />
            <Bar dataKey="umsatz" fill="#C69F6B" name="Aylık Ciro" />
        </BarChart>
    </ResponsiveContainer>
);