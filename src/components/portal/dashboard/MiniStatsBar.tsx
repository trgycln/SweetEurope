'use client';

import Link from 'next/link';
import { FiTruck, FiHeart, FiPackage } from 'react-icons/fi';

interface MiniStatsBarProps {
    activeOrdersCount: number;
    sampleRequestsCount: number;
    favoritesCount: number;
    locale: string;
    labels: {
        activeOrders: string;
        sampleRequests: string;
        favorites: string;
    };
}

export function MiniStatsBar({
    activeOrdersCount,
    sampleRequestsCount,
    favoritesCount,
    locale,
    labels
}: MiniStatsBarProps) {
    const stats = [
        {
            icon: FiTruck,
            label: labels.activeOrders,
            value: activeOrdersCount,
            href: `/${locale}/portal/siparisler?filter=offen`,
            color: 'text-orange-600 bg-orange-50'
        },
        {
            icon: FiPackage,
            label: labels.sampleRequests,
            value: sampleRequestsCount,
            href: `/${locale}/portal/taleplerim`,
            color: 'text-blue-600 bg-blue-50'
        },
        {
            icon: FiHeart,
            label: labels.favorites,
            value: favoritesCount,
            href: `/${locale}/portal/katalog?favoriten=true`,
            color: 'text-red-600 bg-red-50'
        }
    ];

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
            <div className="flex flex-wrap justify-around items-center gap-4">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Link
                            key={index}
                            href={stat.href}
                            className="flex items-center gap-3 hover:scale-105 transition-transform"
                        >
                            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                                <p className="text-xs text-gray-600 font-medium">{stat.label}</p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
