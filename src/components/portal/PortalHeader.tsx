// src/components/portal/PortalHeader.tsx
'use client';

import { BiLogOut } from "react-icons/bi";
import { FiMenu } from "react-icons/fi";
import { dictionary } from '@/dictionaries/de';

// Header artık mobil menüyü açma fonksiyonunu da alıyor.
interface PortalHeaderProps {
    firmaUnvan: string;
    setSidebarOpen?: (isOpen: boolean) => void; // Opsiyonel, çünkü layout'u gelecekte değiştirebiliriz
}

export function PortalHeader({ firmaUnvan, setSidebarOpen }: PortalHeaderProps) {
    const content = dictionary.portal.header;

    return (
        <header className="fixed top-0 left-0 z-20 flex h-16 w-full items-center justify-between border-b border-bg-subtle bg-secondary px-6 lg:left-64 lg:w-[calc(100%-16rem)]">
            <button onClick={() => setSidebarOpen?.(true)} className="lg:hidden text-text-main/70 hover:text-primary">
                <FiMenu size={24} />
            </button>
            <h1 className="hidden lg:block font-serif text-xl font-bold text-primary">{firmaUnvan} {content.titleSuffix}</h1>
            <form action="/auth/sign-out" method="post">
                <button type="submit" className="flex items-center gap-2 text-red-500 hover:text-red-700">
                    <BiLogOut size={20} />
                    <span className="text-sm font-medium">{content.logout}</span>
                </button>
            </form>
        </header>
    );
}