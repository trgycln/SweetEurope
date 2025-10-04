// src/app/admin/dashboard/AdminCharts.tsx
"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { MonthlyRevenueData } from '../orders/actions';
// NEU: Wir brauchen den Typ aus der applications/actions.ts für die Partner-Status-Karte
import { PartnerStatusCount } from '../applications/actions'; 


// Farben für die Partner-Status-Torten
const PIE_COLORS: Record<string, string> = {
    pending: '#FFC107', // Gelb
    approved: '#4CAF50', // Grün
    rejected: '#F44336', // Rot
    // Fügen Sie hier alle möglichen Status aus Ihrer DB hinzu
    'Anlaşıldı': '#4CAF50', // Türkisch für 'Approved'/'Vereinbart'
};

// ---------------------------------------------
// 1. MONATLICHER UMSATZ-CHART
// ---------------------------------------------
interface AdminRevenueChartProps {
    data: MonthlyRevenueData[];
}

export function AdminRevenueChart({ data }: AdminRevenueChartProps) {
    return (
        <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="month" tickFormatter={(tick) => new Date(tick).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })} />
                    <YAxis tickFormatter={(tick) => `${tick.toLocaleString('de-DE')} €`} />
                    <Tooltip 
                        formatter={(value) => [`€${Number(value).toFixed(2)}`, 'Umsatz']}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                    />
                    <Bar dataKey="total_revenue" fill="#C69F6B" name="Umsatz" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// ---------------------------------------------
// 2. PARTNER STATUS TORTEN-CHART
// ---------------------------------------------
interface PartnerStatusChartCardProps {
    title: string;
    // Wir verwenden den importierten Typ
    statusCounts: PartnerStatusCount[]; 
}

export function PartnerStatusChartCard({ title, statusCounts }: PartnerStatusChartCardProps) {
    const dataForChart = statusCounts
        // Wir filtern nur relevante Status und mappen sie für das Chart
        .map(item => ({
            name: item.status.charAt(0).toUpperCase() + item.status.slice(1), 
            value: item.count,
            color: PIE_COLORS[item.status] || '#9E9E9E' // Fallback-Farbe
        }));

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg h-80">
            <h2 className="text-xl font-bold mb-4 text-primary">{title}</h2>
            <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                    <Pie
                        data={dataForChart}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        labelLine={false}
                    >
                        {dataForChart.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}