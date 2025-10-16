// src/app/admin/gorevler/GorevGeriAlButton.tsx
'use client';

import { useTransition } from 'react';
import { gorevDurumGuncelleAction } from './actions';
import { toast } from 'sonner';
import { FiRotateCcw, FiLoader } from 'react-icons/fi';

export default function GorevGeriAlButton({ gorevId }: { gorevId: string }) {
    const [isPending, startTransition] = useTransition();

    const handleClick = () => {
        startTransition(async () => {
            const result = await gorevDurumGuncelleAction(gorevId, false); // Görevi 'açık' yap
            if (result.success) toast.success(result.success);
            else if (result.error) toast.error(result.error);
        });
    };

    return (
        <button onClick={handleClick} disabled={isPending} className="p-2 rounded-full hover:bg-blue-100 text-blue-600 disabled:opacity-50" title="Görevi yeniden aç">
            {isPending ? <FiLoader className="animate-spin" /> : <FiRotateCcw />}
        </button>
    );
}