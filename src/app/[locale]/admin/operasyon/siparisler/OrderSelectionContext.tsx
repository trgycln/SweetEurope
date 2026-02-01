'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface OrderSelectionContextType {
    selectedOrderIds: Set<string>;
    toggleOrderSelection: (orderId: string) => void;
    selectAllOrders: (orderIds: string[]) => void;
    clearSelection: () => void;
    isOrderSelected: (orderId: string) => boolean;
    selectionCount: number;
}

const OrderSelectionContext = createContext<OrderSelectionContextType | undefined>(undefined);

export function OrderSelectionProvider({ children }: { children: React.ReactNode }) {
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

    const toggleOrderSelection = useCallback((orderId: string) => {
        setSelectedOrderIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(orderId)) {
                newSet.delete(orderId);
            } else {
                newSet.add(orderId);
            }
            return newSet;
        });
    }, []);

    const selectAllOrders = useCallback((orderIds: string[]) => {
        setSelectedOrderIds(new Set(orderIds));
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedOrderIds(new Set());
    }, []);

    const isOrderSelected = useCallback((orderId: string) => {
        return selectedOrderIds.has(orderId);
    }, [selectedOrderIds]);

    return (
        <OrderSelectionContext.Provider
            value={{
                selectedOrderIds,
                toggleOrderSelection,
                selectAllOrders,
                clearSelection,
                isOrderSelected,
                selectionCount: selectedOrderIds.size
            }}
        >
            {children}
        </OrderSelectionContext.Provider>
    );
}

export function useOrderSelection() {
    const context = useContext(OrderSelectionContext);
    if (!context) {
        throw new Error('useOrderSelection must be used within OrderSelectionProvider');
    }
    return context;
}
