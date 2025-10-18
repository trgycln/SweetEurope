'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { FiSearch } from 'react-icons/fi';
import { Enums } from '@/lib/supabase/database.types';

interface DuyuruFiltreleriProps {
    hedefKitleOptions: Enums<'hedef_rol'>[];
}

export default function DuyuruFiltreleri({ hedefKitleOptions }: DuyuruFiltreleriProps) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const handleFilterChange = useDebouncedCallback((value: string, name: 'q' | 'aktif' | 'hedef') => {
        const params = new URLSearchParams(searchParams);
        if (value) {
            params.set(name, value);
        } else {
            params.delete(name);
        }
        replace(`${pathname}?${params.toString()}`);
    }, 300);

    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm border border-bg-subtle">
            <div className="relative flex-grow">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Duyuru başlığına göre ara..."
                    className="w-full pl-10 pr-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition"
                    onChange={(e) => handleFilterChange(e.target.value, 'q')}
                    defaultValue={searchParams.get('q')?.toString()}
                />
            </div>
            <select
                onChange={(e) => handleFilterChange(e.target.value, 'aktif')}
                defaultValue={searchParams.get('aktif')?.toString() || ''}
                className="w-full sm:w-48 px-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition bg-white"
            >
                <option value="">Tüm Durumlar</option>
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
            </select>
            <select
                onChange={(e) => handleFilterChange(e.target.value, 'hedef')}
                defaultValue={searchParams.get('hedef')?.toString() || ''}
                className="w-full sm:w-48 px-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition bg-white"
            >
                <option value="">Tüm Hedef Kitleler</option>
                {hedefKitleOptions.map(kitle => (
                    <option key={kitle} value={kitle}>{kitle}</option>
                ))}
            </select>
        </div>
    );
}