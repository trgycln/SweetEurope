'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { FiSearch, FiUsers } from 'react-icons/fi';
import CustomerRow from './CustomerRow';

interface Customer {
    id: string;
    unvan: string;
    telefon: string | null;
    email: string | null;
    kategori: string | null;
    status: string | null;
    created_at: string;
    adres?: string | null;
    sehir?: string | null;
    ilce?: string | null;
    posta_kodu?: string | null;
    kaynak?: string | null;
    oncelik?: string | null;
    oncelik_puani?: number | null;
    etiketler?: string[] | null;
    son_etkilesim_tarihi?: string | null;
    google_maps_url?: string | null;
    instagram_url?: string | null;
}

interface CustomersListProps {
    customers: Customer[];
    locale: string;
    labels: {
        searchPlaceholder: string;
        filterAll: string;
        noCustomers: string;
        noCustomersFiltered: string;
        companyName: string;
        category: string;
        phone: string;
        status: string;
        actions: string;
        createOrder: string;
        editCustomer: string;
        callNow: string;
        priority?: string;
        source?: string;
        registrationDate?: string;
        lastInteraction?: string;
        allStatusesLabel?: string;
        allPrioritiesLabel?: string;
        allCitiesLabel?: string;
        allDistrictsLabel?: string;
        allZipCodesLabel?: string;
    };
    statusOptions: string[];
    cityOptions?: string[];
    districtOptions?: string[];
    zipCodeOptions?: string[];
    zipCodeLabels?: Record<string, string>;
}

const STATUS_COLORS: Record<string, string> = {
    'ADAY': 'bg-gray-100 text-gray-800 border-gray-300',
    'TEMAS EDİLDİ': 'bg-blue-50 text-blue-600 border-blue-200',
    'NUMUNE VERİLDİ': 'bg-purple-50 text-purple-600 border-purple-200',
    'MÜŞTERİ': 'bg-green-50 text-green-600 border-green-200',
    'REDDEDİLDİ': 'bg-red-100 text-red-800 border-red-300',
    // Old statuses fallback
    'Aday': 'bg-gray-100 text-gray-800 border-gray-300',
    'Takipte': 'bg-gray-100 text-gray-800 border-gray-300',
    'Temas Kuruldu': 'bg-blue-100 text-blue-800 border-blue-300',
    'İletişimde': 'bg-gray-100 text-gray-800 border-gray-300',
    'Müşteri': 'bg-green-100 text-green-800 border-green-300',
    'Pasif': 'bg-red-100 text-red-800 border-red-300'
};

export function CustomersList({ 
    customers, 
    locale, 
    labels, 
    statusOptions,
    cityOptions = [],
    districtOptions = [],
    zipCodeOptions = [],
    zipCodeLabels = {}
}: CustomersListProps) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

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

    return (
        <div className="space-y-4">
            {/* Filters Bar - Admin Panel Style */}
            <div className="bg-gray-50 py-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b border-gray-200 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-grow min-w-[200px]">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={labels.searchPlaceholder}
                            className="w-full pl-10 pr-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition bg-white"
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
                            <option value="">{labels.allPrioritiesLabel || 'Tüm Öncelikler'}</option>
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
                            <option value="">{labels.allCitiesLabel || 'Tüm Şehirler'}</option>
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
                            <option value="">{labels.allDistrictsLabel || 'Tüm İlçeler'}</option>
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
                            <option value="">{labels.allZipCodesLabel || 'Tüm PLZ Bölgeleri'}</option>
                            {zipCodeOptions.map(zipCode => (
                                <option key={zipCode} value={zipCode}>
                                    {zipCodeLabels[zipCode] || zipCode}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="flex-grow sm:flex-grow-0 sm:w-64">
                        <select
                            className="w-full px-4 py-2 border border-bg-subtle rounded-md focus:ring-accent focus:border-accent transition bg-white"
                            onChange={(e) => handleStatusChange(e.target.value)}
                            value={searchParams.get('status')?.toString() || ''}
                        >
                            <option value="">{labels.allStatusesLabel || labels.filterAll}</option>
                            {statusOptions.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Mobile: Card View */}
            <div className="lg:hidden space-y-4">
                {customers.length > 0 ? (
                    customers.map(customer => (
                        <CustomerRow
                            key={customer.id}
                            customer={customer}
                            locale={locale}
                            statusColors={STATUS_COLORS}
                            isDesktop={false}
                            labels={labels}
                        />
                    ))
                ) : (
                    <div className="mt-12 text-center p-10 border-2 border-dashed border-gray-200 rounded-lg bg-white shadow-sm">
                        <FiUsers className="mx-auto text-5xl text-gray-300 mb-4" />
                        <h2 className="font-serif text-2xl font-semibold text-primary">
                            {searchTerm || statusFilter ? labels.noCustomersFiltered : labels.noCustomers}
                        </h2>
                    </div>
                )}
            </div>

            {/* Desktop: Table View */}
            {customers.length === 0 ? (
                <div className="hidden lg:flex mt-12 text-center p-10 border-2 border-dashed border-gray-200 rounded-lg bg-white shadow-sm">
                    <div className="w-full">
                        <FiUsers className="mx-auto text-5xl text-gray-300 mb-4" />
                        <h2 className="font-serif text-2xl font-semibold text-primary">
                            {labels.noCustomers}
                        </h2>
                    </div>
                </div>
            ) : (
                <div className="hidden lg:block bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden -mt-8">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {labels.companyName}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {labels.priority || 'Öncelik'}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {labels.source || 'Kaynak'}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {labels.registrationDate || 'Kayıt Tarihi'}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {labels.category}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {labels.phone}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {labels.lastInteraction || 'Son Etkileşim'}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {labels.status}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {customers.map(customer => (
                                <CustomerRow
                                    key={customer.id}
                                    customer={customer}
                                    locale={locale}
                                    statusColors={STATUS_COLORS}
                                    isDesktop={true}
                                    labels={labels}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
