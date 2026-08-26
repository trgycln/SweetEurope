'use client';

import React from 'react';
import { useVisitPlanner } from '@/contexts/VisitPlannerContext';

type VPCompany = {
    id: string;
    unvan: string;
    adres: string | null;
    sehir: string | null;
    ilce: string | null;
    posta_kodu: string | null;
    google_maps_url: string | null;
    telefon: string | null;
    parent_firma_id: string | null;
};

interface SelectAllOrdersCheckboxProps {
    firmalar: VPCompany[];
}

export default function SelectAllOrdersCheckbox({ firmalar }: SelectAllOrdersCheckboxProps) {
    const { addCompany, removeCompany, isSelected } = useVisitPlanner();

    const validFirmas = firmalar.filter(f => f && f.id);
    if (validFirmas.length === 0) return null;

    // Unique firmalar
    const uniqueFirmas = Array.from(
        new Map(validFirmas.map(f => [f.id, f])).values()
    );

    const allSelected = uniqueFirmas.length > 0 && uniqueFirmas.every(f => isSelected(f.id));
    const someSelected = uniqueFirmas.some(f => isSelected(f.id)) && !allSelected;

    const toggleAll = () => {
        if (allSelected) {
            uniqueFirmas.forEach(f => removeCompany(f.id));
        } else {
            uniqueFirmas.forEach(f => {
                if (!isSelected(f.id)) {
                    addCompany(f);
                }
            });
        }
    };

    return (
        <input
            type="checkbox"
            checked={allSelected}
            ref={el => {
                if (el) el.indeterminate = someSelected;
            }}
            onChange={toggleAll}
            className="w-4 h-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            title={allSelected ? "Tümünün seçimini kaldır" : "Tüm firmaları ziyaret listesine ekle"}
        />
    );
}
