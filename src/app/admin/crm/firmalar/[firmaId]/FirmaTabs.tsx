// src/app/admin/crm/firmalar/[firmaId]/FirmaTabs.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function FirmaTabs({ firmaId }: { firmaId: string }) {
    const pathname = usePathname();

    const tabs = [
        { name: 'Genel Bilgiler', href: `/admin/crm/firmalar/${firmaId}` },
        { name: 'Etkinlik Akışı', href: `/admin/crm/firmalar/${firmaId}/etkinlikler` },
        // Gelecekte eklenecek diğer sekmeler...
        // { name: 'İlgili Kişiler', href: `/admin/crm/firmalar/${firmaId}/kisiler` },
        // { name: 'Siparişler', href: `/admin/crm/firmalar/${firmaId}/siparisler` },
    ];

    const baseClasses = "px-4 py-3 text-sm font-bold transition-colors duration-200";
    const inactiveClasses = "text-text-main/70 hover:bg-secondary";
    const activeClasses = "text-accent border-b-2 border-accent";

    return (
        <nav className="flex border-b border-bg-subtle bg-white rounded-t-2xl shadow-lg overflow-hidden">
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
    );
}