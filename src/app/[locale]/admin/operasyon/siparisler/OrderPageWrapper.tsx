'use client';

import { OrderSelectionProvider } from './OrderSelectionContext';
import OrderSelectionControl from './OrderSelectionControl';
import React from 'react';

interface OrderPageWrapperProps {
    children: React.ReactNode;
    allOrderIds: string[];
    locale: string;
}

export default function OrderPageWrapper({ children, allOrderIds, locale }: OrderPageWrapperProps) {
    return (
        <OrderSelectionProvider>
            {children}
            <OrderSelectionControl allOrderIds={allOrderIds} locale={locale} />
        </OrderSelectionProvider>
    );
}
