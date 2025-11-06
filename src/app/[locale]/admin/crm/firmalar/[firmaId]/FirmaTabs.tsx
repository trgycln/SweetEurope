// src/app/[locale]/admin/crm/firmalar/[firmaId]/FirmaTabs.tsx (Locale-aware, i18n labels)
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/i18n-config';

export default function FirmaTabs({ 
    firmaId, 
    locale, 
    labels,
}: { 
    firmaId: string; 
    locale: Locale; 
    labels: { generalInfo: string; activities: string; contacts: string; orders: string; tasks: string; } 
}) {
    const pathname = usePathname();

    const tabs = [
        { name: labels.generalInfo, href: `/${locale}/admin/crm/firmalar/${firmaId}` },
        { name: labels.activities, href: `/${locale}/admin/crm/firmalar/${firmaId}/etkinlikler` },
        { name: labels.contacts, href: `/${locale}/admin/crm/firmalar/${firmaId}/kisiler` },
        { name: labels.orders, href: `/${locale}/admin/crm/firmalar/${firmaId}/siparisler` },
        { name: labels.tasks, href: `/${locale}/admin/crm/firmalar/${firmaId}/gorevler` },
    ];

    const baseClasses = "px-4 py-3 text-sm font-bold transition-colors duration-200 whitespace-nowrap";
    const inactiveClasses = "text-text-main/70 hover:bg-secondary";
    const activeClasses = "text-accent border-b-2 border-accent";

    return (
        // İyileştirme: Yatayda scroll edilebilir yapı eklendi (küçük mobil ekranlar için)
        <div className="w-full overflow-x-auto bg-white rounded-t-2xl shadow-lg">
            <nav className="flex border-b border-bg-subtle">
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