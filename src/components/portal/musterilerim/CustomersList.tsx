'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { FiPhone, FiMail, FiEdit, FiShoppingCart, FiSearch } from 'react-icons/fi';

interface Customer {
    id: string;
    unvan: string;
    telefon: string | null;
    email: string | null;
    kategori: string | null;
    status: string | null;
    created_at: string;
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
        email: string;
        status: string;
        actions: string;
        createOrder: string;
        editCustomer: string;
        callNow: string;
    };
    statusOptions: string[];
}

const STATUS_COLORS: Record<string, string> = {
    'Potansiyel': 'bg-blue-100 text-blue-800 border-blue-300',
    'İlk Temas': 'bg-gray-100 text-gray-800 border-gray-300',
    'Numune Sunuldu': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Teklif Verildi': 'bg-purple-100 text-purple-800 border-purple-300',
    'Anlaşma Sağlandı': 'bg-green-100 text-green-800 border-green-300',
    'Pasif': 'bg-red-100 text-red-800 border-red-300',
};

export function CustomersList({ customers, locale, labels, statusOptions }: CustomersListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');

    // Filter and search
    const filteredCustomers = useMemo(() => {
        return customers.filter((customer) => {
            const matchesSearch = 
                customer.unvan.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (customer.telefon?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
                (customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
            
            const matchesStatus = !statusFilter || customer.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [customers, searchTerm, statusFilter]);

    return (
        <div className="space-y-4">
            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 flex flex-col md:flex-row gap-3">
                {/* Search */}
                <div className="flex-1 relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={labels.searchPlaceholder}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent min-w-[200px]"
                >
                    <option value="">{labels.filterAll}</option>
                    {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </div>

            {/* Mobile: Card View */}
            <div className="lg:hidden space-y-4">
                {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(customer => (
                        <div
                            key={customer.id}
                            className="bg-white p-5 rounded-lg shadow-lg border border-gray-200 hover:border-accent transition-all"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <Link href={`/${locale}/portal/musterilerim/${customer.id}`} className="font-bold text-lg text-primary hover:text-accent">
                                        {customer.unvan}
                                    </Link>
                                    {customer.kategori && (
                                        <p className="text-sm text-gray-600">{customer.kategori}</p>
                                    )}
                                </div>
                                {customer.status && (
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_COLORS[customer.status] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                                        {customer.status}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2 mb-4">
                                {customer.telefon && (
                                    <a
                                        href={`tel:${customer.telefon}`}
                                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-accent"
                                    >
                                        <FiPhone size={14} />
                                        {customer.telefon}
                                    </a>
                                )}
                                {customer.email && (
                                    <a
                                        href={`mailto:${customer.email}`}
                                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-accent"
                                    >
                                        <FiMail size={14} />
                                        {customer.email}
                                    </a>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Link
                                    href={`/${locale}/portal/siparisler/yeni?firmaId=${customer.id}`}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-lg font-semibold text-sm hover:bg-opacity-90 transition-colors"
                                >
                                    <FiShoppingCart size={16} />
                                    {labels.createOrder}
                                </Link>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white p-12 rounded-lg shadow-md text-center">
                        <p className="text-gray-500 text-lg">
                            {searchTerm || statusFilter ? labels.noCustomersFiltered : labels.noCustomers}
                        </p>
                    </div>
                )}
            </div>

            {/* Desktop: Table View */}
            <div className="hidden lg:block bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {labels.companyName}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {labels.category}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {labels.phone}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {labels.email}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {labels.status}
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {labels.actions}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredCustomers.length > 0 ? (
                            filteredCustomers.map(customer => (
                                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Link
                                            href={`/${locale}/portal/musterilerim/${customer.id}`}
                                            className="text-sm font-bold text-primary hover:text-accent"
                                        >
                                            {customer.unvan}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {customer.kategori || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {customer.telefon ? (
                                            <a
                                                href={`tel:${customer.telefon}`}
                                                className="text-accent hover:underline flex items-center gap-1"
                                            >
                                                <FiPhone size={14} />
                                                {customer.telefon}
                                            </a>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {customer.email ? (
                                            <a
                                                href={`mailto:${customer.email}`}
                                                className="text-accent hover:underline"
                                            >
                                                {customer.email}
                                            </a>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {customer.status ? (
                                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${STATUS_COLORS[customer.status] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                                                {customer.status}
                                            </span>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <Link
                                                href={`/${locale}/portal/siparisler/yeni?firmaId=${customer.id}`}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent text-white rounded-lg font-semibold hover:bg-opacity-90 transition-colors text-xs"
                                            >
                                                <FiShoppingCart size={14} />
                                                {labels.createOrder}
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-lg">
                                    {searchTerm || statusFilter ? labels.noCustomersFiltered : labels.noCustomers}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
