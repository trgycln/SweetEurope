// src/app/admin/operasyon/siparisler/SiparisFiltreleri.tsx (DÜZELTİLMİŞ)
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { FiSearch } from 'react-icons/fi';

type Firma = { id: string; unvan: string | null };
type Durum = { anahtar: string; deger: string };

interface SiparisFiltreleriProps {
    firmalar: Firma[];
    durumlar: Durum[];
    locale: string;
    dictionary: any;
}

export default function SiparisFiltreleri({ firmalar, durumlar, locale, dictionary }: SiparisFiltreleriProps) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    // Dictionary content extraction
    const content = (dictionary as any)?.adminDashboard?.ordersPage || {};

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        replace(`${pathname}?${params.toString()}`);
    };
    
    const handleSearch = useDebouncedCallback((term: string) => {
        handleFilterChange('q', term);
    }, 300);

    const baseClasses = "w-full bg-white border border-bg-subtle rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-accent";

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm border border-bg-subtle">
            {/* Arama Çubuğu */}
            <div className="md:col-span-1">
                <label htmlFor="search" className="block text-xs font-bold text-text-main/80 mb-1">
                    {content.searchLabel || 'Ara (Sipariş No / Firma)'}
                </label>
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        id="search"
                        type="text"
                        placeholder={content.searchPlaceholder || 'Sipariş no veya firma adı...'}
                        className="w-full pl-10 pr-4 py-2 border border-bg-subtle rounded-md"
                        onChange={(e) => handleSearch(e.target.value)}
                        defaultValue={searchParams.get('q')?.toString()}
                    />
                </div>
            </div>

            {/* Duruma Göre Filtrele */}
            <div>
                <label htmlFor="status" className="block text-xs font-bold text-text-main/80 mb-1">
                    {content.statusLabel || 'Durum'}
                </label>
                <select
                    id="status"
                    className={baseClasses}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    defaultValue={searchParams.get('status')?.toString() || ''}
                >
                    <option value="">{content.statusAllOption || 'Tüm Durumlar'}</option>
                    {durumlar.map(durum => (
                        <option key={durum.anahtar} value={durum.anahtar}>{durum.deger}</option>
                    ))}
                </select>
            </div>

            {/* Firmaya Göre Filtrele */}
            <div>
                <label htmlFor="firma" className="block text-xs font-bold text-text-main/80 mb-1">
                    {content.companyLabel || 'Firma'}
                </label>
                <select
                    id="firma"
                    className={baseClasses}
                    onChange={(e) => handleFilterChange('firmaId', e.target.value)}
                    defaultValue={searchParams.get('firmaId')?.toString() || ''}
                >
                    <option value="">{content.companyAllOption || 'Tüm Firmalar'}</option>
                    {firmalar.map(f => (
                        <option key={f.id} value={f.id}>{f.unvan}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}