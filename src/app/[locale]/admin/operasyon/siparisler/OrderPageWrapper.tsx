'use client';

import React from 'react';

interface OrderPageWrapperProps {
    children: React.ReactNode;
    allOrderIds?: string[];
    locale?: string;
}

export default function OrderPageWrapper({ children }: OrderPageWrapperProps) {
    return (
        <>
            {children}
        </>
    );
}
