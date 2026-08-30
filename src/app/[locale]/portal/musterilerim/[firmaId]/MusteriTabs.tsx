// src/app/[locale]/portal/musterilerim/[firmaId]/MusteriTabs.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/i18n-config';

export default function MusteriTabs({ 
    firmaId, 
    locale, 
}: { 
    firmaId: string; 
    locale: Locale; 
}) {
    const pathname = usePathname();

    const tabs = [
        { name: 'Özet', href: `/${locale}/portal/musterilerim/${firmaId}` },
        { name: 'Detaylar', href: `/${locale}/portal/musterilerim/${firmaId}/detaylar` },
        { name: 'Etkinlik Akışı', href: `/${locale}/portal/musterilerim/${firmaId}/etkinlikler` },
        { name: 'İlgili Kişiler', href: `/${locale}/portal/musterilerim/${firmaId}/kisiler` },
        { name: 'Siparişler', href: `/${locale}/portal/musterilerim/${firmaId}/siparisler` },
        { name: 'Görevler', href: `/${locale}/portal/musterilerim/${firmaId}/gorevler` },
    ];

    const baseClasses = "px-4 py-3 text-sm font-bold transition-colors duration-200 whitespace-nowrap";
    const inactiveClasses = "text-slate-600 hover:bg-slate-50";
    const activeClasses = "text-blue-600 border-b-2 border-blue-600";

    return (
        <div className="w-full overflow-x-auto bg-white rounded-t-xl shadow-xs">
            <nav className="flex border-b border-slate-200">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href;
                    return (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                        >
                            {tab.name}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
