// src/app/[locale]/admin/operasyon/numune-talepleri/NumuneCancelButton.tsx (NEUE DATEI)
'use client';

import React, { useTransition } from 'react';
import { toast } from 'sonner';
import { FiLoader, FiXCircle } from 'react-icons/fi';
import { cancelNumuneTalepAction } from '@/app/actions/numune-actions'; // Neue Action importieren

interface NumuneCancelButtonProps {
    anfrageId: string;
    label: string;
    promptText: string;
    emptyReasonError: string;
}

export default function NumuneCancelButton({ anfrageId, label, promptText, emptyReasonError }: NumuneCancelButtonProps) {
    const [isPending, startTransition] = useTransition();

    const handleClick = () => {
        // Zeige einen Browser-Prompt, um die Begründung abzufragen
    const begruendung = prompt(promptText);

        // Wenn der Benutzer auf "Abbrechen" klickt (prompt gibt null zurück)
        if (begruendung === null) {
            return; // Nichts tun
        }

        // Wenn der Benutzer "OK" klickt, aber nichts eingibt
        if (begruendung.trim() === '') {
            toast.error(emptyReasonError);
            return;
        }

        // Action mit der Begründung starten
        startTransition(async () => {
            const result = await cancelNumuneTalepAction(anfrageId, begruendung);
            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error(result.error);
            }
        });
    };

    return (
        <button
            onClick={handleClick}
            disabled={isPending}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-md transition-colors bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
        >
            {isPending ? <FiLoader className="animate-spin" /> : <FiXCircle size={12} />}
            {label}
        </button>
    );
}