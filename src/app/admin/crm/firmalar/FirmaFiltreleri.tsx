// src/app/admin/crm/firmalar/FirmaFiltreleri.tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { FiSearch } from 'react-icons/fi';

interface FirmaFiltreleriProps {
    statusOptions: string[];
}

export default function FirmaFiltreleri({ statusOptions }: FirmaFiltreleriProps) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    // Debounce, her tuşa basıldığında arama yapılmasını engeller.
    // Kullanıcı yazmayı bıraktıktan 300ms sonra arama yapar.
    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set('q', term);
        } else {
            params.delete('q');
        }
        replace(`${pathname}?${params.toString()}`);
    }, 300);

    const handleStatusChange = (status: string) => {
        const params = new URLSearchParams(searchParams);
        if (status) {
            params.set('status', status);
        } else {
            params.delete('status');
        }
        replace(`${pathname}?${params.toString()}`);
    };
    
    // NOT: use-debounce kütüphanesini eklemeniz gerekecek:
    // yarn add use-debounce

    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm border border-bg-subtle">
            <div className="relative flex-grow">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Firma unvanına göre ara..."
                    className="w-full pl-10 pr-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition"
                    onChange={(e) => handleSearch(e.target.value)}
                    defaultValue={searchParams.get('q')?.toString()}
                />
            </div>
            <div className="flex-grow sm:flex-grow-0 sm:w-64">
                <select
                    className="w-full px-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition bg-white"
                    onChange={(e) => handleStatusChange(e.target.value)}
                    value={searchParams.get('status')?.toString() || ''}
                >
                    <option value="">Tüm Statüler</option>
                    {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}