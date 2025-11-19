// src/app/[locale]/admin/operasyon/numune-talepleri/NumuneFiltreleri.tsx (NEUE DATEI)
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { FiSearch } from 'react-icons/fi';
import { Tables, Enums } from '@/lib/supabase/database.types';

type Firma = Pick<Tables<'firmalar'>, 'id' | 'unvan'>;
type StatusOption = {
    anahtar: Enums<'numune_talep_durumu'>;
    deger: string;
};

interface NumuneFiltreleriProps {
    firmalar: Firma[];
    durumlar: StatusOption[];
    searchPlaceholder: string;
    allCompaniesText: string;
    allStatusesText: string;
}

export default function NumuneFiltreleri({ firmalar, durumlar, searchPlaceholder, allCompaniesText, allStatusesText }: NumuneFiltreleriProps) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    // Debounced-Funktion für alle Filter
    const handleFilterChange = (value: string, name: 'status' | 'firmaId' | 'q') => {
        const params = new URLSearchParams(searchParams.toString()); // .toString() ist sicherer
        if (value) {
            params.set(name, value);
        } else {
            params.delete(name);
        }
        // Bei Filterung immer zur ersten Seite (falls Paginierung später hinzukommt)
        // params.set('page', '1'); 
        replace(`${pathname}?${params.toString()}`);
    };
    
    // Debounced-Wrapper für die Texteingabe
    const handleSearch = useDebouncedCallback((term) => {
        handleFilterChange(term, 'q');
    }, 500); // 500ms warten

    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm border border-bg-subtle">
            {/* Suchfeld (für Firma oder Produkt) */}
            <div className="relative flex-grow">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder={searchPlaceholder}
                    className="w-full pl-10 pr-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition"
                    onChange={(e) => handleSearch(e.target.value)}
                    defaultValue={searchParams.get('q')?.toString()}
                />
            </div>
            
            {/* Firmen-Filter */}
            <select
                onChange={(e) => handleFilterChange(e.target.value, 'firmaId')}
                defaultValue={searchParams.get('firmaId')?.toString() || ''}
                className="w-full sm:w-56 px-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition bg-white"
            >
                <option value="">{allCompaniesText}</option>
                {firmalar.map(firma => (
                    <option key={firma.id} value={firma.id}>{firma.unvan}</option>
                ))}
            </select>
            
            {/* Status-Filter */}
            <select
                onChange={(e) => handleFilterChange(e.target.value, 'status')}
                defaultValue={searchParams.get('status')?.toString() || ''}
                className="w-full sm:w-48 px-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition bg-white"
            >
                <option value="">{allStatusesText}</option>
                {durumlar.map(durum => (
                    <option key={durum.anahtar} value={durum.anahtar}>{durum.deger}</option>
                ))}
            </select>
        </div>
    );
}