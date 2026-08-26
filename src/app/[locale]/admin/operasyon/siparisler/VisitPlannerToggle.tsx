'use client';

import React from 'react';
import { useVisitPlanner } from '@/contexts/VisitPlannerContext';
import { FiNavigation } from 'react-icons/fi';

type VPCompany = {
    id: string; unvan: string; adres: string | null; sehir: string | null;
    ilce: string | null; posta_kodu: string | null; google_maps_url: string | null;
    telefon: string | null; parent_firma_id: string | null;
};

export default function VisitPlannerToggle({ firma }: { firma: VPCompany }) {
    const { addCompany, removeCompany, isSelected } = useVisitPlanner();
    const selected = isSelected(firma.id);

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (selected) removeCompany(firma.id);
        else addCompany(firma);
    };

    return (
        <button 
            onClick={toggle}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${selected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 shadow-sm'}`}
            title={selected ? "Rotadan Çıkar" : "Ziyaret Planlayıcıya Ekle"}
        >
            <FiNavigation size={12} />
            {selected ? "Rotada" : "Rotaya Ekle"}
        </button>
    );
}
