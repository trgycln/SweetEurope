'use client';

import { useVisitPlanner } from '@/contexts/VisitPlannerContext';
import { FiNavigation, FiCheck } from 'react-icons/fi';

interface Props {
    company: {
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
    size?: 'sm' | 'md';
}

export function VisitToggleButton({ company, size = 'md' }: Props) {
    const { isSelected, addCompany, removeCompany } = useVisitPlanner();
    const inVisitList = isSelected(company.id);

    const handleToggle = () => {
        if (inVisitList) {
            removeCompany(company.id);
        } else {
            addCompany(company);
        }
    };

    const baseCls = size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs';
    const iconSize = size === 'sm' ? 10 : 12;

    return (
        <button onClick={handleToggle}
            className={`font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${baseCls} ${inVisitList
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
            title={inVisitList ? 'Ziyaret listesinden çıkar' : 'Ziyaret listesine ekle'}>
            {inVisitList ? <FiCheck size={iconSize} /> : <FiNavigation size={iconSize} />}
            {inVisitList ? 'Ziyaret listesinde' : 'Ziyaret listesine ekle'}
        </button>
    );
}
