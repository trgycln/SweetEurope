// src/app/admin/operasyon/siparisler/StatusUpdateButton.tsx
'use client';
import { useTransition } from 'react';
import { statusAendernAction } from './actions';
import { toast } from 'sonner';
import { FiLoader } from 'react-icons/fi';
import { Enums } from '@/lib/supabase/database.types';

interface Props {
    siparisId: string;
    neuerStatus: Enums<'siparis_durumu'>;
    label: string;
    icon: React.ReactNode;
    className?: string;
}

export default function StatusUpdateButton({ siparisId, neuerStatus, label, icon, className }: Props) {
    const [isPending, startTransition] = useTransition();

    const handleClick = () => {
        startTransition(async () => {
            const result = await statusAendernAction(siparisId, neuerStatus);
            if (result.success) toast.success(result.success);
            else if (result.error) toast.error(result.error);
        });
    };

    return (
        <button onClick={handleClick} disabled={isPending} className={`flex items-center gap-2 text-xs font-bold px-2 py-1 rounded-md transition-colors disabled:opacity-50 ${className}`}>
            {isPending ? <FiLoader className="animate-spin" /> : icon}
            {label}
        </button>
    );
}