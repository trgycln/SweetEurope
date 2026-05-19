'use client';

import { useState, useTransition } from 'react';
import { siparisDurumGuncelleAction } from '@/app/actions/siparis-actions';
import { toast } from 'sonner';
import { FiLoader, FiCheck, FiTruck, FiPackage, FiX } from 'react-icons/fi';
import { Enums } from '@/lib/supabase/database.types';

type SiparisDurumu = Enums<'siparis_durumu'>;

interface Props {
    siparisId: string;
    mevcutDurum: SiparisDurumu | string;
    locale?: string;
}

const DURUM_BUTONLARI: {
    durum: SiparisDurumu;
    label: string;
    icon: React.ReactNode;
    color: string;
}[] = [
    { durum: 'Hazırlanıyor', label: 'Hazırlanıyor', icon: <FiPackage size={14} />, color: 'bg-blue-600 hover:bg-blue-700 text-white' },
    { durum: 'Yola Çıktı',   label: 'Yola Çıktı',  icon: <FiTruck size={14} />,   color: 'bg-violet-600 hover:bg-violet-700 text-white' },
    { durum: 'Teslim Edildi',label: 'Teslim Edildi',icon: <FiCheck size={14} />,   color: 'bg-green-600 hover:bg-green-700 text-white' },
    { durum: 'İptal Edildi', label: 'İptal Edildi', icon: <FiX size={14} />,       color: 'bg-red-600 hover:bg-red-700 text-white' },
];

export default function DurumGuncellePaneli({ siparisId, mevcutDurum }: Props) {
    const [isPending, startTransition] = useTransition();
    const [aktifDurum, setAktifDurum] = useState<string>(mevcutDurum);

    const isFinished = aktifDurum === 'Teslim Edildi' || aktifDurum === 'İptal Edildi' || aktifDurum === 'cancelled';

    const handleDurumDegistir = (yeniDurum: SiparisDurumu) => {
        if (yeniDurum === aktifDurum || isFinished) return;

        startTransition(async () => {
            const result = await siparisDurumGuncelleAction(siparisId, yeniDurum);
            if (result.success) {
                setAktifDurum(yeniDurum);
                toast.success(`Durum "${yeniDurum}" olarak güncellendi`);
            } else {
                toast.error(result.error || 'Hata oluştu');
            }
        });
    };

    if (isFinished) {
        return (
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
                aktifDurum === 'Teslim Edildi'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
                {aktifDurum === 'Teslim Edildi' ? <FiCheck size={14} /> : <FiX size={14} />}
                {aktifDurum} — Güncelleme yapılamaz
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            {DURUM_BUTONLARI.map(btn => (
                <button
                    key={btn.durum}
                    onClick={() => handleDurumDegistir(btn.durum)}
                    disabled={isPending || btn.durum === aktifDurum}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border disabled:cursor-not-allowed ${
                        btn.durum === aktifDurum
                            ? `${btn.color} opacity-100 ring-2 ring-offset-1 ring-current`
                            : `${btn.color} opacity-70 hover:opacity-100 border-transparent`
                    }`}
                >
                    {isPending ? <FiLoader className="animate-spin" size={14} /> : btn.icon}
                    {btn.label}
                    {btn.durum === aktifDurum && <FiCheck size={11} className="ml-1" />}
                </button>
            ))}
        </div>
    );
}
