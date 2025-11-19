// src/app/admin/gorevler/GorevFiltreleri.tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// Tipleri ana sayfadan alacağız, şimdilik basitçe tanımlıyoruz.
type Profil = { id: string; tam_ad: string | null };
type Oncelik = 'Düşük' | 'Orta' | 'Yüksek';

interface GorevFiltreleriProps {
    profiller: Profil[];
    oncelikler: Oncelik[];
    dictionary: any;
}

export default function GorevFiltreleri({ profiller, oncelikler, dictionary }: GorevFiltreleriProps) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    function handleFilterChange(key: string, value: string) {
        const params = new URLSearchParams(searchParams);
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        replace(`${pathname}?${params.toString()}`);
    }

    const baseClasses = "w-full bg-white border border-bg-subtle rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-accent";

    const content = (dictionary?.tasksPage) || (dictionary?.adminDashboard?.tasksPage) || {};

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm border border-bg-subtle">
            {/* Duruma Göre Filtrele */}
            <div>
                <label htmlFor="durum" className="block text-xs font-bold text-text-main/80 mb-1">{content.filterStatusLabel || 'Status'}</label>
                <select
                    id="durum"
                    className={baseClasses}
                    onChange={(e) => handleFilterChange('durum', e.target.value)}
                    defaultValue={searchParams.get('durum')?.toString() || ''}
                >
                    <option value="">{content.statusAll || 'All'}</option>
                    <option value="acik">{content.openTasksOption || 'Open Tasks'}</option>
                    <option value="tamamlandi">{content.completedTasksOption || 'Completed Tasks'}</option>
                </select>
            </div>
            {/* Personele Göre Filtrele */}
            <div>
                <label htmlFor="atanan" className="block text-xs font-bold text-text-main/80 mb-1">{content.filterAssigneeLabel || 'Assignee'}</label>
                <select
                    id="atanan"
                    className={baseClasses}
                    onChange={(e) => handleFilterChange('atanan', e.target.value)}
                    defaultValue={searchParams.get('atanan')?.toString() || ''}
                >
                    <option value="">{content.assigneeAll || 'All Assignees'}</option>
                    {profiller.map(p => (
                        <option key={p.id} value={p.id}>{p.tam_ad}</option>
                    ))}
                </select>
            </div>
            {/* Önceliğe Göre Filtrele */}
            <div>
                <label htmlFor="oncelik" className="block text-xs font-bold text-text-main/80 mb-1">{content.filterPriorityLabel || 'Priority'}</label>
                <select
                    id="oncelik"
                    className={baseClasses}
                    onChange={(e) => handleFilterChange('oncelik', e.target.value)}
                    defaultValue={searchParams.get('oncelik')?.toString() || ''}
                >
                    <option value="">{content.priorityAll || 'All Priorities'}</option>
                    {oncelikler.map(o => (
                        <option key={o} value={o}>{o}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}