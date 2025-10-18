// src/components/portal/PortalHeader.tsx (NİHAİ VE DOĞRU HALİ)
'use client';

import { BiLogOut } from "react-icons/bi";
import { FiMenu } from "react-icons/fi";
import { Bildirimler } from '../Bildirimler';
import { Dictionary } from '@/dictionaries'; // DİKKAT: Bu import'u ekliyoruz

interface PortalHeaderProps {
    firmaUnvan: string;
    setSidebarOpen: (isOpen: boolean) => void;
    dictionary: Dictionary; // DİKKAT: Prop'lara 'dictionary' eklendi
}

export function PortalHeader({ firmaUnvan, setSidebarOpen, dictionary }: PortalHeaderProps) {
    // DİKKAT: Artık 'content'i prop olarak gelen dictionary'den alıyoruz
    const content = dictionary.portal.header;

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-bg-subtle bg-secondary px-6">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-text-main/70 hover:text-primary">
                <FiMenu size={24} />
            </button>
            <h1 className="hidden lg:block font-serif text-xl font-bold text-primary">{firmaUnvan} {content.titleSuffix}</h1>
            <div className="flex items-center gap-4">
                <Bildirimler />
                <div className="h-8 w-px bg-bg-subtle hidden sm:block" />
                
                {/* İŞTE ÇIKIŞ YAPMA FORMU BURADA! */}
                <form action="/auth/sign-out" method="post">
                    <button type="submit" className="flex items-center gap-2 text-red-500 hover:text-red-700">
                        <BiLogOut size={20} />
                        <span className="text-sm font-medium">{content.logout}</span>
                    </button>
                </form>

            </div>
        </header>
    );
}