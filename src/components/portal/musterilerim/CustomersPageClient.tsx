'use client';

import { CustomersList } from '@/components/portal/musterilerim/CustomersList';

interface CustomersPageClientProps {
    customers: any[];
    locale: string;
    labels: any;
    statusOptions: string[];
    cityOptions?: string[];
    districtOptions?: string[];
    zipCodeOptions?: string[];
    zipCodeLabels?: Record<string, string>;
}

export function CustomersPageClient({
    customers,
    locale,
    labels,
    statusOptions,
    cityOptions,
    districtOptions,
    zipCodeOptions,
    zipCodeLabels
}: CustomersPageClientProps) {
    return (
        <CustomersList
            customers={customers}
            locale={locale}
            labels={labels}
            statusOptions={statusOptions}
            cityOptions={cityOptions}
            districtOptions={districtOptions}
            zipCodeOptions={zipCodeOptions}
            zipCodeLabels={zipCodeLabels}
        />
    );
}
