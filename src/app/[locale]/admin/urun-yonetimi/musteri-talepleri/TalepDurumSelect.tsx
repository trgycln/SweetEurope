'use client';

import { useState } from 'react';
import { updateUrunTalepDurumu } from '@/app/actions/talep-actions';
import { toast } from 'sonner';

export default function TalepDurumSelect({ talepId, initialDurum }: { talepId: string, initialDurum: string }) {
    const [durum, setDurum] = useState(initialDurum);
    const [isUpdating, setIsUpdating] = useState(false);

    const durumlar = [
        { value: 'Bekliyor', label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-800' },
        { value: 'İşleme Alındı', label: 'İşleme Alındı', color: 'bg-blue-100 text-blue-800' },
        { value: 'Tedarikçiye Soruldu', label: 'Tedarikçiye Soruldu', color: 'bg-purple-100 text-purple-800' },
        { value: 'Tamamlandı', label: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
        { value: 'İptal Edildi', label: 'İptal Edildi', color: 'bg-red-100 text-red-800' },
    ];

    const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDurum = e.target.value;
        setIsUpdating(true);
        const prevDurum = durum;
        setDurum(newDurum);

        const res = await updateUrunTalepDurumu(talepId, newDurum);
        if (!res.success) {
            toast.error(res.error || 'Hata oluştu');
            setDurum(prevDurum); // rollback on error
        } else {
            toast.success('Talep durumu güncellendi.');
        }
        setIsUpdating(false);
    };

    const currentDurumObj = durumlar.find(d => d.value === durum) || durumlar[0];

    return (
        <div className="relative">
            <select
                value={durum}
                onChange={handleChange}
                disabled={isUpdating}
                className={`appearance-none pl-3 pr-8 py-1 rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50 transition-colors ${currentDurumObj.color}`}
            >
                {durumlar.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
        </div>
    );
}