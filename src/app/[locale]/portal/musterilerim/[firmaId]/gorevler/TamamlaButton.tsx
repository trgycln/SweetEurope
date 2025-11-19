'use client';

import { useTransition } from 'react';
import { gorevDurumGuncelleAction } from './actions';
import { toast } from 'sonner';
import { FiCheck, FiLoader } from 'react-icons/fi';

export default function TamamlaButton({ gorevId, firmaId }: { gorevId: string, firmaId: string }) {
    const [isPending, startTransition] = useTransition();

    const handleClick = () => {
        startTransition(async () => {
            const result = await gorevDurumGuncelleAction(gorevId, firmaId, true);
            if (result.success) {
                toast.success(result.success);
            } else if (result.error) {
                toast.error(result.error);
            }
        });
    };

    return (
        <button 
            onClick={handleClick} 
            disabled={isPending}
            className="flex-shrink-0 p-2 h-10 w-10 flex items-center justify-center rounded-full bg-secondary hover:bg-green-100 text-green-600 transition-colors disabled:opacity-50"
            title="Görevi tamamla"
        >
            {isPending ? <FiLoader className="animate-spin" /> : <FiCheck />}
        </button>
    );
}
