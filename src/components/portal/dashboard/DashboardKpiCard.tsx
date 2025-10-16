// src/components/portal/dashboard/DashboardKpiCard.tsx
import { ElementType } from 'react';

interface KpiCardProps {
    title: string;
    value: string | number;
    icon: ElementType;
    color: 'blue' | 'orange' | 'red' | 'green';
}

const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800',
    green: 'bg-green-100 text-green-800',
};

export function DashboardKpiCard({ title, value, icon: Icon, color }: KpiCardProps) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg flex items-center gap-6 transform hover:-translate-y-1 transition-transform duration-300">
            <div className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
                <Icon className="w-7 h-7" />
            </div>
            <div>
                <p className="text-sm font-medium text-text-main/70">{title}</p>
                <p className="text-3xl font-bold text-primary">{value}</p>
            </div>
        </div>
    );
}