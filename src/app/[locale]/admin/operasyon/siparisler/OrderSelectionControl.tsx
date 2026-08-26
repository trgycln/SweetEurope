'use client';

import React, { useState } from 'react';
import { FiNavigation, FiX } from 'react-icons/fi';
import { useOrderSelection } from './OrderSelectionContext';
import { useVisitPlanner } from '@/contexts/VisitPlannerContext';

interface OrderSelectionControlProps {
    allOrderIds: string[];
    locale: string;
}

export default function OrderSelectionControl({ allOrderIds, locale }: OrderSelectionControlProps) {
    const { selectedOrderIds, clearSelection } = useOrderSelection();
    const { addCompany, isSelected } = useVisitPlanner();
    const [isLoading, setIsLoading] = useState(false);
    
    const selectedIds = Array.from(selectedOrderIds);

    if (selectedIds.length === 0) {
        return null;
    }

    const handleAddToVisitPlanner = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(
                `/api/admin/operasyon/siparisler/get-firmalar`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ selectedOrderIds: selectedIds })
                }
            );

            if (!response.ok) {
                throw new Error('Firmalar getirilemedi');
            }

            const data = await response.json();
            const firmas = data.firmas || [];
            
            firmas.forEach((firma: any) => {
                if (!isSelected(firma.id)) {
                    addCompany({
                        id: firma.id,
                        unvan: firma.unvan || '',
                        adres: firma.adres || null,
                        sehir: firma.sehir || null,
                        ilce: firma.ilce || null,
                        posta_kodu: firma.posta_kodu || null,
                        google_maps_url: firma.google_maps_url || null,
                        telefon: firma.telefon || null,
                        parent_firma_id: firma.parent_firma_id || null,
                    });
                }
            });
            
            // İşlem bitince hem modal/yüklenme biter hem de seçim temizlenir
            clearSelection();
        } catch (error) {
            console.error('Error adding to visit planner:', error);
            alert('Ziyaret planlayıcıya eklenirken bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Selection Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-slate-800 text-white border-t border-slate-900 shadow-2xl z-[60]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold">
                            {selectedIds.length} sipariş seçildi
                        </span>
                        <button
                            onClick={() => clearSelection()}
                            className="text-xs text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
                        >
                            <FiX size={16} /> Temizle
                        </button>
                    </div>

                    <button
                        onClick={handleAddToVisitPlanner}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-bold disabled:opacity-50"
                    >
                        {isLoading ? (
                            <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Ekleniyor...</>
                        ) : (
                            <><FiNavigation size={18} /> Ziyaret Planlayıcıya Ekle</>
                        )}
                    </button>
                </div>
            </div>

            {/* Add padding to main content to avoid overlap with fixed bar */}
            <div className="pb-24" />
        </>
    );
}
