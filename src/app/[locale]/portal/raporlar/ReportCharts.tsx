// src/app/[locale]/portal/raporlar/ReportCharts.tsx
'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const COLORS = ['#C69F6B', '#2B2B2B', '#8884d8', '#82ca9d', '#ffc658'];

interface MonthlyRevenue {
    month: string;
    revenue: number;
}

interface TopProduct {
    product_name: string;
    total_quantity: number;
    total_revenue: number;
}

interface CustomerGrowth {
    month: string;
    new_customers: number;
}

export const RevenueChart = ({ data, locale }: { data: MonthlyRevenue[], locale: string }) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(value);
    };

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="revenue" fill="#C69F6B" name="Ciro" />
            </BarChart>
        </ResponsiveContainer>
    );
};

export const TopProductsChart = ({ data, locale }: { data: TopProduct[], locale: string }) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(value);
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Ürün
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Adet
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Toplam Ciro
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.length > 0 ? (
                        data.map((product, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {product.product_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                                    {product.total_quantity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary text-right">
                                    {formatCurrency(product.total_revenue)}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                Henüz satış verisi bulunmamaktadır.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export const CustomerGrowthChart = ({ data }: { data: CustomerGrowth[] }) => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="new_customers" stroke="#8884d8" strokeWidth={2} name="Yeni Müşteri" />
            </LineChart>
        </ResponsiveContainer>
    );
};
