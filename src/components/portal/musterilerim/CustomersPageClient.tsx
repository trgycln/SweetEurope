'use client';

import { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { CustomerFormModal } from '@/components/portal/musterilerim/CustomerFormModal';
import { CustomersList } from '@/components/portal/musterilerim/CustomersList';

interface CustomersPageClientProps {
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
    };
    statusOptions: string[];
    categoryOptions: string[];
}

export function CustomersPageClient({
    customers,
    locale,
    onSubmit,
    labels,
    statusOptions,
    categoryOptions
}: CustomersPageClientProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">{labels.title}</h1>
                    <p className="text-text-main/80 mt-1">
                        {customers.length} {labels.totalCustomers}
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all font-bold text-sm w-full sm:w-auto"
                >
                    <FiPlus size={18} />
                    {labels.addCustomerButton}
                </button>
            </header>

            {/* Customers List */}
            <CustomersList
                customers={customers}
                locale={locale}
                labels={labels.list}
                statusOptions={statusOptions}
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
