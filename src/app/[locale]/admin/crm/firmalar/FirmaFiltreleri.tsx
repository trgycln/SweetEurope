// src/app/[locale]/admin/crm/firmalar/FirmaFiltreleri.tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { FiSearch } from 'react-icons/fi';

interface FirmaFiltreleriProps {
    statusOptions: string[];
    statusLabels?: Record<string, string>;
    searchPlaceholder: string;
    allStatusesLabel: string;
    allPrioritiesLabel: string;
    allCitiesLabel: string;
    allDistrictsLabel: string;
    allZipCodesLabel?: string;
    allCategoriesLabel?: string; // YENİ
    cityOptions?: string[];
    districtOptions?: string[];
    zipCodeOptions?: string[];
    zipCodeLabels?: Record<string, string>;
    categoryOptions?: string[]; // YENİ
}

export default function FirmaFiltreleri({ 
    statusOptions, 
    statusLabels = {},
    searchPlaceholder, 
    allStatusesLabel,
    allPrioritiesLabel,
    allCitiesLabel,
    allDistrictsLabel,
    allZipCodesLabel = "All Zip Codes",
    allCategoriesLabel = "All Categories", // YENİ
    cityOptions = [],
    districtOptions = [],
    zipCodeOptions = [],
    zipCodeLabels = {},
    categoryOptions = [] // YENİ
}: FirmaFiltreleriProps) {
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

    const handleCityChange = (city: string) => {
        const params = new URLSearchParams(searchParams);
        if (city) {
            params.set('city', city);
        } else {
            params.delete('city');
        }
        replace(`${pathname}?${params.toString()}`);
    };

    const handleDistrictChange = (district: string) => {
        const params = new URLSearchParams(searchParams);
        if (district) {
            params.set('district', district);
        } else {
            params.delete('district');
        }
        replace(`${pathname}?${params.toString()}`);
    };

    const handleZipCodeChange = (zipCode: string) => {
        const params = new URLSearchParams(searchParams);
        if (zipCode) {
            params.set('posta_kodu', zipCode);
        } else {
            params.delete('posta_kodu');
        }
        replace(`${pathname}?${params.toString()}`);
    };

    const handleStatusChange = (status: string) => {
        const params = new URLSearchParams(searchParams);
        if (status) {
            params.set('status', status);
        } else {
            params.delete('status');
        }
        replace(`${pathname}?${params.toString()}`);
    };

    const handlePriorityChange = (priority: string) => {
        const params = new URLSearchParams(searchParams);
        if (priority) {
            params.set('priority_group', priority);
        } else {
            params.delete('priority_group');
        }
        replace(`${pathname}?${params.toString()}`);
    };

    const handleCategoryChange = (category: string) => { // YENİ
        const params = new URLSearchParams(searchParams);
        if (category) {
            params.set('kategori', category);
        } else {
            params.delete('kategori');
        }
        replace(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white rounded-lg shadow-sm border border-bg-subtle flex-wrap">
            <div className="relative flex-grow min-w-[200px]">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder={searchPlaceholder}
                    className="w-full pl-10 pr-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition"
                    onChange={(e) => handleSearch(e.target.value)}
                    defaultValue={searchParams.get('q')?.toString()}
                />
            </div>
            
            {/* Priority Filter */}
            <div className="relative flex-grow sm:flex-grow-0 sm:w-40">
                <select
                    className="w-full px-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition bg-white"
                    onChange={(e) => handlePriorityChange(e.target.value)}
                    value={searchParams.get('priority_group')?.toString() || ''}
                >
                    <option value="">{allPrioritiesLabel}</option>
                    <option value="A">A (High)</option>
                    <option value="B">B (Medium)</option>
                    <option value="C">C (Low)</option>
                </select>
            </div>

            {/* City Filter */}
            <div className="relative flex-grow sm:flex-grow-0 sm:w-48">
                <select
                    className="w-full px-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition bg-white"
                    onChange={(e) => handleCityChange(e.target.value)}
                    value={searchParams.get('city')?.toString() || ''}
                >
                    <option value="">{allCitiesLabel}</option>
                    {cityOptions.map(city => (
                        <option key={city} value={city}>{city}</option>
                    ))}
                </select>
            </div>

            {/* District Filter */}
            <div className="relative flex-grow sm:flex-grow-0 sm:w-48">
                <select
                    className="w-full px-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition bg-white"
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    value={searchParams.get('district')?.toString() || ''}
                >
                    <option value="">{allDistrictsLabel}</option>
                    {districtOptions.map(district => (
                        <option key={district} value={district}>{district}</option>
                    ))}
                </select>
            </div>

            {/* Zip Code Filter */}
            <div className="relative flex-grow sm:flex-grow-0 sm:w-48">
                <select
                    className="w-full px-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition bg-white"
                    onChange={(e) => handleZipCodeChange(e.target.value)}
                    value={searchParams.get('posta_kodu')?.toString() || ''}
                >
                    <option value="">{allZipCodesLabel}</option>
                    {zipCodeOptions.map(zipCode => (
                        <option key={zipCode} value={zipCode}>
                            {zipCodeLabels[zipCode] || zipCode}
                        </option>
                    ))}
                </select>
            </div>

            {/* Category Filter - YENİ */}
            <div className="relative flex-grow sm:flex-grow-0 sm:w-56">
                <select
                    className="w-full px-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition bg-white"
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    value={searchParams.get('kategori')?.toString() || ''}
                >
                    <option value="">{allCategoriesLabel}</option>
                    {categoryOptions.map(category => (
                        <option key={category} value={category}>{category}</option>
                    ))}
                </select>
            </div>

            <div className="flex-grow sm:flex-grow-0 sm:w-64">
                <select
                    className="w-full px-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition bg-white"
                    onChange={(e) => handleStatusChange(e.target.value)}
                    value={searchParams.get('status')?.toString() || ''}
                >
                    <option value="">{allStatusesLabel}</option>
                    {statusOptions.map(status => (
                        <option key={status} value={status}>{statusLabels[status] || status}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}