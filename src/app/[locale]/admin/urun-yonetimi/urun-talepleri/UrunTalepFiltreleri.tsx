// src/app/[locale]/admin/urun-yonetimi/urun-talepleri/UrunTalepFiltreleri.tsx (NEUE DATEI)
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { FiSearch } from 'react-icons/fi';
import { Tables, Enums } from '@/lib/supabase/database.types';

type Firma = Pick<Tables<'firmalar'>, 'id' | 'unvan'>;
type StatusOption = {
    anahtar: Enums<'urun_talep_durumu'>;
    deger: string;
};

interface UrunTalepFiltreleriProps {
    firmalar: Firma[];
    durumlar: StatusOption[];
}

export default function UrunTalepFiltreleri({ firmalar, durumlar }: UrunTalepFiltreleriProps) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const handleFilterChange = (value: string, name: 'status' | 'firmaId' | 'q') => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) { params.set(name, value); }
        else { params.delete(name); }
        replace(`${pathname}?${params.toString()}`);
    };
    
    const handleSearch = useDebouncedCallback((term) => {
        handleFilterChange(term, 'q');
    }, 500);

    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm border border-bg-subtle">
            <div className="relative flex-grow">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Nach Firma oder Produktname suchen..."
                    className="w-full pl-10 pr-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition"
                    onChange={(e) => handleSearch(e.target.value)}
                    defaultValue={searchParams.get('q')?.toString()}
                />
            </div>
            
            <select
                onChange={(e) => handleFilterChange(e.target.value, 'firmaId')}
                defaultValue={searchParams.get('firmaId')?.toString() || ''}
                className="w-full sm:w-56 px-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition bg-white"
            >
                <option value="">Alle Firmen</option>
                {firmalar.map(firma => (
                    <option key={firma.id} value={firma.id}>{firma.unvan}</option>
                ))}
            </select>
            
            <select
                onChange={(e) => handleFilterChange(e.target.value, 'status')}
                defaultValue={searchParams.get('status')?.toString() || ''}
                className="w-full sm:w-48 px-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition bg-white"
            >
                <option value="">Alle Status</option>
                {durumlar.map(durum => (
                    <option key={durum.anahtar} value={durum.anahtar}>{durum.deger}</option>
                ))}
            </select>
        </div>
    );
}