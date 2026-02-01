'use client';

import { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { CustomersPageClient } from './CustomersPageClient';
import { CustomerFormModal } from './CustomerFormModal';

interface CustomersPageClientWrapperProps {
    customers: any[];
    locale: string;
    onSubmit: (formData: FormData) => Promise<void>;
    labels: {
        title: string;
        subtitle: string;
        addCustomerButton: string;
        totalCustomers: string;
        modal: any;
        list: any;
        searchPlaceholder?: string;
        allStatusesLabel?: string;
        allPrioritiesLabel?: string;
        allCitiesLabel?: string;
        allDistrictsLabel?: string;
        allZipCodesLabel?: string;
    };
    statusOptions: string[];
    categoryOptions: string[];
    cityOptions?: string[];
    districtOptions?: string[];
    zipCodeOptions?: string[];
    zipCodeLabels?: Record<string, string>;
}

export function CustomersPageClientWrapper({
    customers,
    locale,
    onSubmit,
    labels,
    statusOptions,
    categoryOptions,
    cityOptions,
    districtOptions,
    zipCodeOptions,
    zipCodeLabels
}: CustomersPageClientWrapperProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="space-y-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">{labels.title}</h1>
                    <p className="text-text-main/80 mt-1">{customers.length} {labels.totalCustomers}</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto"
                >
                    <FiPlus size={18} />
                    {labels.addCustomerButton}
                </button>
            </header>

            {/* Customers List */}
            <CustomersPageClient
                customers={customers}
                locale={locale}
                labels={{
                    ...labels.list,
                    searchPlaceholder: labels.searchPlaceholder,
                    allStatusesLabel: labels.allStatusesLabel,
                    allPrioritiesLabel: labels.allPrioritiesLabel,
                    allCitiesLabel: labels.allCitiesLabel,
                    allDistrictsLabel: labels.allDistrictsLabel,
                    allZipCodesLabel: labels.allZipCodesLabel,
                }}
                statusOptions={statusOptions}
                cityOptions={cityOptions}
                districtOptions={districtOptions}
                zipCodeOptions={zipCodeOptions}
                zipCodeLabels={zipCodeLabels}
            />

            {/* Add Customer Modal */}
            <CustomerFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={onSubmit}
                labels={labels.modal}
                categoryOptions={categoryOptions}
            />
        </div>
    );
}
