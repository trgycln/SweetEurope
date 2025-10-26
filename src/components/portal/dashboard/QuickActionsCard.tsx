'use client';

import Link from 'next/link';
import { FiPlus, FiMessageSquare, FiBookOpen } from 'react-icons/fi';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';

interface QuickActionsCardProps {
    locale: Locale;
    dictionary: Dictionary;
}

export function QuickActionsCard({ locale, dictionary }: QuickActionsCardProps) {
    // Texte aus dem Dictionary holen, mit Fallbacks
    const dashboardContent = (dictionary as any)?.portal?.dashboard || {};
    const actionsContent = {
        title: dashboardContent.quickActionsTitle || "Schnellaktionen",
        newOrder: dashboardContent.actionNewOrder || "Neue Bestellung",
        myRequests: (dictionary as any)?.portal?.sidebar?.requests || "Meine Anfragen", // Aus Sidebar nehmen
        viewCatalog: (dictionary as any)?.portal?.sidebar?.products || "Produktkatalog", // Aus Sidebar nehmen
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
            <h2 className="font-serif text-xl font-bold text-primary mb-4">{actionsContent.title}</h2>
            <div className="space-y-3">
                <Link href={`/${locale}/portal/siparisler/yeni`} className="flex items-center gap-3 px-4 py-3 bg-accent text-white rounded-lg shadow-sm hover:bg-opacity-90 transition-all font-bold text-sm w-full text-center justify-center">
                    <FiPlus /> {actionsContent.newOrder}
                </Link>
                <Link href={`/${locale}/portal/taleplerim`} className="flex items-center gap-3 px-4 py-3 bg-secondary text-primary rounded-lg shadow-sm hover:bg-bg-subtle transition-all font-bold text-sm w-full text-center justify-center border border-gray-200">
                    <FiMessageSquare /> {actionsContent.myRequests}
                </Link>
                <Link href={`/${locale}/portal/katalog`} className="flex items-center gap-3 px-4 py-3 bg-secondary text-primary rounded-lg shadow-sm hover:bg-bg-subtle transition-all font-bold text-sm w-full text-center justify-center border border-gray-200">
                    <FiBookOpen /> {actionsContent.viewCatalog}
                </Link>
            </div>
        </div>
    );
}
