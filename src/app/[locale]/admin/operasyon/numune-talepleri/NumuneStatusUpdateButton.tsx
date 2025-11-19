// src/app/[locale]/admin/operasyon/numune-talepleri/NumuneStatusUpdateButton.tsx (NEUE DATEI)
'use client';

import React, { useTransition } from 'react';
import { toast } from 'sonner';
import { FiLoader } from 'react-icons/fi';
import { Enums } from '@/lib/supabase/database.types';
import { updateNumuneStatusAction } from '@/app/actions/numune-actions'; // Korrigierten Pfad importieren

interface NumuneStatusUpdateButtonProps {
    anfrageId: string;
    neuerStatus: Enums<'numune_talep_durumu'>;
    label: string; // Already localized label passed from parent
    icon: React.ReactNode;
    className?: string;
    successMessage?: string; // Optional localized toast success
    errorMessage?: string;   // Optional localized toast error prefix
}

export default function NumuneStatusUpdateButton({
    anfrageId,
    neuerStatus,
    label,
    icon,
    className,
    successMessage,
    errorMessage
}: NumuneStatusUpdateButtonProps) {
    const [isPending, startTransition] = useTransition();

    const handleClick = () => {
        startTransition(async () => {
            const result = await updateNumuneStatusAction(anfrageId, neuerStatus);
            if (result.success) {
                toast.success(successMessage || result.message);
            } else {
                toast.error(errorMessage ? `${errorMessage} ${result.error}` : result.error);
            }
        });
    };

    return (
        <button
            onClick={handleClick}
            disabled={isPending}
            className={`flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-md transition-colors disabled:opacity-50 ${className || 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
            {isPending ? <FiLoader className="animate-spin" /> : icon}
            {label}
        </button>
    );
}