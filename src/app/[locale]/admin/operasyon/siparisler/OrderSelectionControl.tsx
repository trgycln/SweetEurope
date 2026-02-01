'use client';

import React, { useState } from 'react';
import { FiMap, FiX } from 'react-icons/fi';
import { useOrderSelection } from './OrderSelectionContext';
import RouteDrawerModal from './RouteDrawerModal';

interface OrderSelectionControlProps {
    allOrderIds: string[];
    locale: string;
}

export default function OrderSelectionControl({ allOrderIds, locale }: OrderSelectionControlProps) {
    const { selectedOrderIds, clearSelection, selectAllOrders } = useOrderSelection();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const selectedIds = Array.from(selectedOrderIds);

    if (selectedIds.length === 0) {
        return null;
    }

    return (
        <>
            {/* Selection Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-gray-700">
                            {selectedIds.length} sipariş seçildi
                        </span>
                        <button
                            onClick={() => clearSelection()}
                            className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                        >
                            <FiX size={16} /> Temizle
                        </button>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium"
                    >
                        <FiMap size={18} />
                        Gözergah Oluştur
                    </button>
                </div>
            </div>

            {/* Add padding to main content to avoid overlap with fixed bar */}
            <div className="pb-20" />

            {/* Modal */}
            <RouteDrawerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                selectedOrderIds={selectedIds}
                locale={locale}
            />
        </>
    );
}
