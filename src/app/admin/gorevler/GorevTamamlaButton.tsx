// src/app/admin/gorevler/GorevTamamlaButton.tsx
'use client';

import { useTransition } from 'react';
import { gorevDurumGuncelleAction } from './actions';
import { toast } from 'sonner';
import { FiCheck, FiLoader } from 'react-icons/fi';

export default function GorevTamamlaButton({ gorevId }: { gorevId: string }) {
    const [isPending, startTransition] = useTransition();

    const handleClick = () => {
        startTransition(async () => {
            const result = await gorevDurumGuncelleAction(gorevId, true); // Görevi 'tamamlandı' yap
            if (result.success) toast.success(result.success);
            else if (result.error) toast.error(result.error);
        });
    };

    return (
        <button onClick={handleClick} disabled={isPending} className="p-2 rounded-full hover:bg-green-100 text-green-600 disabled:opacity-50" title="Görevi tamamla">
            {isPending ? <FiLoader className="animate-spin" /> : <FiCheck />}
        </button>
    );
}