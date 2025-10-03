"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Order {
  created_at: string;
  total: number;
}

interface SalesChartProps {
  orders: Order[];
  dictionary: any;
}

const SalesChart: React.FC<SalesChartProps> = ({ orders, dictionary }) => {
  // Veriyi grafiğe uygun formata dönüştürelim
  const processDataForChart = () => {
    const dailySales: { [key: string]: number } = {};
    orders.forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString('de-DE');
      dailySales[date] = (dailySales[date] || 0) + order.total;
    });
    return Object.keys(dailySales).map(date => ({
      date,
      Umsatz: dailySales[date],
    })).reverse(); // En yeni tarihler sağda olacak şekilde sırala
  };

  const chartData = processDataForChart();

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mt-8">
      <h3 className="font-serif text-2xl font-bold text-primary mb-4">{dictionary.dashboard.salesOverview}</h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
            <Tooltip
              cursor={{ fill: 'rgba(198, 159, 107, 0.1)' }}
              formatter={(value: number) => [`€${value.toFixed(2)}`, 'Umsatz']}
            />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            <Bar dataKey="Umsatz" fill="#C69F6B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesChart;
