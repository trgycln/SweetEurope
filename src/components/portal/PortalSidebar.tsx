'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiGrid, FiPackage, FiBox } from 'react-icons/fi';
import { dictionary } from '@/dictionaries/de'; // Wörterbuch importieren

export function PortalSidebar() {
    const pathname = usePathname();
    const content = dictionary.portal.sidebar; // Texte für die Sidebar holen

const menuItems = [
    { name: content.dashboard, href: '/portal/dashboard', icon: FiGrid },
    { name: content.orders, href: '/portal/siparislerim', icon: FiPackage }, // Dieser Link wird jetzt funktionieren
    { name: content.products, href: '/portal/katalog', icon: FiBox },
];

    return (
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-primary lg:flex">
             <div className="flex h-16 flex-shrink-0 items-center border-b border-white/10 px-6">
                <h1 className="text-white text-2xl font-serif font-bold">{content.title}</h1>
            </div>
            <nav className="flex-1 space-y-2 p-4">
                {menuItems.map(item => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link key={item.name} href={item.href}
                            className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors ${isActive ? 'bg-accent text-primary font-bold' : 'text-secondary/70 hover:bg-white/10'}`}>
                            <item.icon size={20} />
                            <span className="text-sm font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}