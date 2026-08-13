// src/app/admin/operasyon/siparisler/SiparisFiltreleri.tsx (DÜZELTİLMİŞ)
'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { FiSearch } from 'react-icons/fi';

function SearchableSelect({
    options,
    value,
    onChange,
    allOptionLabel
}: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (val: string) => void;
    allOptionLabel: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));
    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className="relative" ref={wrapperRef}>
            <div 
                className="w-full bg-white border border-bg-subtle rounded-lg p-2.5 text-sm cursor-pointer flex justify-between items-center hover:border-gray-300"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="truncate">{selectedOption ? selectedOption.label : allOptionLabel}</span>
                <span className="text-gray-400 text-xs">▼</span>
            </div>
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 flex flex-col">
                    <div className="p-2 border-b border-gray-100">
                        <input 
                            type="text" 
                            className="w-full p-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500"
                            placeholder="Firma ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                        />
                    </div>
                    <div className="overflow-y-auto">
                        <div 
                            className={`p-2 px-3 text-sm cursor-pointer hover:bg-gray-100 ${value === '' ? 'bg-blue-50 text-blue-600' : ''}`}
                            onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}
                        >
                            {allOptionLabel}
                        </div>
                        {filteredOptions.map(opt => (
                            <div 
                                key={opt.value}
                                className={`p-2 px-3 text-sm cursor-pointer hover:bg-gray-100 ${value === opt.value ? 'bg-blue-50 text-blue-600' : ''}`}
                                onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
                            >
                                {opt.label}
                            </div>
                        ))}
                        {filteredOptions.length === 0 && (
                            <div className="p-2 px-3 text-sm text-gray-500">Kayıt bulunamadı</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

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
                <SearchableSelect
                    options={firmalar.map(f => ({ value: f.id, label: f.unvan || 'İsimsiz Firma' }))}
                    value={searchParams.get('firmaId')?.toString() || ''}
                    onChange={(val) => handleFilterChange('firmaId', val)}
                    allOptionLabel={content.companyAllOption || 'Tüm Firmalar'}
                />
            </div>
        </div>
    );
}