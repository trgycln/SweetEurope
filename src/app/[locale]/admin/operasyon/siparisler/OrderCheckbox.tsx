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

interface OrderCheckboxProps {
    firma: VPCompany | null;
}

export default function OrderCheckbox({ firma }: OrderCheckboxProps) {
    const { addCompany, removeCompany, isSelected } = useVisitPlanner();
    
    if (!firma || !firma.id) {
        return (
            <input
                type="checkbox"
                disabled
                className="w-4 h-4 rounded border-gray-200 text-slate-300 opacity-40 cursor-not-allowed"
                title="Firma bilgisi yok"
            />
        );
    }

    const selected = isSelected(firma.id);

    const toggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (selected) {
            removeCompany(firma.id);
        } else {
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
    };

    return (
        <input
            type="checkbox"
            checked={selected}
            onChange={toggle}
            className="w-4 h-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            title={selected ? "Ziyaret listesinden çıkar" : "Ziyaret listesine ekle"}
        />
    );
}
