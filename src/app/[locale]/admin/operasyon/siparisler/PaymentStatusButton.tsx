'use client';

import { useState, useTransition } from 'react';
import { FiDollarSign, FiCheck, FiX } from 'react-icons/fi';
import { updateOdemeDurumuAction } from './actions';
import { toast } from 'sonner';

export default function PaymentStatusButton({
    siparisId,
    mevcutDurum,
    mevcutKasa
}: {
    siparisId: string;
    mevcutDurum: string;
    mevcutKasa: string;
}) {
    const [isPending, startTransition] = useTransition();
    const isPaid = mevcutDurum === 'Ödendi';

    const handleToggle = () => {
        const yeniDurum = isPaid ? 'Ödenmedi' : 'Ödendi';
        const yeniKasa = isPaid ? mevcutKasa : 'Banka'; // Default to Banka if just clicked
        
        startTransition(async () => {
            try {
                const res = await updateOdemeDurumuAction(siparisId, yeniDurum, yeniKasa);
                if (res.error) {
                    toast.error(res.error);
                } else {
                    toast.success(res.success);
                }
            } catch (error) {
                toast.error('Beklenmeyen bir hata oluştu');
            }
        });
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isPending}
            title={isPaid ? "Ödenmedi olarak işaretle" : "Ödendi olarak işaretle"}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors border disabled:opacity-50 ${
                isPaid 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
        >
            {isPending ? (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isPaid ? (
                <FiCheck size={12} />
            ) : (
                <FiX size={12} />
            )}
            {isPaid ? 'Ödendi' : 'Ödenmedi'}
        </button>
    );
}
