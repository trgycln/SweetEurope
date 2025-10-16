// src/app/admin/crm/firmalar/[firmaId]/FirmaTabs.tsx (DÜZELTİLMİŞ)
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function FirmaTabs({ firmaId }: { firmaId: string }) {
    const pathname = usePathname();

    const tabs = [
        { name: 'Genel Bilgiler', href: `/admin/crm/firmalar/${firmaId}` },
        { name: 'Etkinlik Akışı', href: `/admin/crm/firmalar/${firmaId}/etkinlikler` },
        { name: 'İlgili Kişiler', href: `/admin/crm/firmalar/${firmaId}/kisiler` },
        { name: 'Siparişler', href: `/admin/crm/firmalar/${firmaId}/siparisler` },
        // DÜZELTME: 'gorever' -> 'gorevler' olarak düzeltildi.
        { name: 'Görevler', href: `/admin/crm/firmalar/${firmaId}/gorevler` },
    ];

    const baseClasses = "px-4 py-3 text-sm font-bold transition-colors duration-200 whitespace-nowrap";
    const inactiveClasses = "text-text-main/70 hover:bg-secondary";
    const activeClasses = "text-accent border-b-2 border-accent";

    return (
        // İyileştirme: Yatayda scroll edilebilir yapı eklendi (küçük mobil ekranlar için)
        <div className="w-full overflow-x-auto bg-white rounded-t-2xl shadow-lg">
            <nav className="flex border-b border-bg-subtle">
                {tabs.map((tab) => {
                    // DÜZELTME: 'startsWith' yerine tam eşleşme ('===') kontrolü yapılıyor.
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