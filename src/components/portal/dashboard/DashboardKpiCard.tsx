// src/components/portal/dashboard/DashboardKpiCard.tsx (Aktualisiert)
'use client';

import { ElementType } from 'react';
import Link from 'next/link';
// NEU: Icons hier in der Client-Komponente importieren
import { FiTruck, FiDollarSign, FiShoppingCart, FiBox, FiClock } from 'react-icons/fi';

// NEU: Ein Typ für die Icon-Namen, die wir als String erwarten
export type KpiIconName = 'truck' | 'dollar' | 'cart' | 'box' | 'clock';

interface KpiCardProps {
    title: string;
    value: string | number;
    icon: KpiIconName; // KORREKTUR: Typ ist jetzt KpiIconName (ein String)
    color: 'blue' | 'orange' | 'red' | 'green';
    href?: string; // Optionale Link-Prop
}

// NEU: Map, die die String-Namen den importierten Icon-Komponenten zuordnet
const iconMap: Record<KpiIconName, ElementType> = {
    truck: FiTruck,
    dollar: FiDollarSign,
    cart: FiShoppingCart,
    box: FiBox,       // Behalte die alten Icons als Fallback
    clock: FiClock,   // Behalte die alten Icons als Fallback
};

const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800',
    green: 'bg-green-100 text-green-800',
};

export function DashboardKpiCard({ title, value, icon: iconName, color, href }: KpiCardProps) {
    
    // NEU: Wähle die Icon-Komponente basierend auf dem übergebenen String-Namen aus
    const Icon = iconMap[iconName] || FiBox; // FiBox als Standard-Fallback

    const cardClasses = `bg-white p-6 rounded-2xl shadow-lg flex items-center gap-6 transform hover:-translate-y-1 transition-transform duration-300 ${href ? 'hover:shadow-accent/30 hover:ring-2 hover:ring-accent' : ''}`;

    const cardContent = (
        <>
            <div className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
                <Icon className="w-7 h-7" />
            </div>
            <div>
                <p className="text-sm font-medium text-text-main/70">{title}</p>
                <p className="text-3xl font-bold text-primary">{value}</p>
            </div>
        </>
    );

    if (href) {
        return (
            <Link href={href} className={cardClasses}>
                {cardContent}
            </Link>
        );
    }

    return (
        <div className={cardClasses}>
            {cardContent}
        </div>
    );
}